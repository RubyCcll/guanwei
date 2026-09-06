// 八字排盘 vs lunar-typescript EightChar（独立权威实现）交叉验证
// 覆盖：四柱干支 / 胎元命宫身宫 / 大运序列与起运 / 节气分钟级边界 / 晚子时口径
// lunar 侧统一 sect=2（日柱不换、晚子时时柱归次日——与 guanwei 引擎口径一致）
import { describe, it, expect, beforeAll } from 'vitest';
import { baziCalc } from '../shared/core/engine/bazi';

let LT: any = null;
beforeAll(async () => { LT = await import('lunar-typescript'); });

// [y,m,d,HH:mm,hourIndex,gender]  gender '男'|'女'
const CASES: [number, number, number, string, number, '男' | '女'][] = [
  [1991, 8, 17, '16:30', 8, '男'],   // 报告案例：辛未 丙申 己未 壬申 / 逆行 4 岁起运 / 命宫辛丑 身宫癸巳
  [1991, 8, 17, '23:30', 0, '女'],   // 晚子时：日柱不换（己未）、时柱按次日干（丙子）
  [1991, 8, 18, '00:30', 0, '女'],   // 早子时：庚申日 丙子时
  [1993, 1, 23, '04:00', 2, '男'],   // 立春前 → 壬申年
  [2024, 2, 4, '16:26', 8, '男'],    // 立春前 1 分 → 癸卯 乙丑
  [2024, 2, 4, '16:28', 8, '男'],    // 立春后 1 分 → 甲辰 丙寅（分钟级节界，回归 2026-09 修复）
  [1990, 6, 15, '12:00', 6, '男'],
  [1984, 2, 2, '08:30', 4, '女'],    // 近立春 2.6 天 → 1 岁即起运
  [2000, 1, 1, '06:15', 3, '男'],    // 立春前 → 己卯年，逆行
  [2031, 6, 30, '22:45', 11, '女'],
];

describe('八字 vs lunar-typescript EightChar（标准交叉验证）', () => {
  it('四柱 + 胎元/命宫/身宫 干支全对齐（10 案例）', () => {
    for (const [y, m, d, time, hourIdx, gender] of CASES) {
      const [hh, mm] = time.split(':').map(Number);
      const g = baziCalc({ y, m, d, hourIndex: hourIdx, gender, time });
      const ec = LT.Solar.fromYmdHms(y, m, d, hh, mm, 0).getLunar().getEightChar();
      ec.setSect(2);
      const tag = `${y}-${m}-${d} ${time} ${gender}`;
      expect(g.yearGZ, tag + ' 年柱').toBe(ec.getYear());
      expect(g.monthGZ, tag + ' 月柱').toBe(ec.getMonth());
      expect(g.dayGZ, tag + ' 日柱').toBe(ec.getDay());
      expect(g.hourGZ, tag + ' 时柱').toBe(ec.getTime());
      expect(g.taiyuan, tag + ' 胎元').toBe(ec.getTaiYuan());
      expect(g.minggong, tag + ' 命宫').toBe(ec.getMingGong());
      expect(g.shengong, tag + ' 身宫').toBe(ec.getShenGong());
    }
  });

  it('起运顺逆 + 起运虚岁 + 大运干支序列全对齐', () => {
    for (const [y, m, d, time, hourIdx, gender] of CASES) {
      const [hh, mm] = time.split(':').map(Number);
      const g = baziCalc({ y, m, d, hourIndex: hourIdx, gender, time });
      const lunar = LT.Solar.fromYmdHms(y, m, d, hh, mm, 0).getLunar();
      const ec = lunar.getEightChar();
      ec.setSect(2);
      const yun = ec.getYun(gender === '男' ? 1 : 0, 2);
      const dy = yun.getDaYun(8);
      const tag = `${y}-${m}-${d} ${time} ${gender}`;
      // 实岁年数精确对齐（3 天=1 岁 取整）；虚岁起运岁：gui 为 floor 取整 +1，
      // lunar DaYun.startAge 按起运精确公历年-生年+1，日级进位可能差 1 岁（口径差，容差 1）
      expect(g.qiYun.startAge - 1, tag + ' 起运实岁').toBe(yun.getStartYear());
      expect(Math.abs(g.qiYun.startAge - dy[1].getStartAge()), tag + ' 起运虚岁(±1)').toBeLessThanOrEqual(1);
      expect(g.qiYun.startMonth, tag + ' 起运月(±1)').toBeGreaterThanOrEqual(Math.max(0, yun.getStartMonth() - 1));
      expect(g.qiYun.startMonth, tag + ' 起运月(±1)').toBeLessThanOrEqual(yun.getStartMonth() + 1);
      expect(g.dayun.length, tag).toBe(8);
      for (let i = 0; i < 6; i++) {
        expect(g.dayun[i].gz, tag + ` 大运${i + 1}`).toBe(dy[i + 1].getGanZhi());
      }
    }
  });

  it('节气分钟级边界：2024-02-04 立春 16:26/16:28 年柱月柱翻转且顺逆随之翻转', () => {
    const before = baziCalc({ y: 2024, m: 2, d: 4, hourIndex: 8, gender: '男', time: '16:26' });
    const after = baziCalc({ y: 2024, m: 2, d: 4, hourIndex: 8, gender: '男', time: '16:28' });
    expect(before.yearGZ + before.monthGZ).toBe('癸卯乙丑');
    expect(after.yearGZ + after.monthGZ).toBe('甲辰丙寅');
    expect(before.dayun[0].gz).toBe('甲子'); // 癸年男逆行：乙丑月退一位
    expect(after.dayun[0].gz).toBe('丁卯');  // 甲年男顺行：丙寅月进一位
  });

  it('晚子时口径：23:30 日柱不变、时柱按次日干（与 lunar sect2 一致）', () => {
    const g = baziCalc({ y: 1991, m: 8, d: 17, hourIndex: 0, gender: '女', time: '23:30' });
    expect(g.dayGZ).toBe('己未'); // 不换日
    expect(g.hourGZ).toBe('丙子'); // 次日庚申日干起子时
    const next = baziCalc({ y: 1991, m: 8, d: 18, hourIndex: 0, gender: '女', time: '00:30' });
    expect(next.dayGZ).toBe('庚申');
    expect(next.hourGZ).toBe('丙子');
  });
});
