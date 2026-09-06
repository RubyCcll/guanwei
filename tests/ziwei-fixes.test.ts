// 紫微算法修正回归（2026-09-05 边界反馈）：
// 昼夜亮度（太阳喜昼/太阴喜夜）、水澄桂萼等新格局、空宫借对宫、杂曜补全
import { describe, it, expect } from 'vitest';
import { ziweiCalc } from '../shared/core/engine/ziwei';

// 用固定干支构造盘（癸酉年），便于对照
function chart(month: number, hour: number, opts: any = {}) {
  return ziweiCalc({ ganzhi: '癸酉', month, day: 1, hour, gender: '女', birthYear: 1993, ...opts });
}
const Z = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

describe('紫微修正层', () => {
  it('昼夜判定：卯~申时支(2..7)=昼，酉~寅=夜', () => {
    expect(chart(1, 2).dayNight).toBe('day');   // 卯
    expect(chart(1, 7).dayNight).toBe('day');   // 申
    expect(chart(1, 8).dayNight).toBe('night'); // 酉
    expect(chart(1, 1).dayNight).toBe('night'); // 丑
  });

  it('昼夜亮度调整：太阳昼生不低于原、太阴夜生不低于原（庙陷为界）', () => {
    for (let m = 1; m <= 12; m++) {
      const day = chart(m, 3);    // 昼
      const night = chart(m, 9);  // 夜
      const lv: Record<string, number> = { 陷: 1, 平: 2, 利: 3, 得: 4, 旺: 5, 庙: 6 };
      if (day.zwStars['太阳'] !== undefined) {
        expect(lv[day.effBrightness['太阳']]).toBeGreaterThanOrEqual(lv[day.brightness['太阳']]);
      }
      if (night.zwStars['太阴'] !== undefined) {
        expect(lv[night.effBrightness['太阴']]).toBeGreaterThanOrEqual(lv[night.brightness['太阴']]);
      }
    }
  });

  it('水澄桂萼：太阴在子庙 → 识别', () => {
    // 穷举找太阴在子的盘
    let found = false;
    for (let m = 1; m <= 12 && !found; m++) {
      for (let h = 0; h < 12; h++) {
        const r = chart(m, h);
        if (Z[r.zwStars['太阴']] === '子' && r.effBrightness['太阴'] === '庙') {
          found = r.geju.some(g => g.key === '水澄桂萼');
          expect(r.geju.some(g => g.key === '水澄桂萼')).toBe(true);
          break;
        }
      }
    }
    if (!found) console.warn('未找到太阴在子庙的盘（视紫微排布而定）——跳过');
  });

  it('空宫借对宫：无主星之宫列出对宫主星', () => {
    const r = chart(1, 8);
    expect(r.borrowedStars).toBeTruthy();
    // 有主星的宫不借
    for (let i = 0; i < 12; i++) {
      const p = r.palaces[i];
      const own = Object.keys(r.zwStars).filter(s => r.zwStars[s] === p);
      if (own.length > 0) expect(r.borrowedStars![i] || []).toEqual([]);
    }
  });

  it('杂曜补全：三台/八座/天才/天寿/恩光/天贵 皆布宫', () => {
    const r = chart(1, 8, { solarDate: [1993, 1, 23], location: { lng: 116.4, lat: 39.9 } });
    for (const s of ['三台', '八座', '天才', '天寿', '恩光', '天贵']) {
      expect(r.fuStars[s], s + ' 应在盘上').toBeGreaterThanOrEqual(0);
    }
  });
});
