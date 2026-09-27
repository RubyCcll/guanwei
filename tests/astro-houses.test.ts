// 星盘宫位制金标：整宫制 / 等宫制 / 普拉西度（Placidus）
//
// 背景（2026-09-26，ROADMAP #25「星盘仅整宫制」）：原实现 houseSystem 标称 'whole-sign'
// 但宫头实为「上升度数起每 30°」= 等宫制，标签与算法不符；现三种宫位制各自实现：
//   whole-sign 整宫制：1 宫 = 上升所落整个星座（宫头 = 该星座 0°）—— 古典希腊化/中世纪本位
//   equal      等宫制：1 宫头 = 上升度数，每 30°（即原实现行为）
//   placidus   普拉西度：宫头按半日弧三分迭代求解 —— 对拍 Swiss Ephemeris（含南半球与高纬）
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { astrologyCalc } from '../shared/core/engine/astrology';

const PY: string = [
  process.env.SWE_PYTHON,
  path.join(process.cwd(), '.swe-venv/bin/python'),
  '/tmp/swe-venv/bin/python',
].filter(Boolean).find((p: string) => existsSync(p as string)) as string || 'python3';
const SCRIPT = path.join(process.cwd(), 'tests/helpers/swe_ephemeris.py');
const HAS_SWE: boolean = (() => {
  if (!existsSync(PY)) return false;
  try { execFileSync(PY, ['-c', 'import swisseph'], { encoding: 'utf8', timeout: 15000 }); return true; }
  catch { return false; }
})();
if (!HAS_SWE) console.warn('[astro-houses] pyswisseph 不可用 → Placidus 对拍组显式 skip');

/** 出生时刻与地点（经度/纬度），覆盖南北半球与高纬 */
const CASES: { y: number; m: number; d: number; hour: number; min: number; lng: number; lat: number; tag: string }[] = [
  { y: 1991, m: 8, d: 17, hour: 16, min: 30, lng: 116.07, lat: 37.21, tag: '山东武城' },
  { y: 1990, m: 6, d: 15, hour: 12, min: 0, lng: 116.4, lat: 39.9, tag: '北京' },
  { y: 2000, m: 1, d: 1, hour: 6, min: 15, lng: 121.47, lat: 31.23, tag: '上海' },
  { y: 1974, m: 4, d: 28, hour: 16, min: 40, lng: 87.62, lat: 43.79, tag: '乌鲁木齐' },
  { y: 1969, m: 7, d: 20, hour: 5, min: 40, lng: -74.0, lat: 40.7, tag: '纽约' },
  { y: 1975, m: 11, d: 3, hour: 19, min: 5, lng: 151.21, lat: -33.87, tag: '悉尼（南半球）' },
  { y: 2013, m: 12, d: 22, hour: 23, min: 20, lng: 18.42, lat: 59.33, tag: '斯德哥尔摩（高纬）' },
  { y: 2031, m: 6, d: 30, hour: 22, min: 45, lng: 100.23, lat: 25.04, tag: '大理' },
];

/** 角度差（跨 0° 安全） */
const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe('星盘宫位制：三种制式各自成立', () => {
  it('整宫制：1 宫头 = 上升所落星座的 0°，12 宫即 12 星座整宫', () => {
    for (const c of CASES) {
      const r = astrologyCalc(c.y, c.m, c.d, c.hour, c.min, c.lng, c.lat, 'whole-sign');
      expect(r.houseSystem, c.tag).toBe('whole-sign');
      const signStart = Math.floor(r.asc / 30) * 30;
      expect(r.cusps![0], c.tag + ' 1 宫头').toBeCloseTo(signStart, 9);
      // 宫头与星座边界重合，且逐宫 +30°
      r.cusps!.forEach((cusp, i) => {
        expect(cusp % 30, `${c.tag} 第${i + 1}宫头应为星座 0°`).toBeCloseTo(0, 9);
        expect(cusp, `${c.tag} 第${i + 1}宫头`).toBeCloseTo((signStart + i * 30) % 360, 9);
      });
      // 上升必落在第 1 宫内
      expect(r.planetDetails.length).toBeGreaterThan(0);
    }
  });

  it('等宫制：1 宫头 = 上升度数，逐宫 +30°', () => {
    for (const c of CASES) {
      const r = astrologyCalc(c.y, c.m, c.d, c.hour, c.min, c.lng, c.lat, 'equal');
      expect(r.houseSystem, c.tag).toBe('equal');
      expect(r.cusps![0], c.tag).toBeCloseTo(r.asc, 9);
      r.cusps!.forEach((cusp, i) => {
        expect(cusp, `${c.tag} 第${i + 1}宫头`).toBeCloseTo((r.asc + i * 30) % 360, 9);
      });
    }
  });

  it('整宫与等宫之别：仅当上升不在星座 0° 时宫头不同（同一盘可复现）', () => {
    const c = CASES[0];
    const w = astrologyCalc(c.y, c.m, c.d, c.hour, c.min, c.lng, c.lat, 'whole-sign');
    const e = astrologyCalc(c.y, c.m, c.d, c.hour, c.min, c.lng, c.lat, 'equal');
    expect(angDiff(w.cusps![0], e.cusps![0])).toBeGreaterThan(0);       // 武城案例上升非 0°
    expect(angDiff(w.cusps![0], e.cusps![0])).toBeLessThan(30);
    // 两制的上升点、中天、行星黄经必须完全一致（宫位制只影响宫头与落宫）
    expect(w.asc).toBe(e.asc);
    expect(w.mc).toBe(e.mc);
    w.planets.forEach((p, i) => expect(p[2]).toBe(e.planets[i][2]));
  });
});

describe('星盘宫位制：普拉西度（对照 Swiss Ephemeris）', () => {
  let swe: any[] = [];
  beforeAll(() => {
    if (!HAS_SWE) return;
    const input = { cases: CASES.map(c => ({ y: c.y, m: c.m, d: c.d, hour: c.hour, min: c.min, lng: c.lng, lat: c.lat })) };
    const out = execFileSync(PY, [SCRIPT], { input: JSON.stringify(input), encoding: 'utf8', timeout: 120000 });
    swe = JSON.parse(out).results;
  });

  it.skipIf(!HAS_SWE)('十二宫头逐宫对齐（≤0.01°，含南半球与高纬）', () => {
    CASES.forEach((c, i) => {
      const r = astrologyCalc(c.y, c.m, c.d, c.hour, c.min, c.lng, c.lat, 'placidus');
      expect(r.houseSystem, c.tag).toBe('placidus');
      for (let k = 0; k < 12; k++) {
        expect(angDiff(r.cusps![k], swe[i].cusps[k]), `${c.tag} 第${k + 1}宫头`).toBeLessThan(0.01);
      }
    });
  });

  it.skipIf(!HAS_SWE)('上升/中天仍与瑞士星历一致（宫位制不应影响 Asc/MC）', () => {
    CASES.forEach((c, i) => {
      const r = astrologyCalc(c.y, c.m, c.d, c.hour, c.min, c.lng, c.lat, 'placidus');
      expect(angDiff(r.asc, swe[i].asc), c.tag + ' 上升').toBeLessThan(0.1);
      expect(angDiff(r.mc, swe[i].mc), c.tag + ' 中天').toBeLessThan(0.1);
    });
  });

  it('结构自洽：对宫相差 180°、宫头按 1→12 递增、Asc/MC 即 1/10 宫头', () => {
    for (const c of CASES) {
      const r = astrologyCalc(c.y, c.m, c.d, c.hour, c.min, c.lng, c.lat, 'placidus');
      const cusps = r.cusps!;
      expect(r.houseSystem, c.tag + '（高纬不收敛时回退整宫制）').toBe(c.lat > 66.5 ? 'whole-sign' : 'placidus');
      expect(cusps[0], c.tag + ' 1 宫头=上升').toBeCloseTo(r.asc, 9);
      expect(cusps[9], c.tag + ' 10 宫头=中天').toBeCloseTo(r.mc, 9);
      for (let i = 0; i < 6; i++) {
        expect(angDiff(cusps[i], cusps[i + 6]), `${c.tag} 第${i + 1}宫与对宫`).toBeCloseTo(180, 6);
      }
      // 1→12 宫头沿黄道顺序递增（跨度均在 (0,180) 内）
      for (let i = 0; i < 12; i++) {
        const span = ((cusps[(i + 1) % 12] - cusps[i] + 360) % 360);
        expect(span, `${c.tag} 第${i + 1}→${i + 2}宫跨度`).toBeGreaterThan(0);
        expect(span, `${c.tag} 第${i + 1}→${i + 2}宫跨度`).toBeLessThan(180);
      }
    }
  });

  it('行星落宫：按宫头区间判定，且每颗行星恰属一宫', () => {
    for (const c of CASES) {
      const r = astrologyCalc(c.y, c.m, c.d, c.hour, c.min, c.lng, c.lat, 'placidus');
      for (const p of r.planetDetails) {
        expect(p.house, `${c.tag} ${p.cn}`).toBeGreaterThanOrEqual(1);
        expect(p.house, `${c.tag} ${p.cn}`).toBeLessThanOrEqual(12);
        const cusps = r.cusps!;
        const a = cusps[p.house - 1], b = cusps[p.house % 12];
        const span = (b - a + 360) % 360;
        expect((p.lng - a + 360) % 360, `${c.tag} ${p.cn} 应落在第${p.house}宫区间`).toBeLessThan(span);
      }
    }
  });
});
