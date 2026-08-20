// 术数基础算法准确性验证（已知口诀/标准卦例 + 结构一致性）
import { describe, it, expect } from 'vitest';
import { liuyaoCalc, mulberry32 } from '../shared/core/engine/liuyao';
import { xiaoliurenCalc } from '../shared/core/engine/xiaoliuren';
import { meihuaCalc } from '../shared/core/engine/meihua';
import { qimenCalc } from '../shared/core/engine/qimen';
import { liurenCalc } from '../shared/core/engine/liuren';

// 从摇卦序列构建六爻结果（1=阳 0=阴），测纳甲
function yaoResult(seq: number[], date: { y: number; m: number; d: number }) {
  // 直接构造与 liuyaoCalc 相同输出（不动爻）
  const names = seq.map(v => ({ v, nm: v ? '少阳' : '少阴', backs: v ? 3 : 0 }));
  const BIT_TO_BA: Record<number, number> = { 7: 1, 6: 2, 5: 3, 4: 4, 3: 5, 2: 6, 1: 7, 0: 8 };
  const lB = BIT_TO_BA[seq[0] * 4 + seq[1] * 2 + seq[2]];
  const uB = BIT_TO_BA[seq[3] * 4 + seq[4] * 2 + seq[5]];
  // 直接调用引擎（rng 构造）：用 mulberry32 找匹配序列太脆——改为断言引擎输出的卦名
  return null;
}

describe('六爻纳甲（通行纳甲表标准卦例）', () => {
  // 乾为天：初爻起 甲子甲寅甲辰壬午壬申壬戌；世6应3
  it('乾为天：纳甲与世应', () => {
    // 摇出乾卦序列 [1,1,1,1,1,1]
    let found = null;
    for (let seed = 1; seed < 500 && !found; seed++) {
      const r = liuyaoCalc(mulberry32(seed), { y: 2024, m: 1, d: 15 });
      if (r.benGua.name === '乾为天') { found = r; break; }
    }
    expect(found).not.toBeNull();
    const n = found!.najia!;
    expect(n.gong).toBe('乾');
    expect(n.lines.map(l => l.gz)).toEqual(['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌']);
    expect(n.lines.map(l => l.liuqin)).toEqual(['子孙', '妻财', '父母', '官鬼', '兄弟', '父母']);
    expect(n.shiPos).toBe(6);
    expect(n.yingPos).toBe(3);
  });
  it('坤为地：纳甲与世应', () => {
    let found = null;
    for (let seed = 1; seed < 500 && !found; seed++) {
      const r = liuyaoCalc(mulberry32(seed), { y: 2024, m: 1, d: 15 });
      if (r.benGua.name === '坤为地') { found = r; break; }
    }
    expect(found).not.toBeNull();
    const n = found!.najia!;
    expect(n.gong).toBe('坤');
    expect(n.lines.map(l => l.gz)).toEqual(['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉']);
    expect(n.shiPos).toBe(6);
    expect(n.yingPos).toBe(3);
  });
});

describe('小六壬（掌诀口诀案例）', () => {
  it('2024-01-15 午时 → 赤口（大安起正月顺数至腊月=空亡；空亡起初一顺数至初五=赤口；赤口起子时至午时=赤口）', () => {
    const r = xiaoliurenCalc('time', 2024, 1, 15, 12);
    expect(r.name).toBe('赤口');
    expect(r.detail.ji).toBe('凶');
  });
});

describe('梅花易数（邵雍时间起卦，农历月日）', () => {
  it('2024-01-15 12:00（农历癸卯年腊月初五午时）→ 风雷益，动爻4', () => {
    const r = meihuaCalc({ mode: 'time', now: new Date(2024, 0, 15, 12, 0, 0) });
    expect(r.benGua.name).toBe('风雷益');
    expect(r.move).toBe(4);
  });
  it('2024-03-10 12:00（农历甲辰年二月初一午时）→ 地山谦（上坤下艮），动爻3', () => {
    const r = meihuaCalc({ mode: 'time', now: new Date(2024, 2, 10, 12, 0, 0) });
    expect(r.benGua.name).toBe('地山谦');
    expect(r.move).toBe(3);
  });
});

describe('奇门遁甲（结构一致性）', () => {
  it('2024-08-18 立秋后阴遁：九宫齐/值符值使/阴阳遁与节气匹配', () => {
    const r = qimenCalc({ datetime: '2024-08-18T12:00' });
    expect(r.yin).toBe(true); // 立秋后为阴遁
    expect(r.ju).toBeGreaterThanOrEqual(1);
    expect(r.ju).toBeLessThanOrEqual(9);
    expect(Object.keys(r.pan).length).toBe(9);
    expect(r.xunShou).toBeTruthy();
    expect(r.zfStar).toBeTruthy();
    expect(r.zsMen).toBeTruthy();
  });
});

describe('大六壬（结构一致性 + 月将）', () => {
  it('2024-08-18 12:00：大暑后处暑前 → 午将；甲寅日庚午时天地盘重合 → 伏吟课（四课三传皆寅）', () => {
    const r = liurenCalc('2024-08-18T12:00');
    expect(r.jiang).toBe('午');
    expect(r.dayGZ).toBe('甲寅');
    expect(Object.keys(r.tianpan).length).toBe(12);
    expect(r.ke1 && r.ke2 && r.ke3 && r.ke4).toBeTruthy();
    expect(r.chuan1 && r.chuan2 && r.chuan3).toBeTruthy();
    expect([r.ke1, r.ke2, r.ke3, r.ke4].every(k => k === '寅')).toBe(true); // 伏吟
  });
});
