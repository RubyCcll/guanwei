import { describe, it, expect } from 'vitest';
import { ziweiCalc } from '../shared/core/engine/ziwei';
import { Solar, Lunar } from 'lunar-typescript';

describe('紫微大限与流年', () => {
  it('五行局定起运岁数（金四局 → 4 岁起）', () => {
    const r = ziweiCalc({ ganzhi: '癸酉', month: 1, day: 1, hour: 0, gender: '男', birthYear: 1993 });
    expect(r.startAge).toBe(4);
    expect(r.dayun?.length).toBe(12);
    expect(r.dayun?.[0].start).toBe(4);
    expect(r.dayun?.[0].end).toBe(13);
  });
  it('大限顺逆：癸酉年（阴干）男命 → 逆行', () => {
    const r = ziweiCalc({ ganzhi: '癸酉', month: 1, day: 1, hour: 0, gender: '男', birthYear: 1993 });
    expect(r.forward).toBe(false);
  });
  it('大限顺逆：癸酉年（阴干）女命 → 顺行', () => {
    const r = ziweiCalc({ ganzhi: '癸酉', month: 1, day: 1, hour: 0, gender: '女', birthYear: 1993 });
    expect(r.forward).toBe(true);
  });
  it('流年：虚岁与流年宫位存在', () => {
    const r = ziweiCalc({ ganzhi: '癸酉', month: 1, day: 1, hour: 0, gender: '男', birthYear: 1993 });
    expect(r.nominalAge).toBeGreaterThan(30);
    expect(r.liunianPalaceName).toBeTruthy();
    expect(Array.isArray(r.liunianStars)).toBe(true);
  });
});

describe('公历农历互转（万年历）', () => {
  it('农历 1995 年 7 月 13 日 → 公历 1995-08-08', () => {
    const s = Lunar.fromYmd(1995, 7, 13).getSolar();
    expect(s.getYear() + '-' + String(s.getMonth()).padStart(2, '0') + '-' + String(s.getDay()).padStart(2, '0')).toBe('1995-08-08');
  });
  it('公历 2023-03-22 → 农历闰二月（负数月）', () => {
    const l = Solar.fromYmd(2023, 3, 22).getLunar();
    expect(l.getMonth()).toBe(-2);
  });
  it('闰月创建：2023 闰二月初一', () => {
    const l = Lunar.fromYmd(2023, -2, 1);
    expect(l.toString()).toContain('闰二');
  });
});