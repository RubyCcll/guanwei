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

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-sec-'));
const USERS_DB = path.join(TMP, 'nested', 'data', 'db.json');   // 目录亦不存在 → 覆盖 P2-1
const SQLITE = path.join(TMP, 'guanwei.db');
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
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', GUANWEI_USERS_DB: USERS_DB, GUANWEI_DB_FILE: SQLITE },
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

describe('安全回归（P0/P1/P2）', () => {
  it('P2-1 干净实例首次起占：目录/文件皆不存在也自动建档', async () => {
    expect(fs.existsSync(USERS_DB)).toBe(false);
    const res = await post(BASE + '/api/divine', { username: '首位来客', artId: 'liuyao', inputs: {} });
    expect(res.status).toBe(200);
    expect(fs.existsSync(USERS_DB)).toBe(true);   // mkdirSync + 建档成功
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

  it('P1-2 过期 token 在 divine 链路失效（与 users 同口径）', async () => {
    const name = '过期令牌' + Date.now().toString().slice(-4);
    let res = await post(BASE + '/api/users/register', { username: name, password: 'secret123' });
    expect(res.status).toBe(200);
    const { token } = await res.json();
    // 有效期内可读历史
    res = await fetch(BASE + '/api/divine?username=' + encodeURIComponent(name), { headers: { 'X-Guanwei-Token': token } });
    expect(res.status).toBe(200);
    // 把该用户 tokenExpires 改成过去 → divine 链路应拒绝
    const db = JSON.parse(fs.readFileSync(USERS_DB, 'utf-8'));
    const u = db.users.find((x: any) => x.username === name);
    u.tokenExpires = Date.now() - 1000;
    fs.writeFileSync(USERS_DB, JSON.stringify(db, null, 2));
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

  it('SSE 连接数上限：超出返回 503', async () => {
    // 占用唯一一个 SSE 连接（不消费响应体，保持打开）
    const req = http.get({ host: '127.0.0.1', port: SSE_PORT, path: '/mcp' });
    await once(req, 'response');
    const second = await fetch(SSE_BASE + '/mcp');
    expect(second.status).toBe(503);
    req.destroy();
  });
});
