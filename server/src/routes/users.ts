// 用户/档案/记录 API（本地 JSON 文件存储，供前后端联调）
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

interface DbUser {
  username: string;
  passHash: string;
  createdAt: number;
  profile: Record<string, unknown>;
  samples: { id: string; name: string; profile: Record<string, unknown> }[];
  records: Record<string, unknown>[];
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

function hash(pw: string): string {
  let h = 5381;
  const s = 'guanwei::' + pw;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return 'h' + h.toString(16);
}

const router = Router();

// 注册
// 云同步 upsert：本地账号（无密语）不存在时自动建档，避免因数据清理导致 404
function upsertUser(username: string): DbUser {
  const db = loadDb();
  let user = db.users.find((x: any) => x.username === username);
  if (!user) {
    user = { username, passHash: '', createdAt: Date.now(), profile: {}, samples: [], records: [] };
    db.users.push(user);
    saveDb(db);
    console.log(`[users] 自动建档: ${username}`);
  }
  return user;
}

router.post('/register', (req, res) => {
  const { username, password, profile } = req.body;
  const name = String(username || '').trim();
  if (name.length < 2) return res.status(400).json({ error: '名号至少二字' });
  if (!password || String(password).length < 4) return res.status(400).json({ error: '密语至少四位' });
  const db = loadDb();
  const existing = db.users.find(u => u.username === name);
  if (existing) {
    // 云同步自动建档的占位账号（无密语）可被正式注册升级
    if (!existing.passHash) {
      existing.passHash = hash(String(password));
      if (profile) existing.profile = { ...existing.profile, ...profile };
      saveDb(db);
      return res.json({ ok: true, upgraded: true, user: { username: existing.username, profile: existing.profile, samples: existing.samples } });
    }
    return res.status(400).json({ error: '此名号已有人用' });
  }
  const user: DbUser = { username: name, passHash: hash(String(password)), createdAt: Date.now(), profile: profile || {}, samples: [], records: [] };
  db.users.push(user);
  saveDb(db);
  res.json({ ok: true, user: { username: user.username, profile: user.profile, samples: user.samples } });
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = loadDb();
  const user = db.users.find(u => u.username === String(username || '').trim());
  if (!user || user.passHash !== hash(String(password || ''))) return res.status(401).json({ error: '名号或密语未合' });
  res.json({ ok: true, user: { username: user.username, profile: user.profile, samples: user.samples } });
});

// 档案读取/更新
router.get('/:username/profile', (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  res.json({ profile: user.profile, samples: user.samples });
});

router.put('/:username/profile', (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  user.profile = req.body.profile || user.profile;
  saveDb(db);
  res.json({ ok: true, profile: user.profile });
});

// 示例档案增删/提升
router.post('/:username/samples', (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  const sample = { id: 's' + Date.now(), name: String(req.body.name || '未名档案'), profile: req.body.profile || {} };
  user.samples.push(sample);
  saveDb(db);
  res.json({ ok: true, samples: user.samples });
});

router.delete('/:username/samples/:id', (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  user.samples = user.samples.filter(s => s.id !== req.params.id);
  saveDb(db);
  res.json({ ok: true, samples: user.samples });
});

// 记录同步（按用户整表覆盖）
router.put('/:username/records', (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  user.records = Array.isArray(req.body.records) ? req.body.records : [];
  saveDb(db);
  res.json({ ok: true, count: user.records.length });
});

router.get('/:username/records', (req, res) => {
  const db = loadDb();
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: '馆中无此人' });
  res.json({ records: user.records });
});

export default router;