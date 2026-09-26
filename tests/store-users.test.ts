// 存储合并回归（2026-09 W38 架构欠债 #4）：用户库 JSON → 统一 SQLite
// 覆盖：
//  ① 旧 db.json 在 users 表为空时一次性导入（密语/档案/示例/记录/凭据全保留，原文件不删）
//  ② 并发注册不再丢档（原缺陷：30 并发注册仅 1 个落库）
//  ③ 并发占位建档只下发一个 claimToken（原缺陷：竞态下可能重复建档/多份凭据）
//  ④ 已导入过则不重复导入（幂等）
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

// node:sqlite 不在 Vite 的内置模块清单中（jsdom 环境下会尝试打包）→ 用 createRequire 运行时加载
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

const PORT = 3095;
const BASE = `http://127.0.0.1:${PORT}`;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-store-'));
const JSON_DB = path.join(TMP, 'db.json');
const SQLITE = path.join(TMP, 'guanwei.db');
let proc: ChildProcess | null = null;

/** 造一份旧版 db.json（含占位账号与正式账号各一） */
function legacyJsonFixture() {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync('legacypass1', salt, 64);
  return {
    users: [
      {
        username: '旧档正式', passHash: 'scrypt$' + salt.toString('hex') + '$' + key.toString('hex'),
        createdAt: 1700000000000,
        profile: { birthDate: '1991-08-17', birthTime: '16:30', gender: '男', location: { province: '山东', city: '德州', district: '武城县', lng: 116.07, lat: 37.21 } },
        samples: [{ id: 's1', name: '示例甲', profile: { gender: '女' } }],
        records: [{ id: 'r1', kind: 'liuyao' }],
        token: 'a'.repeat(64), tokenExpires: Date.now() + 86400000,
      },
      {
        username: '旧档占位', passHash: '', createdAt: 1700000001000,
        profile: {}, samples: [], records: [],
        token: 'b'.repeat(64), tokenExpires: Date.now() + 86400000,
      },
    ],
  };
}

async function waitReady(ms = 40000): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) return; } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('后端未就绪:' + PORT);
}

function withDb<T>(fn: (db: InstanceType<typeof DatabaseSync>) => T): T {
  const db = new DatabaseSync(SQLITE);
  try { db.exec('PRAGMA busy_timeout = 5000'); } catch { /* ignore */ }
  try { return fn(db); } finally { db.close(); }
}

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

beforeAll(async () => {
  fs.writeFileSync(JSON_DB, JSON.stringify(legacyJsonFixture(), null, 2));
  proc = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: path.join(process.cwd(), 'server'),
    env: {
      ...process.env, PORT: String(PORT), HOST: '127.0.0.1', GUANWEI_DATA_DIR: TMP,
      GUANWEI_DB_FILE: SQLITE, GUANWEI_USERS_DB: JSON_DB,
      GUANWEI_RATE_AUTH: '1000', GUANWEI_RATE_DIVINE: '5000', GUANWEI_RATE_GENERIC: '5000',
    },
    stdio: 'ignore',
  });
  await waitReady();
}, 90000);

afterAll(() => {
  try { proc?.kill(); } catch { /* ignore */ }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('存储合并：JSON → 统一 SQLite', () => {
  it('① 旧 db.json 启动即导入，档案/示例/记录/密语/凭据全保留', async () => {
    // 启动时已导入（users 表非空即为证据）
    const rows = withDb(db => db.prepare('SELECT COUNT(*) AS c FROM users').get() as any);
    expect(Number(rows.c)).toBe(2);
    // 旧密语可登录（scrypt 哈希原样迁移）
    let res = await post(BASE + '/api/users/login', { username: '旧档正式', password: 'legacypass1' });
    expect(res.status).toBe(200);
    const { token, user } = await res.json();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(user.profile.birthDate).toBe('1991-08-17');
    expect(user.profile.location.district).toBe('武城县');
    // 登录已轮换 token：旧 token 失效、新 token 可读档案与记录
    res = await fetch(BASE + '/api/users/旧档正式/profile', { headers: { 'X-Guanwei-Token': 'a'.repeat(64) } });
    expect(res.status).toBe(401);
    res = await fetch(BASE + '/api/users/旧档正式/profile', { headers: { 'X-Guanwei-Token': token } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.samples).toHaveLength(1);
    expect(body.samples[0].name).toBe('示例甲');
    res = await fetch(BASE + '/api/users/旧档正式/records', { headers: { 'X-Guanwei-Token': token } });
    expect((await res.json()).records).toEqual([{ id: 'r1', kind: 'liuyao' }]);
    // 占位账号的凭据同样迁入（可用旧 claimToken 认领）
    res = await post(BASE + '/api/users/register', { username: '旧档占位', password: 'newpass123', claimToken: 'b'.repeat(64) });
    expect(res.status).toBe(200);
    expect((await res.json()).upgraded).toBe(true);
    // 旧 JSON 文件保留（可回滚），未再被读写
    expect(fs.existsSync(JSON_DB)).toBe(true);
    expect(JSON.parse(fs.readFileSync(JSON_DB, 'utf-8')).users).toHaveLength(2);
  });

  it('② 30 并发注册全部落库（原缺陷：仅 1 个存活）', async () => {
    const names = Array.from({ length: 30 }, (_, i) => `并发${Date.now().toString().slice(-6)}_${i}`);
    const codes = await Promise.all(names.map(n => post(BASE + '/api/users/register', { username: n, password: 'pw123456' }).then(r => r.status)));
    expect(codes.filter(c => c === 200)).toHaveLength(30);
    const found = withDb(db => names.map(n => db.prepare('SELECT COUNT(*) AS c FROM users WHERE username = ?').get(n) as any).reduce((a, r) => a + Number(r.c), 0));
    expect(found).toBe(30);
  });

  it('③ 并发占位建档：只发一份 claimToken，且只建一行', async () => {
    const name = '并发占位' + Date.now().toString().slice(-6);
    const results = await Promise.all(Array.from({ length: 20 }, () =>
      post(BASE + '/api/divine', { username: name, artId: 'liuyao', inputs: {} }).then(r => r.json())));
    const withToken = results.filter((r: any) => typeof r.claimToken === 'string' && r.claimToken);
    expect(withToken).toHaveLength(1);                                   // 恰一份凭据下发（P0-1）
    expect(withToken[0].claimToken).toMatch(/^[0-9a-f]{64}$/);
    const rows = withDb(db => db.prepare('SELECT token FROM users WHERE username = ?').all(name) as any[]);
    expect(rows).toHaveLength(1);
    expect(rows[0].token).toBe(withToken[0].claimToken);                 // 库中凭据 = 下发的凭据
  });

  it('⑤ 同一毫秒建立的记录，分页顺序确定（rowid 兜底，原按 uuid 比较随机）', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-order-'));
    process.env.GUANWEI_DB_FILE = path.join(dir, 'guanwei.db');
    process.env.GUANWEI_USERS_DB = path.join(dir, 'nope.json');
    const store = await import('../server/src/services/divineStore.js');
    const ids: string[] = [];
    for (let i = 0; i < 12; i++) ids.push(store.createDivination({ username: '排序', artId: 'liuyao', kind: 'zhanwen', params: {}, resultRaw: {} }).id);
    // 分页两次读取，顺序必须一致且为「后建在前」
    const first = store.listDivinations('排序', 1, 12).list.map((x: any) => x.divineId);
    const again = store.listDivinations('排序', 1, 12).list.map((x: any) => x.divineId);
    expect(first).toEqual(again);
    expect(first[0]).toBe(ids[ids.length - 1]);
    expect(first[first.length - 1]).toBe(ids[0]);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('④ 导入幂等：重启不会重复导入，也不会覆盖已轮换的凭据', async () => {
    // 记下当前（已被①轮换过的）token，重启后应保持
    const before = withDb(db => (db.prepare('SELECT token FROM users WHERE username = ?').get('旧档正式') as any).token);
    expect(before).toMatch(/^[0-9a-f]{64}$/);
    const again: ChildProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: path.join(process.cwd(), 'server'),
      env: { ...process.env, PORT: String(PORT + 1), HOST: '127.0.0.1', GUANWEI_DATA_DIR: TMP, GUANWEI_DB_FILE: SQLITE, GUANWEI_USERS_DB: JSON_DB },
      stdio: 'ignore',
    });
    try {
      const deadline = Date.now() + 40000;
      while (Date.now() < deadline) {
        try { const r = await fetch(`http://127.0.0.1:${PORT + 1}/api/health`); if (r.ok) break; } catch { /* retry */ }
        await new Promise(r => setTimeout(r, 300));
      }
      const after = withDb(db => (db.prepare('SELECT token FROM users WHERE username = ?').get('旧档正式') as any).token);
      expect(after).toBe(before);
      const cnt = withDb(db => Number((db.prepare('SELECT COUNT(*) AS c FROM users').get() as any).c));
      expect(cnt).toBe(30 + 2 + 1);   // 两旧档 + 30 并发 + 1 占位（无重复行）
    } finally { try { again.kill(); } catch { /* ignore */ } }
  });
});
