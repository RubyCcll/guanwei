// 奇门遁甲：演示级九宫起局（精确节气定阴阳遁，三候取局）
import { GAN, ZHI, mod } from '../data/ganzhi';
import { QM_SEASONS, QM_STARS, QM_MEN, LUOSHU } from '../data/qimen';
import { daysSince, currentJieqiNameExact } from './calendar';
import type { QimenInput, QimenResult } from '../types';

export function qimenCalc(input: QimenInput): QimenResult {
  const d = input.datetime instanceof Date ? input.datetime : new Date(input.datetime);
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const h = d.getHours();
  /* 日干支 */
  const dIdx = mod(daysSince(y, m, day) + 16, 60);
  const dayGZ = GAN[dIdx % 10] + ZHI[dIdx % 12];
  /* 时干支 */
  const hourIndex = Math.floor(((h + 1) % 24) / 2);
  const dgIdx = GAN.indexOf(dayGZ[0] as any);
  const hgIdx = mod((dgIdx % 5) * 2 + hourIndex, 10);
  const hourGZ = GAN[hgIdx] + ZHI[hourIndex];
  /* 节气 → 阴阳遁（精确：当前所处节气） */
  const jqName = currentJieqiNameExact(y, m, day);
  const season = QM_SEASONS.find(s => s.name === jqName);
  if (!season) throw new Error('节气未找到: ' + jqName);
  const yin = season.yin;
  /* 候（三元）：按日数粗略取元 */
  const xun = Math.floor(day / 5) % 3;
  const ju = season.ju[xun];
  /* 旬首六仪（由时干定） */
  const xunshouMap: Record<string, string> = { 戊: '甲子', 己: '甲戌', 庚: '甲申', 辛: '甲午', 壬: '甲辰', 癸: '甲寅' };
  const hourGan = hourGZ[0];
  const xunShou = ['戊', '己', '庚', '辛', '壬', '癸'].includes(hourGan) ? hourGan : '戊';
  /* 地盘布奇仪：阳遁顺布（1→8→3→4→9→2→7→6→中5），阴遁逆布 */
  const qiyiOrder = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
  const yiAt: Record<number, string> = {};
  const pan: QimenResult['pan'] = {};
  for (let i = 0; i < 9; i++) {
    const palace = yin ? mod(ju - 1 - i, 9) + 1 : mod(ju - 1 + i, 9) + 1;
    yiAt[palace] = qiyiOrder[i];
    pan[palace] = { yi: qiyiOrder[i], men: '', star: '' };
  }
  /* 值符宫 = 旬首六仪所在宫；值符星/值使门 = 该宫九星八门 */
  const zfPalace = Number(Object.keys(yiAt).find(p => yiAt[Number(p)] === xunShou) || 1);
  const zfStar = QM_STARS[zfPalace - 1];
  const zsMen = QM_MEN[zfPalace - 1];
  /* 八门：从值使宫起按宫序顺布；九星按洛书固定 */
  const menOrder = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];
  const starOrder = ['天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱', '天心'];
  LUOSHU.forEach((p, i) => {
    pan[p].star = starOrder[i];
    const mIdx = mod(i - (LUOSHU.indexOf(zfPalace) - 1), 8);
    pan[p].men = menOrder[mIdx];
  });
  pan[5] = { yi: '中', star: '天禽', men: '' };
  return { yin, ju, jqName, dayGZ, hourGZ, xunShou, xunshouName: xunshouMap[xunShou] || '', zfStar, zsMen, zfPalace, pan };
}