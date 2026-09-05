// 用户/档案/记录 API（本地 JSON 文件存储，供前后端联调）
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

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

function loadDb(): Db {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); }
  catch { return { users: [] }; }
}

function saveDb(db: Db): void {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
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
  if (!password || String(password).length < 4) return res.status(400).json({ error: '密语至少四位' });
  const db = loadDb();
  const existing = db.users.find(u => u.username === name);
  if (existing) {
    // 占位账号（自动建档、无密语）：升级须持有建档时发放的 claimToken，防任意抢占
    if (!existing.passHash) {
      const claimToken = String(req.body.claimToken || '');
      if (!tokenMatches(existing, claimToken)) {
        return res.status(409).json({ error: 'ACCOUNT_CLAIMED', message: '此名号已被自动建档占用，需持有建档凭据方可注册（或更换名号）' });
      }
      existing.passHash = await hashPassword(String(password));
      existing.token = newToken();
      existing.tokenExpires = Date.now() + TOKEN_TTL;
      if (profile) existing.profile = { ...existing.profile, ...profile };
      saveDb(db);
      return res.json({ ok: true, upgraded: true, token: existing.token, user: { username: existing.username, profile: existing.profile, samples: existing.samples } });
    }
    return res.status(400).json({ error: '此名号已有人用' });
  }
  const user: DbUser = { username: name, passHash: await hashPassword(String(password)), createdAt: Date.now(), profile: profile || {}, samples: [], records: [], token: newToken(), tokenExpires: Date.now() + TOKEN_TTL };
  db.users.push(user);
  saveDb(db);
  res.json({ ok: true, token: user.token, user: { username: user.username, profile: user.profile, samples: user.samples } });
});

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = loadDb();
  const user = db.users.find(u => u.username === String(username || '').trim());
  if (!user) return res.status(401).json({ error: '名号或密语未合' });
  const ok = await verifyPassword(String(password || ''), user.passHash);
  if (!ok) return res.status(401).json({ error: '名号或密语未合' });
  // 旧哈希命中 → 升级为 scrypt 存储
  if (user.passHash && !user.passHash.startsWith('scrypt$')) {
    user.passHash = await hashPassword(String(password));
    saveDb(db);
    console.log(`[users] 密码哈希已升级为 scrypt: ${user.username}`);
  }
  // 登录成功 → 轮换 token（旧 token 即失效；防泄露长期有效）
  user.token = newToken();
  user.tokenExpires = Date.now() + TOKEN_TTL;
  saveDb(db);
  res.json({ ok: true, token: user.token, user: { username: user.username, profile: user.profile, samples: user.samples } });
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
  user.profile = req.body.profile || user.profile;
  saveDb(db);
  res.json({ ok: true, profile: user.profile });
});

// 示例档案增删/提升
router.post('/:username/samples', requireOwner, (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  const sample = { id: 's' + Date.now(), name: String(req.body.name || '未名档案'), profile: req.body.profile || {} };
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
  user.records = Array.isArray(req.body.records) ? req.body.records : [];
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