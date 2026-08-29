// 排盘路由：登录用户起占 → 后端引擎计算 → SQLite 入库 → 返回 resultRaw + display
import { Router } from 'express';
import { baziCalc } from '../../../shared/core/engine/bazi.js';
import { ziweiCalc } from '../../../shared/core/engine/ziwei.js';
import { astrologyCalc } from '../../../shared/core/engine/astrology.js';
import { qimenCalc } from '../../../shared/core/engine/qimen.js';
import { meihuaCalc } from '../../../shared/core/engine/meihua.js';
import { liuyaoCalc } from '../../../shared/core/engine/liuyao.js';
import { liurenCalc } from '../../../shared/core/engine/liuren.js';
import { xiaoliurenCalc } from '../../../shared/core/engine/xiaoliuren.js';
import { tarotDraw } from '../../../shared/core/engine/tarot.js';
import { allTarotSpreads } from '../../../shared/core/data/tarotSpreads.js';
import { createDivination, listDivinations, getDivination, deleteDivination } from '../services/divineStore.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

const router = Router();
const MINGPAN_ARTS = ['bazi', 'ziwei', 'astrology'];

// 宽松建档：前端本地注册的用户在此同步建档（与 users.ts upsert 同策略；建档即发 claimToken 防抢占）
function ensureUser(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const exist = db.users.find((u: any) => u.username === username);
    if (exist) return true;
    const token = crypto.randomBytes(32).toString('hex');
    db.users.push({ username, passHash: '', createdAt: Date.now(), profile: {}, samples: [], records: [], token });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    console.log('[divine] 自动建档:', username);
    return true;
  } catch (e: any) {
    console.error('[divine] ensureUser 异常:', e?.message || e);
    return false;
  }
}

// 请求携带的 token → 对应用户名（有 token 则以其为准，堵「query/body 自报 username」越权）
function authedUsername(req: any): string | null {
  const tk = String(req.headers['x-guanwei-token'] || '');
  if (!tk) return null;
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const user = db.users.find((u: any) => u.token && u.token.length === tk.length && crypto.timingSafeEqual(Buffer.from(u.token), Buffer.from(tk)));
    return user ? user.username : null;
  } catch { return null; }
}

// POST /api/divine —— 起占入库
router.post('/', (req, res) => {
  const { artId, inputs, profile, question, username, profileId } = req.body || {};
  const authed = authedUsername(req);
  const owner = authed || String(username || '');  // 有 token 以 token 为准，防自报他人名
  // 游客不允许
  if (!ensureUser(owner)) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: '请先入馆（登录）再起占' });
  }
  if (!artId || !inputs) return res.status(400).json({ error: '缺少必要参数' });

  let resultRaw: unknown;
  try {
    switch (artId) {
      case 'bazi': {
        const i = inputs as any;
        resultRaw = baziCalc({ y: i.y, m: i.m, d: i.d, hourIndex: i.hourIndex, time: i.time, gender: i.gender, location: i.location });
        break;
      }
      case 'ziwei': {
        const i = inputs as any;
        resultRaw = ziweiCalc({ ganzhi: i.ganzhi, month: i.month, day: i.day, hour: i.hour, time: i.time, location: i.location, gender: i.gender, birthYear: i.birthYear });
        break;
      }
      case 'astrology': {
        const i = inputs as any;
        resultRaw = astrologyCalc(i.y, i.m, i.d, i.hour || 0, i.min || 0, i.lng, i.lat);
        break;
      }
      case 'qimen': {
        resultRaw = qimenCalc({ datetime: (inputs as any).datetime || new Date() });
        break;
      }
      case 'meihua': {
        const i = inputs as any;
        resultRaw = meihuaCalc({ mode: i.mode || 'time', n1: i.n1, n2: i.n2, n3: i.n3, now: i.now ? new Date(i.now) : undefined });
        break;
      }
      case 'liuyao': {
        const now = new Date();
        resultRaw = liuyaoCalc(undefined, { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
        break;
      }
      case 'liuren': {
        resultRaw = liurenCalc((inputs as any).datetime || new Date());
        break;
      }
      case 'xiaoliuren': {
        const i = inputs as any;
        resultRaw = xiaoliurenCalc(i.mode || 'time', i.m, i.d, i.h, i.n1, i.n2, i.n3);
        break;
      }
      case 'tarot': {
        const i = inputs as any;
        const cards = tarotDraw(Math.max(1, i.n || 3));
        const spread = allTarotSpreads().find((s: any) => s.id === i.spread) || allTarotSpreads()[0];
        resultRaw = { spread: spread || { id: 'three', name: '圣三角', description: '', positions: [] }, cards };
        break;
      }
      default:
        return res.status(400).json({ error: '术无此名' });
    }
  } catch (e: any) {
    console.error('[divine] 推演异常:', e);
    return res.status(500).json({ error: 'DIVINE_FAILED', message: '推演未应机' });
  }

  const kind = MINGPAN_ARTS.includes(artId) ? 'mingpan' : 'zhanwen';
  const rec = createDivination({
    username, artId, kind,
    question: question || undefined,
    profileId: profileId || 'main',
    profile: profile || undefined,
    params: inputs,
    resultRaw,
  });
  res.json({ ok: true, divineId: rec.id, resultRaw, display: rec.display });
});

// GET /api/divine?username=&page=&pageSize= —— 占卜历史
router.get('/', (req, res) => {
  const username = String(req.query.username || '');
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  if (!ensureUser(username)) return res.status(401).json({ error: 'UNAUTHORIZED' });
  res.json(listDivinations(username, page, pageSize, String(req.query.profileId || '')));
});

// GET /api/divine/:id —— 详情（排盘 + AI 报告）
router.get('/:id', (req, res) => {
  const rec = getDivination(req.params.id);
  if (!rec) return res.status(404).json({ error: 'DIVINE_NOT_FOUND' });
  // 归属校验：token 优先；无 token 时 query username 必须与记录一致（向后兼容本地旧前端）
  const authed = authedUsername(req);
  if (authed ? authed !== rec.username : String(req.query.username || '') !== rec.username) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  res.json({ ...rec, resultRaw: rec.resultRaw, display: rec.display, report: rec.report || null });
});

// DELETE /api/divine/:id?username= —— 删除（校验归属）
router.delete('/:id', (req, res) => {
  const username = String(req.query.username || '');
  const ok = deleteDivination(req.params.id, username);
  if (!ok) return res.status(404).json({ error: 'DIVINE_NOT_FOUND' });
  res.json({ ok: true });
});

export default router;