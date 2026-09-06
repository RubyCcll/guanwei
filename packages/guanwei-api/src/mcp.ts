// 观微 MCP Server：Claude Code / Cursor 等 agent 可直接调用九术排盘
// 零依赖实现 MCP stdio（JSON-RPC 2.0 over stdin/stdout）：
//   initialize → tools/list → tools/call（guanwei_chart）
// 复用 shared/core/engine/chart.ts 单一算法副本
import { chartCalc, CHART_ARTS, CHART_INPUT_SCHEMA } from '../../../shared/core/engine/chart.js';

const ART_NAMES: Record<string, string> = {
  bazi: '四柱八字', ziwei: '紫微斗数', astrology: '古典星盘',
  qimen: '奇门遁甲', meihua: '梅花易数', liuyao: '六爻',
  liuren: '大六壬', xiaoliuren: '小六壬', tarot: '塔罗',
};

// ─── MCP 协议 ───
export interface McpRequest { jsonrpc: '2.0'; id?: number | string | null; method: string; params?: any }
export interface McpResponse { jsonrpc: '2.0'; id: number | string | null; result?: any; error?: { code: number; message: string } }

function send(msg: McpResponse): void {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function toolResult(content: string): any {
  return { content: [{ type: 'text', text: content }] };
}

// tools/list：声明 guanwei_chart
function toolsList(): any {
  const arts = CHART_ARTS.map(id => ({ id, name: ART_NAMES[id] || id }));
  return {
    tools: [{
      name: 'guanwei_chart',
      description: '九术排盘（四柱八字/紫微斗数/古典星盘/奇门遁甲/梅花易数/六爻/大六壬/小六壬/塔罗）。输入 art + inputs 返回完整盘面结果。可用的 art 与 inputs 字段：' + JSON.stringify(arts),
      inputSchema: {
        type: 'object',
        properties: {
          art: { type: 'string', description: '术名：' + CHART_ARTS.join('/') },
          inputs: {
            type: 'object',
            description: '该术输入参数（见各术 schema）',
          },
        },
        required: ['art'],
      },
    }],
  };
}

// tools/call：执行排盘
function toolsCall(params: any): { result?: any; error?: { code: number; message: string } } {
  const name = params?.name;
  const args = params?.arguments || {};
  if (name !== 'guanwei_chart') {
    return { error: { code: -32602, message: '未知工具: ' + name } };
  }
  const art = String(args.art || '');
  if (!CHART_ARTS.includes(art as any)) {
    return { result: toolResult('❌ 术无此名: ' + art + '。可用：' + CHART_ARTS.join(' / ')) };
  }
  try {
    const r = chartCalc(art, args.inputs || {});
    return { result: toolResult('【' + (ART_NAMES[art] || art) + ' 排盘结果】\n' + JSON.stringify(r, null, 1)) };
  } catch (e: any) {
    return { result: toolResult('❌ 排盘失败：' + (e?.message || e)) };
  }
}

// ─── 协议核心：处理单个 JSON-RPC 请求 → 返回响应对象（stdio 与 HTTP/SSE 共用）───
export function handleMcpRequest(req: McpRequest): McpResponse | null {
  if (req.method === 'initialize') {
    return { jsonrpc: '2.0', id: req.id ?? null, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'guanwei-mcp', version: '1.3.0' } } };
  }
  if (req.method === 'notifications/initialized' || req.method === 'notifications/cancelled') {
    return null;  // 通知无响应
  }
  if (req.method === 'tools/list') {
    return { jsonrpc: '2.0', id: req.id ?? null, result: toolsList() };
  }
  if (req.method === 'tools/call') {
    const r = toolsCall(req.params);
    if (r.error) return { jsonrpc: '2.0', id: req.id ?? null, error: r.error };
    return { jsonrpc: '2.0', id: req.id ?? null, result: r.result };
  }
  if (req.method === 'ping') {
    return { jsonrpc: '2.0', id: req.id ?? null, result: {} };
  }
  return { jsonrpc: '2.0', id: req.id ?? null, error: { code: -32601, message: '未知方法: ' + req.method } };
}

// ─── stdio 主循环（本地 agent：Claude Code / Cursor）───
// 仅直接运行（npx tsx src/mcp.ts）时启用；被 HTTP 网关 import 时不挂 stdin
const isDirectRun = process.argv[1] && process.argv[1].endsWith('mcp.ts');
if (isDirectRun) {
let buf = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk: string) => {
  buf += chunk;
  let idx: number;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let req: McpRequest;
    try { req = JSON.parse(line); } catch { continue; }
    const resp = handleMcpRequest(req);
    if (resp) send(resp);
  }
});
process.stdin.on('end', () => { process.exit(0); });
}
