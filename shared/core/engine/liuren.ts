// 大六壬：月将加时（中气定将）· 四课三传（九宗门真实起法）
// 九宗门：贼克（元首/始入/重审/知一）→ 比用 → 涉害 → 遥克（蒿矢/弹射）→ 昴星（虎视/冬蛇掩目）→ 别责 → 八专 → 返吟（取驿马）→ 伏吟（取刑）
import { GAN, ZHI, WUXING, mod } from '../data/ganzhi';
import { LR_JIANGS, LR_JIANG_SUN, LR_GANJI } from '../data/liuren';
import { daysSince, currentJieqiNameExact } from './calendar';
import type { LiurenResult } from '../types';

// ─── 九宗门辅助表 ───
// 五行生克：克我者（谁克我）——五行相克序：木→土→水→火→金→木
const WX_KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

function ke(wx1: string, wx2: string): boolean {
  // wx1 克 wx2？
  return WX_KE[wx1] === wx2;
}

// 地支阴阳：子(0)阳 丑(1)阴 寅(2)阳 … 亥(11)阴
const zhiYang = (z: string) => ZHI.indexOf(z as any) % 2 === 0;

// 干阴阳：甲丙戊庚壬 阳；乙丁己辛癸 阴
const ganYang = (g: string) => GAN.indexOf(g as any) % 2 === 0;

// 刑：子刑卯、卯刑子；寅刑巳、巳刑申、申刑寅；丑刑戌、戌刑未、未刑丑；辰午酉亥自刑
const XING: Record<string, string> = { 子: '卯', 卯: '子', 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑' };
const ZIXING = ['辰', '午', '酉', '亥'];

// 冲：子午、丑未、寅申、卯酉、辰戌、巳亥
const CHONG: Record<string, string> = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };

// 驿马（三合局冲）：申子辰→寅、寅午戌→申、巳酉丑→亥、亥卯未→巳
function yimaOf(zhi: string): string {
  const maMap: Record<string, string> = { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' };
  return maMap[zhi] || '寅';
}

// 干五合（别责阳日用）：甲己合、乙庚合、丙辛合、丁壬合、戊癸合
const GAN_HE: Record<string, string> = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };

interface Ke {
  shang: string;   // 上神（天盘所加之神）
  xia: string;     // 下神（地盘本支）
  shangKe: boolean; // 上克下
  xiaKe: boolean;   // 下克上（贼）
}

function buildKe(tianpan: Record<number, string>, ganJi: string, dayZhi: string): Ke[] {
  const zi = (z: string) => ZHI.indexOf(z as any);
  const ke1 = tianpan[zi(ganJi)];
  const ke2 = tianpan[zi(ke1)];
  const ke3 = tianpan[zi(dayZhi)];
  const ke4 = tianpan[zi(ke3)];
  const rows: Ke[] = [
    { shang: ke1, xia: ganJi, shangKe: false, xiaKe: false },
    { shang: ke2, xia: ke1, shangKe: false, xiaKe: false },
    { shang: ke3, xia: dayZhi, shangKe: false, xiaKe: false },
    { shang: ke4, xia: ke3, shangKe: false, xiaKe: false },
  ];
  for (const r of rows) {
    const sw = WUXING[r.shang], xw = WUXING[r.xia];
    r.shangKe = ke(sw, xw);
    r.xiaKe = ke(xw, sw);
  }
  return rows;
}

interface Chuan { method: string; note: string; chuan1: string; chuan2: string; chuan3: string; }

// 由初传推中传、末传：中传 = 初传上神（天盘加临初传者），末传 = 中传上神
function chuanFrom(tianpan: Record<number, string>, chuan1: string): { chuan2: string; chuan3: string } {
  const zi = (z: string) => ZHI.indexOf(z as any);
  const chuan2 = tianpan[zi(chuan1)];
  const chuan3 = tianpan[zi(chuan2)];
  return { chuan2, chuan3 };
}

/**
 * 九宗门起三传（《六壬大全》标准规则）
 * 顺序：有克→贼克（唯一取之；多克→比用→涉害）；无克→遥克；无遥克→别责/八专/昴星；
 *       返吟无克取驿马；伏吟无克取刑
 */
export function jiuzongmen(tianpan: Record<number, string>, ganJi: string, dayZhi: string, dayGan: string, hourIndex: number, jiang: string): Chuan {
  const zi = (z: string) => ZHI.indexOf(z as any);
  const kes = buildKe(tianpan, ganJi, dayZhi);
  const shangKeRows = kes.filter(k => k.shangKe);
  const xiaKeRows = kes.filter(k => k.xiaKe);
  const jiangIdx = zi(jiang);
  const isFuyin = jiangIdx === hourIndex;                    // 天地盘同位
  const isFanyin = mod(jiangIdx - hourIndex, 12) === 6;      // 天地盘对冲

  // 涉害：多克且比用不出时，取受克最深者（涉害深者发用）；同深取先见
  const shehai = (candidates: Ke[]): Ke => {
    let best = candidates[0], bestDepth = -1;
    for (const c of candidates) {
      let depth = 0;
      for (const z of ZHI) {
        const wx = WUXING[c.shang];
        if (ke(WUXING[z], wx)) depth++;   // 地盘支克上神
      }
      if (depth > bestDepth) { best = c; bestDepth = depth; }
    }
    return best;
  };

  // ── 1. 贼克法 ──
  if (shangKeRows.length > 0 || xiaKeRows.length > 0) {
    // 有上克下优先取上克下；无上克下取贼
    const pool = shangKeRows.length > 0 ? shangKeRows : xiaKeRows;
    if (pool.length === 1) {
      // 元首课（一上克下）/ 始入课（一下贼上）
      const c1 = pool[0].shang;
      const { chuan2, chuan3 } = chuanFrom(tianpan, c1);
      return {
        method: pool[0].shangKe ? (shangKeRows.length === 1 && xiaKeRows.length === 0 ? '元首课' : '重审课') : '始入课',
        note: pool[0].shangKe ? (shangKeRows.length === 1 && xiaKeRows.length === 0 ? '一上克下，事起于外，宜主动决断。' : '课多上克，主事多制肘，须审时度势。') : '一下贼上，事起于内，防人算计。',
        chuan1: c1, chuan2, chuan3,
      };
    }
    // 多克 → 比用（取与日干阴阳相同之上神）
    const dayGanYang = ganYang(dayGan);
    const bi = pool.filter(k => zhiYang(k.shang) === dayGanYang);
    if (bi.length === 1) {
      const c1 = bi[0].shang;
      const { chuan2, chuan3 } = chuanFrom(tianpan, c1);
      return { method: '知一课', note: '取与日干比和者发用，事有取舍，宜择同类而谋。', chuan1: c1, chuan2, chuan3 };
    }
    // 比用不出 → 涉害
    const pick = shehai(pool);
    const c1 = pick.shang;
    const { chuan2, chuan3 } = chuanFrom(tianpan, c1);
    return { method: '涉害课', note: '诸克不比，取受克最深者发用，事机隐晦，宜深察利害。', chuan1: c1, chuan2, chuan3 };
  }

  // ── 返吟无克：取驿马 ──
  if (isFanyin) {
    const ma = yimaOf(dayZhi);
    const c1 = tianpan[zi(ma)];   // 马星所加之神
    const { chuan2, chuan3 } = chuanFrom(tianpan, c1);
    return { method: '返吟课', note: '天地盘相冲，事有反复翻覆；无克取驿马发用，主变动奔波，宜动不宜静。', chuan1: c1, chuan2, chuan3 };
  }

  // ── 伏吟无克：取刑 ──
  if (isFuyin) {
    const ganYangFlag = ganYang(dayGan);
    const c1 = ganYangFlag ? ganJi : dayZhi;   // 阳日取干上（寄宫本支），阴日取支上
    const xing1 = XING[c1] || (ZIXING.includes(c1) ? CHONG[c1] : c1);
    const xing2 = xing1 && xing1 !== c1 ? (XING[xing1] || (ZIXING.includes(xing1) ? CHONG[xing1] : xing1)) : c1;
    const chuan2 = tianpan[zi(xing1)] || c1;
    const chuan3 = tianpan[zi(xing2)] || chuan2;
    return { method: '伏吟课', note: '天地盘同位，诸事迟滞反复；无克取刑发用，主静中藏动，宜守待变。', chuan1: tianpan[zi(c1)], chuan2, chuan3 };
  }

  // ── 2. 遥克法（无上下克）：日干遥克上神（蒿矢）/ 上神遥克日干（弹射） ──
  const ganWx = WUXING[dayGan];
  const yaoKe: Ke[] = [];
  const yaoBei: Ke[] = [];
  for (const k of kes) {
    if (ke(ganWx, WUXING[k.shang])) yaoKe.push(k);       // 日干克上神
    if (ke(WUXING[k.shang], ganWx)) yaoBei.push(k);      // 上神克日干
  }
  if (yaoKe.length > 0 || yaoBei.length > 0) {
    const pool = yaoKe.length > 0 ? yaoKe : yaoBei;
    const dayGanYang = ganYang(dayGan);
    const bi = pool.filter(k => zhiYang(k.shang) === dayGanYang);
    const pick = bi.length > 0 ? bi[0] : pool[0];
    const c1 = pick.shang;
    const { chuan2, chuan3 } = chuanFrom(tianpan, c1);
    return {
      method: yaoKe.length > 0 ? '蒿矢课' : '弹射课',
      note: yaoKe.length > 0 ? '日遥克神，事由己发，主主动求取，渐有所成。' : '神遥克日，事出意外，防暗箭来袭，宜谨慎自守。',
      chuan1: c1, chuan2, chuan3,
    };
  }

  // ── 3. 无克无遥克：别责 / 八专 / 昴星 ──
  const ganJiZhi = ganJi;
  // 八专：日干寄宫与日支同位（四课止两课）
  if (ganJiZhi === dayZhi) {
    const ganYangFlag = ganYang(dayGan);
    const c1 = ganYangFlag ? kes[0].shang : kes[2].shang;   // 阳日取干上神，阴日取支上神
    const { chuan2, chuan3 } = chuanFrom(tianpan, c1);
    return { method: '八专课', note: '干支同位，四课不完；主事机专一，惟阴阳未分，宜专一其心。', chuan1: c1, chuan2, chuan3 };
  }
  // 别责：干上神与支上神相同（四课不备）
  if (kes[0].shang === kes[2].shang) {
    const ganYangFlag = ganYang(dayGan);
    // 阳日取干五合之干寄宫上神；阴日取支上神
    if (ganYangFlag) {
      const heGan = GAN_HE[dayGan];
      const heJi = LR_GANJI[heGan];
      const c1 = tianpan[zi(heJi)];
      const { chuan2, chuan3 } = chuanFrom(tianpan, c1);
      return { method: '别责课', note: '四课不备，取干合发用；主事不归一，须借力他人，另辟蹊径。', chuan1: c1, chuan2, chuan3 };
    }
    const c1 = kes[2].shang;
    const { chuan2, chuan3 } = chuanFrom(tianpan, c1);
    return { method: '别责课', note: '四课不备，取支上神发用；主事有隐衷，宜旁敲侧击，徐图其成。', chuan1: c1, chuan2, chuan3 };
  }
  // 昴星：无克无遥克且四课全备——以酉（昴星）为用
  {
    const ganYangFlag = ganYang(dayGan);
    const youIdx = zi('酉');
    if (ganYangFlag) {
      // 阳日：取天盘加临地盘酉之神（酉上神）为初传（虎视课）；中传取支上神，末传取干上神
      const c1 = tianpan[youIdx];
      const c2 = tianpan[zi(dayZhi)];    // 支上神
      const c3 = tianpan[zi(ganJi)];     // 干上神
      return { method: '昴星课', note: '无克无遥，取昴星（酉）发用（虎视格）；主事机隐晦，宜静观其变，防惊变于暗处。', chuan1: c1, chuan2: c2, chuan3: c3 };
    }
    // 阴日：取天盘酉加临之地盘支（酉下神）为初传（冬蛇掩目）；中传取干上神，末传取支上神
    let c1 = '';
    for (let i = 0; i < 12; i++) if (tianpan[i] === '酉') { c1 = ZHI[i]; break; }
    const c2 = tianpan[zi(ganJi)];
    const c3 = tianpan[zi(dayZhi)];
    return { method: '昴星课', note: '无克无遥，取昴星（酉）发用（冬蛇掩目格）；主事蒙昧，宜守正待时，防晦气暗生。', chuan1: c1, chuan2: c2, chuan3: c3 };
  }
}

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
  /* 三传：九宗门真实起法（替代旧简式取传） */
  const chuan = jiuzongmen(tianpan, ganJi, dayGZ[1], dayGZ[0], hourIndex, jiang);
  const { chuan1, chuan2, chuan3, method, note } = chuan;

  /* ── 补齐层：贵人 + 十二天将 ── */
  // 贵人起法（日干）：甲戊庚牛羊 乙己鼠猴乡 丙丁猪鸡位 壬癸兔蛇藏 六辛逢马虎
  const GUIREN: Record<string, [string, string]> = {
    甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
    乙: ['子', '申'], 己: ['子', '申'],
    丙: ['亥', '酉'], 丁: ['亥', '酉'],
    壬: ['卯', '巳'], 癸: ['卯', '巳'],
    辛: ['午', '寅'],
  };
  // 昼占：卯时至酉时前（hourIndex 2..7）；夜占：酉时至卯时前
  const isDay = hourIndex >= 2 && hourIndex < 8;
  const guiRen = (GUIREN[dayGZ[0]] || ['丑', '未'])[isDay ? 0 : 1];
  // 天将序列（贵人起）：贵人 螣蛇 朱雀 六合 勾陈 青龙 天空 白虎 太常 玄武 太阴 天后
  const JIANG_SEQ = ['贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];
  // 贵人加临天盘后定顺逆：贵人落支在亥子丑寅卯辰 → 顺布；巳午未申酉戌 → 逆布
  const grIdx = ZHI.indexOf(guiRen as any);
  const grPan = tianpan[grIdx];          // 贵人在天盘所加之支
  const grPanIdx = ZHI.indexOf(grPan as any);
  const forwardJiang = [10, 11, 0, 1, 2, 3].includes(grPanIdx); // 亥子丑寅卯辰顺
  const tianJiang: Record<number, string> = {};
  for (let i = 0; i < 12; i++) {
    const step = forwardJiang ? i : -i;
    tianJiang[mod(grPanIdx + step, 12)] = JIANG_SEQ[i];
  }
  const chuanJiang = [chuan1, chuan2, chuan3].map(ch => {
    const cz = ZHI.indexOf(ch as any);
    return { chuan: ch, jiang: tianJiang[cz] || '' };
  });

  /* ── 补齐层：课体分类（2026-08-20）── */
  const hourZhi = ZHI[hourIndex];
  let keti = '常课';
  if (jiang === hourZhi) keti = '伏吟课';
  else if (mod(ZHI.indexOf(jiang as any) - hourIndex, 12) === 6) keti = '反吟课';
  const ketiNote = keti === '伏吟课' ? '天地盘同位，诸事迟滞反复，宜静待其变，不宜躁进。'
    : keti === '反吟课' ? '天地盘相冲，事有反复翻覆，来去无常，宜缓不宜急。'
    : '四课三传乘常气，事机明朗，顺其自然即可。';

  return { dayGZ, hourGZ, jiang, jqName, tianpan, ganJi, ke1, ke2, ke3, ke4, chuan1, chuan2, chuan3, guiRen, isDay, tianJiang, chuanJiang, keti, ketiNote, chuanMethod: method, chuanNote: note };
}

export const jiangName = (zhi: string): string => {
  const row = LR_JIANGS.find(j => j[1] === zhi);
  return row ? row[0] : zhi;
}
