// MCP HTTP 传输（国内客户端：WorkBuddy / ima 等，支持 type:"sse"|"http"）
// 兼容两种模式：
//  - Streamable HTTP（新版）：POST /mcp 收 JSON-RPC（可返回 JSON 或 SSE 流）；GET /mcp 建 SSE 推送
//  - 旧版 SSE：GET /mcp/sse 建连 + POST /mcp/messages 发请求
// 协议核心复用 mcp.ts 的 handleMcpRequest（工具实现单一副本）
import { Router, type Request, type Response } from 'express';
import { handleMcpRequest } from './mcp.js';

export function mcpRouter(): Router {
  const router = Router();
  const clients = new Set<Response>();
  // 容量与闲置上限（2026-09 修 P0-2）：SSE 长连接无凭证，原实现无上限可被挂死连接占满 fd/内存
  const MAX_SSE_CLIENTS = Number(process.env.GUANWEI_API_MAX_SSE || 50);
  const SSE_IDLE_MS = Number(process.env.GUANWEI_API_SSE_IDLE_MS || 10 * 60 * 1000);

  /** 建连（含容量检查 + 闲置超时回收）；超限返回 false */
  function sseOpen(res: Response, onReady?: () => void): boolean {
    if (clients.size >= MAX_SSE_CLIENTS) {
      res.status(503).json({ error: 'SSE_LIMIT', message: '连接数已达上限，请稍后再试' });
      return false;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    onReady?.();
    res.write(': connected\n\n');
    clients.add(res);
    // 心跳 + 闲置超时：长期无活动主动断开，回收连接
    const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* ignore */ } }, 25000);
    const idle = setTimeout(() => { try { res.end(); } catch { /* ignore */ } }, SSE_IDLE_MS);
    res.on('close', () => { clients.delete(res); clearInterval(hb); clearTimeout(idle); });
    return true;
  }

  function sseInit(res: Response): void {
    sseOpen(res);
  }

  // 把响应推给所有 SSE 客户端（服务端主动消息：log/资源更新等）
  function broadcast(msg: object): void {
    const payload = 'data: ' + JSON.stringify(msg) + '\n\n';
    for (const c of clients) { try { c.write(payload); } catch { /* ignore */ } }
  }

  // ---- 旧版 SSE 传输（type:"sse"）----
  router.get('/sse', (req, res) => {
    // 按 MCP 旧规范：先发 endpoint 事件告知消息 POST 地址
    const base = req.protocol + '://' + req.get('host');
    sseOpen(res, () => {
      res.write('event: endpoint\ndata: ' + base + '/mcp/messages\n\n');
    });
  });

  router.post('/messages', (req: Request, res: Response) => {
    const body = req.body || {};
    const resp = handleMcpRequest(body);
    if (resp) res.json(resp);
    else res.status(202).end();  // 通知类：202 Accepted
  });

  // ---- Streamable HTTP（type:"http"，新版标准）----
  router.post('/', (req: Request, res: Response) => {
    const accept = String(req.headers.accept || 'application/json, text/event-stream');
    const body = req.body || {};
    const resp = handleMcpRequest(body);
    if (!resp) { res.status(202).end(); return; }  // 通知
    if (accept.includes('text/event-stream')) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write('data: ' + JSON.stringify(resp) + '\n\n');
      res.end();
    } else {
      res.json(resp);
    }
  });

  router.get('/', (req, res) => {
    sseInit(res);
  });

  return router;
}
