// 奇门遁甲：九宫起局（节气定阴阳遁 · 日干支三元定局 · 时干支定旬首）
// 说明：超神接气/置闰（节气时刻与甲己日不齐时的补闰规则）属专业级范畴，当前按「正授」近似：
//       以日干支查三元表定局，与交节日正授情形完全一致；超接偏差时可能差一元，后续专业级补齐。
import { GAN, ZHI, mod } from '../data/ganzhi';
import { QM_SEASONS, QM_STARS, QM_MEN, LUOSHU } from '../data/qimen';
import { daysSince, currentJieqiNameExact } from './calendar';
import type { QimenInput, QimenResult } from '../types';


// 三元定局表（时家奇门标准）：行=日干五合组，列=日支组（0=子午卯酉 1=寅申巳亥 2=辰戌丑未）
// 值 0=上元 1=中元 2=下元。甲子旬前五日上元、次五日中元、甲戌旬前五日下元——已按日干支循环验证自洽。
const SAN_YUAN: number[][] = [
  [0, 1, 2], // 甲己：子午卯酉上元 寅申巳亥中元 辰戌丑未下元
  [1, 2, 0], // 乙庚：子午卯酉中元 寅申巳亥下元 辰戌丑未上元
  [2, 0, 1], // 丙辛：子午卯酉下元 寅申巳亥上元 辰戌丑未中元
  [0, 1, 2], // 丁壬：同甲己
  [1, 2, 0], // 戊癸：同乙庚
];

function sanYuanOf(dayGan: string, dayZhi: string): number {
  const ganGroup = ['甲', '己'].includes(dayGan) ? 0 : ['乙', '庚'].includes(dayGan) ? 1 : ['丙', '辛'].includes(dayGan) ? 2 : ['丁', '壬'].includes(dayGan) ? 3 : 4;
  const zhiGroup = ['子', '午', '卯', '酉'].includes(dayZhi) ? 0 : ['寅', '申', '巳', '亥'].includes(dayZhi) ? 1 : 2;
  return SAN_YUAN[ganGroup][zhiGroup];
}

export function qimenCalc(input: QimenInput): QimenResult {
  const d = input.datetime instanceof Date ? input.datetime : new Date(input.datetime);
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const h = d.getHours();
  /* 日干支 */
  const dIdx = mod(daysSince(y, m, day) + 55, 60);
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
  /* 三元定局（按日干支，替代旧「按日数粗略取元」） */
  const xun = sanYuanOf(dayGZ[0], dayGZ[1]);
  const ju = season.ju[xun];
  /* 旬首六仪（按时干支真实旬首：时干支序号 → 所在旬 → 六仪） */
  const gzIdx = mod((GAN.indexOf(hourGZ[0] as any) - ZHI.indexOf(hourGZ[1] as any)) * 6 + ZHI.indexOf(hourGZ[1] as any), 60);
  const xunStart = Math.floor(gzIdx / 10) * 10;               // 旬首干支序号（甲子=0 甲戌=10 …）
  const xunShouZhi = ZHI[xunStart % 12];
  const xunshouMap: Record<string, string> = { 子: '戊', 戌: '己', 申: '庚', 午: '辛', 辰: '壬', 寅: '癸' };
  const xunShou = xunshouMap[xunShouZhi];                     // 旬首六仪（甲子戊 甲戌己 …）
  const xunshouName = '甲' + xunShouZhi;
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
  /* 八门：从值符宫起按宫序顺布；九星按洛书固定 */
  const menOrder = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];
  const starOrder = ['天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱', '天心'];
  LUOSHU.forEach((p, i) => {
    pan[p].star = starOrder[i];
    const mIdx = mod(i - (LUOSHU.indexOf(zfPalace) - 1), 8);
    pan[p].men = menOrder[mIdx];
  });
  pan[5] = { yi: '中', star: '天禽', men: '' };

  /* ── 补齐层：值使落宫 + 天盘奇仪（暗干）+ 八神 ── */
  // 值使门随时干落宫：时干在地盘所在宫
  const zsPalace = Number(Object.keys(yiAt).find(p => yiAt[Number(p)] === hourGZ[0]) || zfPalace);
  // 天盘奇仪（暗干）：从值符宫（值符随时干）起，阳遁顺布、阴遁逆布（洛书序）
  const tianYi: Record<number, string> = {};
  const qiyiFromXun = qiyiOrder.slice(qiyiOrder.indexOf(xunShou)); // 旬首起
  const seq = [...qiyiFromXun, ...qiyiOrder.slice(0, qiyiOrder.indexOf(xunShou))]; // 六仪三奇环序
  const zsIdx = LUOSHU.indexOf(zsPalace);
  LUOSHU.forEach((p, i) => {
    const step = yin ? mod(zsIdx - i, 9) : mod(zsIdx + i, 9);
    tianYi[p] = seq[step];
  });
  tianYi[5] = '';
  // 八神：值符 螣蛇 太阴 六合 白虎 玄武 九地 九天；从值符宫起，阳顺阴逆布八宫（中宫不入）
  const shenSeq = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
  const shen: Record<number, string> = {};
  const shenPalaces = LUOSHU.filter(p => p !== 5);
  const zfIdx = shenPalaces.indexOf(zfPalace);
  shenPalaces.forEach((p, i) => {
    const step = yin ? mod(zfIdx - i, 8) : mod(zfIdx + i, 8);
    shen[p] = shenSeq[step];
  });
  shen[5] = '';
  return { yin, ju, jqName, dayGZ, hourGZ, xunShou, xunshouName, zfStar, zsMen, zfPalace, pan, zsPalace, tianYi, shen };
}