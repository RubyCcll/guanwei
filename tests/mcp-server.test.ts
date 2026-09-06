// MCP Server 测试：模拟 Claude Code/Cursor 客户端握手
// 用 child_process 起 mcp.ts（stdio 管道），发 JSON-RPC 断言响应
import { describe, it, expect, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP = path.join(__dirname, '..', 'packages', 'guanwei-api', 'src', 'mcp.ts');

function startMcp(): { proc: ChildProcess; call: (req: any) => Promise<any> } {
  const proc = spawn('npx', ['tsx', MCP], { stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = '';
  const pending = new Map<number, (v: any) => void>();
  let nextId = 1;
  proc.stdout!.setEncoding('utf-8');
  proc.stdout!.on('data', (chunk: string) => {
    buf += chunk;
    let idx: number;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      try {
        const d = JSON.parse(line);
        if (d.id && pending.has(d.id)) { pending.get(d.id)!(d); pending.delete(d.id); }
      } catch { /* ignore */ }
    }
  });
  const call = (req: any) => new Promise<any>((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    proc.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id, ...req }) + '\n');
  });
  return { proc, call };
}

describe('MCP Server（guanwei-mcp）', () => {
  it('握手 + 工具列表 + 排盘调用', async () => {
    const { proc, call } = startMcp();
    try {
      const init = await call({ method: 'initialize', params: {} });
      expect(init.result.serverInfo.name).toBe('guanwei-mcp');
      const list = await call({ method: 'tools/list' });
      expect(list.result.tools.map((t: any) => t.name)).toContain('guanwei_chart');
      const chart = await call({
        method: 'tools/call',
        params: { name: 'guanwei_chart', arguments: { art: 'bazi', inputs: { y: 1993, m: 1, d: 23, hourIndex: 1, gender: '男' } } },
      });
      const text = chart.result.content[0].text;
      expect(text).toContain('壬申');  // 年柱
      expect(text).toContain('排盘结果');
    } finally {
      proc.kill();
    }
  }, 15000);

  it('未知术名与未知工具的错误处理', async () => {
    const { proc, call } = startMcp();
    try {
      await call({ method: 'initialize', params: {} });
      const badArt = await call({ method: 'tools/call', params: { name: 'guanwei_chart', arguments: { art: 'bogus' } } });
      expect(badArt.result.content[0].text).toContain('术无此名');
      const badTool = await call({ method: 'tools/call', params: { name: 'nope' } });
      expect(badTool.error.code).toBe(-32602);
    } finally {
      proc.kill();
    }
  }, 15000);
});
