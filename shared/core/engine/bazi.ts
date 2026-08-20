// 四柱八字：真太阳时校正 + 精确节气定年柱月柱 + 十神强弱
import { GAN, ZHI, WUXING, SHISHEN_MAP, NAYIN, mod, jiaziIndex } from '../data/ganzhi';
import { daysSince, monthBranchOf, getJieQiTableExact } from './calendar';
import { trueSolarTime, shiftedDate } from './trueSolarTime';
import type { BaziInput, BaziResult } from '../types';

const MONTH_NAMES: Record<number, string> = { 0: '寅月', 1: '卯月', 2: '辰月', 3: '巳月', 4: '午月', 5: '未月', 6: '申月', 7: '酉月', 8: '戌月', 9: '亥月', 10: '子月', 11: '丑月' };

export function baziCalc(input: BaziInput): BaziResult {
  let { y, m, d, hourIndex } = input;
  const gender = input.gender;

  // 1. 真太阳时校正（出生地点 → 经度）
  let correctedHourIndex = hourIndex;
  let trueSolar;
  if (input.location) {
    // 取该时辰的中点作为出生时刻代表（如午时 → 12:00）
    const hour = (hourIndex * 2) % 24; // 时辰中点（子时 0 点起）
    trueSolar = trueSolarTime(y, m, d, hour, 30, input.location.lng);
    correctedHourIndex = trueSolar.hourIndex;
    if (trueSolar.dateOffset !== 0) {
      [y, m, d] = shiftedDate(y, m, d, trueSolar.dateOffset);
    }
  }
  const hour = (correctedHourIndex * 2) % 24; // 时辰中点（子时 0 点起）
  const min = 0;

  // 2. 年柱：立春（精确时刻）为界——取时刻之前最近一次立春所在公历年的干支
  const t = new Date(y, m - 1, d, hour, min).getTime();
  let lichunBest = -Infinity;
  let lichunYear = y - 1;
  for (const yy of [y - 1, y, y + 1]) {
    for (const jq of getJieQiTableExact(yy)) {
      if (jq.name === '立春') {
        const tt = jq.time.getTime();
        if (tt <= t && tt > lichunBest) { lichunBest = tt; lichunYear = yy; }
      }
    }
  }
  const yearGZ = ganzhiYear(lichunYear);

  // 3. 月柱：精确节气定月支 + 五虎遁
  const mb = monthBranchOf(y, m, d, hour, min);
  const ygIdx = GAN.indexOf(yearGZ[0] as any);
  const mgIdx = mod((ygIdx % 5) * 2 + 2 + mb, 10);
  const monthGZ = GAN[mgIdx] + ZHI[mod(2 + mb, 12)];

  // 4. 日柱：JD 推算
  const dIdx = mod(daysSince(y, m, d) + 16, 60);
  const dayGZ = GAN[dIdx % 10] + ZHI[dIdx % 12];
  const dayGan = dayGZ[0];
  const dayGanWx = WUXING[dayGan];

  // 5. 时柱：五鼠遁
  const dgIdx = GAN.indexOf(dayGan as any);
  const hgIdx = mod((dgIdx % 5) * 2 + correctedHourIndex, 10);
  const hourGZ = GAN[hgIdx] + ZHI[correctedHourIndex];

  // 6. 五行统计 + 十神 + 强弱
  const wxCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const gzList = [yearGZ, monthGZ, dayGZ, hourGZ];
  gzList.forEach(gz => { wxCount[WUXING[gz[0]]]++; wxCount[WUXING[gz[1]]]++; });
  const shishenList = gzList.map(gz => ({ gan: gz[0], name: shishen(dayGan, gz[0]) }));
  const wxOrder = ['木', '火', '土', '金', '水'];
  const sheng = wxOrder[(wxOrder.indexOf(dayGanWx) + 4) % 5];
  const ke = wxOrder[(wxOrder.indexOf(dayGanWx) + 2) % 5];
  const support = wxCount[dayGanWx] + wxCount[sheng];
  const drain = wxCount[ke] + wxCount[wxOrder[(wxOrder.indexOf(dayGanWx) + 1) % 5]] + wxCount[wxOrder[(wxOrder.indexOf(dayGanWx) + 3) % 5]];
  const strength: BaziResult['strength'] = support > drain ? '身强' : (support < drain ? '身弱' : '中和');

  const nayin = NAYIN[Math.floor(jiaziIndex(y) / 2) % 30];

  return {
    yearGZ, monthGZ, dayGZ, hourGZ,
    dayGan, dayGanWx,
    wxCount,
    shishen: shishenList,
    strength, support, drain,
    nayin,
    correctedHourIndex,
    trueSolar,
  };
}

export function ganzhiYear(year: number): string {
  const i = jiaziIndex(year);
  return GAN[i % 10] + ZHI[i % 12];
}

export function shishen(dayGan: string, gan: string): string {
  if (gan === dayGan) return '比肩';
  const dWx = WUXING[dayGan], gWx = WUXING[gan];
  const dYin = GAN.indexOf(dayGan as any) % 2 === 0;
  const gYin = GAN.indexOf(gan as any) % 2 === 0;
  const same = dYin === gYin;
  if (gWx === dWx) return same ? '比肩' : '劫财';
  const wxOrder = ['木', '火', '土', '金', '水'];
  const dI = wxOrder.indexOf(dWx), gI = wxOrder.indexOf(gWx);
  const rel = mod(gI - dI, 5);
  const map: Record<number, string> = { 1: same ? '食神' : '伤官', 4: same ? '偏财' : '正财', 3: same ? '七杀' : '正官', 2: same ? '偏印' : '正印' };
  return map[rel] || '比肩';
}

export { MONTH_NAMES };