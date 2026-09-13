// 观微排盘 API 入口：/v1 开放接口（免费无 Key，排盘纯计算零 token）
// 协议与未来托管 API（packages/guanwei-api 演进版）同风格：/v1/chart、/v1/arts、统一错误码
// 复用：shared/core/engine/chart.ts 单一算法副本（divine 路由同源）
import express from 'express';
import chartRouter from './routes/chart.js';
import artsRouter from './routes/arts.js';
import { mcpRouter } from './mcp-http.js';

const app = express();
const PORT = Number(process.env.GUANWEI_API_PORT || 3020);
// 默认只绑本机：开放 API 无 Key，公网暴露须自行加反代/网关；容器与局域网用 GUANWEI_API_HOST=0.0.0.0 显式放开
const HOST = process.env.GUANWEI_API_HOST || '127.0.0.1';

app.use(express.json({ limit: '256kb' }));

// ─── 限流（2026-09 修 P0-2）：per-IP 令牌桶兜底，防低成本 DoS / 爬取 ───
// 默认每分钟 120 次排盘；可用 GUANWEI_API_RATE_MAX / GUANWEI_API_RATE_WINDOW_MS 调整
const RATE_MAX = Number(process.env.GUANWEI_API_RATE_MAX || 120);
const RATE_WINDOW_MS = Number(process.env.GUANWEI_API_RATE_WINDOW_MS || 60_000);
const hits = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
}, 5 * 60 * 1000).unref();
app.use((req, res, next) => {
  if (req.path === '/v1' || req.path === '/v1/') return next();  // 能力探测不计数
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return next();
  }
  rec.count++;
  if (rec.count > RATE_MAX) {
    res.setHeader('Retry-After', String(Math.ceil((rec.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试' });
  }
  next();
});

// 请求日志（access log：谁在什么时间调了哪一术，Gate 1 需求验证数据）
app.use((req, res, next) => {
  res.on('finish', () => {
    const ip = req.ip || req.socket.remoteAddress || '-';
    const line = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} ip=${ip}${(req as any).artId ? ' art=' + (req as any).artId : ''}`;
    console.log(line);
  });
  next();
});

app.get('/v1', (_req, res) => {
  res.json({ name: '观微排盘 API', version: 'v1', endpoints: ['POST /v1/chart', 'GET /v1/arts'], docs: 'https://github.com/RubyCcll/guanwei' });
});

app.use('/v1/chart', chartRouter);
app.use('/v1/arts', artsRouter);

// MCP HTTP 传输（国内客户端：WorkBuddy type:"sse"|"http" 等）
//  - POST /mcp（Streamable HTTP）· GET /mcp（SSE）
//  - GET /mcp/sse + POST /mcp/messages（旧版 SSE 传输）
app.use('/mcp', mcpRouter());

// 统一错误处理
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ error: err.code || 'INTERNAL', message: err.message || '服务未应机' });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 观微排盘 API 已启动: http://${HOST}:${PORT}/v1`);
  console.log(`   POST /v1/chart 排盘（免费） · GET /v1/arts 能力清单`);
  console.log(`   限流 ${RATE_MAX}/${RATE_WINDOW_MS / 1000}s per IP · 监听 ${HOST}（公网暴露请置 GUANWEI_API_HOST=0.0.0.0 并加反代）`);
});
