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
      // 注：仅支持「整行注释」（行首 #）。不做行内注释剥离——API Key 可能含「 #」，
      // 原实现会把密钥截断且仍报「已配置」，故障延后到运行期 401（2026-09 修 P1-5）
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
import { DATA_DIR } from './services/dataDir.js';

const app = express();
const PORT = process.env.PORT || 3018;
// 默认只绑本机（个人自托管场景）；容器/局域网部署用 HOST=0.0.0.0 显式放开
const HOST = process.env.HOST || '127.0.0.1';
// 反代（nginx/Docker）后取真实客户端 IP：否则限流键恒为网关地址，退化为全站单桶（2026-09 修 P1-2）
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

// CORS：默认仅同源/本机（原 `cors()` 全开，配合匿名占位账号放行可被任意站点跨源读取，2026-09 修 P2-1）
// 需要放开时设 GUANWEI_ALLOWED_ORIGINS=https://a.com,https://b.com
const ALLOWED = (process.env.GUANWEI_ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
app.use(cors({
  origin(origin: string | undefined, cb: (e: Error | null, ok?: boolean) => void) {
    if (!origin) return cb(null, true);                       // 同源/服务端调用
    if (ALLOWED.length === 0) {
      const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
      return cb(null, local);                                  // 未配置 → 仅本机前端
    }
    return cb(null, ALLOWED.includes(origin));
  },
}));
app.use(express.json());

// ─── 限流（防 BYOK Key 被刷爆 / 无限建占刷库）：per-IP + per-路由组 令牌桶 ───
// /api/ai：每分钟 30 次（AI 烧 token，重点防护）
// /api/divine 写：每分钟 60 次（防无限建占刷 SQLite）
// 2026-09 修 P1-1：桶键含路由组——原实现单 Map 仅按 IP 计数，
// 用户连续起占 31 次会把首个 AI 解读请求顶成 429（跨路由互相误伤）
const RATE_ENV = (k: string, d: number) => Number(process.env[k] || d);
const AI_RATE_LIMIT = { windowMs: 60_000, max: RATE_ENV('GUANWEI_RATE_AI', 30) };
const DIVINE_RATE_LIMIT = { windowMs: 60_000, max: RATE_ENV('GUANWEI_RATE_DIVINE', 60) };
const hits = new Map<string, { count: number; resetAt: number }>();
// 定期清理过期桶（防内存泄漏，M-NEW3）
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
}, 10 * 60 * 1000).unref();

function rateLimit(group: string, limit: { windowMs: number; max: number }) {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = group + ':' + ip;
    const now = Date.now();
    const rec = hits.get(key);
    if (!rec || now > rec.resetAt) {
      hits.set(key, { count: 1, resetAt: now + limit.windowMs });
      return next();
    }
    rec.count++;
    if (rec.count > limit.max) {
      return res.status(429).json({ error: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试' });
    }
    next();
  };
}
app.use('/api/ai', rateLimit('ai', AI_RATE_LIMIT));
app.use('/api/divine', (req, res, next) => {
  if (req.method === 'GET') return next();  // 读操作不限制
  return rateLimit('divine', DIVINE_RATE_LIMIT)(req, res, next);
});
// 登录/注册：更严阈值（防口令爆破与脚本化抢注，2026-09 修 P1-3）
const AUTH_RATE_LIMIT = { windowMs: 60_000, max: RATE_ENV('GUANWEI_RATE_AUTH', 10) };
const GENERIC_LIMIT = { windowMs: 60_000, max: RATE_ENV('GUANWEI_RATE_GENERIC', 120) };
app.use('/api/users/login', rateLimit('login', AUTH_RATE_LIMIT));
app.use('/api/users/register', rateLimit('register', AUTH_RATE_LIMIT));
app.use('/api/users', rateLimit('users', GENERIC_LIMIT));
// 其余匿名计算端点（原不在任何桶内 → 可被无上限刷，2026-09 修 P0-5/P2-7）
app.use('/api/tarot', rateLimit('tarot', GENERIC_LIMIT));
app.use('/api/hour', rateLimit('hour', GENERIC_LIMIT));

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
  // 轻量自检：数据目录可写 + LLM 配置状态（不含敏感值）
  let dataDirOk = true;
  try { fs.accessSync(DATA_DIR, fs.constants.W_OK); } catch { dataDirOk = false; }
  res.json({ status: dataDirOk ? 'ok' : 'degraded', dataDir: dataDirOk ? 'ok' : 'readonly', timestamp: Date.now() });
});

app.use('/api/tarot', tarotRouter);
app.use('/api/ai', aiRouter);
app.use('/api/users', usersRouter);
app.use('/api/divine', divineRouter);
app.use('/api', hourRouter);

// 统一错误处理（2026-09 修 P1-1）：JSON 解析失败/未捕获异常一律返回 JSON，
// 且不把堆栈与绝对路径回给客户端（原实现由 Express 默认处理器返回 HTML 堆栈页）
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err?.status || err?.statusCode || 500;
  const isJsonErr = err?.type === 'entity.parse.failed';
  if (status >= 500) console.error('[server] 未处理异常:', err?.message || err);
  res.status(status).json({
    error: isJsonErr ? 'BAD_JSON' : (err?.code || 'INTERNAL'),
    message: isJsonErr ? '请求体不是合法 JSON' : (status >= 500 ? '服务暂时不可用' : (err?.message || '请求有误')),
  });
});

app.listen(Number(PORT), HOST, () => {
  console.log(`
  🎴 观微后端服务已启动
  
  地址: http://localhost:${PORT}
  健康检查: http://localhost:${PORT}/api/health
  塔罗API: http://localhost:${PORT}/api/tarot
  `);
});

export default app;