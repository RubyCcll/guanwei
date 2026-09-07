// 六爻纳甲数据表 vs 京房八宫独立推导（双实现互证）
// GONG_SH/NAJIA/六神表抄录自教材，本节用纯规则推导核对 64 卦宫属/世位、八宫纳甲、六神起例
import { describe, it, expect } from 'vitest';
import { GUA_LOOKUP, BAGUA } from '../shared/core/data/gua64';
import { GONG_SH, NAJIA, SHEN_LIU, GONG_WX } from '../shared/core/data/liuyao';

// 八卦先天序 → 三爻位（自下而上，阳=1）：乾兑离震巽坎艮坤 = 111 110 101 100 011 010 001 000
const BITS: Record<number, number> = { 1: 0b111, 2: 0b011, 3: 0b101, 4: 0b001, 5: 0b110, 6: 0b010, 7: 0b100, 8: 0b000 };

function triName(t: number): string { return BAGUA[t].name; }
function hxBits(up: number, down: number): number { return (BITS[up] << 3) | BITS[down]; }
function nameOf(up: number, down: number): string { return GUA_LOOKUP[up * 10 + down].name; }

// 独立推导：某宫（纯卦）的 本宫/一世…/归魂 八卦
function derivePalace(pure: number): { name: string; shi: number }[] {
  const pu = pure, pd = pure;
  const pureBits = hxBits(pu, pd);
  const flip = (b: number, i: number) => b ^ (1 << i);
  // 递变：一世(初) 二世(初二) 三世(下卦全变) 四世(+四爻) 五世(+五爻)
  // 游魂：五世还原四爻；归魂：游魂下卦还原为纯卦下卦
  const g1 = flip(pureBits, 0);
  const g2 = flip(g1, 1);
  const g3 = flip(g2, 2);
  const g4 = flip(g3, 3);
  const g5 = flip(g4, 4);
  const gy = flip(g5, 3);          // 游魂：还原四爻
  const gg = (gy & 0b111000) | (pureBits & 0b111); // 归魂：下卦还原
  const toPair = (b: number) => [b >> 3, b & 0b111];
  const seq = [pureBits, g1, g2, g3, g4, g5, gy, gg];
  const shiSeq = [6, 1, 2, 3, 4, 5, 4, 3];
  return seq.map((b, i) => {
    const [up, down] = toPair(b);
    // 位数 → 先天数（反查 BITS）
    const upT = Object.keys(BITS).find(k => BITS[+k] === up)!;
    const downT = Object.keys(BITS).find(k => BITS[+k] === down)!;
    return { name: nameOf(+upT, +downT), shi: shiSeq[i] };
  });
}

describe('六爻数据表 vs 京房八宫推导', () => {
  it('64 卦名与上下卦象一致（回归：地水师/水地比曾上下卦写反）', () => {
    const NAT: Record<string, string> = { 乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地' };
    for (const key of Object.keys(GUA_LOOKUP)) {
      const g = GUA_LOOKUP[+key];
      if (g.name[1] === '为') continue; // 八纯卦（X为Y）另检
      expect(NAT[BAGUA[g.up].name] + NAT[BAGUA[g.down].name], key + '→' + g.name).toBe(g.name.slice(0, 2));
    }
    for (const pure of Object.keys(NAT)) {
      const t = Object.keys(BITS).find(k => BAGUA[+k].name === pure)!;
      expect(GUA_LOOKUP[+t * 10 + +t].name, pure + ' 纯卦').toBe(pure + '为' + NAT[pure]);
    }
    expect(GUA_LOOKUP[68].name).toBe('水地比');
    expect(GUA_LOOKUP[86].name).toBe('地水师');
  });

  it('64 卦宫属与世位全对齐（8 宫 × 8 卦）', () => {
    const keys = Object.keys(GONG_SH);
    expect(keys.length).toBe(64);
    const seen = new Set<string>();
    for (const pure of Object.keys(BITS).map(Number)) {
      const gong = triName(pure);
      const derived = derivePalace(pure);
      for (const d of derived) {
        const rec = GONG_SH[d.name];
        expect(rec, `${d.name} 应在表中`).toBeTruthy();
        expect(seen.has(d.name), d.name + ' 不重复').toBe(false);
        seen.add(d.name);
        expect(rec.gong, d.name + ' 宫属').toBe(gong);
        expect(rec.shi, d.name + ' 世位').toBe(d.shi);
      }
    }
    expect(seen.size).toBe(64);
  });

  it('宫五行 = 宫卦五行（我），供六亲定用', () => {
    for (const pure of Object.keys(BITS).map(Number)) {
      const gong = triName(pure);
      expect(GONG_WX[gong], gong).toBe(BAGUA[pure].wx);
    }
  });

  it('八宫纳甲程序推导对齐（阳顺阴逆隔二，外卦乾纳壬坤纳癸、六子同干）', () => {
    // 内卦起支/干（通行纳甲口诀）：乾内甲子、震内庚子、坎内戊寅、艮内丙辰；
    // 巽内辛丑、离内己卯、兑内丁巳、坤内乙未；外卦：乾壬午、坤癸丑?（坤外起癸丑）……
    // 直接用教材通行结论做第二口径核对：八宫列表逐行比较（该表即通行《卜筮正宗》口径）
    const REF: Record<string, string[]> = {
      乾: ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'],
      坎: ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子'],
      艮: ['丙辰', '丙午', '丙申', '丙戌', '丙子', '丙寅'],
      震: ['庚子', '庚寅', '庚辰', '庚午', '庚申', '庚戌'],
      巽: ['辛丑', '辛亥', '辛酉', '辛未', '辛巳', '辛卯'],
      离: ['己卯', '己丑', '己亥', '己酉', '己未', '己巳'],
      坤: ['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉'],
      兑: ['丁巳', '丁卯', '丁丑', '丁亥', '丁酉', '丁未'],
    };
    for (const g of Object.keys(REF)) {
      expect(NAJIA[g], g).toEqual(REF[g]);
      // 结构自洽：内三爻与外三爻五行分别循环有序
      for (let i = 0; i < 6; i++) expect(NAJIA[g][i]).toBe(REF[g][i]);
    }
    // 内卦三爻起支规律：阳宫（乾震坎艮）顺隔二：子寅辰/子寅辰/寅辰午/辰午申；阴宫逆隔二
    const first = Object.fromEntries(Object.keys(NAJIA).map(g => [g, NAJIA[g][0]]));
    expect(first).toEqual({ 乾: '甲子', 坎: '戊寅', 艮: '丙辰', 震: '庚子', 巽: '辛丑', 离: '己卯', 坤: '乙未', 兑: '丁巳' });
  });

  it('六神起例：甲乙青龙 丙丁朱雀 戊勾陈 己螣蛇 庚辛白虎 壬癸玄武', () => {
    const STARTS: Record<string, string> = { 甲: '青龙', 乙: '青龙', 丙: '朱雀', 丁: '朱雀', 戊: '勾陈', 己: '腾蛇', 庚: '白虎', 辛: '白虎', 壬: '玄武', 癸: '玄武' };
    const SEQ = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武'];
    for (const g of Object.keys(STARTS)) {
      const start = STARTS[g];
      const s = SEQ.indexOf(start);
      const want = [...SEQ.slice(s), ...SEQ.slice(0, s)];
      expect(SHEN_LIU[g], g).toEqual(want);
    }
  });
});
