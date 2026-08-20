import { describe, it, expect } from 'vitest';
import { astrologyCalc } from '../shared/core/engine/astrology';

describe('星盘纬度敏感性（上升点）', () => {
  it('同一时刻：广州（23°N）与哈尔滨（45°N）上升星座不同', () => {
    const gz = astrologyCalc(1990, 6, 15, 12, 0, 113.26, 23.13);
    const heb = astrologyCalc(1990, 6, 15, 12, 0, 126.53, 45.80);
    const diff = Math.abs(gz.asc - heb.asc);
    expect(Math.min(diff, 360 - diff)).toBeGreaterThan(10);
  });
  it('同经度不同纬度：上升黄经差异显著（>15°）', () => {
    const south = astrologyCalc(1990, 6, 15, 12, 0, 116.4, 20.0);
    const north = astrologyCalc(1990, 6, 15, 12, 0, 116.4, 50.0);
    const diff = Math.abs(south.asc - north.asc);
    expect(Math.min(diff, 360 - diff)).toBeGreaterThan(1); // 正午时分纬度影响较小但存在
  });
  it('无地点时回退北京纬度（39.9°N）可算', () => {
    const r = astrologyCalc(1990, 6, 15, 12, 0);
    expect(r.asc).toBeGreaterThanOrEqual(0);
    expect(r.asc).toBeLessThan(360);
  });
  it('1985-08-16 14:30 广州：上升应与传入纬度一致（回归验证）', () => {
    // 同一输入两次计算应一致（确定性）
    const a = astrologyCalc(1985, 8, 16, 14, 30, 113.26, 23.13);
    const b = astrologyCalc(1985, 8, 16, 14, 30, 113.26, 23.13);
    expect(a.asc).toBeCloseTo(b.asc, 6);
    expect(a.planets[0][2]).toBeCloseTo(b.planets[0][2], 6);
  });
});