// 星盘（西洋占星）vs Swiss Ephemeris（瑞士星历，占星行业事实标准）交叉验证
// 覆盖：7 古典行星回归黄经（视位置）、上升点 Asc、中天 MC
// 环境：需 python3 环境含 pyswisseph（默认 /tmp/swe-venv；可用环境变量 SWE_PYTHON 覆盖）；缺环境时整组跳过
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { astrologyCalc } from '../shared/core/engine/astrology';

// python 解释器探测：SWE_PYTHON → 项目内 .swe-venv → /tmp venv → 系统 python3
const PY: string = [
  process.env.SWE_PYTHON,
  require('path').join(process.cwd(), '.swe-venv/bin/python'),
  '/tmp/swe-venv/bin/python',
].filter(Boolean).find((p: string) => existsSync(p)) || 'python3';
const SCRIPT = require('path').join(process.cwd(), 'tests/helpers/swe_ephemeris.py');

// [y,m,d,hour,min,lng,lat] 北京时间
const CASES: [number, number, number, number, number, number, number][] = [
  [1991, 8, 17, 16, 30, 116.078627, 37.209527],   // 报告案例（武城）
  [1990, 6, 15, 12, 0, 113.26, 23.13],             // 广州正午
  [1985, 8, 16, 14, 30, 113.26, 23.13],            // 广州
  [2000, 1, 1, 6, 15, 116.4, 39.9],                // 北京清晨
  [2024, 2, 4, 16, 28, 121.5, 31.2],               // 上海
  [1966, 5, 16, 10, 20, 104.07, 30.67],            // 成都
  [1958, 9, 12, 3, 20, 87.62, 43.83],              // 乌鲁木齐（东经 87°）
  [2031, 6, 30, 22, 45, 114.06, 22.54],            // 深圳
];

// 模块级探测：无 pyswisseph 时显式 skip（不再静默 return「假通过」——2026-09 修 P1-3）
const HAS_SWE: boolean = (() => {
  if (!existsSync(PY)) return false;
  try { execFileSync(PY, ['-c', 'import swisseph'], { encoding: 'utf8', timeout: 15000 }); return true; }
  catch { return false; }
})();
if (!HAS_SWE) console.warn('[astro-sweph] pyswisseph 不可用（' + PY + '）→ 本组显式 skip；CI 会安装以保证真跑');

function angDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

describe('星盘 vs Swiss Ephemeris（事实标准）', () => {
  it.skipIf(!HAS_SWE)('7 行星黄经 + 上升 + 中天 全对齐（8 时空案例）', () => {
    const input = { cases: CASES.map(([y, m, d, hour, min, lng, lat]) => ({ y, m, d, hour, min, lng, lat })) };
    const out = execFileSync(PY, [SCRIPT], { input: JSON.stringify(input), encoding: 'utf8', timeout: 60000 });
    const { results } = JSON.parse(out);
    expect(results.length).toBe(CASES.length);
    for (let i = 0; i < CASES.length; i++) {
      const [y, m, d, hour, min, lng, lat] = CASES[i];
      const g = astrologyCalc(y, m, d, hour, min, lng, lat);
      const s = results[i];
      const tag = `${y}-${m}-${d} ${hour}:${min} (${lng},${lat})`;
      for (const p of g.planets) {
        const cn = p[0];
        expect(angDiff(p[2], s.planets[cn]), tag + ' ' + cn).toBeLessThan(0.05);   // 黄经 ≤0.05°
      }
      expect(angDiff(g.asc, s.asc), tag + ' 上升').toBeLessThan(0.1);              // 上升 ≤0.1°
      expect(angDiff(g.mc, s.mc), tag + ' 中天').toBeLessThan(0.1);
    }
  });

  it.skipIf(!HAS_SWE)('引擎输出结构自洽：行星落宫=整宫制（asc 起 1 宫）', () => {
    for (const [y, m, d, hour, min, lng, lat] of CASES.slice(0, 4)) {
      const g = astrologyCalc(y, m, d, hour, min, lng, lat);
      for (const pd of g.planetDetails) {
        // 整宫制：宫号 = floor((黄经 - asc)/30) + 1
        const expectHouse = Math.floor(((pd.lng - g.asc + 360) % 360) / 30) + 1;
        expect(pd.house, `${y}-${m}-${d} ${pd.cn}`).toBe(expectHouse);
      }
    }
  });
});
