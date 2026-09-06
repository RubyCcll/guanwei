// 紫微排盘 vs iztro（事实标准 4073★）对照校验——防排盘算法回归
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { Solar } from 'lunar-typescript';
import { ziweiCalc } from '../shared/core/engine/ziwei';

const require = createRequire(import.meta.url);
let astro: any = null;
beforeAll(() => {
  // tsx/vitest 环境下 iztro i18n 兼容（Node 无 navigator.languages；i18next 对非数组 codes 无保护）
  try {
    const i18next = require('i18next');
    const lu = i18next?.services?.languageUtils;
    if (lu && typeof lu.getBestMatchFromCodes === 'function') {
      const orig = lu.getBestMatchFromCodes.bind(lu);
      lu.getBestMatchFromCodes = (codes: any) => orig(Array.isArray(codes) ? codes : codes ? [codes] : []);
    }
  } catch { /* */ }
  try { Object.defineProperty(globalThis, 'navigator', { value: { languages: ['zh-CN'], language: 'zh-CN' }, configurable: true }); } catch { /* */ }
  astro = require('iztro').astro;
});

const DIZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const MAJORS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
const FU = ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '擎羊', '陀罗', '火星', '铃星', '地空', '地劫', '天马'];

const CASES: [string, number, number, string][] = [
  ['1996-12-24', 7, 38, '男'], ['1990-06-15', 12, 0, '男'], ['1984-02-02', 8, 30, '女'],
  ['2000-01-01', 6, 15, '男'], ['1974-04-28', 16, 40, '男'], ['2008-08-08', 20, 8, '女'],
  ['1966-05-16', 10, 20, '男'], ['2020-01-25', 14, 50, '女'], ['1958-09-12', 3, 20, '男'], ['2031-06-30', 22, 45, '女'],
  // 1991-08-17 16:30 山东德州武城（报告案例）：命宫子·天同+太阴 土五局 身宫辰(官禄) 庚子 紫微巳(交友)
  ['1991-08-17', 16, 30, '男'],
];

function ownCalc(dateStr: string, h: number, gender: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const hourIndex = Math.floor(((h + 1) % 24) / 2);
  const lunar = Solar.fromYmd(y, m, d).getLunar();
  const rawMonth = lunar.getMonth();
  const month = Math.abs(rawMonth) + (rawMonth < 0 && lunar.getDay() > 15 ? 1 : 0);
  return ziweiCalc({ ganzhi: lunar.getYearInGanZhi(), month, day: lunar.getDay(), hour: hourIndex, gender: gender as '男' | '女', birthYear: y });
}

describe('紫微排盘 vs iztro 事实标准', () => {
  it('五行局 / 命宫 / 紫微位置（10 案例）', () => {
    for (const [dateStr, h, , gender] of CASES) {
      const hourIndex = Math.floor(((h + 1) % 24) / 2);
      const it = astro.bySolar(dateStr, hourIndex, gender, true, 'zh-CN');
      const iZw = it.palaces.find((p: any) => p.majorStars?.some((s: any) => s.name === '紫微'))?.earthlyBranch;
      const g = ownCalc(dateStr, h, gender);
      expect(g.juName, dateStr + ' 五行局').toBe(it.fiveElementsClass);
      expect(DIZHI[g.ming], dateStr + ' 命宫').toBe(it.earthlyBranchOfSoulPalace);
      expect(DIZHI[g.zwPos], dateStr + ' 紫微').toBe(iZw);
    }
  });
  it('十四主星位置（10 案例 × 14 星）', () => {
    for (const [dateStr, h, , gender] of CASES) {
      const hourIndex = Math.floor(((h + 1) % 24) / 2);
      const it = astro.bySolar(dateStr, hourIndex, gender, true, 'zh-CN');
      const iStars: Record<string, string> = {};
      it.palaces.forEach((p: any) => p.majorStars?.forEach((s: any) => { if (MAJORS.includes(s.name)) iStars[s.name] = p.earthlyBranch; }));
      const g = ownCalc(dateStr, h, gender);
      for (const s of MAJORS) {
        expect(DIZHI[g.zwStars[s]], dateStr + ' ' + s).toBe(iStars[s]);
      }
    }
  });
  it('辅星位置（10 案例 × 14 星）', () => {
    for (const [dateStr, h, , gender] of CASES) {
      const hourIndex = Math.floor(((h + 1) % 24) / 2);
      const it = astro.bySolar(dateStr, hourIndex, gender, true, 'zh-CN');
      const iFu: Record<string, string> = {};
      it.palaces.forEach((p: any) => [...(p.minorStars || []), ...(p.adjectiveStars || [])].forEach((s: any) => { if (FU.includes(s.name) && !iFu[s.name]) iFu[s.name] = p.earthlyBranch; }));
      const g = ownCalc(dateStr, h, gender);
      for (const s of FU) {
        if (iFu[s] !== undefined) {
          expect(DIZHI[g.fuStars[s]], dateStr + ' ' + s).toBe(iFu[s]);
        }
      }
    }
  });
  it('主星亮度（10 案例 × 14 星，表源=iztro STARS_INFO）', () => {
    for (const [dateStr, h, , gender] of CASES) {
      const hourIndex = Math.floor(((h + 1) % 24) / 2);
      const it = astro.bySolar(dateStr, hourIndex, gender, true, 'zh-CN');
      const iB: Record<string, string> = {};
      it.palaces.forEach((p: any) => p.majorStars?.forEach((s: any) => { if (MAJORS.includes(s.name) && !iB[s.name]) iB[s.name] = s.brightness; }));
      const g = ownCalc(dateStr, h, gender);
      for (const s of MAJORS) {
        expect(g.brightness[s], dateStr + ' ' + s).toBe(iB[s]);
      }
    }
  });
});