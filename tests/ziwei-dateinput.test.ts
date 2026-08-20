import { describe, it, expect } from 'vitest';
import { Solar } from 'lunar-typescript';
import { ziweiCalc } from '../shared/core/engine/ziwei';

describe('紫微公历输入排盘', () => {
  it('公历 1993-01-01 → 农历 1992 腊月初九 → 排盘不崩溃且结果完整', () => {
    const lunar = Solar.fromYmd(1993, 1, 1).getLunar();
    const gz = lunar.getYearInGanZhi();
    const lm = Math.abs(lunar.getMonth());
    const ld = lunar.getDay();
    expect(gz.length).toBe(2);
    expect(lm).toBeGreaterThanOrEqual(1);
    expect(lm).toBeLessThanOrEqual(12);
    const r = ziweiCalc({ ganzhi: gz, month: lm, day: ld, hour: 0, gender: '男', birthYear: 1993 });
    expect(r.juName).toBeTruthy();
    expect(r.ming).toBeGreaterThanOrEqual(0);
    expect(Object.keys(r.zwStars).length).toBe(14);
  });
  it('农历闰月（2023 闰二月）公历对应日排盘', () => {
    // 2023-03-22 是闰二月初一
    const lunar = Solar.fromYmd(2023, 3, 22).getLunar();
    expect(lunar.getMonth()).toBe(-2);
    const r = ziweiCalc({ ganzhi: lunar.getYearInGanZhi(), month: 2, day: 1, hour: 6, gender: '女', birthYear: 2023 });
    expect(r.zwStars['紫微']).toBeGreaterThanOrEqual(0);
  });
});