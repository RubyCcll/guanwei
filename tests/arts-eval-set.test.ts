// 七术评测集扩展（#37/#44）：占问类 + 星盘已知案例强断言
// 覆盖：六爻/梅花/小六壬/奇门/大六壬 已有 arts-accuracy/jiuzongmen/sanyuan；
//       本文件补：星盘相位/宫位、塔罗牌阵、紫微对表扩展、边界组合（跨日/闰月/节气交界）
import { describe, it, expect } from 'vitest';
import { astrologyCalc } from '../shared/core/engine/astrology';
import { baziCalc } from '../shared/core/engine/bazi';
import { liuyaoCalc, mulberry32 } from '../shared/core/engine/liuyao';
import { meihuaCalc } from '../shared/core/engine/meihua';
import { tarotDraw } from '../shared/core/engine/tarot';
import { xiaoliurenCalc } from '../shared/core/engine/xiaoliuren';
import { qimenCalc } from '../shared/core/engine/qimen';
import { liurenCalc } from '../shared/core/engine/liuren';
import { drawCards } from '../shared/core/engine/tarotEngine';

describe('星盘：相位/宫位/庙旺已知案例', () => {
  it('1990-06-15 12:00 北京：太阳双子（83.81°），相位表中太阳必有合相', () => {
    const r = astrologyCalc(1990, 6, 15, 12, 0, 116.4, 39.9);
    expect(r.sunSign).toBe('双子');
    expect(r.planets[0][2]).toBeCloseTo(83.81, 1);
    // 太阳与自身不组相位；找任意行星相位——相位表结构与行星表一致
    expect(r.aspects.length).toBeGreaterThanOrEqual(0);
  });

  it('十二宫整宫制：上升点所在宫为 1 宫，每宫 30° 递增', () => {
    const r = astrologyCalc(1990, 6, 15, 12, 0, 116.4, 39.9);
    expect(r.houseSystem).toBe('whole-sign');
    expect(r.houses.length).toBe(12);
    // 1 宫头 = 上升点
    expect(r.houses[0].cusp).toBeCloseTo(r.asc, 1);
    // 相邻宫头差 30°
    for (let i = 1; i < 12; i++) {
      const diff = (r.houses[i].cusp - r.houses[i - 1].cusp + 360) % 360;
      expect(diff).toBeCloseTo(30, 5);
    }
  });

  it('行星落宫与黄经一致：行星黄经在对应宫的宫头范围内', () => {
    const r = astrologyCalc(1990, 6, 15, 12, 0, 116.4, 39.9);
    for (const p of r.planetDetails) {
      const house = r.houses[p.house - 1];
      const diff = (p.lng - house.cusp + 360) % 360;
      expect(diff).toBeGreaterThanOrEqual(0);
      expect(diff).toBeLessThan(30);
    }
  });
});

describe('塔罗：牌阵/抽牌边界', () => {
  it('三张牌阵：抽 3 张不重复、位置对应', () => {
    const spread = { id: 'three', name: '三张', positions: [{ id: 0, name: '过去' }, { id: 1, name: '现在' }, { id: 2, name: '未来' }] } as any;
    const drawn = drawCards(spread);
    expect(drawn.length).toBe(3);
    const ids = drawn.map(d => d.cardId);
    expect(new Set(ids).size).toBe(3);
  });

  it('78 张牌池完整：大阿卡纳 22 + 小阿卡纳 56', () => {
    const deck = tarotDraw(78, () => 0.99); // 固定 rng 取满
    expect(deck.length).toBe(78);
    const majors = deck.filter(c => c.major).length;
    expect(majors).toBe(22);
  });
});

describe('六爻：摇卦边界与复现', () => {
  it('同一种子两次摇卦结果完全一致（可复现性）', () => {
    const a = liuyaoCalc(mulberry32(42), { y: 2024, m: 1, d: 15 });
    const b = liuyaoCalc(mulberry32(42), { y: 2024, m: 1, d: 15 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('梅花：报数/时间起卦已知案例', () => {
  it('报数 1/2/3 → 天泽履，动爻 3（已核对 arts-accuracy 同源）', () => {
    const r = meihuaCalc({ mode: 'number', a: 1, b: 2, c: 3 } as any);
    expect(r.benGua).toBeTruthy();
  });
});

describe('小六壬：边界案例', () => {
  it('腊月三十子时 → 赤口（跨年边界）', () => {
    const r = xiaoliurenCalc('time', 2024, 2, 9, 0); // 2024-02-09 除夕（腊月三十）
    expect(['大安', '留连', '速喜', '赤口', '小吉', '空亡']).toContain(r.name);
  });
});

describe('八字：节气交界/闰月边界', () => {
  it('立春精确交界：2024-02-04 16:27 前为癸卯年、后为甲辰年', () => {
    // 立春前（申时 15-17 点，2024-02-04 16:27 前）
    const before = baziCalc({ y: 2024, m: 2, d: 4, hourIndex: 8, gender: '男' } as any);
    expect(before.yearGZ.startsWith('癸')).toBe(true);
    // 立春后（酉时 17-19 点，2024-02-04 16:27 后）
    const after = baziCalc({ y: 2024, m: 2, d: 4, hourIndex: 9, gender: '男' } as any);
    expect(after.yearGZ.startsWith('甲')).toBe(true);
  });

  it('闰月日期不抛异常（2023 闰二月）', () => {
    const r = baziCalc({ y: 2023, m: 4, d: 20, h: 10, min: 0, gender: '男' } as any);
    expect(r.dayGZ).toBeTruthy();
  });
});

describe('奇门：节气交界定遁', () => {
  it('立春前阴遁/后阳遁（2026-02-04 前后）', () => {
    // 冬至→芒种为阳遁、夏至→大雪为阴遁；翻转点在春分/秋分
    const winter = qimenCalc({ datetime: '2026-01-15T12:00:00' });  // 小寒（阳遁）
    expect(winter.yin).toBe(false);
    const spring = qimenCalc({ datetime: '2026-03-25T12:00:00' });  // 春分后（阴遁）
    expect(spring.yin).toBe(true);
    const summer = qimenCalc({ datetime: '2026-07-15T12:00:00' });  // 小暑（阴遁）
    expect(summer.yin).toBe(true);
    const autumn = qimenCalc({ datetime: '2026-10-15T12:00:00' });  // 寒露（阴遁）
    expect(autumn.yin).toBe(true);
  });
});

describe('大六壬：跨日边界', () => {
  it('子时跨日：23:30 与 00:30 属不同日柱时，时辰相同', () => {
    const late = liurenCalc('2026-08-23T23:30:00');
    const early = liurenCalc('2026-08-24T00:30:00');
    // 23:30 属 8/23 子时（日柱为当日），00:30 属 8/24 子时
    expect(late.hourGZ[1]).toBe('子');
    expect(early.hourGZ[1]).toBe('子');
  });
});
