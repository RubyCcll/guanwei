// 历法模块：儒略日 / 节气（精确，基于 lunar-typescript）/ 农历黄历
import { Solar } from 'lunar-typescript';
import { JIEQI_APPROX } from '../data/qimen';

/* ---------- 儒略日 ---------- */
export function jd(y: number, m: number, d: number): number {
  let yy = y, mm = m;
  if (mm <= 2) { yy--; mm += 12; }
  const A = Math.floor(yy / 100);
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + 2 - A + Math.floor(A / 4) - 1524.5;
}

export function daysSince(y: number, m: number, d: number): number {
  return Math.floor(jd(y, m, d) - 2451545);
}

/* ---------- 节气 ---------- */
// 近似表取法（奇门定遁 / 展示用）：
export function getJieqiApproxName(y: number, m: number, d: number): string {
  const v = m * 100 + d;
  let name = '大雪';
  for (let i = JIEQI_APPROX.length - 1; i >= 0; i--) {
    const [, jm, jd2] = JIEQI_APPROX[i];
    if (v >= jm * 100 + jd2) { name = JIEQI_APPROX[i][0]; break; }
  }
  return name;
}

// 精确节气时刻表（某年全年 24 节气）
export interface JieQiTime { name: string; time: Date }
export function getJieQiTableExact(year: number): JieQiTime[] {
  const solar = Solar.fromYmdHms(year, 6, 1, 12, 0, 0);
  const table = solar.getLunar().getJieQiTable();
  const out: JieQiTime[] = [];
  for (const key of Object.keys(table)) {
    const s = table[key];
    out.push({ name: key, time: new Date(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) });
  }
  return out;
}

// 当天是否为某节气（精确）
export function getJieQiNameExact(y: number, m: number, d: number): string | null {
  const solar = Solar.fromYmdHms(y, m, d, 12, 0, 0);
  return solar.getLunar().getJieQi() || null;
}

// 当前所处节气（精确：取该时刻之前最近的节气，24 节气皆可）
export function currentJieqiNameExact(y: number, m: number, d: number): string {
  const t = new Date(y, m - 1, d, 12, 0, 0).getTime();
  let best: { name: string; time: number } | null = null;
  for (const yy of [y - 1, y, y + 1]) {
    for (const jq of getJieQiTableExact(yy)) {
      const tt = jq.time.getTime();
      if (tt <= t && (!best || tt > best.time)) best = { name: jq.name, time: tt };
    }
  }
  return best ? best.name : '大雪';
}

// 十二「节」（定月支用）与月支映射（0=寅 … 11=丑，与参考项目一致）
export const JIE_BRANCH: Record<string, number> = {
  小寒: 11, 立春: 0, 惊蛰: 1, 清明: 2, 立夏: 3, 芒种: 4,
  小暑: 5, 立秋: 6, 白露: 7, 寒露: 8, 立冬: 9, 大雪: 10,
};

// 判断给定时刻位于哪个「节」之后 → 返回月支（0=寅 正月起）
export function monthBranchOf(y: number, m: number, d: number, hour: number, min = 0): number {
  const t = new Date(y, m - 1, d, hour, min).getTime();
  // 收集 y-1/y/y+1 三年的节时刻，取 t 之前最近的
  let best: { name: string; time: number } | null = null;
  for (const yy of [y - 1, y, y + 1]) {
    for (const jq of getJieQiTableExact(yy)) {
      if (JIE_BRANCH[jq.name] === undefined) continue; // 只取十二节
      const tt = jq.time.getTime();
      if (tt <= t && (!best || tt > best.time)) best = { name: jq.name, time: tt };
    }
  }
  return best ? JIE_BRANCH[best.name] : 0;
}

// 判断给定时刻是否已过某「节」（精确，年柱用立春）
export function isAfterJie(y: number, m: number, d: number, hour: number, min: number, jieName: string): boolean {
  const t = new Date(y, m - 1, d, hour, min).getTime();
  for (const yy of [y - 1, y, y + 1]) {
    for (const jq of getJieQiTableExact(yy)) {
      if (jq.name === jieName && jq.time.getTime() <= t) return true;
    }
  }
  return false;
}

/* ---------- 农历 / 黄历（万年历，供 almanac 模块与首页） ---------- */
export interface AlmanacDay {
  lunarText: string;          // 二〇二四年腊月廿六
  ganzhiYear: string;
  ganzhiMonth: string;
  ganzhiDay: string;
  shengxiao: string;
  xingZuo: string;
  jieQi: string | null;       // 当天节气名
  yi: string[];
  ji: string[];
  pengZu: string;
  chong: string;
  sha: string;
}

export function almanacOf(y: number, m: number, d: number): AlmanacDay {
  const solar = Solar.fromYmdHms(y, m, d, 12, 0, 0);
  const l = solar.getLunar();
  const ec = l.getEightChar();
  return {
    lunarText: l.toString(),
    ganzhiYear: ec.getYear(),
    ganzhiMonth: ec.getMonth(),
    ganzhiDay: ec.getDay(),
    shengxiao: l.getYearShengXiao(),
    xingZuo: solar.getXingZuo(),
    jieQi: l.getJieQi() || null,
    yi: l.getDayYi(),
    ji: l.getDayJi(),
    pengZu: l.getPengZuGan() + ' ' + l.getPengZuZhi(),
    chong: l.getDayChongDesc(),
    sha: l.getDaySha(),
  };
}