import { describe, it, expect } from 'vitest';
import { dailyAlmanac, dailySky, dailyFortune } from '../shared/core/engine/daily';

describe('每日星相与黄历', () => {
  it('黄历：农历/干支/宜忌/月相/星座', () => {
    const a = dailyAlmanac(new Date(2024, 7, 18));
    expect(a.lunarText).toBeTruthy();
    expect(a.ganzhi.length).toBe(2);
    expect(a.yi.length).toBeGreaterThan(0);
    expect(a.ji.length).toBeGreaterThan(0);
    expect(a.yueXiang).toBeTruthy();
    expect(a.xingZuo).toBeTruthy();
  });
  it('星相：太阳/月亮落座 + 7 行星', () => {
    const s = dailySky(new Date(2024, 7, 18));
    expect(s.sunSign).toBeTruthy();
    expect(s.moonSign).toBeTruthy();
    expect(s.planets.length).toBe(7);
  });
  it('运势：同日稳定 + 个性化标记', () => {
    const f1 = dailyFortune(new Date(2024, 7, 18));
    const f2 = dailyFortune(new Date(2024, 7, 18));
    expect(f1.text).toBe(f2.text);
    expect(f1.personalized).toBe(false);
    const fp = dailyFortune(new Date(2024, 7, 18), '天蝎座');
    expect(fp.personalized).toBe(true);
    expect(fp.sign).toBe('天蝎座');
  });
});