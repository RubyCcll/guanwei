// 六壬月将 vs 天文太阳视黄经（独立验证）
//
// 传统「月将」= 太阳过宫：太阳视黄经每跨 30° 换一将（中气为界）。
// 本测试**不复用引擎的节气表**：用 Swiss Ephemeris 二分求出各中气的真实过宫时刻，
// 再在其前后 6 小时取样，断言引擎 `liurenCalc().jiang` 落在正确区间。
//
// 区间映射（黄经 → 将）：[330,360)亥 [0,30)戌 [30,60)酉 [60,90)申 [90,120)未 [120,150)午
//                        [150,180)巳 [180,210)辰 [210,240)卯 [240,270)寅 [270,300)丑 [300,330)子
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { liurenCalc } from '../shared/core/engine/liuren';

const PY: string = [
  process.env.SWE_PYTHON,
  require('path').join(process.cwd(), '.swe-venv/bin/python'),
  '/tmp/swe-venv/bin/python',
].filter(Boolean).find((p: string) => existsSync(p)) || 'python3';
const SCRIPT = require('path').join(process.cwd(), 'tests/helpers/swe_ephemeris.py');

const HAS_SWE: boolean = (() => {
  if (!existsSync(PY)) return false;
  try { execFileSync(PY, ['-c', 'import swisseph'], { encoding: 'utf8', timeout: 15000 }); return true; }
  catch { return false; }
})();
if (!HAS_SWE) console.warn('[liuren-jiang-astro] pyswisseph 不可用 → 本组显式 skip');

// 12 中气：黄经度数 → 该中气起用的月将（寅起序无所谓，这里直接用将支）
const ZHONGQI: { name: string; deg: number; approx: string; jiang: string }[] = [
  { name: '大寒', deg: 300, approx: '1-20', jiang: '子' },
  { name: '雨水', deg: 330, approx: '2-19', jiang: '亥' },
  { name: '春分', deg: 0, approx: '3-20', jiang: '戌' },
  { name: '谷雨', deg: 30, approx: '4-20', jiang: '酉' },
  { name: '小满', deg: 60, approx: '5-21', jiang: '申' },
  { name: '夏至', deg: 90, approx: '6-21', jiang: '未' },
  { name: '大暑', deg: 120, approx: '7-22', jiang: '午' },
  { name: '处暑', deg: 150, approx: '8-23', jiang: '巳' },
  { name: '秋分', deg: 180, approx: '9-23', jiang: '辰' },
  { name: '霜降', deg: 210, approx: '10-23', jiang: '卯' },
  { name: '小雪', deg: 240, approx: '11-22', jiang: '寅' },
  { name: '冬至', deg: 270, approx: '12-22', jiang: '丑' },
];

/** 黄经 → 月将（独立于引擎的映射） */
function jiangOfLongitude(lng: number): string {
  const i = Math.floor((((lng % 360) + 360) % 360) / 30);   // 0=戌, 1=酉, ...
  return ['戌', '酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑', '子', '亥'][i];
}

describe('六壬月将 vs 天文太阳视黄经（独立验证）', () => {
  it.skipIf(!HAS_SWE)('2024 年 12 中气前后 6 小时：将位切换与太阳过宫一致', () => {
    // 1) 用瑞士星历求 12 中气的真实过宫时刻（北京时）
    const targets = ZHONGQI.map(z => ({ name: z.name, deg: z.deg, approx: z.approx, y: 2024 }));
    const out = execFileSync(PY, [SCRIPT], {
      input: JSON.stringify({ mode: 'jieqi', targets }), encoding: 'utf8', timeout: 120000,
    });
    const { results } = JSON.parse(out);
    expect(results.length).toBe(12);

    // 2) 每个中气 ±6h 取样，断言引擎将位
    let checked = 0;
    for (let i = 0; i < ZHONGQI.length; i++) {
      const cross = new Date(results[i].time.replace(' ', 'T') + '+08:00');
      for (const [offsetH, wantJiang, tag] of [[-6, ZHONGQI[(i + 11) % 12].jiang, '前'], [6, ZHONGQI[i].jiang, '后']] as [number, string, string][]) {
        const t = new Date(cross.getTime() + offsetH * 3600_000);
        const lng = solarLongitudeAt(t);
        // 交叉核对：取样点的太阳黄经确实落在期望区间（避免样本贴着边界）
        expect(jiangOfLongitude(lng), `${results[i].name}${tag} 的太阳黄经分段`).toBe(wantJiang);
        const r = liurenCalc(t);
        expect(r.jiang, `${results[i].name} ${offsetH > 0 ? '后' : '前'} 6 小时（${t.toISOString()}）`).toBe(wantJiang);
        checked++;
      }
    }
    expect(checked).toBe(24);
  });

  it.skipIf(!HAS_SWE)('全年随机 24 个时刻：将位与太阳黄经分段一致', () => {
    const cases = Array.from({ length: 24 }, (_, i) => {
      const day = new Date(Date.UTC(2024, 0, 1 + i * 15, 3, 30));   // 每 15 天取一点
      return day;
    });
    const input = { cases: cases.map(d => ({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), hour: d.getUTCHours() + 8, min: d.getUTCMinutes(), lng: 116.4, lat: 39.9 })) };
    const out = execFileSync(PY, [SCRIPT], { input: JSON.stringify(input), encoding: 'utf8', timeout: 60000 });
    const { results } = JSON.parse(out);
    for (let i = 0; i < cases.length; i++) {
      const want = jiangOfLongitude(results[i].planets['太阳']);
      const r = liurenCalc(cases[i]);
      expect(r.jiang, cases[i].toISOString() + '（太阳黄经 ' + results[i].planets['太阳'].toFixed(2) + '°）').toBe(want);
    }
  });
});

/** 该时刻太阳视黄经（瑞士星历，含光行差；与引擎同口径但独立实现） */
function solarLongitudeAt(t: Date): number {
  const bj = new Date(t.getTime() + 8 * 3600_000);   // 转北京钟表时刻供 helper 解析
  const input = { cases: [{ y: bj.getUTCFullYear(), m: bj.getUTCMonth() + 1, d: bj.getUTCDate(), hour: bj.getUTCHours(), min: bj.getUTCMinutes(), lng: 116.4, lat: 39.9 }] };
  const out = execFileSync(PY, [SCRIPT], { input: JSON.stringify(input), encoding: 'utf8', timeout: 30000 });
  return JSON.parse(out).results[0].planets['太阳'];
}
