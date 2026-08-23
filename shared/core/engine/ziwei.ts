// 紫微斗数：简式星盘（命宫/五行局/紫微定位/十四主星）+ 补齐层（辅星/身宫/四化/庙旺/格局）
import { NAYIN, ganZhiIndex, mod } from '../data/ganzhi';
import { GAN } from '../data/ganzhi';
import { trueSolarTime } from './trueSolarTime';
import type { ZiweiInput, ZiweiResult } from '../types';

import { PALACE_NAMES, ZW_SIHUA, ZW_BRIGHTNESS, LU_CUN, KUI_YUE, TIAN_MA, HUO_START, LING_START, ZW_GEJU } from '../data/ziwei';

// 地支位：0=寅 起（与既有约定一致）
const DIZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const zhiIdx = (z: string) => DIZHI.indexOf(z);

export function ziweiCalc(input: ZiweiInput): ZiweiResult {
  let { month, day, hour } = input;
  const gz = input.ganzhi;
  const gan = gz[0];
  const zhi = gz[1];
  // 时辰真太阳时校正（经度 + 均时差；有公历日期用完整版）
  let correctedHour = hour;
  if (input.location) {
    const [th, tm] = input.time ? input.time.split(':').map(Number) : [(hour * 2) % 24, 30];
    if (input.solarDate) {
      const ts = trueSolarTime(input.solarDate[0], input.solarDate[1], input.solarDate[2], th, tm, input.location.lng);
      correctedHour = ts.hourIndex;
    } else {
      // 无公历日期：仅经度修正（均时差 ≤15 分钟，边界时辰有风险——建议传 solarDate）
      const localMean = th + (tm || 0) / 60 + (input.location.lng - 120) * 4 / 60;
      correctedHour = Math.floor((((localMean + 24) % 24) + 1) % 24 / 2);
    }
  }
  /* 命宫：寅宫起正月顺数至生月，再从生月宫起子时逆数至生时 */
  const ming = mod((month - 1) - correctedHour, 12);
  /* 身宫：寅起正月顺数生月，再从生月宫起子时顺数生时 */
  const shen = mod((month - 1) + correctedHour, 12);
  const nayin = NAYIN[Math.floor(ganZhiIndex(gz) / 2) % 30]; // 年柱纳音（展示用）
  /* ── 补齐修正（2026-08-20，以 iztro《紫微斗数全书》安星为准）──
     五行局：由「命宫干支」纳音取数定局（非年干支纳音） */
  // 命宫天干：五虎遁起寅月，顺数至命宫位（TIGER_RULE：甲己丙、乙庚戊、丙辛庚、丁壬壬、戊癸甲）
  const TIGER: Record<string, string> = { 甲: '丙', 乙: '戊', 丙: '庚', 丁: '壬', 戊: '甲', 己: '丙', 庚: '戊', 辛: '庚', 壬: '壬', 癸: '甲' };
  const mingGan = GAN[mod(GAN.indexOf(TIGER[gan] as any) + ming, 10)];
  const mingGZ = mingGan + DIZHI[ming];
  // 纳音五行取数：天干 甲乙1 丙丁2 戊己3 庚辛4 壬癸5；地支 子丑午未1 寅卯申酉2 辰巳戌亥3；和 >5 减 5；1木 2金 3水 4火 5土
  const ganNum = Math.floor(GAN.indexOf(mingGan as any) / 2) + 1;
  const zhiNum = Math.floor(mod(ming + 2, 6) / 2) + 1; // 寅起序 +2 → 子起序（子丑午未1 寅卯申酉2 辰巳戌亥3）
  let fiveIdx = ganNum + zhiNum;
  while (fiveIdx > 5) fiveIdx -= 5;
  const FIVE_CLASS = ['木三局', '金四局', '水二局', '火六局', '土五局'];
  const juName = FIVE_CLASS[fiveIdx - 1];
  const JU_NUM: Record<string, number> = { 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
  const juNum = JU_NUM[juName[1]] || 4;
  /* 紫微定位（起紫微星诀）：(生日+offset) 可被局数整除，商定宫位，offset 奇偶定顺逆 */
  let offset = -1, quotient = 0, remainder = -1;
  do {
    offset++;
    const divisor = day + offset;
    quotient = Math.floor(divisor / juNum);
    remainder = divisor % juNum;
  } while (remainder !== 0);
  quotient %= 12;
  let ziweiIdx = quotient - 1;
  if (offset % 2 === 0) ziweiIdx += offset;
  else ziweiIdx -= offset;
  const zwPos = mod(ziweiIdx, 12);
  /* 天府与紫微相对（寅起 12 之补） */
  const tianfu = mod(12 - zwPos, 12);
  /* 十四主星 */
  const zwStars: Record<string, number> = {};
  const ziweiList = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞'];
  const ziweiOff = [0, -1, -3, -4, -5, -8];
  ziweiList.forEach((s, i) => { zwStars[s] = mod(zwPos + ziweiOff[i], 12); });
  const tianfuList = ['天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
  const tianfuOff = [0, 1, 2, 3, 4, 5, 6, 10]; // 七杀空三宫后破军（iztro 校准）
  tianfuList.forEach((s, i) => { zwStars[s] = mod(tianfu + tianfuOff[i], 12); });
  /* 十二宫布列：命宫起逆布 */
  const palaces: Record<number, number> = {};
  for (let i = 0; i < 12; i++) palaces[i] = mod(ming - i, 12);

  /* ===== 补齐层 ===== */

  /* 1. 辅星安星 */
  const fuStars: Record<string, number> = {};
  // 左辅右弼：左辅辰起顺数至生月，右弼戌起逆数至生月（iztro 校准）
  fuStars['左辅'] = mod(zhiIdx('辰') + (month - 1), 12);
  fuStars['右弼'] = mod(zhiIdx('戌') - (month - 1), 12);
  // 文昌文曲：文昌戌起逆数至生时，文曲辰起顺数至生时（iztro 校准）
  fuStars['文昌'] = mod(zhiIdx('戌') - correctedHour, 12);
  fuStars['文曲'] = mod(zhiIdx('辰') + correctedHour, 12);
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
  // 火星铃星（年支三合起宫，均顺数至生时——iztro 校准，铃星原误为逆行）
  const hStart = HUO_START[zhi];
  if (hStart) fuStars['火星'] = mod(zhiIdx(hStart) + correctedHour, 12);
  const lStart = LING_START[zhi];
  if (lStart) fuStars['铃星'] = mod(zhiIdx(lStart) + correctedHour, 12);
  // 地空地劫：亥起，地空逆数、地劫顺数至生时
  fuStars['地空'] = mod(zhiIdx('亥') - correctedHour, 12);
  fuStars['地劫'] = mod(zhiIdx('亥') + correctedHour, 12);
  // 天马（年支三合）
  const tm = TIAN_MA[zhi];
  if (tm) fuStars['天马'] = zhiIdx(tm);


  /* 1.5 小星（年支起法，2026-08-20 补全） */
  const yearZhiIdx = zhiIdx(zhi);
  fuStars['红鸾'] = mod(11 - yearZhiIdx, 12);   // 卯起子年逆数（寅起序验证：子→卯）
  fuStars['天喜'] = mod(fuStars['红鸾'] + 6, 12);
  const XIANCHI: Record<string, string> = { 申: '酉', 子: '酉', 辰: '酉', 寅: '卯', 午: '卯', 戌: '卯', 巳: '午', 酉: '午', 丑: '午', 亥: '子', 卯: '子', 未: '子' };
  fuStars['咸池'] = zhiIdx(XIANCHI[zhi] || '酉');
  fuStars['天姚'] = mod(yearZhiIdx + 2, 12);      // 寅起子年顺行
  fuStars['天刑'] = mod(yearZhiIdx + 9, 12);      // 酉起子年顺行
  const GU_GUA: Record<string, [string, string]> = { 亥: ['寅', '戌'], 子: ['寅', '戌'], 丑: ['寅', '戌'], 寅: ['巳', '丑'], 卯: ['巳', '丑'], 辰: ['巳', '丑'], 巳: ['申', '辰'], 午: ['申', '辰'], 未: ['申', '辰'], 申: ['亥', '未'], 酉: ['亥', '未'], 戌: ['亥', '未'] };
  fuStars['孤辰'] = zhiIdx((GU_GUA[zhi] || ['寅', '戌'])[0]);
  fuStars['寡宿'] = zhiIdx((GU_GUA[zhi] || ['寅', '戌'])[1]);
  fuStars['天哭'] = mod(yearZhiIdx + 6, 12);      // 午起子年顺行
  fuStars['天虚'] = mod(fuStars['天哭'] + 6, 12);

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

  return { ming, shen, zwPos, zwStars, fuStars, palaces, juName, mingGZ, nayin, correctedHour, dayun, curDayunIdx, nominalAge, liunianIdx, liunianPalaceName, liunianStars, startAge, forward, sihua, sihuaPos, brightness, geju };
}