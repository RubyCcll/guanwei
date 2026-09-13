// 排盘路由：登录用户起占 → 后端引擎计算 → SQLite 入库 → 返回 resultRaw + display
import { Router } from 'express';
import { chartCalc } from '../../../shared/core/engine/chart.js';
import { createDivination, listDivinations, getDivination, deleteDivination } from '../services/divineStore.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 用户档案 JSON 库：默认 server/src/data/db.json；可用 GUANWEI_USERS_DB 指向临时文件（测试/多实例隔离）
const DB_FILE = process.env.GUANWEI_USERS_DB || path.join(__dirname, '..', 'data', 'db.json');

// 读取用户库：文件/目录不存在 → 视为空库（懒建档会自行创建，避免干净实例首次起占 401）
function loadUsersDb(): any {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); }
  catch { return { users: [] }; }
}

const router = Router();
const MINGPAN_ARTS = ['bazi', 'ziwei', 'astrology'];

// 宽松建档：前端本地注册的用户在此同步建档（与 users.ts upsert 同策略；新建时发 claimToken 防抢占）
// 返回 null=失败；否则 { existed, claimToken }
// 安全（2026-09 修 P0-1）：claimToken 只在「本次新建」时返回，绝不回吐已存在账号的 token——
// 否则任何人只要知道 username 即可取走占位账号凭据并 register 抢占（含档案/起占历史）。
function ensureUser(username: string): { existed: boolean; claimToken: string } | null {
  if (!username || typeof username !== 'string') return null;
  try {
    const db = loadUsersDb();
    const exist = db.users.find((u: any) => u.username === username);
    if (exist) return { existed: true, claimToken: '' };
    const token = crypto.randomBytes(32).toString('hex');
    db.users.push({ username, passHash: '', createdAt: Date.now(), profile: {}, samples: [], records: [], token, tokenExpires: Date.now() + 30 * 24 * 3600 * 1000 });
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    console.log('[divine] 自动建档:', username);
    return { existed: false, claimToken: token };
  } catch (e: any) {
    console.error('[divine] ensureUser 异常:', e?.message || e);
    return null;
  }
}

// 请求携带的 token → 对应用户名（有 token 则以其为准，堵「query/body 自报 username」越权）
function authedUsername(req: any): string | null {
  const tk = String(req.headers['x-guanwei-token'] || '');
  if (!tk) return null;
  try {
    const db = loadUsersDb();
    const user = db.users.find((u: any) => u.token && u.token.length === tk.length && crypto.timingSafeEqual(Buffer.from(u.token), Buffer.from(tk)));
    if (!user) return null;
    // 安全（2026-09 修 P1-2）：与 users.ts tokenMatches 同口径校验过期——过期 token 在占卜链路同样失效
    if (user.tokenExpires && Date.now() > user.tokenExpires) return null;
    return user.username;
  } catch { return null; }
}

// 归属校验统一入口：
// - 带有效 token → 以 token 用户为准（堵自报 username 越权）
// - 无 token：
//   · 目标为占位账号（passHash 空，自动建档/未正式注册）→ 允许（本地单机流程）
//   · 目标为正式账号（注册过，passHash 非空）→ 401（必须持本人 token，H-NEW1~3）
// 返回 { owner, isPlaceholder }；null = 校验失败（已 res 响应）
function resolveOwner(req: any, res: any, fallbackUsername: string): { owner: string; isPlaceholder: boolean } | null {
  const authed = authedUsername(req);
  let owner = authed || String(fallbackUsername || '');
  if (!owner) { res.status(401).json({ error: 'UNAUTHORIZED', message: '请先入馆（登录）' }); return null; }
  let user: any = null;
  try {
    user = loadUsersDb().users.find((u: any) => u.username === owner) || null;
  } catch { /* 读失败按占位处理 */ }
  const isPlaceholder = !user || !user.passHash;
  if (!authed && !isPlaceholder) {
    // 无 token 但目标是正式账号 → 拒绝（防自报他人 username 越权）
    res.status(401).json({ error: 'AUTH_REQUIRED', message: '请先入馆（登录）后操作' });
    return null;
  }
  return { owner, isPlaceholder };
}

// POST /api/divine —— 起占入库
router.post('/', (req, res) => {
  const { artId, inputs, profile, question, username, profileId } = req.body || {};
  const resolved = resolveOwner(req, res, String(username || ''));
  if (!resolved) return;
  const owner = resolved.owner;
  const ensured = ensureUser(owner);
  if (!ensured) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: '请先入馆（登录）再起占' });
  }
  const claimToken = ensured.claimToken;  // 仅「本次新建」时非空（P0-1）
  if (!artId || !inputs) return res.status(400).json({ error: '缺少必要参数' });

  let resultRaw: unknown;
  try {
    resultRaw = chartCalc(artId, inputs);
  } catch (e: any) {
    if (e?.message?.includes('术无此名')) return res.status(400).json({ error: '术无此名' });
    console.error('[divine] 推演异常:', e);
    return res.status(500).json({ error: 'DIVINE_FAILED', message: '推演未应机' });
  }

  const kind = MINGPAN_ARTS.includes(artId) ? 'mingpan' : 'zhanwen';
  const rec = createDivination({
    username: owner, artId, kind,
    question: question || undefined,
    profileId: profileId || 'main',
    profile: profile || undefined,
    params: inputs,
    resultRaw,
  });
  const authed = authedUsername(req);
  res.json({
    ok: true, divineId: rec.id, resultRaw, display: rec.display,
    // L-NEW1：仅未鉴权 + 本次新建占位账号时返回 claimToken（前端保存后注册可升级）；已存在账号一律不回吐
    claimToken: (!authed && !ensured.existed && claimToken) ? claimToken : undefined,
  });
});

// GET /api/divine?username=&page=&pageSize= —— 占卜历史（H-NEW2：正式账号须本人 token）
router.get('/', (req, res) => {
  const username = String(req.query.username || '');
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const resolved = resolveOwner(req, res, username);
  if (!resolved) return;
  if (!ensureUser(resolved.owner)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  res.json(listDivinations(resolved.owner, page, pageSize, String(req.query.profileId || '')));
});

// GET /api/divine/:id —— 详情（排盘 + AI 报告；正式账号须本人 token）
router.get('/:id', (req, res) => {
  const rec = getDivination(req.params.id);
  if (!rec) return res.status(404).json({ error: 'DIVINE_NOT_FOUND' });
  // 归属校验：token 优先；无 token 仅占位账号可经 query username 访问
  const resolved = resolveOwner(req, res, String(req.query.username || ''));
  if (!resolved) return;
  if (resolved.owner !== rec.username) return res.status(403).json({ error: 'FORBIDDEN' });
  res.json({ ...rec, resultRaw: rec.resultRaw, display: rec.display, report: rec.report || null });
});

// DELETE /api/divine/:id?username= —— 删除（H-NEW3：正式账号须本人 token）
router.delete('/:id', (req, res) => {
  const username = String(req.query.username || '');
  const resolved = resolveOwner(req, res, username);
  if (!resolved) return;
  const ok = deleteDivination(req.params.id, resolved.owner);
  if (!ok) return res.status(404).json({ error: 'DIVINE_NOT_FOUND' });
  res.json({ ok: true });
});

export default router;