// 观微排盘 API 入口：/v1 开放接口（免费无 Key，排盘纯计算零 token）
// 协议与未来托管 API（packages/guanwei-api 演进版）同风格：/v1/chart、/v1/arts、统一错误码
// 复用：shared/core/engine/chart.ts 单一算法副本（divine 路由同源）
import express from 'express';
import chartRouter from './routes/chart.js';
import artsRouter from './routes/arts.js';
import { mcpRouter } from './mcp-http.js';

const app = express();
const PORT = Number(process.env.GUANWEI_API_PORT || 3020);

app.use(express.json({ limit: '256kb' }));

// 请求日志（access log：谁在什么时间调了哪一术，Gate 1 需求验证数据）
app.use((req, res, next) => {
  res.on('finish', () => {
    const line = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode}${(req as any).artId ? ' art=' + (req as any).artId : ''}`;
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

app.listen(PORT, () => {
  console.log(`🚀 观微排盘 API 已启动: http://127.0.0.1:${PORT}/v1`);
  console.log(`   POST /v1/chart 排盘（免费） · GET /v1/arts 能力清单`);
});
