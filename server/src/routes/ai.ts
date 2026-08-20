// AI 解读路由：/api/ai/interpret（非流式）+ /api/ai/interpret/stream（SSE）
import { Router } from 'express';
import { buildMessages, buildReportMessages } from '../services/promptBuilder.js';
import { chatOnce, chatStream, activeProvider, providerStatus, lastFinishReason } from '../services/llmProvider.js';
import { getDivination, attachReport, markAiFailed } from '../services/divineStore.js';

const router = Router();

// Provider 健康状态
router.get('/providers', (_req, res) => {
  res.json({ providers: providerStatus(), active: activeProvider()?.id ?? null });
});

// 非流式解读（保底通道）
router.post('/interpret', async (req, res) => {
  const { artId, question, divineId, semantic, profile, report, fit, username } = req.body;
  if (!artId) return res.status(400).json({ error: '缺少必要参数' });
  try {
    // 从 SQLite 读排盘数据（v6：不再信任前端直传 resultRaw）
    let resultRaw: unknown = null;
    if (divineId) {
      const rec = getDivination(divineId);
      if (!rec) return res.status(400).json({ error: 'DIVINE_NOT_FOUND', message: '起占记录不存在，请重新起占' });
      if (username && rec.username !== username) return res.status(403).json({ error: 'FORBIDDEN' });
      resultRaw = rec.resultRaw;
    } else {
      return res.status(400).json({ error: 'DIVINE_REQUIRED', message: '请先起占（divineId 缺失）' });
    }
    // 统一报告模式：无论 report 标志，均按 Schema 输出结构化报告
    const kind = ['bazi', 'ziwei', 'astrology'].includes(artId) ? 'mingpan' : 'zhanwen';
    const messages = buildReportMessages(artId, question || '', resultRaw, profile, semantic, fit);
    const text = await chatOnce(messages);
    const parsed = parseReport(text, kind);
    if (parsed.quality === 'poor') {
      console.error('[ai] 输出不符合报告结构，拒绝返回（不入库）');
      markAiFailed(divineId, artId, kind, '质量评分未达标', text.slice(0, 4000));
      return res.status(502).json({ error: 'AI_REPORT_INVALID', message: 'AI 输出不符合报告结构，请重试' });
    }
    // 达标 → 报告回写存储（quality=ok 才入库）
    attachReport(divineId, parsed, 'ok');
    res.json({ provider: activeProvider()?.id, report: parsed, sections: parseSections(text) });
  } catch (e: any) {
    if (e.message === 'AI_UNCONFIGURED') {
      return res.status(503).json({ error: 'AI_UNCONFIGURED', message: '未配置 AI 服务，请设置 LLM_PROVIDER 与对应 Key' });
    }
    console.error('[ai/interpret]', e);
    res.status(502).json({ error: 'AI_FAILED', message: 'AI 解读暂未应机' });
  }
});

// SSE 流式解读：逐字推送（含 start / done 事件）
router.post('/interpret/stream', async (req, res) => {
  const { artId, question, divineId, semantic, profile, report, fit, username } = req.body;
  if (!artId) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }
  // 从 SQLite 读排盘数据（v6：divineId 必填）
  const rec = divineId ? getDivination(divineId) : null;
  if (!rec) {
    res.status(400).json({ error: 'DIVINE_NOT_FOUND', message: '起占记录不存在，请重新起占' });
    return;
  }
  if (username && rec.username !== username) {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }
  const resultRaw = rec.resultRaw;
  try {
    const messages = buildReportMessages(artId, question || '', resultRaw, profile, semantic, fit);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: 'start', provider: activeProvider()?.id })}\n\n`);
    let full = '';
    for await (const chunk of chatStream(messages)) {
      full += chunk;
      res.write(`data: ${JSON.stringify({ type: 'char', char: chunk })}\n\n`);
    }
    // 统一结构化报告：后端完成文本清洗与结构归一，前端只做渲染
    const kind2 = ['bazi', 'ziwei', 'astrology'].includes(artId) ? 'mingpan' : 'zhanwen';
    const rep = parseReport(full, kind2);
    const sections = parseSections(full);
    const truncated = lastFinishReason === 'length';
    // 质量门槛：ok → 报告回写入库；poor/截断 → 不入库 + fail 留档
    if (rep.quality === 'ok' && !truncated) {
      attachReport(divineId, rep, 'ok');
    } else {
      const reason = truncated ? '输出截断（finish_reason=length）' : '质量评分未达标';
      markAiFailed(divineId, artId, kind2, reason, full.slice(0, 4000));
    }
    res.write(`data: ${JSON.stringify({ type: 'done', report: rep, sections, full, truncated, quality: rep.quality || 'ok' })}\n\n`);
    res.end();
  } catch (e: any) {
    if (e.message === 'AI_UNCONFIGURED') {
      // 流已开始则发送错误事件；否则返回 503
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: 'error', code: 'AI_UNCONFIGURED', message: '未配置 AI 服务' })}\n\n`);
        res.end();
      } else {
        res.status(503).json({ error: 'AI_UNCONFIGURED' });
      }
      return;
    }
    console.error('[ai/stream]', e);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', code: 'AI_FAILED', message: 'AI 解读暂未应机' })}\n\n`);
      res.end();
    } else {
      res.status(502).json({ error: 'AI_FAILED' });
    }
  }
});


// 报告解析：按两套 Schema 归一化（命盘类/占问类），字段缺失兜底
interface RawReading { summary: string; keyPoints: string[] }

export interface AIReportNormalized {
  kind: 'mingpan' | 'zhanwen';
  title: string;
  overview: string;
  rawReading: RawReading;
  character?: { summary: string; traits: { name: string; desc: string }[] };
  lifeStages?: { stage: string; age: string; summary: string }[];
  career?: { summary: string; direction: string; advice: string };
  love?: { summary: string; advice: string };
  wealth?: { summary: string; advice: string };
  health?: { summary: string; advice: string };
  situation?: string;
  trend?: string;
  timing?: string;
  advice: string;
  conclusion: string;
  disclaimer: string;
  suitability?: { suitable: boolean | 'partial'; note: string; suggestion: string };
  quality?: 'ok' | 'poor';
}

// 后端文本清洗：剥离 Markdown 格式标记（**、*、#、>、- 等），保留纯文本
function stripMd(s: string): string {
  return s
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function str(v: unknown, fb = ''): string {
  return v === undefined || v === null ? fb : stripMd(String(v));
}

// 严格判断输出是否满足 Schema 关键要求（命盘：character+lifeStages 或 career/love/wealth；占问：situation/trend/timing）
function reportMeetsSchema(obj: any, kind: 'mingpan' | 'zhanwen'): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (kind === 'mingpan') {
    const ch = obj.character;
    const okChar = ch && (typeof ch.summary === 'string' && ch.summary.length > 10 || Array.isArray(ch.traits) && ch.traits.length > 0);
    const okLife = Array.isArray(obj.lifeStages) && obj.lifeStages.length > 0;
    const okDomains = obj.career || obj.love || obj.wealth;
    return okChar && okLife && okDomains;
  }
  return typeof obj.situation === 'string' && obj.situation.length > 10
    && typeof obj.trend === 'string' && obj.trend.length > 10
    && typeof obj.timing === 'string' && obj.timing.length > 10;
}
function stripJson(text: string): string {
  const t = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  return t;
}

function parseReport(text: string, kind: 'mingpan' | 'zhanwen'): AIReportNormalized {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  let obj: any = {};
  try { obj = JSON.parse(cleaned); } catch {
    return { kind, title: '观微解读报告', overview: cleaned, rawReading: { summary: cleaned, keyPoints: [] }, advice: '', conclusion: '', disclaimer: '凡占问所得，仅供修身养性、怡情遣兴之用，不构成决策依据。' };
  }
  if (Array.isArray(obj.chapters) && obj.chapters.length && !obj.rawReading) {
    const body = obj.chapters.map((ch: any) => '【' + (ch.skill || '') + '】' + str(ch.content)).join('\n');
    return {
      kind,
      title: str(obj.title, '观微解读报告'),
      overview: str(obj.overview) || body.slice(0, 200),
      rawReading: { summary: body, keyPoints: [] },
      advice: str(obj.conclusion, ''),
      conclusion: str(obj.conclusion, ''),
      disclaimer: str(obj.disclaimer, '凡占问所得，仅供修身养性、怡情遣兴之用，不构成决策依据。'),
    };
  }
  const raw = (obj.rawReading || {}) as any;
  const out: AIReportNormalized = {
    kind,
    title: str(obj.title, '观微解读报告'),
    overview: str(obj.overview),
    rawReading: { summary: str(raw.summary), keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints.map((k: unknown) => String(k)) : [] },
    advice: str(obj.advice),
    conclusion: str(obj.conclusion),
    disclaimer: str(obj.disclaimer, '凡占问所得，仅供修身养性、怡情遣兴之用，不构成决策依据。'),
  };
  if (kind === 'mingpan') {
    const ch = (obj.character || {}) as any;
    out.character = {
      summary: str(ch.summary),
      traits: Array.isArray(ch.traits) ? ch.traits.filter((t: any) => t && t.name).map((t: any) => ({ name: String(t.name), desc: str(t.desc) })) : [],
    };
    out.lifeStages = Array.isArray(obj.lifeStages) ? obj.lifeStages.filter((s: any) => s && s.stage).map((s: any) => ({ stage: String(s.stage), age: str(s.age), summary: str(s.summary) })) : [];
    const career = (obj.career || {}) as any;
    out.career = { summary: str(career.summary), direction: str(career.direction), advice: str(career.advice) };
    const love = (obj.love || {}) as any;
    out.love = { summary: str(love.summary), advice: str(love.advice) };
    const wealth = (obj.wealth || {}) as any;
    const health = (obj.health || {}) as any;
    out.health = { summary: str(health.summary), advice: str(health.advice) };
    out.wealth = { summary: str(wealth.summary), advice: str(wealth.advice) };
  } else {
    out.situation = str(obj.situation);
    out.trend = str(obj.trend);
    out.timing = str(obj.timing);
  }
  // 兜底：AI 返回的自定义字段（如 minggong/dayun/liunian）转为通用章节，保证任何输出都有结构化展示
  const KNOWN = new Set(['title', 'overview', 'rawReading', 'character', 'lifeStages', 'career', 'love', 'wealth', 'health', 'advice', 'conclusion', 'disclaimer', 'suitability', 'situation', 'trend', 'timing', 'chapters', 'sections', 'kind']);
  const extra: { skill: string; content: string }[] = [];
  Object.keys(obj).forEach((k: string) => {
    if (KNOWN.has(k)) return;
    const v = obj[k];
    if (typeof v === 'string' && v.length > 10) extra.push({ skill: k, content: v });
  });
  if (extra.length) (out as any).extraSections = extra;
  const sui = (obj.suitability || {}) as any;
  if (obj.suitability) {
    out.suitability = {
      suitable: sui.suitable === true || sui.suitable === 'partial' ? sui.suitable : false,
      note: str(sui.note),
      suggestion: str(sui.suggestion),
    };
  }
  // 质量评分：关键字段缺失/为空 -> poor（前端据此提示本次解读可能不完整）
  let score = 0;
  const has = (v: unknown) => typeof v === 'string' && stripMd(v).length > 10;
  if (has(out.overview)) score += 15;
  if (out.rawReading && (has(out.rawReading.summary) || (out.rawReading.keyPoints?.length || 0) > 0)) score += 15;
  if (kind === 'mingpan') {
    if (out.character && (has(out.character.summary) || (out.character.traits?.length || 0) > 0)) score += 20;
    if (out.lifeStages && out.lifeStages.length > 0 && out.lifeStages.some(s => has(s.summary))) score += 20;
    if (has(out.career?.summary) || has(out.love?.summary) || has(out.wealth?.summary)) score += 15;
    if (has(out.health?.summary)) score += 5;
  } else {
    if (has(out.situation)) score += 20;
    if (has(out.trend)) score += 20;
    if (has(out.timing)) score += 15;
  }
  if (has(out.advice)) score += 10;
  if (has(out.conclusion)) score += 5;
  out.quality = score >= 60 ? 'ok' : 'poor';
  return out;
}
function parseSections(text: string): { title: string; content: string }[] {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  try {
    const obj = JSON.parse(cleaned);
    if (Array.isArray(obj.sections)) {
      return obj.sections.filter((s: any) => s && s.title && s.content).map((s: any) => ({ title: String(s.title), content: String(s.content) }));
    }
    // 结构化报告 JSON → 多章节（兼容旧 JS 不读 report 字段时也能分节展示）
    const out: { title: string; content: string }[] = [];
    const str = (v: unknown): string => (typeof v === 'string' ? v : v ? JSON.stringify(v) : '');
    const push = (t: string, v: unknown) => { const s = str(v); if (s && s.length > 2) out.push({ title: t, content: s }); };
    push('总览', obj.overview);
    if (obj.rawReading) push('原始解读', typeof obj.rawReading === 'string' ? obj.rawReading : obj.rawReading.summary);
    if (obj.character) {
      const ch = obj.character;
      const traits = Array.isArray(ch.traits) ? ch.traits.map((t: any) => t?.name + '：' + (t?.desc || '')).join('\n') : '';
      push('性格', ch.summary + (traits ? '\n' + traits : ''));
    }
    if (Array.isArray(obj.lifeStages)) push('人生阶段', obj.lifeStages.map((s: any) => '【' + s.stage + (s.age ? '（' + s.age + '）' : '') + '】' + s.summary).join('\n'));
    if (obj.career) push('事业', (obj.career.summary || '') + (obj.career.direction ? '\n方向：' + obj.career.direction : '') + (obj.career.advice ? '\n建议：' + obj.career.advice : ''));
    if (obj.love) push('爱情', (obj.love.summary || '') + (obj.love.advice ? '\n建议：' + obj.love.advice : ''));
    if (obj.wealth) push('财富', (obj.wealth.summary || '') + (obj.wealth.advice ? '\n建议：' + obj.wealth.advice : ''));
    push('现状', obj.situation);
    push('趋势', obj.trend);
    push('时机', obj.timing);
    push('建议', obj.advice);
    push('结语', obj.conclusion);
    push('声明', obj.disclaimer);
    if (out.length) return out;
  } catch { /* 非 JSON，走散文兜底 */ }
  // 兜底：整段为一节
  return [{ title: 'AI 参详', content: cleaned || 'AI 未返回内容' }];
}

export default router;