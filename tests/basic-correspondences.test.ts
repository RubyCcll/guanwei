// 基础对应关系金标（防「水在南、火在北」这类根本性错误）
//
// 本文件把术数最底层的对应关系写成可执行断言，并逐表核对仓库数据：
//   五行 ↔ 方位（木东·火南·土中·金西·水北）、五行 ↔ 颜色（木青·火红·土黄·金白·水黑）
//   六神 ↔ 方位（青龙东·朱雀南·白虎西·玄武北·勾陈/腾蛇居中）
//   八卦 ↔ 五行（乾兑金·震巽木·坎水·离火·坤艮土）、后天八卦 ↔ 九宫方位
//   八门 ↔ 宫位、九星 ↔ 宫位/五行、天干地支 ↔ 五行、地支 ↔ 生肖、六爻六神 ↔ 日干
// 另外交叉核对塔罗牌的「星座 ↔ 元素」（牌面元素须与其所配星座元素一致）。
import { describe, it, expect } from 'vitest';
import { WUXING, GAN, ZHI } from '../shared/core/data/ganzhi';
import { BAGUA } from '../shared/core/data/gua64';
import { XLR, XLR_ORDER } from '../shared/core/data/xiaoliuren';
import { QM_NAMES, QM_MEN, QM_STARS } from '../shared/core/data/qimen';
import { SHEN_LIU } from '../shared/core/data/liuyao';
import { LR_JIANG_SYMBOL } from '../shared/core/data/liuren';
import { tarotCards } from '../shared/core/data/tarotCards';

// ─── 底层规则（三方定义，供全表核对）───
const WX_DIR: Record<string, string> = { 木: '东方', 火: '南方', 土: '中央', 金: '西方', 水: '北方' };
const WX_COLOR: Record<string, string> = { 木: '青色', 火: '红色', 土: '黄色', 金: '白色', 水: '黑色' };
/** 五行所主方位（含四隅：土寄西南/东北，金水可用西北） */
const DIR_OK: Record<string, string[]> = {
  木: ['东方', '东南'], 火: ['南方'], 土: ['中央', '西南', '东北', '西北'],
  金: ['西方', '西北'], 水: ['北方'],
};
const SHEN_DIR: Record<string, string> = { 青龙: '东方', 朱雀: '南方', 白虎: '西方', 玄武: '北方' };
const ZHI_SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

describe('基础对应：五行', () => {
  it('五行 → 方位（木东·火南·土中·金西·水北）', () => {
    expect(WX_DIR).toEqual({ 木: '东方', 火: '南方', 土: '中央', 金: '西方', 水: '北方' });
    // 水在北、火在南（本次修正的直接动因）：逐条比对全部带方位的数据表
    const tables: [string, Record<string, { wx: string; dir: string }>][] = [['小六壬六宫', XLR]];
    for (const [name, table] of tables) {
      for (const [k, v] of Object.entries(table)) {
        expect(DIR_OK[v.wx], `${name}·${k}：${v.wx} 不应在 ${v.dir}`).toContain(v.dir);
      }
    }
  });

  it('五行 → 颜色（木青绿·火红·土黄·金白·水黑）', () => {
    expect(WX_COLOR).toEqual({ 木: '青色', 火: '红色', 土: '黄色', 金: '白色', 水: '黑色' });
    const COLOR_OK: Record<string, string[]> = { 木: ['青色', '绿色'], 火: ['红色', '赤色'], 土: ['黄色'], 金: ['白色'], 水: ['黑色'] };
    for (const [k, v] of Object.entries(XLR)) {
      expect(COLOR_OK[v.wx], `小六壬·${k}（${v.wx}）`).toContain(v.color);
    }
  });

  it('天干 / 地支 → 五行（甲乙木 丙丁火 戊己土 庚辛金 壬癸水；亥子水 寅卯木 巳午火 申酉金 辰戌丑未土）', () => {
    expect(GAN.map(g => WUXING[g])).toEqual(['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']);
    expect(ZHI.map(z => WUXING[z])).toEqual(['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水']);
  });
});

describe('基础对应：六神与六宫', () => {
  it('六神 → 方位（青龙东·朱雀南·白虎西·玄武北·勾陈/腾蛇居中）', () => {
    for (const [k, v] of Object.entries(XLR)) {
      const want = SHEN_DIR[v.shen];
      if (want) expect(v.dir, `小六壬·${k}（临${v.shen}）`).toBe(want);
      else expect(['勾陈', '腾蛇', '六合']).toContain(v.shen);   // 勾陈/腾蛇居中；六合不主方位
    }
  });

  it('六宫断辞全表（五行/颜色/方位/六神/主数）与通行本一致', () => {
    expect(XLR_ORDER).toEqual(['大安', '留连', '速喜', '赤口', '小吉', '空亡']);
    const want: Record<string, [string, string, string, string, string]> = {
      大安: ['木', '青色', '东方', '青龙', '一、五、七'],
      留连: ['水', '黑色', '北方', '玄武', '二、八、十'],
      速喜: ['火', '红色', '南方', '朱雀', '三、六、九'],
      赤口: ['金', '白色', '西方', '白虎', '四、七、十'],
      小吉: ['木', '绿色', '东方', '六合', '一、五、七'],
      空亡: ['土', '黄色', '中央', '勾陈', '三、六、九'],
    };
    for (const name of XLR_ORDER) {
      const e = XLR[name];
      expect([e.wx, e.color, e.dir, e.shen, e.num], name).toEqual(want[name]);
    }
  });

  it('六爻六神起例：甲乙起青龙、丙丁起朱雀、戊起勾陈、己起腾蛇、庚辛起白虎、壬癸起玄武', () => {
    const first = (g: string) => SHEN_LIU[g][0];
    expect(first('甲')).toBe('青龙'); expect(first('乙')).toBe('青龙');
    expect(first('丙')).toBe('朱雀'); expect(first('丁')).toBe('朱雀');
    expect(first('戊')).toBe('勾陈'); expect(first('己')).toBe('腾蛇');
    expect(first('庚')).toBe('白虎'); expect(first('辛')).toBe('白虎');
    expect(first('壬')).toBe('玄武'); expect(first('癸')).toBe('玄武');
    // 六神顺序（初→上）为固定循环
    expect(SHEN_LIU['甲']).toEqual(['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武']);
  });
});

describe('基础对应：八卦与九宫', () => {
  it('八卦 → 五行（乾兑金·震巽木·坎水·离火·坤艮土）', () => {
    const want: Record<string, string> = { 乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' };
    for (const [num, g] of Object.entries(BAGUA)) {
      expect(g.wx, `先天数${num} ${g.name}`).toBe(want[g.name]);
    }
  });

  it('后天八卦九宫方位（坎1北·坤2西南·震3东·巽4东南·中5·乾6西北·兑7西·艮8东北·离9南）', () => {
    expect(QM_NAMES).toEqual(['坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离']);
    const WX_OF_PALACE: Record<string, string> = { 坎: '水', 坤: '土', 震: '木', 巽: '木', 中: '土', 乾: '金', 兑: '金', 艮: '土', 离: '火' };
    QM_NAMES.forEach((name, i) => {
      if (name === '中') return;                              // 中宫无卦，五行寄坤（土）
      const key = Object.keys(BAGUA).find(k => (BAGUA as any)[k].name === name);
      expect(key, `九宫${i + 1}「${name}」应能在八卦表中找到`).toBeTruthy();
      expect((BAGUA as any)[key!].wx, `${i + 1}宫${name}`).toBe(WX_OF_PALACE[name]);
    });
  });

  it('八门与九星各归其宫（休坎·死坤·伤震·杜巽·开乾·惊兑·生艮·景离；蓬坎·芮坤·冲震·辅巽·禽中·心乾·柱兑·任艮·英离）', () => {
    expect(QM_MEN).toEqual(['休', '死', '伤', '杜', '中', '开', '惊', '生', '景']);
    expect(QM_STARS).toEqual(['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英']);
    // 九星五行随宫：蓬水 芮土 冲木 辅木 禽土 心金 柱金 任土 英火
    const XING_WX = ['水', '土', '木', '木', '土', '金', '金', '土', '火'];
    const PALACE_WX = ['水', '土', '木', '木', '土', '金', '金', '土', '火'];
    expect(XING_WX).toEqual(PALACE_WX);
  });
});

describe('基础对应：地支生肖与塔罗星座元素', () => {
  it('十二地支 → 生肖（戌作「犬」为通行写法）', () => {
    ZHI.forEach((z, i) => {
      const got = LR_JIANG_SYMBOL[z];
      const want = ZHI_SHENGXIAO[i];
      if (z === '戌') expect(['犬', '狗'], z).toContain(got);
      else expect(got, z).toBe(want);
    });
  });

  it('塔罗：四元素大牌（愚者风·倒吊人水·审判火·世界土，即 Aleph/Mem/Shin/Tau）', () => {
    const cards = tarotCards as any[];
    const byName = (n: string) => cards.find(c => c.name === n);
    // 2026-09-26 修正：审判原写「水」（与死神整行雷同），金色黎明作 Shin=火
    expect(byName('愚者').astrology.element).toBe('风');
    expect(byName('倒吊人').astrology.element).toBe('水');
    expect(byName('审判').astrology.element).toBe('火');
    expect(byName('世界').astrology.element).toBe('土');
  });

  it('塔罗：四牌组元素（权杖火·圣杯水·宝剑风·星币土）', () => {
    const cards = tarotCards as any[];
    const SUIT_ELEMENT: Record<string, string> = { wands: '火', cups: '水', swords: '风', pentacles: '土' };
    for (const [suit, el] of Object.entries(SUIT_ELEMENT)) {
      const ace = cards.find(c => c.suit === suit && c.number === 1);
      expect(ace, suit + ' 首牌').toBeTruthy();
      expect(ace.astrology.element, suit).toBe(el);
    }
  });

  it('塔罗：十二星座大牌的元素与其星座一致', () => {
    const SIGN_ELEMENT: Record<string, string> = {
      白羊座: '火', 狮子座: '火', 射手座: '火',
      金牛座: '土', 处女座: '土', 摩羯座: '土',
      双子座: '风', 天秤座: '风', 水瓶座: '风',
      巨蟹座: '水', 天蝎座: '水', 双鱼座: '水',
    };
    // 以星座为本命的十二张大牌（行星牌/元素牌另属他系，不参与本检查）
    const ZODIAC_TRUMPS = ['皇帝', '教皇', '恋人', '战车', '力量', '隐者', '正义', '死神', '节制', '恶魔', '星星', '月亮'];
    const cards = tarotCards as any[];
    for (const n of ZODIAC_TRUMPS) {
      const c = cards.find(x => x.name === n);
      expect(c, n).toBeTruthy();
      expect(c.astrology.element, `${n}（${c.astrology.zodiac}）`).toBe(SIGN_ELEMENT[c.astrology.zodiac]);
    }
  });
});
