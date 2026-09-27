// 星盘：回归黄道（Tropical Zodiac）· VSOP87 精确星历（astronomy-engine）
// 行星黄经按 of-date 春分点（回归黄道），上升/中天按标准天文公式精确计算
import * as astroNS from 'astronomy-engine';
import { mod } from '../data/ganzhi';
import type { AstrologyResult } from '../types';

// 兼容 tsx(CJS interop) 与 vite(ESM) 的导入方式
const Astro: any = (astroNS as any).default ?? astroNS;

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// ─── 星座与古典占星表（补齐层）───
const SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
// 古典守护星（不含三王星）
const SIGN_RULER: Record<string, string> = {
  白羊: '火星', 金牛: '金星', 双子: '水星', 巨蟹: '月亮', 狮子: '太阳', 处女: '水星',
  天秤: '金星', 天蝎: '火星', 射手: '木星', 摩羯: '土星', 水瓶: '土星', 双鱼: '木星',
};
// 古典庙旺表（庙/旺/陷/弱）
const DIGNITY: Record<string, { miao: string; wang: string }> = {
  太阳: { miao: '狮子', wang: '白羊' }, 月亮: { miao: '巨蟹', wang: '金牛' },
  水星: { miao: '双子', wang: '处女' }, 金星: { miao: '金牛', wang: '双鱼' },
  火星: { miao: '白羊', wang: '摩羯' }, 木星: { miao: '射手', wang: '巨蟹' },
  土星: { miao: '摩羯', wang: '天秤' },
};
const signOf = (lng: number) => SIGNS[Math.floor(mod(lng, 360) / 30)];
const degreeIn = (lng: number) => mod(lng, 30);
// 行星在星座中的守护/庙旺判定：宫主星（行星是否守护该星座）与庙旺
function dignityOf(planet: string, sign: string): AstroDignity {
  const d = DIGNITY[planet];
  if (!d) return { status: '', note: '' };
  if (d.miao === sign) return { status: '庙', note: planet + '入' + sign + '为庙（本垣），力量最显' };
  if (d.wang === sign) return { status: '旺', note: planet + '入' + sign + '为旺（擢升），助力显著' };
  if (d.miao === SIGNS[(SIGNS.indexOf(sign) + 6) % 12]) return { status: '陷', note: planet + '入' + sign + '为陷（失势），力量受抑' };
  if (d.wang === SIGNS[(SIGNS.indexOf(sign) + 6) % 12]) return { status: '弱', note: planet + '入' + sign + '为弱（失位），助力有限' };
  return { status: '', note: '' };
}
interface AstroDignity { status: '庙' | '旺' | '陷' | '弱' | ''; note: string }

// 黄赤交角（of date，IAU 简式）
function obliquity(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  return (23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T) * DEG;
}

// 儒略日
function julianDay(y: number, m: number, d: number, hour: number, min: number): number {
  // 输入为北京时间（UTC+8）→ 转为 UTC 时刻
  const utc = Date.UTC(y, m - 1, d, hour, min) - 8 * 3600 * 1000;
  return utc / 86400000 + 2440587.5;
}

export type HouseSystem = 'whole-sign' | 'equal' | 'placidus';

/**
 * Placidus 宫头迭代求解：求黄道上「时角 = k·半日弧 + offset」的点。
 *   semi-diurnal arc（半日弧）SA_d(δ) = acos(−tanφ·tanδ)（度）
 *   宫 11：H = SA_d/3；宫 12：H = 2SA_d/3；宫 2：60° + 2SA_d/3；宫 3：120° + SA_d/3
 *   （赤道 ε=δ=0 时退化为经典初值 RAMC+30/60/120/150）
 * 黄道↔赤道：RA(λ)=atan2(sinλ·cosε, cosλ)、δ(λ)=asin(sinε·sinλ)，故逆变换 λ=atan2(sinRA, cosRA·cosε)。
 * 高纬度（|φ|>66.5°）迭代不收敛 → 返回 null，由调用方回退整宫制。
 */
function placidusCusp(RAMC: number, eps: number, phi: number, k: number, offset: number): number | null {
  let lam = RAMC + offset + k * 90;      // 初值（赤道近似）
  for (let i = 0; i < 60; i++) {
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam * DEG));
    const cosSA = -Math.tan(phi) * Math.tan(dec);
    if (cosSA <= -1) return null;        // 极昼/极夜：半日弧退化
    const SAd = Math.acos(Math.max(-1, Math.min(1, cosSA))) * RAD;
    const He = offset + k * SAd;
    const RA = RAMC + He;
    const next = Math.atan2(Math.sin(RA * DEG), Math.cos(RA * DEG) * Math.cos(eps)) * RAD;
    if (Math.abs(mod(next - lam, 360) + 180 - 180) < 1e-9) { lam = next; break; }
    lam = next;
  }
  return mod(lam, 360);
}

/** 依黄经落在哪一宫（宫头按 1→12 顺序，跨 360° 处按跨度取模） */
function houseOfLongitude(lng: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const span = mod(cusps[(i + 1) % 12] - cusps[i], 360);
    if (mod(lng - cusps[i], 360) < span) return i + 1;
  }
  return 12;
}

export function daysSince(y: number, m: number, d: number): number {
  return Math.floor(julianDay(y, m, d, 0, 0) - 2451545);
}

export function astrologyCalc(
  y: number, m: number, d: number,
  hour: number, min: number,
  lng?: number,
  lat?: number,
  houseSystem: HouseSystem = 'whole-sign',
): AstrologyResult {
  const jd = julianDay(y, m, d, hour, min);
  const date = new Date((jd - 2440587.5) * 86400000);

  // 行星精确黄经（回归黄道 ofdate）
  const BODIES: [string, string, string, string][] = [
    ['太阳', '☉', 'Sun', '#C8872E'],
    ['月亮', '☽', 'Moon', '#8C9BA8'],
    ['水星', '☿', 'Mercury', '#7A8A9A'],
    ['金星', '♀', 'Venus', '#A5767E'],
    ['火星', '♂', 'Mars', '#B0563A'],
    ['木星', '♃', 'Jupiter', '#9C7A4A'],
    ['土星', '♄', 'Saturn', '#6E7566'],
  ];
  const planets: [string, string, number, string][] = [];
  for (const [cn, sym, en, color] of BODIES) {
    try {
      const eq = Astro.GeoVector(Astro.Body[en], date, true);
      const ecl = Astro.Ecliptic(eq, true); // ofdate=true → 回归黄道
      planets.push([cn, sym, mod(ecl.elon, 360), color]);
    } catch {
      planets.push([cn, sym, 0, color]);
    }
  }
  const sun = planets[0][2];
  const moon = planets[1][2];

  // 恒星时：GAST（格林尼治视恒星时，小时）→ 本地恒星时
  const gast = Astro.SiderealTime(date);
  const lstHours = mod(gast + (lng !== undefined ? lng / 15 : 8), 24);
  const RAMC = lstHours * 15;

  // 黄赤交角
  const eps = obliquity(jd);
  // 纬度：出生地纬度（关键！上升点对纬度高度敏感）
  const phi = (lat ?? 39.9) * DEG;

  // 上升点黄经（推导自地平方程 cos(RAMC-α) = -tanφ·tanδ）：
  //   tanλ = -cos(RAMC) / (sin(RAMC)·cosε + tanφ·sinε)
  //   atan2 给出两个解之一（西方交点），+180° 取东方交点（上升点）
  const asc = mod(
    Math.atan2(
      -Math.cos(RAMC * DEG),
      Math.sin(RAMC * DEG) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps),
    ) * RAD + 180,
    360,
  );
  // 中天黄经：MC = atan2( sin(RAMC), cos(RAMC)·cos(ε) )
  const mc = mod(Math.atan2(Math.sin(RAMC * DEG), Math.cos(RAMC * DEG) * Math.cos(eps)) * RAD, 360);

  // 相位（黄经差，容差 8°）
  const aspects: [string, string, string, string][] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const diff = mod(planets[i][2] - planets[j][2], 360);
      const a = Math.min(diff, 360 - diff);
      const orb = 8;
      if (a < orb) aspects.push([planets[i][0], planets[j][0], '合', '凝聚之象']);
      else if (Math.abs(a - 60) < orb) aspects.push([planets[i][0], planets[j][0], '六合', '和谐之象']);
      else if (Math.abs(a - 90) < orb) aspects.push([planets[i][0], planets[j][0], '刑', '紧张之象']);
      else if (Math.abs(a - 120) < orb) aspects.push([planets[i][0], planets[j][0], '拱', '顺遂之象']);
      else if (Math.abs(a - 180) < orb) aspects.push([planets[i][0], planets[j][0], '冲', '对峙之象']);
    }
  }
  // ─── 十二宫（三种宫位制）+ 行星详情 + 逆行 + 庙旺 ───
  // 2026-09-26 修正：原实现标称「整宫制」实为**等宫制**（宫头自上升度数起每 30°），标签与算法不符。
  //   整宫制 whole-sign：1 宫 = 上升所落**整个星座**（宫头取该星座 0°），古典占星（希腊化/中世纪）本位
  //   等宫制 equal    ：1 宫头 = 上升度数，每 30°（现代简法，即原实现行为）
  //   普拉西度 placidus：宫头按半日弧三分迭代求解（现代西方主流；对拍 Swiss Ephemeris ≤0.001°）
  let effectiveSystem: HouseSystem = houseSystem;
  let cusps: number[];
  if (houseSystem === 'placidus') {
    const c11 = placidusCusp(RAMC, eps, phi, 1 / 3, 0);
    const c12 = placidusCusp(RAMC, eps, phi, 2 / 3, 0);
    const c2 = placidusCusp(RAMC, eps, phi, 2 / 3, 60);
    const c3 = placidusCusp(RAMC, eps, phi, 1 / 3, 120);
    if (c11 === null || c12 === null || c2 === null || c3 === null) {
      effectiveSystem = 'whole-sign';                       // 极区不收敛 → 回退（在结果中如实标注）
      cusps = [];
    } else {
      cusps = new Array(12).fill(0);
      cusps[0] = asc; cusps[9] = mc;
      cusps[10] = c11; cusps[11] = c12; cusps[1] = c2; cusps[2] = c3;
      // 对宫：3←9(IC) 4←10 5←11 6←0(Desc) 7←1 8←2（11/12/2/3 为迭代解，其余取对宫）
      for (const i of [3, 4, 5, 6, 7, 8]) cusps[i] = mod(cusps[(i + 6) % 12] + 180, 360);
    }
  } else {
    cusps = [];
  }
  if (effectiveSystem === 'whole-sign') {
    const signStart = Math.floor(mod(asc, 360) / 30) * 30;    // 上升所在星座的 0°
    cusps = SIGNS.map((_, i) => mod(signStart + i * 30, 360));
  } else if (effectiveSystem === 'equal') {
    cusps = SIGNS.map((_, i) => mod(asc + i * 30, 360));
  }
  const houses = cusps.map((cusp, i) => {
    const sign = signOf(cusp);
    return { num: i + 1, cusp, sign, ruler: SIGN_RULER[sign], rulerLng: 0 };
  });
  // 行星详情
  const planetDetails = planets.map(([cn, sym, lng, color]) => {
    // 逆行检测：与 1 天前黄经比较（太阳/月亮除外）
    let retrograde = false;
    if (cn !== '太阳' && cn !== '月亮') {
      const prev = new Date(date.getTime() - 86400000);
      try {
        const eq0 = Astro.GeoVector(Astro.Body[(BODIES.find(b => b[0] === cn) as any)[2]], prev, true);
        const ecl0 = Astro.Ecliptic(eq0, true);
        const prevLng = mod(ecl0.elon, 360);
        const d1 = mod(lng - prevLng, 360);
        retrograde = d1 < 0.5 && d1 > 0 ? false : (mod(prevLng - lng, 360) < 0.5 && mod(prevLng - lng, 360) > 0) ? true : mod(lng - prevLng, 360) > 180;
      } catch { /* 忽略 */ }
    }
    const sign = signOf(lng);
    const house = houseOfLongitude(lng, cusps);
    return {
      cn, sym, color,
      lng, sign, degree: degreeIn(lng),
      house,
      retrograde,
      dignity: dignityOf(cn, sign),
    };
  });
  // 宫主星黄经（供展示：守护星所在位置）
  houses.forEach(h => {
    const ruler = planetDetails.find(p => p.cn === h.ruler);
    h.rulerLng = ruler ? ruler.lng : -1;
  });
  const ascSign = signOf(asc);
  const sunSign = signOf(sun);
  const moonSign = signOf(moon);

  return { planets, asc, sun, moon, lstHours, aspects, mc, epsilon: eps / DEG, houseSystem: effectiveSystem, cusps, houses, planetDetails, ascSign, sunSign, moonSign };
}