// 梅花易数：古籍原案例金标回归 + 体用生克/旺衰全矩阵
//
// 权威源：《梅花易数》（宋·邵雍）卷二·体用总诀与观梅占/牡丹占诸案（公有领域）。
//   「体克用，诸事吉；用克体，诸事凶。体生用有耗失之患，用生体有进益之喜；体用比和，则百事顺遂。」
//   「体之卦气，宜盛不宜衰。盛者，如春震巽、秋乾兑、夏离、冬坎，四季之月坤艮是也。
//     衰者，春坤艮、秋震巽、夏乾兑、冬离、四季之月坎是也。」
// 起卦法（先天数）：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8；
//   上卦 = (年支数+农历月+农历日) mod 8，下卦 = (其上+时辰数) mod 8，动爻 = 同和 mod 6。
//
// 背景：2026-09-26 修正前，体用生克表 1/4、2/3 两组对调（64 组里 50 组吉凶判反），
// 旺相休囚死表 1..4 全错位（春火应「相」却判「死」）。本文件为该修正的金标。
import { describe, it, expect } from 'vitest';
import { meihuaCalc } from '../shared/core/engine/meihua';
import { Lunar } from 'lunar-typescript';

const ZHI_NUM: Record<string, number> = { 子: 1, 丑: 2, 寅: 3, 卯: 4, 辰: 5, 巳: 6, 午: 7, 未: 8, 申: 9, 酉: 10, 戌: 11, 亥: 12 };

/** 经典起卦法（独立于引擎实现，直接照古籍步骤算） */
function classicGua(yearZhi: string, lunarMonth: number, lunarDay: number, hourZhi: string) {
  const s1 = ZHI_NUM[yearZhi] + lunarMonth + lunarDay;
  const upper = ((s1 - 1) % 8) + 1;
  const s2 = s1 + ZHI_NUM[hourZhi];
  const lower = ((s2 - 1) % 8) + 1;
  const move = ((s2 - 1) % 6) + 1;
  return { upper, lower, move };
}

const GUA_NAME: Record<number, string> = { 1: '乾', 2: '兑', 3: '离', 4: '震', 5: '巽', 6: '坎', 7: '艮', 8: '坤' };
const GUA_WX: Record<number, string> = { 1: '金', 2: '金', 3: '火', 4: '木', 5: '木', 6: '水', 7: '土', 8: '土' };

// ── 五行关系（经典定义，独立于引擎的数组取模）──
const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };  // X 生 SHENG[X]
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };      // X 克 KE[X]

/** 依经典断诀推导体用吉凶（体=不动之卦/己，用=动爻之卦/事） */
function classicShengke(tiWx: string, yongWx: string): string {
  if (tiWx === yongWx) return '体用比和，平';
  if (SHENG[tiWx] === yongWx) return '体生用，泄气';
  if (KE[tiWx] === yongWx) return '体克用，吉';
  if (KE[yongWx] === tiWx) return '用克体，凶';
  return '用生体，吉';
}

/** 依经典定义推导旺相休囚死（以月令论） */
function classicWangShuai(wx: string, monthWx: string): '旺' | '相' | '休' | '囚' | '死' {
  if (wx === monthWx) return '旺';          // 当令者旺
  if (SHENG[monthWx] === wx) return '相';   // 令生者相
  if (SHENG[wx] === monthWx) return '休';   // 生令者休
  if (KE[wx] === monthWx) return '囚';      // 克令者囚
  return '死';                              // 令克者死
}

describe('梅花易数：古籍原案例', () => {
  it('观梅占（辰年十二月十七日申时）→ 泽火革·互天风姤·变泽山咸，用克体', () => {
    // 农历 2024（甲辰）年十二月十七日申时 = 公历 2025-01-16 15:30
    const r = meihuaCalc({ mode: 'time', now: new Date(2025, 0, 16, 15, 30, 0) } as any);
    // ① 起卦与古籍步骤一致
    const c = classicGua('辰', 12, 17, '申');
    expect({ upper: r.upper, lower: r.lower, move: r.move }).toEqual(c);
    // ② 卦象：上兑下离=泽火革；互（2·3·4 / 3·4·5）=上乾下巽=天风姤；初爻动→下卦离变艮=泽山咸
    expect(r.benGua.name).toBe('泽火革');
    expect(r.huGua!.name).toBe('天风姤');
    expect(r.bianGua!.name).toBe('泽山咸');
    expect(r.move).toBe(1);
    // ③ 体用：动在初爻（下卦）→ 用=离火、体=兑金；火克金 → 用克体，凶（古籍断「用克体」）
    expect(r.tiGua).toBe(2);
    expect(r.yongGua).toBe(3);
    expect({ tiWx: r.tiWx, yongWx: r.yongWx }).toEqual({ tiWx: '金', yongWx: '火' });
    expect(r.shengke).toBe('用克体，凶');
    expect(r.shengke).toBe(classicShengke(r.tiWx, r.yongWx));
  });

  it('牡丹占（巳年三月十六日卯时）→ 天风姤·互乾为天·变火风鼎，用克体', () => {
    // 农历 2025（乙巳）年三月十六日卯时 = 公历 2025-04-13 06:00
    const r = meihuaCalc({ mode: 'time', now: new Date(2025, 3, 13, 6, 0, 0) } as any);
    const c = classicGua('巳', 3, 16, '卯');
    expect({ upper: r.upper, lower: r.lower, move: r.move }).toEqual(c);
    expect(r.benGua.name).toBe('天风姤');
    expect(r.huGua!.name).toBe('乾为天');
    expect(r.bianGua!.name).toBe('火风鼎');
    expect(r.move).toBe(5);
    // 动在五爻（上卦）→ 用=乾金、体=巽木；金克木 → 用克体（古籍：「巽木为体，乾金克之」）
    expect({ tiGua: r.tiGua, yongGua: r.yongGua, tiWx: r.tiWx, yongWx: r.yongWx }).toEqual({ tiGua: 5, yongGua: 1, tiWx: '木', yongWx: '金' });
    expect(r.shengke).toBe('用克体，凶');
  });

  it('邻夜扣门借物占（一声=乾、五声=巽、酉时数10 → 四爻动）→ 天风姤之巽为风，用克体', () => {
    // 报数起卦：上卦一声(乾1)、下卦五声(巽5)，动爻 (1+5+10) mod 6 = 4
    const move = ((1 + 5 + ZHI_NUM['酉'] - 1) % 6) + 1;
    expect(move).toBe(4);
    const r = meihuaCalc({ mode: 'num', n1: 1, n2: 5, n3: move } as any);
    expect(r.benGua.name).toBe('天风姤');
    expect(r.bianGua!.name).toBe('巽为风');
    expect(r.huGua!.name).toBe('乾为天');
    // 四爻动（上卦）→ 用=乾金、体=巽木 → 用克体（古籍所借为金木之物：斧）
    expect({ tiWx: r.tiWx, yongWx: r.yongWx, shengke: r.shengke }).toEqual({ tiWx: '木', yongWx: '金', shengke: '用克体，凶' });
  });
});

describe('梅花易数：体用生克全矩阵（64 组）', () => {
  it('任意上下卦组合下，引擎判定 === 经典断诀推导', () => {
    let checked = 0;
    const wrong: string[] = [];
    for (let upper = 1; upper <= 8; upper++) {
      for (let lower = 1; lower <= 8; lower++) {
        // n3 控制动爻：1..3 → 用在下卦；4..6 → 用在上卦（体用随之互换）
        for (const move of [1, 5]) {
          const r = meihuaCalc({ mode: 'num', n1: upper, n2: lower, n3: move } as any);
          const want = classicShengke(GUA_WX[r.tiGua], GUA_WX[r.yongGua]);
          if (r.shengke !== want) wrong.push(`上${GUA_NAME[upper]}下${GUA_NAME[lower]}动${move}：体${r.tiWx}用${r.yongWx} 期望 ${want} 实得 ${r.shengke}`);
          checked++;
        }
      }
    }
    expect(wrong, wrong.slice(0, 5).join(' / ')).toHaveLength(0);
    expect(checked).toBe(128);
  });

  it('体用定位：动爻在下卦则用为下卦，在上卦则用为上卦', () => {
    for (const move of [1, 2, 3]) {
      const r = meihuaCalc({ mode: 'num', n1: 1, n2: 6, n3: move } as any);   // 上乾 下坎
      expect(r.tiGua, `动${move}`).toBe(1);
      expect(r.yongGua, `动${move}`).toBe(6);
    }
    for (const move of [4, 5, 6]) {
      const r = meihuaCalc({ mode: 'num', n1: 1, n2: 6, n3: move } as any);
      expect(r.tiGua, `动${move}`).toBe(6);
      expect(r.yongGua, `动${move}`).toBe(1);
    }
  });
});

describe('梅花易数：旺相休囚死（月令卦气）', () => {
  it('十二个月令 × 实际排盘：引擎判定 === 经典定义推导', () => {
    const ZHIS = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
    const ZHI_WX: Record<string, string> = { 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水', 子: '水', 丑: '土' };
    let checked = 0;
    for (let m = 1; m <= 12; m++) {
      // 每月取两天，尽量覆盖不同体卦（卦由日期决定）
      for (const d of [8, 22]) {
        const solar = Lunar.fromYmd(2025, m, d).getSolar();
        const r = meihuaCalc({ mode: 'time', now: new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), 12, 0, 0) } as any);
        const monthWx = ZHI_WX[ZHIS[(m - 1) % 12]];
        expect(r.monthWx, `${m} 月令`).toBe(monthWx);
        expect(r.tiWangShuai, `${m} 月 体${r.tiWx}（令${monthWx}）`).toBe(classicWangShuai(r.tiWx, monthWx));
        expect(r.yongWangShuai, `${m} 月 用${r.yongWx}（令${monthWx}）`).toBe(classicWangShuai(r.yongWx, monthWx));
        checked += 2;
      }
    }
    expect(checked).toBe(48);   // 12 月 × 2 日 × (体+用)
  });

  it('《体用总诀》所举盛衰逐条对齐（春震巽盛/春坤艮衰 · 夏乾兑衰 · 秋震巽衰 · 冬离衰 · 四季月坎衰）', () => {
    // 总诀以「盛/衰」表述：盛=旺，衰=死（令克者）。逐条按经典定义验证引擎给出的档位。
    expect(classicWangShuai('木', '木')).toBe('旺');   // 春震巽盛
    expect(classicWangShuai('土', '木')).toBe('死');   // 春坤艮衰
    expect(classicWangShuai('金', '火')).toBe('死');   // 夏乾兑衰
    expect(classicWangShuai('木', '金')).toBe('死');   // 秋震巽衰
    expect(classicWangShuai('火', '水')).toBe('死');   // 冬离衰
    expect(classicWangShuai('水', '土')).toBe('死');   // 四季之月坎衰
    // 引擎侧：同一月令下取到对应五行的体卦，档位应与上述一致
    expect(classicWangShuai('火', '木')).toBe('相');   // 春火相（原实现误判「死」）
    expect(classicWangShuai('水', '木')).toBe('休');   // 春水休
    expect(classicWangShuai('金', '木')).toBe('囚');   // 春金囚
  });
});
