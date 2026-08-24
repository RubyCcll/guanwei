// 断语匹配：排盘因子 → 已校核断语（reviewed）→ 注入 AI prompt 作「古籍引证」
import { duanyuReviewed, type DuanyuEntry } from '../../../shared/core/data/duanyu';

// 盘面因子 → 断语 tags/因子 的关键词映射（每术可扩展）
// artId → 从排盘结果提取的候选关键词
function extractKeywords(artId: string, resultRaw: unknown): string[] {
  const r = resultRaw as Record<string, any> | null;
  if (!r) return [];
  const kws: string[] = [];
  switch (artId) {
    case 'bazi':
      // 月令/格局/用神/调候/旺衰
      if (r.monthZhi) kws.push('月令');
      if (r.geju) kws.push('格局', String(r.geju));
      if (r.yongshen) kws.push('用神', String(r.yongshen));
      if (r.strength) kws.push(r.strength === '身强' ? '旺衰' : '旺衰');
      if (r.tiaohou) kws.push('调候');
      break;
    case 'liuyao':
      if (r.yongshen) kws.push('用神', String(r.yongshen));
      break;
    case 'meihua':
      if (r.tiyong) kws.push('体用');
      break;
    case 'qimen':
      kws.push('阴阳遁', '三奇六仪', '起局');
      break;
    case 'liuren':
      kws.push('四课', '三传');
      break;
    case 'ziwei':
      if (r.brightness) kws.push('庙旺落陷', '星曜生克');
      break;
    case 'xiaoliuren':
      kws.push('六神', '掌诀');
      break;
    default:
      break;
  }
  return kws;
}

// 匹配：断语 tags 与候选关键词有交集即命中；按命中数排序取前 N
export function matchDuanyu(artId: string, resultRaw: unknown, limit = 3): DuanyuEntry[] {
  const pool = duanyuReviewed().filter(d => d.art === artId);
  if (pool.length === 0) return [];
  const kws = extractKeywords(artId, resultRaw);
  const scored = pool.map(d => {
    const hit = d.tags.filter(t => kws.includes(t)).length + (d.factors || []).filter(f => kws.includes(f)).length;
    return { d, hit };
  }).sort((a, b) => b.hit - a.hit);
  // 至少命中 1 个关键词才注入（避免无关引证）；全部不命中则按术别取第一条最通用的
  const matched = scored.filter(s => s.hit > 0);
  const picked = matched.length > 0 ? matched : [scored[0]];
  return picked.slice(0, limit).map(s => s.d);
}

// 生成 prompt 引证段（仅 reviewed 条目；未校核 seed 一律不注入）
export function duanyuPromptBlock(artId: string, resultRaw: unknown): string {
  const matched = matchDuanyu(artId, resultRaw);
  if (matched.length === 0) return '';
  const lines = matched.map(d => {
    const book = d.bookId ? '《' + d.bookId + '》' : '';
    return '· ' + d.original + '（' + book + d.chapter + '）——断语：' + d.duanyu;
  });
  return '【古籍引证（断语库 · 已校核）】以下为与本盘/本问相关的古籍断语，可在行文自然处引用（须标注出处「《书·篇》」，且不得改写原文）：\n' + lines.join('\n');
}
