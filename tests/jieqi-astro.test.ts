// 节气时刻 vs Swiss Ephemeris 太阳视黄经过宫（天文事实标准）交叉验证
// 覆盖：lunar-typescript 节气表（bazi 年/月柱、奇门遁法、六壬月将全部依赖此表）的地基精度
// 24 节气 = 太阳视黄经到达 315°(立春) 起每 15°；对照 swiss 二分求得的过宫时刻，容差 90 秒
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { getJieQiTableExact } from '../shared/core/engine/calendar';

// python 解释器探测：SWE_PYTHON → 项目内 .swe-venv → /tmp venv → 系统 python3
const PY: string = [
  process.env.SWE_PYTHON,
  require('path').join(process.cwd(), '.swe-venv/bin/python'),
  '/tmp/swe-venv/bin/python',
].filter(Boolean).find((p: string) => existsSync(p)) || 'python3';
const SCRIPT = require('path').join(process.cwd(), 'tests/helpers/swe_ephemeris.py');

// 24 节气：太阳黄经度数与近似日期（bracket 中心）
const JQ: [string, number, string][] = [
  ['小寒', 285, '1-5'], ['大寒', 300, '1-20'], ['立春', 315, '2-4'], ['雨水', 330, '2-19'],
  ['惊蛰', 345, '3-5'], ['春分', 0, '3-20'], ['清明', 15, '4-5'], ['谷雨', 30, '4-20'],
  ['立夏', 45, '5-5'], ['小满', 60, '5-21'], ['芒种', 75, '6-5'], ['夏至', 90, '6-21'],
  ['小暑', 105, '7-7'], ['大暑', 120, '7-22'], ['立秋', 135, '8-7'], ['处暑', 150, '8-23'],
  ['白露', 165, '9-7'], ['秋分', 180, '9-23'], ['寒露', 195, '10-8'], ['霜降', 210, '10-23'],
  ['立冬', 225, '11-7'], ['小雪', 240, '11-22'], ['大雪', 255, '12-7'], ['冬至', 270, '12-22'],
];
const YEARS = [1991, 2024, 2026];

// 模块级探测：无 pyswisseph 时显式 skip（不再静默 return「假通过」——2026-09 修 P1-3）
const HAS_SWE: boolean = (() => {
  if (!existsSync(PY)) return false;
  try { execFileSync(PY, ['-c', 'import swisseph'], { encoding: 'utf8', timeout: 15000 }); return true; }
  catch { return false; }
})();
if (!HAS_SWE) console.warn('[jieqi-astro] pyswisseph 不可用（' + PY + '）→ 本组显式 skip；CI 会安装以保证真跑');

describe('节气时刻 vs Swiss Ephemeris 太阳过宫（天文地基）', () => {
  it.skipIf(!HAS_SWE)('3 年 × 24 节气时刻差 ≤90 秒', () => {
    const targets = [];
    for (const y of YEARS) {
      for (const [name, deg, approx] of JQ) targets.push({ name, deg, approx, y });
    }
    const out = execFileSync(PY, [SCRIPT], { input: JSON.stringify({ mode: 'jieqi', targets }), encoding: 'utf8', timeout: 120000 });
    const { results } = JSON.parse(out);
    expect(results.length).toBe(JQ.length * YEARS.length);
    // lunar 节气表按农历年组织（跨公历年，如 y 表含次年立春）：合并 y-1/y/y+1 三表按名取时间差最小项
    const allTables = [...new Set([...YEARS.map(y => y - 1), ...YEARS, ...YEARS.map(y => y + 1)])]
      .flatMap((yy: number) => getJieQiTableExact(yy));
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const local = new Date(r.time.replace(' ', 'T') + '+08:00');
      const cands = allTables.filter((j: any) => j.name === r.name);
      expect(cands.length, r.name + ' 应有候选项').toBeGreaterThan(0);
      let best = cands[0];
      for (const c of cands) if (Math.abs(c.time.getTime() - local.getTime()) < Math.abs(best.time.getTime() - local.getTime())) best = c;
      const diffS = Math.abs(best.time.getTime() - local.getTime()) / 1000;
      expect(diffS, `${r.name} ${r.y}: lunar=${best.time.toISOString()} swe=${r.time}`).toBeLessThan(90);
    }
  });
});
