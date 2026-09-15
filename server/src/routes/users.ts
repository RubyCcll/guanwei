// 用户/档案/记录 API（本地 JSON 文件存储，供前后端联调）
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { USERS_DB } from '../services/dataDir.js';
import { readUsersDb, writeUsersDb, withUsersDb } from '../services/usersDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 用户档案 JSON 库：默认 server/data/db.json（运行时目录，与源码分离，绝不入 npm 包）
const DB_FILE = USERS_DB;

function scryptAsync(pw: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(pw, salt, keylen, (err, key) => err ? reject(err) : resolve(key));
  });
}

interface DbUser {
  username: string;
  passHash: string;
  createdAt: number;
  profile: Record<string, unknown>;
  samples: { id: string; name: string; profile: Record<string, unknown> }[];
  records: Record<string, unknown>[];
  /** 登录态 token（注册/登录时签发，云同步写接口须携带校验归属） */
  token?: string;
  /** token 过期时间（ms；30 天滚动，登录时轮换续期） */
  tokenExpires?: number;
}

interface Db { users: DbUser[] }

// 读写统一走 services/usersDb：原子写（临时文件 + rename），避免半截文件把全库读成空库
function loadDb(): Db { return readUsersDb() as Db; }
function saveDb(db: Db): void { writeUsersDb(db); }

// ─── 输入校验（2026-09 安全修复）───
// profile/records 原样入库会被后续注入 AI prompt 并落盘；此处白名单化 + 拒绝原型污染键
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

function isSafeKey(k: string): boolean { return !DANGEROUS_KEYS.includes(k); }
function cleanString(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}
/** 出生档案白名单校验：仅保留已知字段，限制长度/数值范围 */
function sanitizeProfile(input: any): Record<string, unknown> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const p = input as Record<string, any>;
  const out: Record<string, unknown> = {};
  if (typeof p.birthDate === 'string' && /^\d{4}-\d{1,2}-\d{1,2}$/.test(p.birthDate)) out.birthDate = p.birthDate.slice(0, 10);
  if (typeof p.birthTime === 'string' && /^\d{1,2}:\d{2}$/.test(p.birthTime)) out.birthTime = p.birthTime.slice(0, 5);
  if (Number.isInteger(p.birthHourIndex) && p.birthHourIndex >= -1 && p.birthHourIndex <= 11) out.birthHourIndex = p.birthHourIndex;
  if (typeof p.birthTimeUnknown === 'boolean') out.birthTimeUnknown = p.birthTimeUnknown;
  if (p.gender === '男' || p.gender === '女') out.gender = p.gender;
  if (p.location && typeof p.location === 'object' && !Array.isArray(p.location)) {
    const l = p.location as Record<string, any>;
    const lng = Number(l.lng), lat = Number(l.lat);
    if (Number.isFinite(lng) && lng >= -180 && lng <= 180 && Number.isFinite(lat) && lat >= -90 && lat <= 90) {
      out.location = { province: cleanString(l.province, 40), city: cleanString(l.city, 40), district: cleanString(l.district, 40), lng, lat };
    }
  }
  if (Array.isArray(p.lifeEvents)) {
    out.lifeEvents = p.lifeEvents.slice(0, 50)
      .filter((e: any) => e && typeof e === 'object' && Number.isInteger(e.year) && e.year >= 1900 && e.year <= 2200)
      .map((e: any) => ({ year: e.year, text: cleanString(e.text, 200) }));
  }
  for (const k of Object.keys(out)) if (!isSafeKey(k)) delete out[k];
  if (JSON.stringify(out).length > 20000) return null;
  return out;
}
/** 记录同步校验：整表覆盖须限条数与单条体积 */
function sanitizeRecords(input: any): Record<string, unknown>[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > 2000) return null;
  for (const item of input) {
    if (item && typeof item === 'object' && JSON.stringify(item).length > 20000) return null;
    if (item && typeof item === 'object' && Object.keys(item).some(k => !isSafeKey(k))) return null;
  }
  return input;
}

// 密码哈希：scrypt（带随机盐，防彩虹表/暴力破解）。
// 格式：scrypt$<saltHex>$<hashHex>；登录时对存量旧哈希（djb2 前缀 'h'）做兼容校验，命中即升级为 scrypt。
const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, SCRYPT_KEYLEN = 64;

async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scryptAsync(pw, salt, SCRYPT_KEYLEN);
  return 'scrypt$' + salt.toString('hex') + '$' + key.toString('hex');
}

const TOKEN_TTL = 30 * 24 * 3600 * 1000;  // 30 天

function newToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function tokenMatches(user: DbUser, token: string | undefined): boolean {
  if (!token || !user.token) return false;
  if (user.tokenExpires && Date.now() > user.tokenExpires) return false;  // 过期即失效
  // 恒时比较，防时序侧信道
  const a = Buffer.from(token), b = Buffer.from(user.token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const key = await scryptAsync(pw, salt, expected.length);
    return key.length === expected.length && crypto.timingSafeEqual(key, expected);
  }
  // 旧格式（djb2 变体）：仅做兼容校验，命中后由调用方升级
  let h = 5381;
  const s = 'guanwei::' + pw;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return 'h' + h.toString(16) === stored;
}

const router = Router();

// 注册
// 云同步 upsert：本地账号（无密语）不存在时自动建档，避免因数据清理导致 404
function upsertUser(username: string): DbUser {
  const db = loadDb();
  let user = db.users.find((x: any) => x.username === username);
  if (!user) {
    user = { username, passHash: '', createdAt: Date.now(), profile: {}, samples: [], records: [], token: newToken(), tokenExpires: Date.now() + TOKEN_TTL };
    db.users.push(user);
    saveDb(db);
    console.log(`[users] 自动建档: ${username}`);
  }
  return user;
}

router.post('/register', async (req, res) => {
  const { username, password, profile } = req.body;
  const name = String(username || '').trim();
  if (name.length < 2) return res.status(400).json({ error: '名号至少二字' });
  if (name.length > 24) return res.status(400).json({ error: '名号至多二十四字' });
  if (!password || String(password).length < 8) return res.status(400).json({ error: '密语至少八位' });
  const cleanProfile = sanitizeProfile(profile) || undefined;
  // 锁内完成读-改-写：scrypt 为异步，若跨 await 会让并发注册互相覆盖（实测 30 并发仅 1 落库）
  const outcome = await withUsersDb(async (db) => {
    const users = (db as any).users as DbUser[];
    const existing = users.find(u => u.username === name);
    if (existing) {
      // 占位账号（自动建档、无密语）：升级须持有建档时发放的 claimToken，防任意抢占
      if (!existing.passHash) {
        const claimToken = String(req.body.claimToken || '');
        if (!tokenMatches(existing, claimToken)) {
          return { status: 409, body: { error: 'ACCOUNT_CLAIMED', message: '此名号已被自动建档占用，需持有建档凭据方可注册（或更换名号）' } };
        }
        existing.passHash = await hashPassword(String(password));
        existing.token = newToken();
        existing.tokenExpires = Date.now() + TOKEN_TTL;
        if (cleanProfile) existing.profile = { ...existing.profile, ...cleanProfile };
        return { status: 200, body: { ok: true, upgraded: true, token: existing.token, user: { username: existing.username, profile: existing.profile, samples: existing.samples } } };
      }
      return { status: 400, body: { error: '此名号已有人用' } };
    }
    const user: DbUser = { username: name, passHash: await hashPassword(String(password)), createdAt: Date.now(), profile: cleanProfile || {}, samples: [], records: [], token: newToken(), tokenExpires: Date.now() + TOKEN_TTL };
    users.push(user);
    return { status: 200, body: { ok: true, token: user.token, user: { username: user.username, profile: user.profile, samples: user.samples } } };
  });
  res.status(outcome.status).json(outcome.body);
});

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const name = String(username || '').trim();
  const outcome = await withUsersDb(async (db) => {
    const users = (db as any).users as DbUser[];
    const user = users.find(u => u.username === name);
    // 名号不存在也走一次等价 scrypt，避免时序差异泄露账号是否存在（P2-2）
    const ok = await verifyPassword(String(password || ''), user ? user.passHash : 'scrypt$' + '0'.repeat(32) + '$' + '0'.repeat(128));
    if (!user || !ok) return { status: 401, body: { error: '名号或密语未合' } };
    if (user.passHash && !user.passHash.startsWith('scrypt$')) {
      user.passHash = await hashPassword(String(password));
      console.log(`[users] 密码哈希已升级为 scrypt: ${user.username}`);
    }
    // 登录成功 → 轮换 token（旧 token 即失效）
    user.token = newToken();
    user.tokenExpires = Date.now() + TOKEN_TTL;
    return { status: 200, body: { ok: true, token: user.token, user: { username: user.username, profile: user.profile, samples: user.samples } } };
  });
  res.status(outcome.status).json(outcome.body);
});

// ─── 写接口鉴权中间件：云同步写操作须携带本人 token（堵「知道 username 即可写任意档案」）───
function requireOwner(req: any, res: any, next: any): void {
  const username = req.params.username;
  const token = String(req.headers['x-guanwei-token'] || '');
  const db = loadDb();
  const user = db.users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  if (!tokenMatches(user, token)) return res.status(401).json({ error: 'AUTH_REQUIRED', message: '请先入馆（登录）后再同步档案' });
  (req as any)._dbUser = user;
  next();
}

// 档案读取/更新（读他人档案也须本人 token——防止知道 username 即可窥探）
router.get('/:username/profile', requireOwner, (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  res.json({ profile: user.profile, samples: user.samples });
});

router.put('/:username/profile', requireOwner, (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  const clean = sanitizeProfile(req.body.profile);
  if (!clean) return res.status(400).json({ error: 'BAD_PROFILE', message: '档案格式不合法（字段白名单/长度/数值范围校验未通过）' });
  user.profile = { ...user.profile, ...clean };
  saveDb(db);
  res.json({ ok: true, profile: user.profile });
});

// 示例档案增删/提升
router.post('/:username/samples', requireOwner, (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  const sample = { id: 's' + Date.now(), name: String(req.body.name || '未名档案').slice(0, 40), profile: sanitizeProfile(req.body.profile) || {} };
  user.samples.push(sample);
  saveDb(db);
  res.json({ ok: true, samples: user.samples });
});

router.delete('/:username/samples/:id', requireOwner, (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  user.samples = user.samples.filter(s => s.id !== req.params.id);
  saveDb(db);
  res.json({ ok: true, samples: user.samples });
});

// 记录同步（按用户整表覆盖）
router.put('/:username/records', requireOwner, (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  const recs = sanitizeRecords(req.body.records);
  if (!recs) return res.status(400).json({ error: 'BAD_RECORDS', message: '记录格式不合法（条数上限 2000 / 单条 20KB / 禁止危险键）' });
  user.records = recs;
  saveDb(db);
  res.json({ ok: true, count: user.records.length });
});

router.get('/:username/records', requireOwner, (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  res.json({ records: user.records });
});

export default router;