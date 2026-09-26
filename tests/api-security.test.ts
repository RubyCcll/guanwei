// 安全回归（2026-09 修 W37 报告 P0/P1）：
//  - P0-1 claimToken 不回吐已存在账号（并验证合法认领流程仍可用）
//  - P1-1 限流分桶（/api/divine 写耗尽后 /api/ai 不受影响）
//  - P1-2 过期 token 在 divine 链路同样失效
//  - P2-1 懒建档缺目录时首次起占不再 401（自动 mkdir）
//  - P0-2 开放 API：默认绑本机 + per-IP 限流 + SSE 容量上限
// 自建实例（随机冷门端口 + 临时 db.json / sqlite），不依赖宿主运行中的服务
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import { once } from 'events';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

// node:sqlite 不在 Vite 的内置模块清单中（jsdom 环境下会尝试打包）→ 用 createRequire 运行时加载
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-sec-'));
const USERS_DB = path.join(TMP, 'nested', 'data', 'db.json');   // 旧 JSON 库路径（不存在；新装不应产生）
const SQLITE = path.join(TMP, 'nested', 'data', 'guanwei.db');  // 统一 SQLite（含 users 表）；目录亦不存在 → 覆盖 P2-1
const PORT = 3198;
const BASE = `http://127.0.0.1:${PORT}`;
const API_PORT = 3199;          // 限流实例（RATE_MAX=3）
const API_BASE = `http://127.0.0.1:${API_PORT}`;
const SSE_PORT = 3197;          // SSE 容量实例（限流放宽）
const SSE_BASE = `http://127.0.0.1:${SSE_PORT}`;

const procs: ChildProcess[] = [];

async function waitReady(url: string, ms = 40000): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { const r = await fetch(url); if (r.ok) return; } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('服务未就绪: ' + url);
}

beforeAll(async () => {
  procs.push(spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: path.join(process.cwd(), 'server'),
    // 显式指定两个数据文件（短路 dataDir 的「旧路径迁移」）：避免把项目内开发数据复制进临时目录
    env: {
      ...process.env, PORT: String(PORT), HOST: '127.0.0.1',
      GUANWEI_DATA_DIR: path.join(TMP, 'nested', 'data'), GUANWEI_DB_FILE: SQLITE, GUANWEI_USERS_DB: USERS_DB,
    },
    stdio: 'ignore',
  }));
  procs.push(spawn('npx', ['tsx', 'packages/guanwei-api/src/server.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, GUANWEI_API_PORT: String(API_PORT), GUANWEI_API_HOST: '127.0.0.1', GUANWEI_API_RATE_MAX: '3' },
    stdio: 'ignore',
  }));
  procs.push(spawn('npx', ['tsx', 'packages/guanwei-api/src/server.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, GUANWEI_API_PORT: String(SSE_PORT), GUANWEI_API_HOST: '127.0.0.1', GUANWEI_API_RATE_MAX: '999', GUANWEI_API_MAX_SSE: '1' },
    stdio: 'ignore',
  }));
  await waitReady(BASE + '/api/health');
  await waitReady(API_BASE + '/v1');
  await waitReady(SSE_BASE + '/v1');
}, 90000);

afterAll(() => {
  for (const p of procs) { try { p.kill(); } catch { /* ignore */ } }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
});

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

/** 直连统一 SQLite 库（与运行中的服务并存，WAL 支持多读者 + 写锁等待） */
function withDb<T>(fn: (db: InstanceType<typeof DatabaseSync>) => T): T {
  const db = new DatabaseSync(SQLITE);
  try { db.exec('PRAGMA busy_timeout = 5000'); } catch { /* ignore */ }
  try { return fn(db); } finally { db.close(); }
}
/** 把某用户 tokenExpires 置为过去（模拟到期/旧签发） */
function expireToken(username: string, token: string): void {
  const changes = withDb(db => Number(db.prepare('UPDATE users SET token_expires = ? WHERE username = ? AND token = ?')
    .run(Date.now() - 1000, username, token).changes || 0));
  expect(changes, '应命中 1 行（用户存在且 token 一致）').toBe(1);
}
/** 读该用户的占位凭据（原测试读 db.json，现读 users 表） */
function tokenOf(username: string): string | null {
  return withDb(db => {
    const row = db.prepare('SELECT token FROM users WHERE username = ?').get(username) as any;
    return row?.token ? String(row.token) : null;
  });
}

describe('安全回归（P0/P1/P2）', () => {
  it('P2-1 干净实例：嵌套目录自动创建、统一 SQLite 建档，首次起占不 401', async () => {
    // 统一存储后启动即建库（原实现依赖首次请求才 mkdirSync，缺目录会 401）
    expect(fs.existsSync(SQLITE)).toBe(true);
    expect(fs.existsSync(USERS_DB)).toBe(false);   // 新装不再产生旧 JSON 库
    const res = await post(BASE + '/api/divine', { username: '首位来客', artId: 'liuyao', inputs: {} });
    expect(res.status).toBe(200);
    expect(tokenOf('首位来客')).toMatch(/^[0-9a-f]{64}$/);   // 账号落在 users 表
  });

  it('P0-1 claimToken 仅新建时下发；已存在账号不回吐、无法被抢占，合法认领仍可用', async () => {
    const name = '占位抢注' + Date.now().toString().slice(-4);
    // ① 首次请求（新建占位账号）→ 必须拿到 claimToken
    let res = await post(BASE + '/api/divine', { username: name, artId: 'liuyao', inputs: {} });
    expect(res.status).toBe(200);
    const first = await res.json();
    expect(typeof first.claimToken).toBe('string');
    expect(first.claimToken).toMatch(/^[0-9a-f]{64}$/);
    // ② 第二个未鉴权请求（同 username）→ 不再回吐 token（修复点）
    res = await post(BASE + '/api/divine', { username: name, artId: 'liuyao', inputs: {} });
    expect(res.status).toBe(200);
    const second = await res.json();
    expect(second.claimToken).toBeUndefined();
    // ③ 只知 username 的攻击者注册 → 409（无法抢占）
    res = await post(BASE + '/api/users/register', { username: name, password: 'hacked123' });
    expect(res.status).toBe(409);
    // ④ 持首次 claimToken 的合法用户仍可升级
    res = await post(BASE + '/api/users/register', { username: name, password: 'honest1234', claimToken: first.claimToken });
    expect(res.status).toBe(200);
    const reg = await res.json();
    expect(reg.upgraded).toBe(true);
    expect(reg.token).toBeTruthy();
  });

  it('W38 收紧：占位账号历史与解读也须凭据（匿名读 → 401，带 claimToken → 200）', async () => {
    const name = '匿名读占位' + Date.now().toString().slice(-4);
    // 起占仍允许匿名（本机来源），并下发 claimToken
    let res = await post(BASE + '/api/divine', { username: name, artId: 'liuyao', inputs: {} });
    expect(res.status).toBe(200);
    const { claimToken } = await res.json();
    expect(typeof claimToken).toBe('string');
    // 无凭据读该占位账号历史 → 401（原实现同内网来源会放行）
    res = await fetch(BASE + '/api/divine?username=' + encodeURIComponent(name));
    expect(res.status).toBe(401);
    // 带起占下发的 claimToken → 200（本地流程不受影响）
    res = await fetch(BASE + '/api/divine?username=' + encodeURIComponent(name), { headers: { 'X-Guanwei-Token': claimToken } });
    expect(res.status).toBe(200);
  });

  it('P1-2 过期 token 在 divine 链路失效（与 users 同口径）', async () => {
    const name = '过期令牌' + Date.now().toString().slice(-4);
    let res = await post(BASE + '/api/users/register', { username: name, password: 'secret123' });
    expect(res.status).toBe(200);
    const { token } = await res.json();
    // 有效期内可读历史
    res = await fetch(BASE + '/api/divine?username=' + encodeURIComponent(name), { headers: { 'X-Guanwei-Token': token } });
    expect(res.status).toBe(200);
    // 把该用户 tokenExpires 改成过去（直接改统一 SQLite 库）→ divine 链路应拒绝
    expireToken(name, token);
    res = await fetch(BASE + '/api/divine?username=' + encodeURIComponent(name), { headers: { 'X-Guanwei-Token': token } });
    expect(res.status).toBe(401);
  });

  it('P1-1 限流分桶：divine 写桶耗尽后 ai 路由不受牵连', async () => {
    const name = '限流测试' + Date.now().toString().slice(-4);
    const codes: number[] = [];
    for (let i = 0; i < 65; i++) {
      const r = await post(BASE + '/api/divine', { username: name, artId: 'liuyao', inputs: {} });
      codes.push(r.status);
      if (r.status === 429) break;
    }
    // divine 写桶（60/分）应已被打满
    expect(codes[codes.length - 1]).toBe(429);
    expect(codes.filter(c => c === 200).length).toBeGreaterThanOrEqual(50); // 桶上限 60/分（前序用例已用掉数次）
    // 关键：AI 路由独立计数 → 不因 divine 超限而 429（修复前此处必 429）
    const ai = await fetch(BASE + '/api/ai/providers');
    expect(ai.status).toBe(200);
  });
});

describe('开放 API 硬化（P0-2）', () => {
  it('per-IP 限流兜底：超过阈值返回 429 + Retry-After', async () => {
    const codes: number[] = [];
    let last: Response | null = null;
    for (let i = 0; i < 4; i++) {
      const r = await post(API_BASE + '/v1/chart', { art: 'liuyao', inputs: {} });
      codes.push(r.status);
      last = r;
    }
    expect(codes.slice(0, 3)).toEqual([200, 200, 200]);
    expect(codes[3]).toBe(429);
    expect(last!.headers.get('retry-after')).toBeTruthy();
  });

  it('使用计数（水表）：/v1/stats 仅本机可读，且统计排盘调用（无 IP / 无载荷）', async () => {
    const r1 = await post(SSE_BASE + '/v1/chart', { art: 'liuyao', inputs: {} });
    expect(r1.status).toBe(200);
    const res = await fetch(SSE_BASE + '/v1/stats');
    expect(res.status).toBe(200);
    const d = await res.json();
    expect(d.total).toBeGreaterThan(0);
    expect(d.byEndpoint['/v1/chart']).toBeGreaterThan(0);
    expect(JSON.stringify(d)).not.toContain('127.0.0.1');   // 不记录来源
  });

  it('SSE 连接数上限：超出返回 503', async () => {
    // 占用唯一一个 SSE 连接（不消费响应体，保持打开）
    const req = http.get({ host: '127.0.0.1', port: SSE_PORT, path: '/mcp' });
    await once(req, 'response');
    const second = await fetch(SSE_BASE + '/mcp');
    expect(second.status).toBe(503);
    req.destroy();
  });
});
