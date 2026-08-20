// 大六壬：月将加时（中气定将）· 四课三传（简式）
import { GAN, ZHI, mod } from '../data/ganzhi';
import { LR_JIANGS, LR_JIANG_SUN, LR_GANJI } from '../data/liuren';
import { daysSince, currentJieqiNameExact } from './calendar';
import type { LiurenResult } from '../types';

export function liurenCalc(dt: string | Date): LiurenResult {
  const d = dt instanceof Date ? dt : new Date(dt);
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const h = d.getHours();
  const hourIndex = Math.floor(((h + 1) % 24) / 2); // 0=子
  /* 日干支 */
  const dIdx = mod(daysSince(y, m, day) + 55, 60);
  const dayGZ = GAN[dIdx % 10] + ZHI[dIdx % 12];
  const dgIdx = GAN.indexOf(dayGZ[0] as any);
  const hgIdx = mod((dgIdx % 5) * 2 + hourIndex, 10);
  const hourGZ = GAN[hgIdx] + ZHI[hourIndex];
  /* 月将：中气定将（太阳过宫）；1/1-1/19 属上年冬至后 → 丑将，1/20 大寒后 → 子将 */
  const v = m * 100 + day;
  let jiang = '丑';
  if (v >= 120 && v < 219) jiang = '子';
  else if (v >= 219) {
    for (let i = LR_JIANG_SUN.length - 2; i >= 0; i--) {
      const [, jm, jd2, jz] = LR_JIANG_SUN[i];
      if (v >= jm * 100 + jd2) { jiang = jz; break; }
    }
  }
  const jiangIdx = ZHI.indexOf(jiang as any);
  const jqName = currentJieqiNameExact(y, m, day);
  /* 天盘：月将加时顺布 */
  const tianpan: Record<number, string> = {};
  for (let i = 0; i < 12; i++) tianpan[mod(hourIndex + i, 12)] = ZHI[mod(jiangIdx + i, 12)];
  /* 四课 */
  const ganJi = LR_GANJI[dayGZ[0]];
  const ke1 = tianpan[ZHI.indexOf(ganJi as any)];
  const ke2 = tianpan[ZHI.indexOf(ke1 as any)];
  const ke3 = tianpan[ZHI.indexOf(dayGZ[1] as any)];
  const ke4 = tianpan[ZHI.indexOf(ke3 as any)];
  /* 三传（简式取传：依次取四课初传、中传、末传上神） */
  const chuan1 = ke1, chuan2 = ke2, chuan3 = ke3;
  return { dayGZ, hourGZ, jiang, jqName, tianpan, ganJi, ke1, ke2, ke3, ke4, chuan1, chuan2, chuan3 };
}

export const jiangName = (zhi: string): string => {
  const row = LR_JIANGS.find(j => j[1] === zhi);
  return row ? row[0] : zhi;
}