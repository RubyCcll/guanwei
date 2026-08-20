// 六亲关键事实提取：后端从排盘结果确定性提取父母/夫妻/子女宫位事实
// 目的：AI 只做「解读」，不承担「推算宫位」——推算即出错源（实测 AI 多次把父母宫主星编错）
import type { ZiweiResult, BaziResult } from '../../../shared/core/types';

const DIZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const SIHUA_KEY: Record<string, string> = { lu: '化禄', quan: '化权', ke: '化科', ji: '化忌' };

function ziweiPalaceFact(r: ZiweiResult, palaceIdx: number, palaceName: string): string {
  const zhiIdx = r.palaces?.[palaceIdx] ?? ((r.ming - palaceIdx + 24) % 12);
  const stars = Object.entries(r.zwStars).filter(([, p]) => p === zhiIdx).map(([s]) => s);
  const fus = Object.entries(r.fuStars || {}).filter(([, p]) => p === zhiIdx).map(([s]) => s);
  const sh = Object.entries(r.sihuaPos || {}).filter(([, p]) => p === zhiIdx).map(([k]) => SIHUA_KEY[k]).join('、');
  const parts = [DIZHI[zhiIdx] + '宫', stars.length ? '主星' + stars.join('、') : '无主星'];
  if (fus.length) parts.push('辅星' + fus.join('、'));
  if (sh) parts.push(sh);
  return palaceName + '：' + parts.join('，');
}

// 八字六亲星位（子平惯例）：男命 偏财父/正印母/正财妻/官杀子女；女命 正财父/偏印母/正官夫/食伤子女
function baziRelatives(r: BaziResult, gender: '男' | '女'): string {
  const dayGan = r.dayGan;
  const findStar = (target: string): string | null => {
    // 天干
    for (let i = 0; i < r.shishen.length; i++) {
      const s = r.shishen[i];
      if (s.name === target) return ['年干', '月干', '日干', '时干'][i] + s.gan + '（' + target + '）';
    }
    // 地支藏干
    for (let i = 0; i < r.canggan.length; i++) {
      const cg = r.canggan[i];
      const hit = cg.gans.find(g => g.shishen === target);
      if (hit) return ['年支', '月支', '日支', '时支'][i] + cg.zhi + '藏' + hit.gan + '（' + target + '）';
    }
    return null;
  };
  const parts: string[] = [];
  if (gender === '男') {
    const f = findStar('偏财'), m = findStar('正印');
    parts.push('父亲星位（偏财）：' + (f || '未现'));
    parts.push('母亲星位（正印）：' + (m || '未现'));
  } else {
    const f = findStar('正财'), m = findStar('偏印');
    parts.push('父亲星位（正财）：' + (f || '未现'));
    parts.push('母亲星位（偏印）：' + (m || '未现'));
  }
  const spouse = findStar(gender === '男' ? '正财' : '正官');
  parts.push('配偶星位（' + (gender === '男' ? '正财' : '正官') + '）：' + (spouse || '未现'));
  return parts.join('；');
}

/** 提取六亲关键事实（AI 解读六亲必须引用，不得另立） */
export function sixRelativesFacts(artId: string, resultRaw: unknown, gender?: '男' | '女'): string {
  try {
    if (artId === 'ziwei') {
      const r = resultRaw as ZiweiResult;
      if (!r || typeof r.ming !== 'number') return '';
      return '【本盘六亲事实 · 必须逐字引用，不得推算或更改】'
        + ziweiPalaceFact(r, 11, '父母宫') + '；'
        + ziweiPalaceFact(r, 2, '夫妻宫') + '；'
        + ziweiPalaceFact(r, 3, '子女宫') + '。'
        + '（解读父母/感情/子女必须以此为准，例如父母宫主星武曲贪狼就不得写「父母宫无主星」。）';
    }
    if (artId === 'bazi') {
      const r = resultRaw as BaziResult;
      if (!r || !r.dayGan) return '';
      return '【本盘六亲事实 · 必须逐字引用，不得推算或更改】' + baziRelatives(r, gender === '女' ? '女' : '男') + '。';
    }
  } catch { /* 提取失败则不注入 */ }
  return '';
}
