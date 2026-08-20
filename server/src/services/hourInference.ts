// 时辰反推引擎：给定出生年月日 + 关键人生事件，对候选时辰按「流年 × 时柱互动」打分排序
// 原理：大运/起运不受时辰影响（已实测验证），区分候选时辰的关键在时柱与流年的冲合刑害、时干伏吟
import { baziCalc, shishen } from '../../../shared/core/engine/bazi.js';
import { GAN, ZHI, jiaziIndex } from '../../../shared/core/data/ganzhi.js';
import type { GeoLocation } from '../../../shared/core/types';

export interface HourInferEvent {
  year: number;
  text: string;
  /** 事件类别（可选）：health 健康/手术/伤病；love 恋爱/分手/结婚；job 事业/辞职/入职/公司；
   *  family 父母/家庭变故；money 财务/赔偿；study 学业/升学；move 搬家/远行。缺省时从文本关键词推断 */
  type?: 'health' | 'love' | 'job' | 'family' | 'money' | 'study' | 'move' | 'breakup';
}
export interface HourInferHit { year: number; text: string; reason: string }
export interface HourInferCandidate {
  hourIndex: number;      // 0-11
  hourGZ: string;         // 时柱干支
  shichen: string;        // 时辰名（子丑…）
  score: number;
  hits: HourInferHit[];
}
export interface HourInferResult {
  best: HourInferCandidate;
  candidates: HourInferCandidate[];
  chart: { yearGZ: string; monthGZ: string; dayGZ: string };
  note: string;
}

const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ─── 地支关系 ───
const CHONG: Record<string, string> = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const LIUHE: Record<string, string> = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const SANHE_GROUP: Record<string, string> = { 申: '水', 子: '水', 辰: '水', 寅: '火', 午: '火', 戌: '火', 巳: '金', 酉: '金', 丑: '金', 亥: '木', 卯: '木', 未: '木' };
const PO: Record<string, string> = { 子: '酉', 酉: '子', 丑: '辰', 辰: '丑', 寅: '亥', 亥: '寅', 卯: '午', 午: '卯', 巳: '申', 申: '巳', 未: '戌', 戌: '未' };
const XING: Record<string, string> = { 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑', 子: '卯', 卯: '子' };

function liuGZ(year: number): string {
  const idx = jiaziIndex(year);
  return GAN[idx % 10] + ZHI[idx % 12];
}

// 对单个事件打分：返回 (score, reason?)——只记「涉及时柱/日支/月支的应象」理由，供用户理解
function scoreEvent(ev: HourInferEvent, dayGan: string, hourGZ: string, dayGZ: string, monthGZ: string): { score: number; reason: string } {
  const gz = liuGZ(ev.year);
  const lg = gz[0], lz = gz[1];
  const sz = hourGZ[1], dz = dayGZ[1], mz = monthGZ[1];
  const t = ev.text || '';
  const has = (...ks: string[]) => ks.some(k => t.includes(k));
  // 类别判断：优先用显式 type，其次文本关键词
  const is = (cat: NonNullable<HourInferEvent['type']>) =>
    ev.type === cat || (ev.type === undefined && (
      (cat === 'health' && has('病', '癌', '手术', '住院', '伤', '灾', '去世', '死', '切除', '健康')) ||
      (cat === 'love' && has('恋', '对象', '男友', '女友', '结婚', '相亲', '遇到', '姻缘')) ||
      (cat === 'breakup' && has('分手', '破裂', '退婚', '分开')) ||
      (cat === 'job' && has('辞职', '入职', '工作', '公司', '事业', '创业', '裁员', '解散', '失业', '跳槽', '离职', '外贸', '职场', '晋升', '职位')) ||
      (cat === 'study' && has('上学', '高考', '大学', '读书', '复学', '学业', '高中', '初中', '升学')) ||
      (cat === 'move' && has('搬家', '到北京', '外地', '出国', '远行', '北漂', '去了', '变动')) ||
      (cat === 'money' && has('赔', '破财', '损失', '亏', '没干起来', '财务', '收入', '奖金', '赔偿')) ||
      (cat === 'family' && has('父母', '妈妈', '爸爸', '家里', '家庭', '离婚', '变故'))
    ));
  let s = 0;
  const rs: string[] = [];
  const push = (r: string) => { if (!rs.includes(r)) rs.push(r); };
  const ss = shishen(dayGan, lg);

  // ① 疾病/手术/灾伤/丧亡 → 冲刑破害日支（身体）、时支（子女/下焦）；半三合引动时支（如辰申合水主肾/生殖/下焦）
  if (is('health')) {
    if (lz === CHONG[dz]) { s += 2.5; push(lz + '冲日支' + dz + '（身体宫受冲）'); }
    if (lz === CHONG[sz]) { s += 2.5; push(lz + '冲时支' + sz + '（子女/下焦宫受冲）'); }
    if (lz === PO[dz]) { s += 2; push(lz + '破日支' + dz); }
    if (lz === PO[sz]) { s += 2; push(lz + '破时支' + sz); }
    if (lz === XING[dz]) { s += 1.5; push(lz + '刑日支' + dz); }
    if (lz === XING[sz]) { s += 1.5; push(lz + '刑时支' + sz); }
    // 半合引动时支与冲同权：如辰申合水主肾/骨/生殖（肾主骨，恰应骨骼与下焦之疾）
    if (SANHE_GROUP[lz] && SANHE_GROUP[lz] === SANHE_GROUP[sz]) { s += 3; push(lz + sz + '半三合（' + SANHE_GROUP[lz] + '局，引动时支/对应脏腑）'); }
  }
  // ② 恋爱/对象/结婚/相亲（姻缘始）→ 时干伏吟 / 时支六合三合 / 日支（夫妻宫）六合 / 夫星（女命官杀）
  if (is('love')) {
    if (lg === hourGZ[0]) { s += 2; push('流年' + lg + '与时干伏吟（引动时柱/姻缘宫）'); }
    if (lz === LIUHE[sz]) { s += 1.5; push(lz + '与' + sz + '六合（时支被合动）'); }
    if (lz === LIUHE[dz]) { s += 1.5; push(lz + '与' + dz + '六合（日支/夫妻宫被合动）'); }
    if (SANHE_GROUP[lz] && SANHE_GROUP[lz] === SANHE_GROUP[sz]) { s += 1.5; push(lz + sz + '半三合（' + SANHE_GROUP[lz] + '局）'); }
    if (ss === '正官' || ss === '七杀') { s += 1.5; push('流年' + lg + '为' + ss + '（官星现，主姻缘/担当）'); }
  }
  // ③ 分手/感情破裂 → 伤官克官 / 冲日支（夫妻宫）
  if (is('breakup') || (is('love') && has('分手'))) {
    if (ss === '伤官' || ss === '七杀') { s += 2; push('流年' + lg + '为' + ss + '（克官伤情）'); }
    if (lz === CHONG[dz]) { s += 2; push(lz + '冲日支' + dz + '（夫妻宫动）'); }
    if (lz === CHONG[sz]) { s += 1; push(lz + '冲时支' + sz); }
  }
  // ④ 事业/职场变动（辞职/入职/换工作/公司/裁员/失业）
  if (is('job')) {
    if (lz === CHONG[mz]) { s += 1.5; push(lz + '冲月支' + mz + '（父母/根基宫动）'); }
    if (lz === CHONG[sz]) { s += 1; push(lz + '冲时支' + sz); }
    if (lz === sz) { s += 1.5; push('流年支' + lz + '伏吟时支（变动之象）'); }
    if (ss === '伤官') { s += 1; push('流年' + lg + '为伤官（伤官见官，主与体制/上司冲突）'); }
    if (ss === '正官' || ss === '七杀') { s += 1; push('流年' + lg + '为' + ss + '（官星动，主职场体制变动）'); }
  }
  // ⑤ 学业/考试
  if (is('study')) {
    if (ss === '正印' || ss === '偏印') { s += 1.5; push('流年' + lg + '为' + ss + '（印星主学业）'); }
    if (ss === '食神' || ss === '伤官') { s += 1; push('流年' + lg + '为' + ss + '（食伤泄秀利学习输出）'); }
  }
  // ⑥ 搬家/远行/外地
  if (is('move')) {
    if (lz === CHONG[sz]) { s += 1.5; push(lz + '冲时支' + sz + '（远行之象）'); }
    if (lz === CHONG[mz]) { s += 1; push(lz + '冲月支' + mz); }
    if (lz === sz) { s += 1.5; push('流年支' + lz + '伏吟时支（变动之象）'); }
  }
  // ⑦ 破财/损失
  if (is('money')) {
    if (ss === '劫财') { s += 2; push('流年' + lg + '为劫财（夺财之象）'); }
  }
  // ⑧ 父母/家庭变故
  if (is('family')) {
    if (lz === CHONG[mz]) { s += 2; push(lz + '冲月支' + mz + '（父母宫动）'); }
  }

  return { score: s, reason: rs.join('；') };
}

export function inferHour(input: { y: number; m: number; d: number; gender: '男' | '女'; location?: GeoLocation | null; candidates?: number[]; events: HourInferEvent[] }): HourInferResult {
  const { y, m, d, gender, location, events } = input;
  // 默认全 12 时辰候选（无真太阳时校正：候选按「时辰序」理解，前端可提示用户按钟表时辰选择）
  const candidates = input.candidates && input.candidates.length ? input.candidates : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  // 基准盘（时辰未知模式排年月日三柱，用于取 dayGan 与三柱）
  const base = baziCalc({ y, m, d, hourIndex: -1, gender, location: location || undefined });

  const rows: HourInferCandidate[] = candidates.map(hourIndex => {
    const r = baziCalc({ y, m, d, hourIndex, gender, location: location || undefined });
    let score = 0;
    const hits: HourInferHit[] = [];
    for (const ev of events) {
      const { score: es, reason } = scoreEvent(ev, base.dayGan, r.hourGZ, r.dayGZ, r.monthGZ);
      score += es;
      if (reason) hits.push({ year: ev.year, text: ev.text, reason });
    }
    return { hourIndex, hourGZ: r.hourGZ, shichen: SHICHEN[hourIndex], score: Math.round(score * 10) / 10, hits };
  });

  rows.sort((a, b) => b.score - a.score);
  const best = rows[0];
  return {
    best,
    candidates: rows,
    chart: { yearGZ: base.yearGZ, monthGZ: base.monthGZ, dayGZ: base.dayGZ },
    note: '按「流年 × 时柱」冲合刑害与时干伏吟应象打分：疾病手术看冲刑日/时支，姻缘看时干伏吟与六合三合，事业变动看冲月支，父母变故看冲月支。大运序列不受时辰影响，本推演只区分时柱细节。',
  };
}
