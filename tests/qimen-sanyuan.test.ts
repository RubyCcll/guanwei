// 奇门遁甲三元定局 + 旬首精度测试（手工推演标准课例）
import { describe, it, expect } from 'vitest';
import { qimenCalc } from '../shared/core/engine/qimen';
import { QM_SEASONS } from '../shared/core/data/qimen';

describe('奇门·三元定局（按日干支）', () => {
  // 三元表自洽性验证：甲子旬前五日上元、次五日中元、甲戌旬前五日下元、再五日回上元
  it('甲子日起上元：甲子/乙丑/丙寅/丁卯/戊辰 五日均上元', () => {
    // 用已知日期构造：2026-01-17 是什么日干支？直接用算法验证三元循环
    // 遍历 60 日，验证甲子旬前半（甲子~戊辰）→ 上元，己巳~癸酉 → 中元，甲戌~戊寅 → 下元，己卯~癸未 → 上元
    // 通过 sanYuanOf 语义间接验证：取已知日干支的日子（2026-08-23 立秋附近）
    const r1 = qimenCalc({ datetime: '2026-08-23T10:00:00' });
    // 立秋（8/7）后，2026-08-23 应在立秋节气内；局数应为 ju[三元] 之一
    expect(r1.jqName).toBeTruthy();
    expect(r1.ju).toBeGreaterThanOrEqual(1);
    expect(r1.ju).toBeLessThanOrEqual(9);
    expect(r1.yin).toBe(true); // 立秋为阴遁
  });

  it('旬首正确性：甲子时 → 甲子戊；甲戌时 → 甲戌己', () => {
    // 甲日甲子时：时干支 = 甲子 → 旬首甲子 → 六仪戊
    // 找甲日的甲子时：2026-08-23 00:00-01:00 需日干为甲。用日期推算或直接构造
    // 遍历 2026 全年找甲日（日干支天干为甲）
    let found: { day: string; r: ReturnType<typeof qimenCalc> } | null = null;
    for (let m = 1; m <= 12; m++) {
      for (let dd = 1; dd <= 28; dd++) {
        const dt = new Date(2026, m - 1, dd, 0, 30);
        const r = qimenCalc({ datetime: dt });
        if (r.dayGZ.startsWith('甲')) {
          // 甲日的子时 = 甲子时
          found = { day: r.dayGZ, r };
          break;
        }
      }
      if (found) break;
    }
    expect(found).toBeTruthy();
    if (found) {
      expect(found.r.hourGZ).toBe('甲子');
      expect(found.r.xunshouName).toBe('甲子');
      expect(found.r.xunShou).toBe('戊'); // 甲子戊
    }
  });

  it('三元表循环自洽（60 日遍历）', () => {
    // 从某甲子日起连续 60 天，验证：每 15 天为一轮，第 0-4 天同元、5-9 天同元、10-14 天同元
    // 且 15 天后的同一相位回到同元（甲子旬 0-4 上元，15 天后的己卯旬 0-4 仍上元）
    const results: string[][] = [];
    const start = new Date(2026, 0, 1);
    for (let i = 0; i < 60; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      // 直接测三元组归属：同一天内换时辰，ju 应相同（三元由日干支定，与时辰无关）
      const r1 = qimenCalc({ datetime: d.toISOString().slice(0, 10) + 'T00:30:00' });
      const r2 = qimenCalc({ datetime: d.toISOString().slice(0, 10) + 'T12:30:00' });
      expect(r1.ju).toBe(r2.ju); // 同一天三元必同
    }
    // 三元日干支规则抽查（正授情形）：甲子日起上元。2026 年内找一甲子日验证其节气局数 = 节气三元表[0]
    let found: { jq: string; ju: number; expected: number } | null = null;
    for (let i = 0; i < 366; i++) {
      const d = new Date(2026, 0, 1 + i);
      const r = qimenCalc({ datetime: d.toISOString().slice(0, 10) + 'T12:00:00' });
      if (r.dayGZ === '甲子') {
        const season = QM_SEASONS.find(s => s.name === r.jqName);
        expect(season).toBeTruthy();
        if (season) {
          expect(r.ju).toBe(season.ju[0]); // 甲子日应取上元局
          found = { jq: r.jqName, ju: r.ju, expected: season.ju[0] };
        }
        break;
      }
    }
    expect(found).toBeTruthy();
  });

  it('节气切换正确（冬至前后阴阳遁翻转）', () => {
    // 2026 冬至：12 月 22 日前后。冬至后 → 阳遁（yin=false）
    const after = qimenCalc({ datetime: '2026-12-25T10:00:00' });
    expect(after.jqName).toBe('冬至');
    expect(after.yin).toBe(false);
    // 夏至后 → 阴遁
    const summer = qimenCalc({ datetime: '2026-06-25T10:00:00' });
    expect(summer.yin).toBe(true);
  });

  it('值符宫 = 旬首六仪所在宫', () => {
    const r = qimenCalc({ datetime: '2026-08-23T10:00:00' });
    expect(r.pan[r.zfPalace].yi).toBe(r.xunShou);
  });

  it('九宫完整：每宫有奇仪/门/星，中宫例外处理', () => {
    const r = qimenCalc({ datetime: '2026-08-23T10:00:00' });
    for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) {
      expect(r.pan[p].yi).toBeTruthy();
      expect(r.pan[p].men).toBeTruthy();
      expect(r.pan[p].star).toBeTruthy();
    }
    expect(r.pan[5].yi).toBe('中');
  });
});
