import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 轻量 .env 加载（无第三方依赖）
// 支持：# 注释行、空行、KEY=value（可带双引号/单引号，内嵌转义 \n \t \" \\ 与注释剥离）
(() => {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const envFile = path.join(__dirname, '..', '.env');
    const content = fs.readFileSync(envFile, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;               // 空行 / 注释行
      const eq = line.indexOf('=');
      if (eq <= 0) continue;                                      // 无等号 → 跳过
      const key = line.slice(0, eq).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;        // 非法键名 → 跳过
      if (process.env[key] !== undefined) continue;               // 环境变量优先，不覆盖
      let val = line.slice(eq + 1).trim();
      // 行内注释剥离（引号外的 # 视为注释起点）
      if (!val.startsWith('"') && !val.startsWith("'")) {
        const hash = val.indexOf(' #');
        if (hash >= 0) val = val.slice(0, hash);
      }
      // 引号包裹 → 整体剥引号 + 处理转义（仅双引号内做转义展开）
      const q = val.startsWith('"') ? '"' : val.startsWith("'") ? "'" : null;
      if (q && val.endsWith(q) && val.length >= 2) {
        val = val.slice(1, -1);
        if (q === '"') {
          val = val.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
      } else {
        val = val.trim();
      }
      process.env[key] = val;
    }
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

// ─── AI 接口限流（防 BYOK Key 被刷爆）：per-IP 令牌桶 ───
const AI_RATE_LIMIT = { windowMs: 60_000, max: 30 };  // 每分钟 30 次（本地单用户无感，公网防刷）
const aiHits = new Map<string, { count: number; resetAt: number }>();
app.use('/api/ai', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const rec = aiHits.get(ip);
  if (!rec || now > rec.resetAt) {
    aiHits.set(ip, { count: 1, resetAt: now + AI_RATE_LIMIT.windowMs });
    return next();
  }
  rec.count++;
  if (rec.count > AI_RATE_LIMIT.max) {
    return res.status(429).json({ error: 'AI_RATE_LIMITED', message: '请求过于频繁，请稍后再试' });
  }
  next();
});

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
  🎴 观微后端服务已启动
  
  地址: http://localhost:${PORT}
  健康检查: http://localhost:${PORT}/api/health
  塔罗API: http://localhost:${PORT}/api/tarot
  `);
});

export default app;