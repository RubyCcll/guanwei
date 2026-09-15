// 奇门遁甲 vs qimen-dunjia 3.1.0（拆补法权威实现，MIT）交叉验证
// 对照层：阴阳遁/局数、值符星/落宫、值使门/落宫、地盘/天盘奇仪、八门、九星、八神（逐宫）
// qimen-dunjia 输出繁体，逐项做简繁归一后比对
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { qimenCalc } from '../shared/core/engine/qimen';

const require = createRequire(import.meta.url);
let QD: any = null;
beforeAll(() => { QD = require('qimen-dunjia'); });

const T2S: Record<string, string> = {
  '天輔': '天辅', '天沖': '天冲', '天芮': '天芮', '天蓬': '天蓬', '天柱': '天柱', '天心': '天心', '天任': '天任', '天英': '天英', '天禽': '天禽',
  '傷門': '伤门', '杜門': '杜门', '景門': '景门', '死門': '死门', '驚門': '惊门', '開門': '开门', '休門': '休门', '生門': '生门',
  '值符': '值符', '螣蛇': '腾蛇', '太陰': '太阴', '六合': '六合', '勾陳': '勾陈', '朱雀': '朱雀', '九地': '九地', '九天': '九天',
  '白虎': '白虎', '玄武': '玄武', '騰蛇': '腾蛇', '天沖': '天冲',
  '坎': '坎', '坤': '坤', '震': '震', '巽': '巽', '中': '中', '乾': '乾', '兌': '兑', '艮': '艮', '離': '离',
};
const s2 = (x: string) => (T2S[x] ?? x).replace('門', '门');
// qimen-dunjia 九宫方位序 → 宫号（1 坎 … 9 离）
const IDX2P = [4, 9, 2, 3, 5, 7, 8, 1, 6];

// [YYYYMMDDHH, 期望局/阴阳来自权威库运行时计算]
const CASES = ['2024011510', '2024011522', '2024020417', '2024032112', '2024060108', '2024092314', '2024081812', '2024122200',
  '2026011510', '1991081720', '2024042006', '2024081806', '2024062105', '2025120708', '2024020416', '2023122205',
  '2024010123', '1991081723', '2026051023'];   // 夜子时（23:00）——2026-09 修 P0：日柱须进一日

describe('奇门 vs qimen-dunjia（拆补法权威）', () => {
  it('阴阳遁/局数/值符/值使 全对齐（16 案例）', () => {
    for (const dt of CASES) {
      const c: any = QD.chartToObject(QD.generateChartByDatetime(dt));
      const iso = dt.slice(0, 4) + '-' + dt.slice(4, 6) + '-' + dt.slice(6, 8) + 'T' + dt.slice(8, 10) + ':00';
      const g = qimenCalc({ datetime: iso });
      const tag = dt;
      const LNames = ['巽', '离', '坤', '震', '中', '兑', '艮', '坎', '乾'];
      const palaceOf = (nm: string) => IDX2P[LNames.indexOf(nm === '中' ? '坤' : nm)]; // 中宫寄坤
      expect(g.yin, tag + ' 阴阳').toBe(c.陰陽 === '陰');
      expect(g.ju, tag + ' 局数').toBe(c.局數);
      expect(g.zfStar, tag + ' 值符星').toBe(s2(c.值符));
      expect(g.zfPalace, tag + ' 值符落宫').toBe(palaceOf(s2(c.值符落宮)));
      expect(s2(g.zsMen), tag + ' 值使门').toBe(s2(c.值使 || '').replace('门', '') === '' ? '' : s2(c.值使).replace('门', ''));
      expect(g.zsPalace, tag + ' 值使落宫').toBe(palaceOf(s2(c.值使落宮)));
    }
  });

  it('五层逐宫对齐：地盘/天盘/八门/九星/八神（16 案例 × 9 宫）', () => {
    for (const dt of CASES) {
      const c: any = QD.chartToObject(QD.generateChartByDatetime(dt));
      const iso = dt.slice(0, 4) + '-' + dt.slice(4, 6) + '-' + dt.slice(6, 8) + 'T' + dt.slice(8, 10) + ':00';
      const g = qimenCalc({ datetime: iso });
      const zip = (arr: string[]) => Object.fromEntries(arr.map((v, i) => [IDX2P[i], s2(v)]));
      const diL = zip(c['地盤']), tiL = zip(c['天盤']), starL = zip(c['九星']), godL = zip(c['八神']);
      const doorL = Object.fromEntries(Object.entries(zip(c['天門'])).map(([k, v]) => [k, (v as string).replace(/门$/, '')]));
      for (let p = 1; p <= 9; p++) {
        const tag = `${dt} 宫${p}`;
        expect(g.pan[p].yi, tag + ' 地盘').toBe(diL[p]);
        if (p !== 5) {
          expect(g.tianYi[p], tag + ' 天盘').toBe(tiL[p]);
          expect(g.pan[p].men, tag + ' 八门').toBe(doorL[p]);
          expect(g.shen[p], tag + ' 八神').toBe(godL[p]);
        }
        expect(g.pan[p].star, tag + ' 九星').toBe(starL[p]);
      }
    }
  });
});
