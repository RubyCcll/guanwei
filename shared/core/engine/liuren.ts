// 大六壬：月将加时（中气定将）· 四课三传（九宗门真实起法）
// 九宗门：贼克（元首/始入/重审/知一）→ 比用 → 涉害 → 遥克（蒿矢/弹射）→ 昴星（虎视/冬蛇掩目）→ 别责 → 八专 → 返吟（取驿马）→ 伏吟（取刑）
import { GAN, ZHI, WUXING, mod } from '../data/ganzhi';
import { LR_JIANGS, LR_GANJI } from '../data/liuren';
import { daysSince, currentJieqiNameExact, getJieQiTableExact, beijingMs } from './calendar';
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

  // 涉害（《六壬大全·入手法》：「涉害行来本家止，路逢多克为用取，孟深仲浅季当休，复等柔辰刚日宜」）
  //   ① 自该上神的**地盘本家**顺行至其所临之宫，途中（含终点）受地盘支克者，逐宫计深；
  //   ② 同深者取所临之宫属「孟」(寅申巳亥)，次取「仲」(子午卯酉)，「季」(辰戌丑未)当休；
  //   ③ 仍相等者，刚日（阳日）取干上神、柔日（阴日）取支上神。
  // 2026-09-26 修正：原实现只按「十二支中克该神者总数」计深且同深取先见，未合古法两条断法。
  const shehai = (candidates: Ke[], dayGanYang: boolean, ganShang: string, zhiShang: string): Ke => {
    const MENG = ['寅', '申', '巳', '亥'], ZHONG = ['子', '午', '卯', '酉'];
    const rankOf = (gongZhi: string) => (MENG.includes(gongZhi) ? 0 : ZHONG.includes(gongZhi) ? 1 : 2);
    const scored = candidates.map(c => {
      const sIdx = ZHI.indexOf(c.shang as any);        // 上神本家
      const gongIdx = ZHI.indexOf(c.xia as any);       // 上神所临之宫（即该课下神）
      let depth = 0;
      const steps = mod(gongIdx - sIdx, 12);
      for (let k = 0; k <= steps; k++) {
        const z = ZHI[mod(sIdx + k, 12)];
        if (ke(WUXING[z], WUXING[c.shang])) depth++;   // 路逢地盘支克此神
      }
      return { c, depth, rank: rankOf(c.xia) };
    });
    scored.sort((a, b) => (b.depth - a.depth) || (a.rank - b.rank));
    const top = scored[0];
    const tied = scored.filter(x => x.depth === top.depth && x.rank === top.rank);
    if (tied.length > 1) {
      const prefer = dayGanYang ? ganShang : zhiShang;   // 复等：刚日取干上、柔日取支上
      return (tied.find(x => x.c.shang === prefer) || top).c;
    }
    return top.c;
  };

  // ── 1. 贼克法 ──
  // 《六壬大全·入手法》：「取课先从下贼呼，如无下贼上克初」——**下贼上优先**；
  // 「一下克上曰重审，一上克下曰元首」。
  // 2026-09-26 修正：原实现优先取上克下（与古法相反），且把一下贼上误称「始入课」。
  if (shangKeRows.length > 0 || xiaKeRows.length > 0) {
    const pool = xiaKeRows.length > 0 ? xiaKeRows : shangKeRows;
    if (pool.length === 1) {
      const c1 = pool[0].shang;
      const { chuan2, chuan3 } = chuanFrom(tianpan, c1);
      const isZei = pool[0].xiaKe;   // 下贼上
      return {
        method: isZei ? '重审课' : '元首课',
        note: isZei
          ? '一下贼上，事起于内，以臣诤君，宜详审而后行。'
          : '一上克下，事起于外，天地得位，宜主动决断。',
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
    const pick = shehai(pool, dayGanYang, kes[0].shang, kes[2].shang);
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

  // ── 2. 遥克法（四课无上下克）──
  // 《六壬大全·入手法》：「四课无克号为遥，日与神兮递互招；**先取神遥克其日，如无方取日来遥**」，
  // 且「神遥克日曰蒿矢，日遥克神曰弹射」。
  // 2026-09-26 修正：原实现优先「日克神」并把两名对调。
  const ganWx = WUXING[dayGan];
  const shenKeRi: Ke[] = [];   // 上神克日干 → 蒿矢
  const riKeShen: Ke[] = [];   // 日干克上神 → 弹射
  for (const k of kes) {
    if (ke(WUXING[k.shang], ganWx)) shenKeRi.push(k);
    if (ke(ganWx, WUXING[k.shang])) riKeShen.push(k);
  }
  if (shenKeRi.length > 0 || riKeShen.length > 0) {
    const pool = shenKeRi.length > 0 ? shenKeRi : riKeShen;
    const dayGanYang = ganYang(dayGan);
    const bi = pool.filter(k => zhiYang(k.shang) === dayGanYang);   // 「择与日干比者用」
    const pick = bi.length > 0 ? bi[0] : pool[0];
    const c1 = pick.shang;
    const { chuan2, chuan3 } = chuanFrom(tianpan, c1);
    return {
      method: shenKeRi.length > 0 ? '蒿矢课' : '弹射课',
      note: shenKeRi.length > 0
        ? '神遥克日（蒿矢），事从外来，其力尚轻，宜防外扰而缓图。'
        : '日遥克神（弹射），事由己发，其力较劲，宜主动求取。',
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
  const h = d.getHours();
  // 原始日：节气/月将基准（不随夜子时前移）
  const jy = d.getFullYear(), jm = d.getMonth() + 1, jd = d.getDate();
  // 夜子时（23:00-23:59）归次日——仅日柱进一日（与奇门/八字 sect2 口径一致）
  const dEff = h === 23 ? new Date(d.getTime() + 86400000) : d;
  const y = dEff.getFullYear(), m = dEff.getMonth() + 1, day = dEff.getDate();
  const hourIndex = Math.floor(((h + 1) % 24) / 2); // 0=子
  /* 日干支 */
  const dIdx = mod(daysSince(y, m, day) + 55, 60);
  const dayGZ = GAN[dIdx % 10] + ZHI[dIdx % 12];
  const dgIdx = GAN.indexOf(dayGZ[0] as any);
  const hgIdx = mod((dgIdx % 5) * 2 + hourIndex, 10);
  const hourGZ = GAN[hgIdx] + ZHI[hourIndex];
  /* 月将：中气定将（太阳过宫）。
     （2026-09 修正：原固定日期表（2/19 雨水…）在个别年份与实际中气时刻差 ±1 天，
      现改为按 lunar-typescript 精确中气时刻定将：自某中气起用该将，至下一中气前不变；
      1 月初落在上年冬至（丑将）后自然归丑将，无需特判） */
  const JIANG_BY_JQ: Record<string, string> = {
    雨水: '亥', 春分: '戌', 谷雨: '酉', 小满: '申', 夏至: '未', 大暑: '午',
    处暑: '巳', 秋分: '辰', 霜降: '卯', 小雪: '寅', 冬至: '丑', 大寒: '子',
  };
  // 北京钟表时刻（原始日 +08:00）：与节气时刻同基准，进程时区无关（CI/容器 TZ=UTC 亦正确）
  const _t = beijingMs(jy, jm, jd, h);
  let jiang = '丑';
  {
    const jqTimes: { name: string; time: number }[] = [];
    for (const yy of [jy - 1, jy, jy + 1]) {
      for (const jq of getJieQiTableExact(yy)) {
        if (JIANG_BY_JQ[jq.name]) jqTimes.push({ name: jq.name, time: jq.time.getTime() });
      }
    }
    jqTimes.sort((a, b) => a.time - b.time);
    for (const j of jqTimes) {
      if (j.time <= _t) jiang = JIANG_BY_JQ[j.name];
      else break;
    }
  }
  const jiangIdx = ZHI.indexOf(jiang as any);
  const jqName = currentJieqiNameExact(jy, jm, jd, h);
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
  // 昼占：卯时至申时（hourIndex 3..8，时辰序 0=子）；夜占：酉时至寅时
  // （2026-09 修正：原 2..7 实为寅~未，凌晨寅时误判昼占、下午申时误判夜占，按卯~申对齐）
  const isDay = hourIndex >= 3 && hourIndex <= 8;
  const guiRen = (GUIREN[dayGZ[0]] || ['丑', '未'])[isDay ? 0 : 1];
  // 天将序列（贵人起）：贵人 螣蛇 朱雀 六合 勾陈 青龙 天空 白虎 太常 玄武 太阴 天后
  const JIANG_SEQ = ['贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];
  // 十二天将安布（《六壬大全》：「以课之**天盘**起贵神之例，**地盘**定顺逆之序」）：
  //   ① 贵人歌所得之支即「贵人所乘之神」→ 天将贵人落在天盘上该神所在之宫；
  //   ② 视该宫所临的**地盘**支定顺逆：亥子丑寅卯辰 → 顺布，巳午未申酉戌 → 逆布。
  // 2026-09-26 修正：原实现把贵人歌之支当作地盘位、取其上神落将，并以该天盘神定顺逆（两处皆反）。
  let panIdx = 0;
  for (let i = 0; i < 12; i++) if (tianpan[i] === guiRen) { panIdx = i; break; }
  const forwardJiang = [10, 11, 0, 1, 2, 3].includes(panIdx); // 贵人临 亥子丑寅卯辰 顺布
  const tianJiang: Record<number, string> = {};
  for (let i = 0; i < 12; i++) {
    const step = forwardJiang ? i : -i;
    tianJiang[mod(panIdx + step, 12)] = JIANG_SEQ[i];
  }
  // 三传乘将：三传为**天盘神**，须先找该神所在之宫（地盘位），再取该宫天将
  // （2026-09-26 修正：原按传支当作地盘索引直取，天地盘不同位时取错）
  const gongOfGod = (zhi: string): number => {
    for (let i = 0; i < 12; i++) if (tianpan[i] === zhi) return i;
    return -1;
  };
  const chuanJiang = [chuan1, chuan2, chuan3].map(ch => {
    const g = gongOfGod(ch);
    return { chuan: ch, jiang: g >= 0 ? (tianJiang[g] || '') : '' };
  });

  /* ── 补齐层：课体分类（2026-08-20）── */
  const hourZhi = ZHI[hourIndex];
  let keti = '常课';
  if (jiang === hourZhi) keti = '伏吟课';
  else if (mod(ZHI.indexOf(jiang as any) - hourIndex, 12) === 6) keti = '返吟课';
  const ketiNote = keti === '伏吟课' ? '天地盘同位，诸事迟滞反复，宜静待其变，不宜躁进。'
    : keti === '返吟课' ? '天地盘相冲，事有反复翻覆，来去无常，宜缓不宜急。'
    : '四课三传乘常气，事机明朗，顺其自然即可。';

  return { dayGZ, hourGZ, jiang, jqName, tianpan, ganJi, ke1, ke2, ke3, ke4, chuan1, chuan2, chuan3, guiRen, isDay, tianJiang, chuanJiang, keti, ketiNote, chuanMethod: method, chuanNote: note };
}

export const jiangName = (zhi: string): string => {
  const row = LR_JIANGS.find(j => j[1] === zhi);
  return row ? row[0] : zhi;
}
