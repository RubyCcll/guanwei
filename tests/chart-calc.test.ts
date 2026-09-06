// chartCalc 统一调度测试：九术排盘（divine 路由与 /v1/chart 同源）
import { describe, it, expect } from 'vitest';
import { chartCalc, CHART_ARTS, CHART_INPUT_SCHEMA } from '../shared/core/engine/chart';

describe('chartCalc（唯一算法副本调度）', () => {
  it('九术全覆盖：每术都能排盘', () => {
    for (const art of CHART_ARTS) {
      const inputs: any = art === 'bazi' ? { y: 1993, m: 1, d: 23, hourIndex: 1, gender: '男' }
        : art === 'astrology' ? { y: 1993, m: 1, d: 23, hour: 2, min: 0, lng: 116.4, lat: 39.9 }
        : art === 'qimen' || art === 'liuren' ? { datetime: '2026-08-29T12:00:00' }
        : art === 'meihua' ? { mode: 'number', n1: 3, n2: 5, n3: 7 }
        : art === 'liuyao' ? {}
        : art === 'xiaoliuren' ? { mode: 'time', m: 8, d: 29, h: 6 }
        : art === 'tarot' ? { n: 3 }
        : { ganzhi: '壬申', month: 1, day: 1, hour: 1, time: '02:00', gender: '男', location: null, birthYear: 1993, solarDate: [1993, 1, 23] };  // ziwei
      const r = chartCalc(art, inputs);
      expect(r).toBeTruthy();
    }
  });

  it('bazi 排盘：1993-01-23 寅时男 → 壬申年柱', () => {
    const r: any = chartCalc('bazi', { y: 1993, m: 1, d: 23, hourIndex: 1, gender: '男' });
    expect(r.yearGZ).toBe('壬申');
  });

  it('liuren 排盘与引擎一致：2026-08-29 午时 → 巳将/知一课', () => {
    const r: any = chartCalc('liuren', { datetime: '2026-08-29T12:00:00' });
    expect(r.jiang).toBe('巳');
    expect(r.chuanMethod).toBe('知一课');
  });

  it('未知术名抛错', () => {
    expect(() => chartCalc('bogus', {})).toThrow(/术无此名/);
  });

  it('能力清单：9 术齐 + 每术有 schema', () => {
    expect(Object.keys(CHART_INPUT_SCHEMA).length).toBe(9);
    expect(CHART_INPUT_SCHEMA.bazi.y).toContain('公历');
  });
});
