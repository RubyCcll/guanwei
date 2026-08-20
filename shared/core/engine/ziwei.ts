// 紫微斗数：简式星盘（命宫/五行局/紫微定位/十四主星）
import { NAYIN, NAYIN_JU, ganZhiIndex, mod } from '../data/ganzhi';
import { longitudeCorrectedHourIndex } from './trueSolarTime';
import type { ZiweiInput, ZiweiResult } from '../types';
import { GAN } from '../data/ganzhi';
import { PALACE_NAMES } from '../data/ziwei';

export function ziweiCalc(input: ZiweiInput): ZiweiResult {
  let { month, day, hour } = input;
  const gz = input.ganzhi;
  // 时辰经度修正（真太阳时之经度部分；紫微输入为农历，无公历日期做均时差）
  let correctedHour = hour;
  if (input.location) {
    // 有精确时刻用精确值，否则用时辰中点
    const [th, tm] = input.time ? input.time.split(':').map(Number) : [(hour * 2) % 24, 0];
    correctedHour = longitudeCorrectedHourIndex(th + (tm || 0) / 60, input.location.lng);
  }
  /* 命宫：寅宫起正月顺数至生月，再从生月宫起子时逆数至生时（正月子时 → 寅）*/
  const ming = mod((month - 1) - correctedHour, 12);
  /* 五行局：纳音定局 */
  const nayin = NAYIN[Math.floor(ganZhiIndex(gz) / 2) % 30];
  const juName = NAYIN_JU[nayin] || '金四局';
  const JU_NUM: Record<string, number> = { 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
  const juNum = JU_NUM[juName[1]] || 4;
  /* 紫微定位：寅起，金四局顺行，余者逆行，每局数天移一宫 */
  const ziweiPos = mod(Math.ceil(day / juNum) - 1, 12) * (juNum === 4 ? 1 : -1) % 12 + 12;
  const zwPos = mod(ziweiPos, 12);
  /* 十四主星 */
  const zwStars: Record<string, number> = {};
  const ziweiList = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞'];
  const ziweiOff = [0, -1, -3, -4, -5, -8];
  ziweiList.forEach((s, i) => { zwStars[s] = mod(zwPos + ziweiOff[i], 12); });
  const tianfu = mod(0 - zwPos, 12);
  const tianfuList = ['天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
  const tianfuOff = [0, 1, 2, 3, 4, 5, 6, 9];
  tianfuList.forEach((s, i) => { zwStars[s] = mod(tianfu + tianfuOff[i], 12); });
  /* 十二宫布列：命宫起逆布 */
  const palaces: Record<number, number> = {};
  for (let i = 0; i < 12; i++) palaces[i] = mod(ming - i, 12);

  /* ===== 大限与流年 ===== */
  // 起运岁数 = 五行局数（水二 2、木三 3、金四 4、土五 5、火六 6）
  const JU_AGE: Record<string, number> = { 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
  const startAge = JU_AGE[juName[1]] || 4;
  // 顺逆：阳男阴女顺行，阴男阳女逆行（生年天干阴阳）
  const ganYang = GAN.indexOf(gz[0] as any) % 2 === 0;
  const gender = input.gender || '男';
  const forward = (gender === '男' && ganYang) || (gender === '女' && !ganYang);
  // 大限序列：命宫起，顺行或逆行，每 10 年一宫
  const dayun: { palaceIdx: number; start: number; end: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const palaceIdx = mod(ming + (forward ? i : -i), 12);
    dayun.push({ palaceIdx, start: startAge + i * 10, end: startAge + i * 10 + 9 });
  }
  // 当前大限（按虚岁）
  const birthYear = input.birthYear || 1993;
  const nowYear = new Date().getFullYear();
  const nominalAge = Math.max(nowYear - birthYear + 1, 1);
  let curDayunIdx = 0;
  for (let i = 0; i < dayun.length; i++) {
    if (nominalAge >= dayun[i].start && nominalAge <= dayun[i].end) { curDayunIdx = i; break; }
  }
  // 流年命宫：以虚岁顺数（从命宫起）
  const liunianIdx = mod(ming + (nominalAge - 1), 12);
  const liunianPalaceName = PALACE_NAMES[Object.keys(palaces).find(k => palaces[Number(k)] === liunianIdx) ? Number(Object.keys(palaces).find(k => palaces[Number(k)] === liunianIdx)) : 0];
  const liunianStars = Object.keys(zwStars).filter(s => zwStars[s] === liunianIdx);

  return { ming, zwPos, zwStars, palaces, juName, nayin, correctedHour, dayun, curDayunIdx, nominalAge, liunianIdx, liunianPalaceName, liunianStars, startAge, forward };
}