// 紫微斗数：简式星盘（命宫/五行局/紫微定位/十四主星）+ 补齐层（辅星/身宫/四化/庙旺/格局）
import { NAYIN, NAYIN_JU, ganZhiIndex, mod } from '../data/ganzhi';
import { longitudeCorrectedHourIndex } from './trueSolarTime';
import type { ZiweiInput, ZiweiResult } from '../types';
import { GAN, ZHI } from '../data/ganzhi';
import { PALACE_NAMES, ZW_SIHUA, ZW_BRIGHTNESS, LU_CUN, KUI_YUE, TIAN_MA, HUO_START, LING_START, ZW_GEJU } from '../data/ziwei';

// 地支位：0=寅 起（与既有约定一致）
const DIZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const zhiIdx = (z: string) => DIZHI.indexOf(z);

export function ziweiCalc(input: ZiweiInput): ZiweiResult {
  let { month, day, hour } = input;
  const gz = input.ganzhi;
  const gan = gz[0];
  const zhi = gz[1];
  // 时辰经度修正（真太阳时之经度部分）
  let correctedHour = hour;
  if (input.location) {
    const [th, tm] = input.time ? input.time.split(':').map(Number) : [(hour * 2) % 24, 0];
    correctedHour = longitudeCorrectedHourIndex(th + (tm || 0) / 60, input.location.lng);
  }
  /* 命宫：寅宫起正月顺数至生月，再从生月宫起子时逆数至生时 */
  const ming = mod((month - 1) - correctedHour, 12);
  /* 身宫：寅起正月顺数生月，再从生月宫起子时顺数生时 */
  const shen = mod((month - 1) + correctedHour, 12);
  /* 五行局 */
  const nayin = NAYIN[Math.floor(ganZhiIndex(gz) / 2) % 30];
  const juName = NAYIN_JU[nayin] || '金四局';
  const JU_NUM: Record<string, number> = { 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
  const juNum = JU_NUM[juName[1]] || 4;
  /* 紫微定位 */
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

  /* ===== 补齐层 ===== */

  /* 1. 辅星安星 */
  const fuStars: Record<string, number> = {};
  // 左辅右弼：辰起，左辅顺数至生月，右弼逆数
  fuStars['左辅'] = mod(zhiIdx('辰') + (month - 1), 12);
  fuStars['右弼'] = mod(zhiIdx('辰') - (month - 1), 12);
  // 文昌文曲：戌起，文昌顺数至生时，文曲逆数
  fuStars['文昌'] = mod(zhiIdx('戌') + correctedHour, 12);
  fuStars['文曲'] = mod(zhiIdx('戌') - correctedHour, 12);
  // 天魁天钺（年干）
  const ky = KUI_YUE[gan] || [];
  if (ky[0]) fuStars['天魁'] = zhiIdx(ky[0]);
  if (ky[1]) fuStars['天钺'] = zhiIdx(ky[1]);
  // 禄存 + 擎羊陀罗（年干）
  const lu = LU_CUN[gan];
  if (lu) {
    const luIdx = zhiIdx(lu);
    fuStars['禄存'] = luIdx;
    fuStars['擎羊'] = mod(luIdx + 1, 12);
    fuStars['陀罗'] = mod(luIdx - 1, 12);
  }
  // 火星铃星（年支三合起宫，火顺行、铃逆行至生时）
  const hStart = HUO_START[zhi];
  if (hStart) fuStars['火星'] = mod(zhiIdx(hStart) + correctedHour, 12);
  const lStart = LING_START[zhi];
  if (lStart) fuStars['铃星'] = mod(zhiIdx(lStart) - correctedHour, 12);
  // 地空地劫：亥起，地空逆数、地劫顺数至生时
  fuStars['地空'] = mod(zhiIdx('亥') - correctedHour, 12);
  fuStars['地劫'] = mod(zhiIdx('亥') + correctedHour, 12);
  // 天马（年支三合）
  const tm = TIAN_MA[zhi];
  if (tm) fuStars['天马'] = zhiIdx(tm);

  /* 2. 生年四化 */
  const sh = ZW_SIHUA[gan] || { lu: '', quan: '', ke: '', ji: '' };
  const sihua = { lu: sh.lu, quan: sh.quan, ke: sh.ke, ji: sh.ji };
  const sihuaPos: ZiweiResult['sihuaPos'] = {};
  (['lu', 'quan', 'ke', 'ji'] as const).forEach(k => {
    const star = sh[k];
    if (star && zwStars[star] !== undefined) sihuaPos[k] = zwStars[star];
  });

  /* 3. 主星亮度（庙旺落陷） */
  const brightness: Record<string, string> = {};
  Object.keys(zwStars).forEach(s => {
    const pos = zwStars[s];
    brightness[s] = (ZW_BRIGHTNESS[s] || [])[pos] || '平';
  });

  /* 4. 格局识别 */
  const geju: ZiweiResult['geju'] = [];
  const pushGeju = (key: string, why: string) => {
    const g = ZW_GEJU[key];
    if (g) geju.push({ key, name: g.name, ji: g.ji, desc: g.desc, why });
  };
  const starsAt = (pos: number) => Object.keys(zwStars).filter(s => zwStars[s] === pos);
  const mingStars = starsAt(ming);
  // 三合宫位（命宫 ±4）
  const sanhe = [ming, mod(ming + 4, 12), mod(ming - 4, 12)];
  const sanheStars = sanhe.flatMap(starsAt);
  const duiStars = starsAt(mod(ming + 6, 12));
  // 杀破狼：命宫或三合会齐七杀破军贪狼（≥2 即记）
  const sbp = sanheStars.filter(s => ['七杀', '破军', '贪狼'].includes(s));
  if (sbp.length >= 2) pushGeju('杀破狼', '命宫三合会 ' + [...new Set(sbp)].join('、'));
  // 紫府同宫
  if (zwStars['紫微'] === zwStars['天府']) pushGeju('紫府同宫', '紫微天府同守 ' + DIZHI[zwStars['紫微']] + ' 宫');
  // 紫微朝垣：紫微在午（位置 4）
  if (zwStars['紫微'] === 4) pushGeju('紫微朝垣', '紫微独坐午宫');
  // 机月同梁：命宫及三合会天机/太阴/天同/天梁 ≥2
  const jytl = sanheStars.filter(s => ['天机', '太阴', '天同', '天梁'].includes(s));
  if (jytl.length >= 2) pushGeju('机月同梁', '三合会 ' + [...new Set(jytl)].join('、'));
  // 日月同宫
  if (zwStars['太阳'] === zwStars['太阴']) pushGeju('日月同宫', '太阳太阴同守 ' + DIZHI[zwStars['太阳']] + ' 宫');
  // 日月反背：太阳太阴皆陷
  const sunB = brightness['太阳'], moonB = brightness['太阴'];
  if (sunB === '陷' && moonB === '陷') pushGeju('日月反背', '太阳(' + DIZHI[zwStars['太阳']] + sunB + ')太阴(' + DIZHI[zwStars['太阴']] + moonB + ')皆落陷');
  // 月朗天门：太阴在亥庙
  if (zwStars['太阴'] === 9 && brightness['太阴'] === '庙') pushGeju('月朗天门', '太阴独坐亥宫庙旺');
  // 火贪格 / 铃贪格
  const tanPos = zwStars['贪狼'];
  const huoPos = fuStars['火星'], lingPos = fuStars['铃星'];
  const huoNear = huoPos !== undefined && (huoPos === tanPos || sanhe.includes(huoPos));
  const lingNear = lingPos !== undefined && (lingPos === tanPos || sanhe.includes(lingPos));
  if (huoNear) pushGeju('火贪格', '火星与贪狼同宫/三合');
  if (lingNear) pushGeju('铃贪格', '铃星与贪狼同宫/三合');
  // 石中隐玉：巨门在子午
  if (zwStars['巨门'] === 10 || zwStars['巨门'] === 4) pushGeju('石中隐玉', '巨门坐' + DIZHI[zwStars['巨门']] + '宫' + (gan === '辛' ? '，辛年生人尤佳' : ''));
  // 君臣庆会：紫微 + 左辅右弼/昌曲拱照
  const zwPalace = zwStars['紫微'];
  const junchen = (fuStars['左辅'] === zwPalace || fuStars['右弼'] === zwPalace || fuStars['左辅'] === mod(zwPalace + 6, 12) || fuStars['右弼'] === mod(zwPalace + 6, 12) || fuStars['文昌'] === zwPalace || fuStars['文曲'] === zwPalace);
  if (junchen) pushGeju('君臣庆会', '紫微得辅弼/昌曲拱照');
  // 禄马交驰：禄存天马同宫
  if (fuStars['禄存'] !== undefined && fuStars['禄存'] === fuStars['天马']) pushGeju('禄马交驰', '禄存天马同守 ' + DIZHI[fuStars['禄存']] + ' 宫');
  // 科权禄拱命：命宫三合方有化禄/权/科
  const s3 = (['lu', 'quan', 'ke'] as const).filter(k => sihuaPos[k] !== undefined && sanhe.includes(sihuaPos[k]!));
  if (s3.length >= 2) pushGeju('科权禄拱命', '命宫三合方会 ' + s3.map(k => sihua[k]).join('、'));
  // 廉贞七杀同宫
  if (zwStars['廉贞'] === zwStars['七杀']) pushGeju('廉贞七杀', '廉贞七杀同守 ' + DIZHI[zwStars['廉贞']] + ' 宫');
  // 命无正曜
  if (mingStars.length === 0) pushGeju('命无正曜', '命宫无十四主星，借对宫 ' + [...new Set(duiStars)].join('、') + ' 为用');

  /* ===== 大限与流年（原逻辑保留） ===== */
  const JU_AGE: Record<string, number> = { 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
  const startAge = JU_AGE[juName[1]] || 4;
  const ganYang = GAN.indexOf(gz[0] as any) % 2 === 0;
  const gender = input.gender || '男';
  const forward = (gender === '男' && ganYang) || (gender === '女' && !ganYang);
  const dayun: { palaceIdx: number; start: number; end: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const palaceIdx = mod(ming + (forward ? i : -i), 12);
    dayun.push({ palaceIdx, start: startAge + i * 10, end: startAge + i * 10 + 9 });
  }
  const birthYear = input.birthYear || 1993;
  const nowYear = new Date().getFullYear();
  const nominalAge = Math.max(nowYear - birthYear + 1, 1);
  let curDayunIdx = 0;
  for (let i = 0; i < dayun.length; i++) {
    if (nominalAge >= dayun[i].start && nominalAge <= dayun[i].end) { curDayunIdx = i; break; }
  }
  const liunianIdx = mod(ming + (nominalAge - 1), 12);
  const liunianPalaceName = PALACE_NAMES[Object.keys(palaces).find(k => palaces[Number(k)] === liunianIdx) ? Number(Object.keys(palaces).find(k => palaces[Number(k)] === liunianIdx)) : 0];
  const liunianStars = Object.keys(zwStars).filter(s => zwStars[s] === liunianIdx);

  return { ming, shen, zwPos, zwStars, fuStars, palaces, juName, nayin, correctedHour, dayun, curDayunIdx, nominalAge, liunianIdx, liunianPalaceName, liunianStars, startAge, forward, sihua, sihuaPos, brightness, geju };
}
