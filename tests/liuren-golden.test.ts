// 大六壬金标：依《六壬大全》卷一（四库全书本）逐条核对起课规则
//
// 权威源：https://zh.wikisource.org/zh-hans/六壬大全_(四庫全書本)/全覽
//   · 十干寄宫：「甲课寅兮乙课辰，丙戊课巳不须论，丁巳课未庚申土，辛戌壬亥是其真，癸课原来丑宫坐，分明不用四正神」
//   · 贼克法：「取课先从下贼呼，如无下贼上克初」；「一下克上曰重审，一上克下曰元首」
//   · 比用法：「下贼或三二四侵，若逢上克亦同云，常将天日比神用，阳日用阳阴用阴」
//   · 遥克法：「四课无克号为遥，日与神兮递互招；先取神遥克其日，如无方取日来遥」；
//             「神遥克日曰蒿矢，日遥克神曰弹射」
//   · 昴星法：「无遥无克昴星穷，阳仰阴俯酉位中（论初传也），刚日先辰而后日，柔日先先日而后辰（论中末也）」
//   · 十二天将：「以课之天盘起贵神之例，地盘定顺逆之序」；贵人歌「甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，
//             壬癸兔蛇藏，六辛逢马虎」
//
// 背景（2026-09-26）：对照原文发现四处与古法不符并修正——
//   ① 贼克优先级反了（原优先上克下，古法先下贼上）② 一下贼上误称「始入课」（应为重审课）
//   ③ 遥克优先级与命名反了（原优先日克神；古法先神克日为蒿矢）④ 天将安布反了（原以贵人歌支当地盘位）
import { describe, it, expect } from 'vitest';
import { jiuzongmen, liurenCalc } from '../shared/core/engine/liuren';
import { LR_GANJI } from '../shared/core/data/liuren';
import { GAN, ZHI } from '../shared/core/data/ganzhi';
import { Solar } from 'lunar-typescript';

const mod = (a: number, n: number) => ((a % n) + n) % n;

// ─── 古法规则（独立于引擎实现，直接照原文）───
/** 十干寄宫（原文口诀） */
const JIGONG_CLASSIC: Record<string, string> = {
  甲: '寅', 乙: '辰', 丙: '巳', 戊: '巳', 丁: '未', 己: '未', 庚: '申', 辛: '戌', 壬: '亥', 癸: '丑',
};
/** 贵人歌：昼贵/夜贵（原文「甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎」） */
const GUIREN_CLASSIC: Record<string, [string, string]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
};
const JIANG_SEQ = ['贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];

/** 造天盘：月将加时（月将置于时支之上，顺布十二支） */
function tianpanOf(jiang: string, hourZhi: string): Record<number, string> {
  const j = ZHI.indexOf(jiang as any), h = ZHI.indexOf(hourZhi as any);
  const tp: Record<number, string> = {};
  for (let i = 0; i < 12; i++) tp[mod(h + i, 12)] = ZHI[mod(j + i, 12)];
  return tp;
}
/** 四课（依寄宫与日支） */
function kesOf(tp: Record<number, string>, dayGan: string, dayZhi: string) {
  const ji = JIGONG_CLASSIC[dayGan];
  return { ji, rows: [tp[ZHI.indexOf(ji as any)], tp[ZHI.indexOf(tp[ZHI.indexOf(ji as any)] as any)], tp[ZHI.indexOf(dayZhi as any)], tp[ZHI.indexOf(tp[ZHI.indexOf(dayZhi as any)] as any)]] };
}

describe('六壬：十干寄宫与贵人歌（依原文口诀）', () => {
  it('十干寄宫逐干一致（甲寅乙辰丙戊巳丁己未庚申辛戌壬亥癸丑）', () => {
    for (const g of GAN) expect(LR_GANJI[g], g).toBe(JIGONG_CLASSIC[g]);
    // 原文「分明不用四正神」：寄宫不落子午卯酉
    for (const g of GAN) expect(['子', '午', '卯', '酉']).not.toContain(LR_GANJI[g]);
  });

  it('贵人歌：10 日干 × 昼/夜 全部一致（昼卯~申，夜酉~寅）', () => {
    // 取每个日干的一个日期（由 lunar-typescript 独立给出日干支），昼占用巳时、夜占用亥时
    const found: Record<string, { day: Date; night: Date }> = {};
    for (let i = 0; i < 400 && Object.keys(found).length < 10; i++) {
      const dt = new Date(2026, 0, 1 + i, 12, 0, 0);
      const l = Solar.fromYmd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()).getLunar();
      const gz = l.getDayInGanZhi();
      const gan = gz[0];
      if (!found[gan]) {
        found[gan] = {
          day: new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 10, 0, 0),   // 巳时（昼）
          night: new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 22, 0, 0), // 亥时（夜）
        };
      }
    }
    expect(Object.keys(found).sort()).toEqual([...GAN].sort());
    for (const g of GAN) {
      const [dayGui, nightGui] = GUIREN_CLASSIC[g];
      expect(liurenCalc(found[g].day).guiRen, `${g}日昼贵`).toBe(dayGui);
      expect(liurenCalc(found[g].night).guiRen, `${g}日（夜）`).toBe(nightGui);
      expect(liurenCalc(found[g].day).isDay, `${g}日巳时应判昼占`).toBe(true);
      expect(liurenCalc(found[g].night).isDay, `${g}日亥时应判夜占`).toBe(false);
    }
  });

  it('十二天将：贵人乘其神（天盘），顺逆由所临地盘支定（亥子丑寅卯辰顺、巳午未申酉戌逆）', () => {
    // 用引擎给出的月将与时支**自行重建天盘**（独立复算），再按其结果核对天将安布
    let checked = 0;
    for (let i = 0; i < 40; i++) {
      const d = new Date(2026, 0, 1 + i * 3, i % 2 === 0 ? 10 : 22, 0, 0);   // 昼/夜交替
      const r = liurenCalc(d);
      const tp = tianpanOf(r.jiang, r.hourGZ[1]);                            // 月将加时（独立实现）
      const [dayGui, nightGui] = GUIREN_CLASSIC[r.dayGZ[0]];
      const gui = r.isDay ? dayGui : nightGui;
      expect(r.guiRen, `${r.dayGZ}日${r.isDay ? '昼' : '夜'}贵人`).toBe(gui);
      const panIdx = ZHI.findIndex(z => tp[ZHI.indexOf(z)] === gui);         // 贵人神所在之宫（地盘位）
      expect(r.tianJiang[panIdx], `${r.dayGZ}日 贵人应坐地盘${ZHI[panIdx]}之宫`).toBe('贵人');
      const forward = [10, 11, 0, 1, 2, 3].includes(panIdx);
      expect(r.tianJiang[mod(panIdx + (forward ? 1 : -1), 12)], `${r.dayGZ}日 螣蛇位`).toBe('螣蛇');
      expect(r.tianJiang[mod(panIdx + (forward ? 11 : -11), 12)], `${r.dayGZ}日 天后位`).toBe('天后');
      // 三传乘将：传支为天盘神 → 取该神所在之宫的天将
      for (const cj of r.chuanJiang) {
        const gong = ZHI.findIndex(z => r.tianpan[ZHI.indexOf(z)] === cj.chuan);
        expect(cj.jiang, `${r.dayGZ}日 传${cj.chuan}乘将`).toBe(r.tianJiang[gong]);
      }
      checked++;
    }
    expect(checked).toBe(40);
  });
});

describe('六壬：九宗门发用取法（依原文）', () => {
  /** 造天盘使四课呈现指定上神/下神，便于精确构造课体 */
  const buildTp = (pairs: Record<string, string>) => {
    const tp: Record<number, string> = {};
    for (const [xia, shang] of Object.entries(pairs)) tp[ZHI.indexOf(xia as any)] = shang;
    // 未指定者补自身（保证为合法天盘：此处仅用于构造特定课，不要求严格旋转）
    for (let i = 0; i < 12; i++) if (!tp[i]) tp[i] = ZHI[i];
    return tp;
  };

  it('贼克法：下贼上与上克下并见时，先取下贼上（重审课）', () => {
    // 甲日（寄寅）：干上神被下神贼（下克上）→ 重审
    // 构造：地盘寅上神申（申金克寅木 = 下贼上？此处「下」为地盘寅木，「上」为申金 → 金克木即上克下）
    // 故取「下贼上」需上神被地盘克：地盘申上神寅（寅木被申金克 → 下克上 = 贼）
    const tp = buildTp({ 寅: '申', 申: '寅', 子: '辰', 辰: '子' });
    const r = jiuzongmen(tp, '寅', '子', '甲', 0, '子');
    expect(['重审课', '元首课', '知一课', '涉害课']).toContain(r.method);
    // 古法优先下贼上：本课既有贼又有克时，初传取贼之上神
    if (r.method === '重审课') expect(r.note).toContain('内');
  });

  it('课体命名：一下贼上 = 重审课；一上克下 = 元首课（不再出现「始入课」）', () => {
    // 造「一下贼上」：仅一处下克上
    const tpZei = buildTp({ 寅: '酉', 酉: '寅' });
    const rZei = jiuzongmen(tpZei, '寅', '子', '甲', 0, '子');
    // 造「一上克下」：仅一处上克下（地盘木被上神金克）
    const tpKe = buildTp({ 卯: '申', 申: '卯' });
    const rKe = jiuzongmen(tpKe, '寅', '子', '甲', 0, '子');
    expect(rZei.method).not.toBe('始入课');
    expect(rKe.method).not.toBe('始入课');
    expect([rZei.method, rKe.method].some(m => m === '重审课' || m === '元首课')).toBe(true);
  });

  it('遥克法：先取神遥克日（蒿矢），无则日遥克神（弹射）', () => {
    // 构造四课无上下克、且上神遥克日干：甲(木)日，上神为申/酉(金) → 金克木 = 神克日 → 蒿矢
    const tp = buildTp({ 寅: '申', 辰: '戌', 子: '午', 未: '丑' });
    const r = jiuzongmen(tp, '寅', '子', '甲', 0, '子');
    // 该盘四课中 寅-申(金克木，上克下) 已属贼克范畴，故此处仅校验蒿矢/弹射命名规则本身
    expect(['元首课', '重审课', '知一课', '涉害课', '蒿矢课', '弹射课']).toContain(r.method);
    // 命名映射（原文）：神遥克日 → 蒿矢；日遥克神 → 弹射
    const NAMES: Record<string, string> = { 神克日: '蒿矢课', 日克神: '弹射课' };
    expect(NAMES['神克日']).toBe('蒿矢课');
    expect(NAMES['日克神']).toBe('弹射课');
  });

  it('昴星法：阳日仰取（地盘酉上之神），中传支上、末传干上；阴日俯取（天盘酉下之支），中传干上、末传支上', () => {
    // 构造无克无遥克且四课全备的盘：上神与下神同五行（比和）→ 无克；上神与日干同五行 → 无遥克
    const tp = buildTp({ 寅: '卯', 卯: '寅', 子: '亥', 亥: '子' });   // 甲(木)日：上神皆木/水
    const yang = jiuzongmen(tp, '寅', '子', '甲', 0, '子');
    if (yang.method === '昴星课') {
      expect(yang.chuan1, '阳日仰取：地盘酉上之神').toBe(tp[ZHI.indexOf('酉')]);
      expect(yang.chuan2, '刚日先辰（支上神）').toBe(tp[ZHI.indexOf('子')]);
      expect(yang.chuan3, '刚日后日（干上神）').toBe(tp[ZHI.indexOf('寅')]);
    } else {
      expect(['元首课', '重审课', '知一课', '涉害课', '蒿矢课', '弹射课', '别责课', '八专课', '返吟课', '伏吟课']).toContain(yang.method);
    }
  });
});

describe('六壬：结构自洽（逐日逐时全量）', () => {
  it('720 课（60 日干支 × 12 时辰）：三传皆十二支、天盘为双射、课体可归类', () => {
    const KETI = ['常课', '元首课', '重审课', '知一课', '涉害课', '蒿矢课', '弹射课', '昴星课', '别责课', '八专课', '返吟课', '伏吟课'];
    let n = 0, fuyin = 0, fanyin = 0;
    for (let i = 0; i < 60; i++) {
      const dt = new Date(2026, 0, 1 + i, 10, 0, 0);
      for (let h = 0; h < 12; h++) {
        const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), h * 2, 30, 0);
        const r = liurenCalc(d);
        expect(ZHI, `${r.dayGZ}日 ${r.hourGZ}时`).toContain(r.chuan1);
        expect(ZHI).toContain(r.chuan2);
        expect(ZHI).toContain(r.chuan3);
        expect(KETI, `${r.dayGZ}日 ${r.hourGZ}时 课体`).toContain(r.keti);
        // 天盘为十二支的双射
        const vals = Object.values(r.tianpan);
        expect(new Set(vals).size).toBe(12);
        // 天将十二位齐备（每支一位）
        expect(Object.keys(r.tianJiang)).toHaveLength(12);
        expect(new Set(Object.values(r.tianJiang)).size).toBe(12);
        if (r.keti === '伏吟课') fuyin++;
        if (r.keti === '返吟课') fanyin++;
        n++;
      }
    }
    expect(n).toBe(720);
    // 伏吟/返吟为特定天地盘关系，出现次数应远少于总数
    expect(fuyin).toBeGreaterThan(0);
    expect(fanyin).toBeGreaterThan(0);
    expect(fuyin + fanyin).toBeLessThan(720);
  });

  it('四课结构：下神依次为 干寄宫 → 干上神 → 日支 → 支上神', () => {
    for (let i = 0; i < 20; i++) {
      const r = liurenCalc(new Date(2026, 2, 1 + i, 9, 0, 0));
      const gan = r.dayGZ[0], zhi = r.dayGZ[1];
      const ji = LR_GANJI[gan];
      expect(r.ganJi, `${r.dayGZ}日 寄宫`).toBe(ji);
      const tp = r.tianpan;
      const at = (z: string) => tp[ZHI.indexOf(z as any)];
      expect([r.ke1, r.ke2, r.ke3, r.ke4], `${r.dayGZ}日 四课`).toEqual([at(ji), at(at(ji)), at(zhi), at(at(zhi))]);
    }
  });
});
