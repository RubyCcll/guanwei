// 四柱八字：真太阳时校正 + 精确节气定年柱月柱 + 十神强弱
// 补齐层（2026-08-20）：地支藏干十神 / 旺衰拆解 / 用神喜忌 / 大运流年 / 神煞 / 胎元命宫身宫
import { GAN, ZHI, WUXING, NAYIN, mod, jiaziIndex } from '../data/ganzhi';
import { daysSince, monthBranchOf, getJieQiTableExact } from './calendar';
import { trueSolarTime, shiftedDate } from './trueSolarTime';
import type { BaziInput, BaziResult } from '../types';

const MONTH_NAMES: Record<number, string> = { 0: '寅月', 1: '卯月', 2: '辰月', 3: '巳月', 4: '午月', 5: '未月', 6: '申月', 7: '酉月', 8: '戌月', 9: '亥月', 10: '子月', 11: '丑月' };

// ─── 地支藏干（本气/中气/余气）───
const CANGGAN: Record<string, { gan: string; qi: '本气' | '中气' | '余气' }[]> = {
  子: [{ gan: '癸', qi: '本气' }],
  丑: [{ gan: '己', qi: '本气' }, { gan: '癸', qi: '中气' }, { gan: '辛', qi: '余气' }],
  寅: [{ gan: '甲', qi: '本气' }, { gan: '丙', qi: '中气' }, { gan: '戊', qi: '余气' }],
  卯: [{ gan: '乙', qi: '本气' }],
  辰: [{ gan: '戊', qi: '本气' }, { gan: '乙', qi: '中气' }, { gan: '癸', qi: '余气' }],
  巳: [{ gan: '丙', qi: '本气' }, { gan: '庚', qi: '中气' }, { gan: '戊', qi: '余气' }],
  午: [{ gan: '丁', qi: '本气' }, { gan: '己', qi: '中气' }],
  未: [{ gan: '己', qi: '本气' }, { gan: '丁', qi: '中气' }, { gan: '乙', qi: '余气' }],
  申: [{ gan: '庚', qi: '本气' }, { gan: '壬', qi: '中气' }, { gan: '戊', qi: '余气' }],
  酉: [{ gan: '辛', qi: '本气' }],
  戌: [{ gan: '戊', qi: '本气' }, { gan: '辛', qi: '中气' }, { gan: '丁', qi: '余气' }],
  亥: [{ gan: '壬', qi: '本气' }, { gan: '甲', qi: '中气' }],
};

// ─── 神煞表（日干起）───
const GUI_REN: Record<string, string[]> = { 甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'], 乙: ['子', '申'], 己: ['子', '申'], 丙: ['亥', '酉'], 丁: ['亥', '酉'], 壬: ['卯', '巳'], 癸: ['卯', '巳'], 辛: ['午', '寅'] };
const WEN_CHANG: Record<string, string> = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
const LU_SHEN: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
const YANG_REN: Record<string, string> = { 甲: '卯', 乙: '寅', 丙: '午', 丁: '巳', 戊: '午', 己: '巳', 庚: '酉', 辛: '申', 壬: '子', 癸: '亥' };
// 三合局（年支/日支）→ 驿马/桃花/华盖/将星
const SANHE: Record<string, { ma: string; tao: string; gai: string; jiang: string }> = {
  申: { ma: '寅', tao: '酉', gai: '辰', jiang: '子' }, 子: { ma: '寅', tao: '酉', gai: '辰', jiang: '子' }, 辰: { ma: '寅', tao: '酉', gai: '辰', jiang: '子' },
  寅: { ma: '申', tao: '卯', gai: '戌', jiang: '午' }, 午: { ma: '申', tao: '卯', gai: '戌', jiang: '午' }, 戌: { ma: '申', tao: '卯', gai: '戌', jiang: '午' },
  巳: { ma: '亥', tao: '午', gai: '丑', jiang: '酉' }, 酉: { ma: '亥', tao: '午', gai: '丑', jiang: '酉' }, 丑: { ma: '亥', tao: '午', gai: '丑', jiang: '酉' },
  亥: { ma: '巳', tao: '子', gai: '未', jiang: '卯' }, 卯: { ma: '巳', tao: '子', gai: '未', jiang: '卯' }, 未: { ma: '巳', tao: '子', gai: '未', jiang: '卯' },
};

// 十二「节」（大运起运顺逆数此）
const JIE_NAMES = ['小寒', '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪'];

const WX_ORDER = ['木', '火', '土', '金', '水'];

export function baziCalc(input: BaziInput): BaziResult {
  let { y, m, d, hourIndex } = input;
  const gender = input.gender;
  // 时辰未知：hourIndex < 0（或缺失）→ 不排时柱，年月日三柱照排，大运/起运不受影响
  const hourUnknown = hourIndex === undefined || hourIndex === null || hourIndex < 0;

  // 1. 真太阳时校正（出生地点 → 经度；仅时辰已知时做；优先用输入精确时刻，缺省用时辰中点）
  let correctedHourIndex = hourUnknown ? -1 : hourIndex;
  let trueSolar;
  if (!hourUnknown && input.location) {
    const [th, tm] = input.time ? input.time.split(':').map(Number) : [(hourIndex * 2) % 24, 30];
    trueSolar = trueSolarTime(y, m, d, th, tm, input.location.lng);
    correctedHourIndex = trueSolar.hourIndex;
    if (trueSolar.dateOffset !== 0) {
      [y, m, d] = shiftedDate(y, m, d, trueSolar.dateOffset);
    }
  }
  const hour = hourUnknown ? 12 : (correctedHourIndex * 2) % 24;
  const min = 0;

  // 2. 年柱（立春为界）
  // 注意：getJieQiTableExact(yy) 返回的是「农历年」节气表，冬至后的立春可能落在公历次年
  // （如 2023 表中含 2024-02-04 立春）——取立春发生的公历年份定年柱，不能用表格年份 yy
  const t = new Date(y, m - 1, d, hour, min).getTime();
  let lichunBest = -Infinity;
  let lichunYear = y - 1;
  for (const yy of [y - 1, y, y + 1]) {
    for (const jq of getJieQiTableExact(yy)) {
      if (jq.name === '立春') {
        const tt = jq.time.getTime();
        if (tt <= t && tt > lichunBest) { lichunBest = tt; lichunYear = jq.time.getFullYear(); }
      }
    }
  }
  const yearGZ = ganzhiYear(lichunYear);

  // 3. 月柱（精确节气定月支 + 五虎遁）
  const mb = monthBranchOf(y, m, d, hour, min);
  const ygIdx = GAN.indexOf(yearGZ[0] as any);
  const mgIdx = mod((ygIdx % 5) * 2 + 2 + mb, 10);
  const monthGZ = GAN[mgIdx] + ZHI[mod(2 + mb, 12)];

  // 4. 日柱
  const dIdx = mod(daysSince(y, m, d) + 55, 60);
  const dayGZ = GAN[dIdx % 10] + ZHI[dIdx % 12];
  const dayGan = dayGZ[0];
  const dayGanWx = WUXING[dayGan];

  // 5. 时柱（五鼠遁；时辰未知则不排）
  let hourGZ = '未知';
  if (!hourUnknown) {
    const dgIdx = GAN.indexOf(dayGan as any);
    const hgIdx = mod((dgIdx % 5) * 2 + correctedHourIndex, 10);
    hourGZ = GAN[hgIdx] + ZHI[correctedHourIndex];
  }

  // 6. 基础五行统计 + 天干十神（保留原口径；时辰未知时仅三柱）
  const wxCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const gzList = hourUnknown ? [yearGZ, monthGZ, dayGZ] : [yearGZ, monthGZ, dayGZ, hourGZ];
  gzList.forEach(gz => { wxCount[WUXING[gz[0]]]++; wxCount[WUXING[gz[1]]]++; });
  const shishenList = gzList.map(gz => ({ gan: gz[0], name: shishen(dayGan, gz[0]) }));
  if (hourUnknown) shishenList.push({ gan: '□', name: '未知' });
  const nayin = NAYIN[Math.floor(jiaziIndex(y) / 2) % 30];
  const support = wxCount[dayGanWx] + wxCount[WX_ORDER[(WX_ORDER.indexOf(dayGanWx) + 4) % 5]];
  const drain = gzList.length * 2 - support;

  // ─── 7. 地支藏干 + 藏干十神 + 加权五行 ───
  const canggan = gzList.map(gz => ({
    zhi: gz[1],
    gans: (CANGGAN[gz[1]] || []).map(c => ({
      gan: c.gan, wx: WUXING[c.gan], qi: c.qi, shishen: shishen(dayGan, c.gan),
    })),
  }));
  if (hourUnknown) canggan.push({ zhi: '？', gans: [] });
  const wxWeighted: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  gzList.forEach(gz => { wxWeighted[WUXING[gz[0]]] += 1; });
  canggan.forEach(cg => cg.gans.forEach(c => { wxWeighted[c.wx] += c.qi === '本气' ? 2 : 1; }));

  // ─── 8. 旺衰拆解（得令/得地/得势）───
  const dayWxIdx = WX_ORDER.indexOf(dayGanWx);
  const monthWx = WUXING[monthGZ[1]];
  const mIdx = WX_ORDER.indexOf(monthWx);
  // 月令生克：同=3 生我=2 我生=1 我克/克我=0.5
  const rel = mod(mIdx - dayWxIdx, 5);
  const ling = rel === 0 ? 3 : rel === 4 ? 2 : rel === 1 ? 1 : 0.5;
  let gen = 0;
  const genDetails: string[] = [];
  gzList.forEach(gz => {
    const cgs = CANGGAN[gz[1]] || [];
    const ben = cgs.find(c => c.qi === '本气');
    const zhong = cgs.find(c => c.qi !== '本气' && WUXING[c.gan] === dayGanWx);
    if (ben && WUXING[ben.gan] === dayGanWx) { gen += 2; genDetails.push(gz[1] + '本气' + ben.gan + '通根'); }
    else if (zhong) { gen += 1; genDetails.push(gz[1] + '藏' + zhong.gan + '微根'); }
  });
  let shi = 0;
  [yearGZ[0], monthGZ[0], dayGZ[0]].forEach(gan => {
    const gw = WUXING[gan];
    if (gw === dayGanWx) shi += 1;
    else if (mod(WX_ORDER.indexOf(gw) - dayWxIdx, 5) === 4) shi += 1; // 生我
  });
  const score = ling + gen + shi;
  const reasons: string[] = [];
  reasons.push((ling >= 3 ? '月令得令（' + monthGZ[1] + '月' + monthWx + '）' : ling >= 2 ? '月令生扶' : '月令失令（' + monthGZ[1] + '月' + monthWx + '）') + ' +' + ling);
  if (genDetails.length) reasons.push('地支通根：' + genDetails.join('、') + ' +' + gen);
  else reasons.push('地支无根 +' + gen);
  reasons.push((shi > 0 ? '天干得势（比劫印星 ' + shi + ' 位）' : '天干无助') + ' +' + shi);
  const finalStrength: BaziResult['strength'] = score >= 7 ? '身强' : score <= 4 ? '身弱' : '中和';

  // ─── 9. 用神/喜忌（扶抑 + 季节调候）───
  const XI_Q: Record<string, string[]> = { 身强: ['官杀', '食伤', '财'], 身弱: ['印', '比劫'], 中和: ['食伤', '财', '印'] };
  const JI_Q: Record<string, string[]> = { 身强: ['印', '比劫'], 身弱: ['财', '官杀', '食伤'], 中和: ['比劫', '官杀'] };
  const xi = XI_Q[finalStrength] || [];
  const ji = JI_Q[finalStrength] || [];
  // 调候：按季节（月支）
  const season = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'].indexOf(monthGZ[1]);
  let tiaohou = '';
  if (season >= 9 || season <= 0) tiaohou = '冬月寒凝，宜火调候（丙丁）';
  else if (season >= 3 && season <= 5) tiaohou = '夏月炎燥，宜水调候（壬癸）';
  else if (season >= 0 && season <= 2) tiaohou = '春月木旺，宜火泄秀或金制衡';
  else tiaohou = '秋月金旺，宜火炼金或水泄秀';
  // 主用神五行：身强取克泄（官杀=克我、食伤=我生、财=我克）；身弱取生扶（印=生我、比劫=同我）
  const useWx = finalStrength === '身强'
    ? (WX_ORDER[(dayWxIdx + 2) % 5]) // 我克=财（或取食伤，简化取财）
    : (WX_ORDER[(dayWxIdx + 4) % 5]); // 生我=印
  const yongshen = {
    wx: useWx, shishen: finalStrength === '身强' ? '财星' : '印星',
    xi, ji, tiaohou,
    reason: '日主' + finalStrength + '（旺衰分 ' + score + '：' + reasons.join('；') + '）。' + (finalStrength === '身强' ? '身强宜克泄耗，取' + useWx + '（财星）为用，喜财官食伤，忌印比生扶。' : '身弱宜生扶，取' + useWx + '（印星）为用，喜印比帮身，忌财官食伤。') + tiaohou + '。',
  };

  // ─── 10. 大运（起运 + 序列）───
  const ganYang = GAN.indexOf(yearGZ[0] as any) % 2 === 0;
  const forward = (gender === '男' && ganYang) || (gender === '女' && !ganYang);
  // 找最近「节」：顺排找下一个，逆排找上一个
  const jieTimes: { name: string; time: number }[] = [];
  for (const yy of [y - 1, y, y + 1]) {
    for (const jq of getJieQiTableExact(yy)) {
      if (JIE_NAMES.includes(jq.name)) jieTimes.push({ name: jq.name, time: jq.time.getTime() });
    }
  }
  jieTimes.sort((a, b) => a.time - b.time);
  let diffDays = 0, jieName = '';
  if (forward) {
    const next = jieTimes.find(j => j.time > t);
    if (next) { diffDays = (next.time - t) / 86400000; jieName = next.name; }
  } else {
    const prev = [...jieTimes].reverse().find(j => j.time < t);
    if (prev) { diffDays = (t - prev.time) / 86400000; jieName = prev.name; }
  }
  const qiYunYears = Math.max(0, Math.floor(diffDays / 3));
  const qiYunMonths = Math.max(0, Math.floor((diffDays - qiYunYears * 3) * 4));
  const startAge = qiYunYears + 1; // 虚岁起运
  const mgIdx2 = GAN.indexOf(monthGZ[0] as any);
  const mzIdx2 = ZHI.indexOf(monthGZ[1] as any);
  const dayun: BaziResult['dayun'] = [];
  const birthYear = y;
  for (let i = 0; i < 8; i++) {
    const step = forward ? i : -i;
    const g = GAN[mod(mgIdx2 + step, 10)];
    const z = ZHI[mod(mzIdx2 + step, 12)];
    dayun.push({
      gz: g + z,
      ganShishen: shishen(dayGan, g),
      zhiShishen: (CANGGAN[z] || []).map(c => c.gan + shishen(dayGan, c.gan)).join('、'),
      startAge: startAge + i * 10,
      startYear: birthYear + startAge + i * 10 - 1,
      endYear: birthYear + startAge + i * 10 + 9 - 1,
      forward,
    });
  }

  // ─── 11. 流年（当前年）───
  const nowYear = new Date().getFullYear();
  const liuIdx = jiaziIndex(nowYear);
  const liuGZ = GAN[liuIdx % 10] + ZHI[liuIdx % 12];
  const liunian = {
    year: nowYear,
    gz: liuGZ,
    ganShishen: shishen(dayGan, liuGZ[0]),
    zhiShishen: (CANGGAN[liuGZ[1]] || []).map(c => c.gan + shishen(dayGan, c.gan)).join('、'),
  };

  // ─── 12. 神煞（日干 + 年支/日支三合）───
  const shensha: BaziResult['shensha'] = [];
  const zhis = gzList.map(gz => gz[1]);
  const zhiSet = new Set(zhis);
  (GUI_REN[dayGan] || []).forEach(z => { if (zhiSet.has(z)) shensha.push({ name: '天乙贵人', zhi: z, type: '吉' }); });
  const wc = WEN_CHANG[dayGan];
  if (wc && zhiSet.has(wc)) shensha.push({ name: '文昌贵人', zhi: wc, type: '吉' });
  const lu = LU_SHEN[dayGan];
  if (lu && zhiSet.has(lu)) shensha.push({ name: '禄神', zhi: lu, type: '吉' });
  const yr = YANG_REN[dayGan];
  if (yr && zhiSet.has(yr)) shensha.push({ name: '羊刃', zhi: yr, type: '凶' });
  const sanheKey = SANHE[yearGZ[1]] || SANHE[dayGZ[1]];
  if (sanheKey) {
    if (zhiSet.has(sanheKey.ma)) shensha.push({ name: '驿马', zhi: sanheKey.ma, type: '平' });
    if (zhiSet.has(sanheKey.tao)) shensha.push({ name: '桃花（咸池）', zhi: sanheKey.tao, type: '平' });
    if (zhiSet.has(sanheKey.gai)) shensha.push({ name: '华盖', zhi: sanheKey.gai, type: '平' });
    if (zhiSet.has(sanheKey.jiang)) shensha.push({ name: '将星', zhi: sanheKey.jiang, type: '平' });
  }

  // ─── 12.5 月令取格（八格：月支本气十神定格局，透干者加力）───
  const monthBenQi = (CANGGAN[monthGZ[1]] || [])[0];   // 月支本气
  const monthBenQiShishen = monthBenQi ? shishen(dayGan, monthBenQi.gan) : '比肩';
  const benQiIndex = gzList.findIndex(gz => gz[0] === monthBenQi?.gan); // 本气是否透干
  const benQiTou = benQiIndex >= 0;
  const gejuName = ['比肩', '劫财'].includes(monthBenQiShishen)
    ? (monthBenQiShishen === '比肩' ? '建禄格（月令比肩，不作八格，以身强论）' : '羊刃格（月令劫财，旺极须制）')
    : monthBenQiShishen + '格';
  const geju = {
    name: gejuName,
    gan: monthBenQi?.gan || '',
    shishen: monthBenQiShishen,
    basis: '月支' + monthGZ[1] + '本气' + (monthBenQi?.gan || '') + '（' + monthBenQiShishen + '）' + (benQiTou ? '，透干于' + ['年干', '月干', '日干', '时干'][benQiIndex] + '，格气有力' : '，未透干，格气内藏') + '；' + tiaohou,
  };
  // ─── 13. 胎元 / 命宫 / 身宫 ───
  const taiyuan = GAN[mod(mgIdx2 + 1, 10)] + ZHI[mod(mzIdx2 + 3, 12)];
  const minggong = hourUnknown ? '未知' : ZHI[mod(2 + mod((mb) - correctedHourIndex, 12), 12)];
  const shengong = hourUnknown ? '未知' : ZHI[mod(2 + mod((mb) + correctedHourIndex, 12), 12)];

  return {
    yearGZ, monthGZ, dayGZ, hourGZ,
    dayGan, dayGanWx,
    wxCount,
    shishen: shishenList,
    strength: finalStrength, support, drain,
    nayin,
    correctedHourIndex,
    trueSolar,
    canggan,
    wxWeighted,
    strengthDetail: { score, ling, gen, shi, reasons },
    yongshen,
    dayun,
    qiYun: { startAge, startMonth: qiYunMonths, detail: (forward ? '顺行' : '逆行') + '，' + (jieName ? '距' + jieName : '') + (diffDays > 0 ? ' ' + diffDays.toFixed(1) + ' 天（3 天为 1 岁）' : '') + '，约 ' + startAge + ' 岁起运' },
    liunian,
    shensha,
    taiyuan,
    minggong,
    shengong,
    geju,
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
  const map: Record<number, string> = { 1: same ? '食神' : '伤官', 2: same ? '偏财' : '正财', 3: same ? '七杀' : '正官', 4: same ? '偏印' : '正印' };
  return map[rel] || '比肩';
}

export { MONTH_NAMES };