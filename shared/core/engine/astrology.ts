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

export function daysSince(y: number, m: number, d: number): number {
  return Math.floor(julianDay(y, m, d, 0, 0) - 2451545);
}

export function astrologyCalc(
  y: number, m: number, d: number,
  hour: number, min: number,
  lng?: number,
  lat?: number,
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
  // ─── 补齐层：整宫制十二宫 + 行星详情 + 逆行 + 庙旺 ───
  const houseSystem = 'whole-sign' as const;
  // 整宫制：1 宫头 = 上升点黄经，每宫 30°
  const houses = SIGNS.map((_, i) => {
    const cusp = mod(asc + i * 30, 360);
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
    const house = Math.floor(mod(lng - asc, 360) / 30) + 1;
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

  return { planets, asc, sun, moon, lstHours, aspects, mc, epsilon: eps / DEG, houseSystem, houses, planetDetails, ascSign, sunSign, moonSign };
}