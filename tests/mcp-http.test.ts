// MCP HTTP 传输测试（WorkBuddy/ima 等国内客户端：type:"sse"|"http"）
import { describe, it, expect, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = path.join(__dirname, '..', 'packages', 'guanwei-api', 'src', 'server.ts');

let proc: ChildProcess | null = null;
const PORT = 3031;  // 测试专用端口，避免与 dev 冲突

function startApi(): Promise<void> {
  return new Promise((resolve) => {
    proc = spawn('npx', ['tsx', 'src/server.ts'], {
      cwd: path.join(__dirname, '..', 'packages', 'guanwei-api'),
      env: { ...process.env, GUANWEI_API_PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // 轮询等待就绪
    const t0 = Date.now();
    const poll = setInterval(async () => {
      try {
        const r = await fetch('http://127.0.0.1:' + PORT + '/v1/arts');
        if (r.ok) { clearInterval(poll); resolve(); }
      } catch { /* not ready */ }
      if (Date.now() - t0 > 15000) { clearInterval(poll); resolve(); }
    }, 300);
  });
}

afterAll(() => { proc?.kill(); });

describe('MCP HTTP 传输（国内客户端兼容）', () => {
  it('Streamable HTTP：initialize + tools/call 排盘', async () => {
    await startApi();
    const base = 'http://127.0.0.1:' + PORT + '/mcp';
    // initialize
    let r = await fetch(base, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    });
    const init = await r.json();
    expect(init.result.serverInfo.name).toBe('guanwei-mcp');
    // tools/call
    r = await fetch(base, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'guanwei_chart', arguments: { art: 'bazi', inputs: { y: 1993, m: 1, d: 23, hourIndex: 1, gender: '男' } } } }),
    });
    const chart = await r.json();
    expect(chart.result.content[0].text).toContain('壬申');
  }, 25000);

  it('旧版 SSE：GET /mcp/sse 返回 endpoint 事件', async () => {
    const res = await fetch('http://127.0.0.1:' + PORT + '/mcp/sse');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    // SSE 长连接不断开：读首块（endpoint 事件）即验证，然后取消
    const reader = res.body!.getReader();
    const { value } = await reader.read();
    const chunk = new TextDecoder().decode(value);
    expect(chunk).toContain('event: endpoint');
    expect(chunk).toContain('/mcp/messages');
    await reader.cancel();
  }, 15000);

  it('旧版 SSE：POST /mcp/messages 处理 tools/list', async () => {
    const r = await fetch('http://127.0.0.1:' + PORT + '/mcp/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list' }),
    });
    const d = await r.json();
    expect(d.result.tools.map((t: any) => t.name)).toContain('guanwei_chart');
  }, 15000);
});
