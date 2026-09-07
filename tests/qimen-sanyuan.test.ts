// 奇门遁甲定局回归（拆补法口径，2026-09 起）
// 注：定局权威性由 tests/qimen-chaibu.test.ts（vs qimen-dunjia 16 案例 × 五层逐宫）保证；
//     本文件为引擎内部一致性/防回归测试。
import { describe, it, expect } from 'vitest';
import { qimenCalc } from '../shared/core/engine/qimen';

describe('奇门·定局回归（拆补口径）', () => {
  it('旬首正确性：甲日甲子时 → 甲子戊', () => {
    let found: { day: string; r: ReturnType<typeof qimenCalc> } | null = null;
    for (let m = 1; m <= 12 && !found; m++) {
      for (let dd = 1; dd <= 28 && !found; dd++) {
        const r = qimenCalc({ datetime: new Date(2026, m - 1, dd, 0, 30) });
        if (r.dayGZ.startsWith('甲') && r.hourGZ === '甲子') found = { day: r.dayGZ, r };
      }
    }
    expect(found).toBeTruthy();
    if (found) {
      expect(found.r.xunshouName).toBe('甲子');
      expect(found.r.xunShou).toBe('戊'); // 甲子戊
    }
  });

  it('值符星 = 旬首六仪在地盘宫的原星；符首入中时值使寄坤=死门', () => {
    for (const dt of ['2026-08-23T10:00:00', '2024-04-20T06:00:00', '2024-01-15T10:00:00']) {
      const r = qimenCalc({ datetime: dt });
      const diPalace = Number(Object.keys(r.pan).find(p => r.pan[Number(p)].yi === r.xunShou) || 1);
      const origStars: Record<number, string> = { 1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽', 6: '天心', 7: '天柱', 8: '天任', 9: '天英' };
      if (diPalace === 5) {
        expect(r.zsMen).toBe('死'); // 中宫无门，值使寄坤
      } else {
        expect(r.zfStar).toBe(origStars[diPalace]);
        // 值符星出现在转盘九星中（中宫为天禽时除外）
        const all = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => r.pan[p].star);
        expect(all).toContain(r.zfStar);
      }
    }
  });

  it('值符落宫 = 值符星转后所在（入中寄坤）；2024-01-15 丁巳时定局核对', () => {
    // 与 qimen-dunjia 权威：小寒中元阳 8 局；丁巳时符首癸在地盘巽；值符天辅入中（寄坤 2）；值使杜门落兑 7
    const r = qimenCalc({ datetime: '2024-01-15T10:00:00' });
    expect(r.jqName).toBe('小寒');
    expect(r.yin).toBe(false);
    expect(r.ju).toBe(8);
    expect(r.xunshouName).toBe('甲寅');
    expect(r.zfStar).toBe('天辅');
    expect(r.zfPalace).toBe(2); // 入中寄坤
    expect(r.zsMen).toBe('杜');
    expect(r.zsPalace).toBe(7); // 兑
  });

  it('九宫完整：地盘奇仪/转盘星门/八神，中宫无门、星为天禽', () => {
    const r = qimenCalc({ datetime: '2026-08-23T10:00:00' });
    for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) {
      expect(r.pan[p].yi, '宫' + p + ' 地盘').toBeTruthy();
      expect(r.pan[p].men, '宫' + p + ' 门').toBeTruthy();
      expect(r.pan[p].star, '宫' + p + ' 星').toBeTruthy();
      expect(r.shen[p], '宫' + p + ' 神').toBeTruthy();
    }
    expect(r.pan[5].yi).toBeTruthy(); // 中宫有地盘奇仪
    expect(r.pan[5].star).toBe('天禽');
    expect(r.pan[5].men).toBe('');
    expect(r.shen[5]).toBe('');
    expect(r.tianYi[5]).toBeTruthy(); // 天盘中宫保留地盘原值
  });

  it('阴阳遁分界（冬至/夏至翻转）', () => {
    expect(qimenCalc({ datetime: '2026-12-25T10:00:00' }).yin).toBe(false); // 冬至后阳遁
    expect(qimenCalc({ datetime: '2026-06-25T10:00:00' }).yin).toBe(true);  // 夏至后阴遁
  });
});
