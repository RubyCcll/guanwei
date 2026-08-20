// 真太阳时：经度修正 + 均时差 EoT + 中国夏令时回拨
import type { TrueSolarTime } from '../types';

// 中国夏令时区间（1986-1991，北京时间 02:00 起止）
const DST_PERIODS: [number, number, number, number, number, number][] = [
  [1986, 5, 4, 1986, 9, 14],
  [1987, 4, 12, 1987, 9, 13],
  [1988, 4, 10, 1988, 9, 11],
  [1989, 4, 16, 1989, 9, 17],
  [1990, 4, 15, 1990, 9, 16],
  [1991, 4, 14, 1991, 9, 15],
];

export function isChinaDST(y: number, m: number, d: number): boolean {
  for (const [sy, sm, sd, ey, em, ed] of DST_PERIODS) {
    const start = new Date(sy, sm - 1, sd, 2, 0, 0).getTime();
    const end = new Date(ey, em - 1, ed, 2, 0, 0).getTime();
    const t = new Date(y, m - 1, d, 12, 0, 0).getTime();
    if (t >= start && t <= end) return true;
  }
  return false;
}

// 一年中的第几天
function dayOfYear(y: number, m: number, d: number): number {
  return Math.floor((new Date(y, m - 1, d).getTime() - new Date(y, 0, 1).getTime()) / 86400000) + 1;
}

/**
 * 真太阳时计算
 * @param y/m/d 公历日期（北京时间）
 * @param hour 小时（0-23）
 * @param min 分钟
 * @param lng 出生地东经（如北京 116.4）
 * @param applyDST 是否回拨夏令时（默认 true）
 */
export function trueSolarTime(
  y: number, m: number, d: number,
  hour: number, min: number,
  lng: number,
  applyDST = true,
): TrueSolarTime {
  let beijingHours = hour + min / 60;
  // 夏令时回拨 1 小时
  if (applyDST && isChinaDST(y, m, d)) beijingHours -= 1;
  // 平太阳时：东经 120° 基准，每 1° 差 4 分钟
  const localMeanHours = beijingHours + (lng - 120) * 4 / 60;
  // 均时差 EoT（分钟）
  const N = dayOfYear(y, m, d);
  const B = (2 * Math.PI * (N - 81)) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const trueSolarHours = localMeanHours + eot / 60;
  // 归一化并定日期偏移
  let hh = trueSolarHours;
  let dateOffset = 0;
  while (hh >= 24) { hh -= 24; dateOffset++; }
  while (hh < 0) { hh += 24; dateOffset--; }
  const hourIndex = Math.floor(((hh + 1) % 24) / 2);
  return {
    beijingHours,
    localMeanHours,
    trueSolarHours,
    eotMinutes: eot,
    hourIndex,
    dateOffset,
  };
}

/**
 * 纯经度修正（用于无公历日期的场景，如紫微农历输入）：
 * 只做东经 120° 基准修正，忽略均时差（±15 分钟，不跨时辰段）
 */
export function longitudeCorrectedHourIndex(hour: number, lng: number): number {
  const localMeanHours = hour + (lng - 120) * 4 / 60;
  let hh = localMeanHours;
  while (hh >= 24) hh -= 24;
  while (hh < 0) hh += 24;
  return Math.floor(((hh + 1) % 24) / 2);
}

// 校正日期（应用 dateOffset）
export function shiftedDate(y: number, m: number, d: number, offset: number): [number, number, number] {
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + offset);
  return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()];
}