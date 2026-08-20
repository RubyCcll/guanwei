import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 轻量 .env 加载（无第三方依赖）
(() => {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const envFile = path.join(__dirname, '..', '.env');
    const content = fs.readFileSync(envFile, 'utf-8');
    content.split('\n').forEach(line => {
      const m = /^\s*([A-Z_]+)\s*=\s*(.+)\s*$/.exec(line);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
    console.log('· 已加载 .env（LLM_PROVIDER=' + (process.env.LLM_PROVIDER || '未配置') + '）');
  } catch { /* 无 .env 时忽略 */ }
})();

import express from 'express';
import cors from 'cors';
import tarotRouter from './routes/tarot.js';
import aiRouter from './routes/ai.js';
import usersRouter from './routes/users.js';
import divineRouter from './routes/divine.js';
import hourRouter from './routes/hour.js';

const app = express();
const PORT = process.env.PORT || 3018;

app.use(cors());
app.use(express.json());

// 请求日志（联调排查用）
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log('[' + new Date().toLocaleTimeString() + '] ' + req.method + ' ' + req.originalUrl + ' → ' + res.statusCode);
  });
  next();
});

// /api 根信息（便于浏览器直接访问确认后端）
app.get('/api', (_req, res) => {
  res.json({
    name: '观微后端',
    status: 'ok',
    endpoints: ['/api/health', '/api/ai/providers', '/api/ai/interpret', '/api/ai/interpret/stream', '/api/users/*', '/api/divine'],
    time: Date.now(),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/tarot', tarotRouter);
app.use('/api/ai', aiRouter);
app.use('/api/users', usersRouter);
app.use('/api/divine', divineRouter);
app.use('/api', hourRouter);

app.listen(PORT, () => {
  console.log(`
  🎴 玄冥占星后端服务已启动
  
  地址: http://localhost:${PORT}
  健康检查: http://localhost:${PORT}/api/health
  塔罗API: http://localhost:${PORT}/api/tarot
  `);
});

export default app;