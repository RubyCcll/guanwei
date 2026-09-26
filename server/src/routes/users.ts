// 用户/档案/记录 API（存储：统一 SQLite users 表，见 services/usersStore）
import { Router } from 'express';
import crypto from 'crypto';
import {
  getUser, createUserIfAbsent, upgradePlaceholder, rotateToken, setPassHash,
  mergeProfile, addSample, removeSample, setRecords,
  newToken, tokenMatches, type UserRow,
} from '../services/usersStore.js';

function scryptAsync(pw: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(pw, salt, keylen, (err, key) => err ? reject(err) : resolve(key));
  });
}

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

/** 登录响应体里的用户视图（不含 token/密语） */
function publicUser(user: UserRow) {
  return { username: user.username, profile: user.profile, samples: user.samples };
}

const router = Router();

// 注册（正式注册 / 占位账号凭 claimToken 升级）
router.post('/register', async (req, res) => {
  const { username, password, profile } = req.body;
  const name = String(username || '').trim();
  if (name.length < 2) return res.status(400).json({ error: '名号至少二字' });
  if (name.length > 24) return res.status(400).json({ error: '名号至多二十四字' });
  if (!password || String(password).length < 8) return res.status(400).json({ error: '密语至少八位' });
  const cleanProfile = sanitizeProfile(profile) || undefined;

  const existing = getUser(name);
  if (existing) {
    if (existing.passHash) return res.status(400).json({ error: '此名号已有人用' });
    // 占位账号（自动建档、无密语）：升级须持有建档时发放的 claimToken，防任意抢占
    if (!tokenMatches(existing, String(req.body.claimToken || ''))) {
      return res.status(409).json({ error: 'ACCOUNT_CLAIMED', message: '此名号已被自动建档占用，需持有建档凭据方可注册（或更换名号）' });
    }
    const passHash = await hashPassword(String(password));   // 异步哈希在事务外完成
    const token = newToken();
    const expires = Date.now() + TOKEN_TTL;
    const profileMerged = { ...existing.profile, ...(cleanProfile || {}) };
    try {
      upgradePlaceholder(name, passHash, token, expires, cleanProfile);
    } catch (e: any) {
      console.error('[users] 占位账号升级失败:', e?.message || e);
      return res.status(500).json({ error: 'UPGRADE_FAILED' });
    }
    console.log(`[users] 占位账号已升级: ${name}`);
    return res.json({ ok: true, upgraded: true, token, user: { username: name, profile: profileMerged, samples: existing.samples } });
  }

  const passHash = await hashPassword(String(password));
  const token = newToken();
  const expires = Date.now() + TOKEN_TTL;
  const created = createUserIfAbsent({ username: name, passHash, profile: cleanProfile || {}, token, tokenExpires: expires });
  if (!created) return res.status(400).json({ error: '此名号已有人用' });   // 并发下被抢先
  res.json({ ok: true, token, user: { username: name, profile: cleanProfile || {}, samples: [] } });
});

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const name = String(username || '').trim();
  const user = getUser(name);
  // 名号不存在也走一次等价 scrypt，避免时序差异泄露账号是否存在（P2-2）
  const ok = await verifyPassword(String(password || ''), user ? user.passHash : 'scrypt$' + '0'.repeat(32) + '$' + '0'.repeat(128));
  if (!user || !ok) return res.status(401).json({ error: '名号或密语未合' });
  // 旧格式哈希命中后升级（哈希在事务外算，避免事务内 await）
  const upgraded = user.passHash && !user.passHash.startsWith('scrypt$') ? await hashPassword(String(password)) : null;
  if (upgraded) console.log(`[users] 密码哈希已升级为 scrypt: ${name}`);
  // 登录成功 → 轮换 token（旧 token 即失效）
  const token = newToken();
  const expires = Date.now() + TOKEN_TTL;
  const fresh = getUser(name);
  if (upgraded) setPassHash(name, upgraded);
  rotateToken(name, token, expires);
  res.json({ ok: true, token, user: publicUser(fresh || user) });
});

// ─── 写接口鉴权中间件：云同步写操作须携带本人 token（堵「知道 username 即可写任意档案」）───
function requireOwner(req: any, res: any, next: any): void {
  const username = req.params.username;
  const token = String(req.headers['x-guanwei-token'] || '');
  const user = getUser(username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  if (!tokenMatches(user, token)) return res.status(401).json({ error: 'AUTH_REQUIRED', message: '请先入馆（登录）后再同步档案' });
  req._dbUser = user;
  next();
}

// 档案读取/更新（读他人档案也须本人 token——防止知道 username 即可窥探）
router.get('/:username/profile', requireOwner, (req, res) => {
  const user = getUser(req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  res.json({ profile: user.profile, samples: user.samples });
});

router.put('/:username/profile', requireOwner, (req, res) => {
  const clean = sanitizeProfile(req.body.profile);
  if (!clean) return res.status(400).json({ error: 'BAD_PROFILE', message: '档案格式不合法（字段白名单/长度/数值范围校验未通过）' });
  const profile = mergeProfile(req.params.username, clean);
  if (!profile) return res.status(404).json({ error: '馆中无此人' });
  res.json({ ok: true, profile });
});

// 示例档案增删
router.post('/:username/samples', requireOwner, (req, res) => {
  const sample = { id: 's' + Date.now(), name: String(req.body.name || '未名档案').slice(0, 40), profile: sanitizeProfile(req.body.profile) || {} };
  const samples = addSample(req.params.username, sample);
  if (!samples) return res.status(404).json({ error: '馆中无此人' });
  res.json({ ok: true, samples });
});

router.delete('/:username/samples/:id', requireOwner, (req, res) => {
  const samples = removeSample(req.params.username, req.params.id);
  if (!samples) return res.status(404).json({ error: '馆中无此人' });
  res.json({ ok: true, samples });
});

// 记录同步（按用户整表覆盖）
router.put('/:username/records', requireOwner, (req, res) => {
  const recs = sanitizeRecords(req.body.records);
  if (!recs) return res.status(400).json({ error: 'BAD_RECORDS', message: '记录格式不合法（条数上限 2000 / 单条 20KB / 禁止危险键）' });
  const count = setRecords(req.params.username, recs);
  if (count === null) return res.status(404).json({ error: '馆中无此人' });
  res.json({ ok: true, count });
});

router.get('/:username/records', requireOwner, (req, res) => {
  const user = getUser(req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  res.json({ records: user.records });
});

export default router;
