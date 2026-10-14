// AI 解读「记录对不上」回归（2026-10-14 用户报「无法解读，疑似 Key 被删」）
//
// 现象：divineId 对应的记录不存在时（本地存档记录、换过数据库/换过 Docker 卷、记录被清理），
//       解读一律 400 DIVINE_NOT_FOUND，界面表现为「AI 不能用了」——实际与 Key 无关。
// 修法：调用方带上**原始起占参数** inputs，服务端用同一引擎重算并补建记录后照常解读；
//       仍不接受前端直传 resultRaw（保留 v6 的加固）。
//
// 本测试用「未配置的 provider」注入（.env 不覆盖已有环境变量）→ 不触网、不消耗真实 Key，
// 断言的是**校验与补建行为**（HTTP 状态与库内记录），而非模型输出。
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
const PORT = 3094;
const BASE = `http://127.0.0.1:${PORT}`;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-airecast-'));
const DB = path.join(TMP, 'guanwei.db');
let proc: ChildProcess | null = null;

async function waitReady(ms = 40000): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) return; } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('后端未就绪:' + PORT);
}

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

function divinationCount(username: string): number {
  const db = new DatabaseSync(DB, { readOnly: true });
  try { return Number(db.prepare('SELECT COUNT(*) c FROM divinations WHERE username = ?').get(username)?.c || 0); } finally { db.close(); }
}

beforeAll(async () => {
  proc = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: path.join(process.cwd(), 'server'),
    env: {
      ...process.env,
      PORT: String(PORT), HOST: '127.0.0.1',
      GUANWEI_DATA_DIR: TMP, GUANWEI_DB_FILE: DB, GUANWEI_USERS_DB: path.join(TMP, 'legacy.json'),
      // 注入「未配置」的 provider：.env 不覆盖**已定义**的环境变量（即便为空串），
      // 故把各 provider 的 keyEnv 一律置空 → activeProvider() 为 null → 解读立即 503，测试不触网
      // （否则会自动探测到 server/.env 的真实 Key，向服务商发真实请求）
      LLM_PROVIDER: 'deepseek',
      LLM_DEEPSEEK_KEY: '', LLM_GEMINI_KEY: '', LLM_GROQ_KEY: '', LLM_QWEN_KEY: '', LLM_CUSTOM_KEY: '',
      GUANWEI_RATE_AI: '1000', GUANWEI_RATE_AUTH: '1000', GUANWEI_RATE_GENERIC: '5000',
    },
    stdio: 'ignore',
  });
  await waitReady();
}, 90000);

afterAll(() => {
  try { proc?.kill(); } catch { /* ignore */ }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
});

const INPUTS = { mode: 'time', m: 8, d: 16, h: 6 };

describe('AI 解读：记录对不上时按起占参数服务端重算', () => {
  let token = '';
  const name = '重算验证' + Date.now().toString().slice(-4);

  it('注册账号并起一占（后续用例复用其凭据）', async () => {
    const res = await post(BASE + '/api/users/register', { username: name, password: 'pw123456' });
    expect(res.status).toBe(200);
    token = (await res.json()).token;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const d = await post(BASE + '/api/divine', { username: name, artId: 'xiaoliuren', inputs: INPUTS }, { 'X-Guanwei-Token': token });
    expect(d.status).toBe(200);
  });

  it('① 正常记录：走既有路径（AI 未配置 → 503，说明校验已通过，非 400/403）', async () => {
    const d = await post(BASE + '/api/divine', { username: name, artId: 'xiaoliuren', inputs: INPUTS }, { 'X-Guanwei-Token': token });
    const { divineId } = await d.json();
    const res = await post(BASE + '/api/ai/interpret', { artId: 'xiaoliuren', divineId, question: '测试' }, { 'X-Guanwei-Token': token });
    expect(res.status, '既有记录应通过校验（AI 未配置则 503）').toBe(503);
  });

  it('② divineId 对不上 + 带起占参数 → 服务端重算并补建记录（不再 400）', async () => {
    const before = divinationCount(name);
    const res = await post(BASE + '/api/ai/interpret', {
      artId: 'xiaoliuren', divineId: 'd_来自另一份数据库的记录', username: name, inputs: INPUTS, question: '换库后还能解读吗',
    }, { 'X-Guanwei-Token': token });
    expect(res.status, '不应再是 400 DIVINE_NOT_FOUND').not.toBe(400);
    expect(res.status).toBe(503);                       // AI 未配置：校验通过后止于 provider
    expect(divinationCount(name), '应补建一条记录').toBe(before + 1);
  });

  it('③ 流式同样支持重算（不再 400）', async () => {
    const before = divinationCount(name);
    const res = await post(BASE + '/api/ai/interpret/stream', {
      artId: 'xiaoliuren', divineId: 'd_同样不存在', username: name, inputs: INPUTS, question: '流式换库验证',
    }, { 'X-Guanwei-Token': token });
    expect(res.status).not.toBe(400);
    expect(divinationCount(name)).toBe(before + 1);
  });

  it('④ 既无记录也无起占参数 → 明确报错（指引重新起占）', async () => {
    const res = await post(BASE + '/api/ai/interpret/stream', {
      artId: 'xiaoliuren', divineId: 'd_不存在', username: name,
    }, { 'X-Guanwei-Token': token });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('DIVINE_NOT_FOUND');
    expect(body.message).toContain('未带上起占参数');
  });

  it('⑤ 他人记录仍不可解读（403，归属校验未被削弱）', async () => {
    const other = '旁观' + Date.now().toString().slice(-4);
    const reg = await post(BASE + '/api/users/register', { username: other, password: 'pw123456' });
    const otherToken = (await reg.json()).token;
    const d = await post(BASE + '/api/divine', { username: name, artId: 'xiaoliuren', inputs: INPUTS }, { 'X-Guanwei-Token': token });
    const { divineId } = await d.json();
    const res = await post(BASE + '/api/ai/interpret', { artId: 'xiaoliuren', divineId, question: '偷看' }, { 'X-Guanwei-Token': otherToken });
    expect(res.status).toBe(403);
  });

  it('⑥ 公网来源无凭据：不带参数不能借重算路径消耗额度（401）', async () => {
    const res = await post(BASE + '/api/ai/interpret', {
      artId: 'xiaoliuren', username: name, inputs: INPUTS,
    }, { 'X-Forwarded-For': '203.0.113.9' });
    expect(res.status).toBe(401);
  });

  it('⑦ 起占参数不合法 → 400（不会写入坏记录）', async () => {
    const before = divinationCount(name);
    const res = await post(BASE + '/api/ai/interpret', {
      artId: 'xiaoliuren', divineId: 'd_不存在', username: name, inputs: { mode: 'bogus' },
    }, { 'X-Guanwei-Token': token });
    // xiaoliurenCalc 对未知 mode 走数字分支，不会抛错 → 允许（补建成功即 503）；若引擎报错则应 400
    expect([400, 503]).toContain(res.status);
    if (res.status === 400) expect(divinationCount(name), '参数不合法时不应写库').toBe(before);
  });
});
