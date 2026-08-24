// 九术元数据（名称/编号/卦象符号/说明）
export interface ArtMeta {
  id: ArtId;
  num: string;
  name: string;
  glyph: string;
  tag: string;
  poem: string;
  intro: string;
  source: string;
  kicker: string;
}

export type ArtId =
  | 'bazi' | 'ziwei' | 'qimen' | 'meihua' | 'liuyao'
  | 'liuren' | 'xiaoliuren' | 'astrology' | 'tarot';

export const ARTS: ArtMeta[] = [
  {
    id: 'bazi', num: '壹', name: '四柱八字', glyph: '命', tag: '命理 · 中国',
    poem: '五行流转，命在干支',
    intro: '以年、月、日、时四柱干支为经纬，配五行生克、十神六亲，推人一生之格局穷通。唐李虚中首创，宋徐子平完善，世称「子平术」，为命理之首。',
    source: '源于唐·李虚中《李虚中命书》，成于宋·徐子平《渊海子平》',
    kicker: '命理 · Ming Shu',
  },
  {
    id: 'ziwei', num: '贰', name: '紫微斗数', glyph: '星', tag: '星命 · 中国',
    poem: '星罗棋布，命宫为枢',
    intro: '以北斗紫微星垣为主，列十四主星、百余辅曜，布于十二宫垣，推一生之贵贱休咎。相传出于宋代道家陈抟，与八字并称命理双璧。',
    source: '相传宋·陈抟所传，明清坊间流布而成体系',
    kicker: '星命 · Zi Wei',
  },
  {
    id: 'qimen', num: '叁', name: '奇门遁甲', glyph: '遁', tag: '三式 · 中国',
    poem: '遁甲藏机，运筹帷幄',
    intro: '三式之绝，以洛书九宫为盘，藏三奇六仪，配八门九星八神，推天时地利之机，古称「帝王之学」，用于择时趋吉、排兵布阵。',
    source: '传说出于黄帝战蚩尤，唐宋定型，明清大盛',
    kicker: '三式 · Qi Men',
  },
  {
    id: 'meihua', num: '肆', name: '梅花易数', glyph: '易', tag: '象数 · 中国',
    poem: '梅开万象，心动即占',
    intro: '邵雍观梅得卦而名。以心动起卦，凡数、时、物、字皆可取象，重体用生克，轻程式繁缛，最见「简易」之道。',
    source: '宋·邵雍《梅花易数》',
    kicker: '象数 · Mei Hua',
  },
  {
    id: 'liuyao', num: '伍', name: '六爻', glyph: '卦', tag: '筮法 · 中国',
    poem: '三枚铜钱，六次成卦',
    intro: '承《周易》蓍草古法，以三枚铜钱六掷成卦，配六亲六神、世应爻位，断吉凶悔吝。取象直观、占法灵活，为民间最盛之占。',
    source: '源于《周易》筮法，汉京房纳甲，唐以后铜钱代蓍',
    kicker: '筮法 · Liu Yao',
  },
  {
    id: 'liuren', num: '陆', name: '大六壬', glyph: '课', tag: '三式 · 中国',
    poem: '天地人三传，吉凶立判',
    intro: '三式之中，大六壬最验人事。以月将加时立四课，贼克取三传，配十二天将，推事物之始终得失，古称「人事之王」。',
    source: '起源甚古，汉唐成熟，《六壬大全》集其大成',
    kicker: '三式 · Da Liu Ren',
  },
  {
    id: 'xiaoliuren', num: '柒', name: '小六壬', glyph: '掌', tag: '占时 · 中国',
    poem: '六掌玄机，掐指即知',
    intro: '以农历月、日、时三数，于六掌诀中顺数取位——大安、留连、速喜、赤口、小吉、空亡，断吉凶宜忌。简便迅捷，随身可用。',
    source: '民间流传掌诀，李淳风六壬时课一脉',
    kicker: '占时 · Xiao Liu Ren',
  },
  {
    id: 'astrology', num: '捌', name: '星盘', glyph: '穹', tag: '占星 · 西方',
    poem: '黄道十二，天穹为书',
    intro: '承西方古典占星，以出生时刻天象立本命盘，察太阳、月亮与诸行星之落宫相位，观性格天赋与人生轨迹，为西学观照之镜。',
    source: '源自古巴比伦与希腊化占星传统',
    kicker: '占星 · Astrology',
  },
  {
    id: 'tarot', num: '玖', name: '塔罗', glyph: '镜', tag: '镜鉴 · 西方',
    poem: '镜照本心，塔罗为引',
    intro: '七十八张牌，二十二大阿卡纳述灵魂之旅，五十六小阿卡纳描日常万象。不问吉凶，但照本心，为自我观照之艺术。',
    source: '源起欧洲文艺复兴前后，马赛系为古制',
    kicker: '镜鉴 · Tarot',
  },
];

export const artById = (id: string): ArtMeta | undefined => ARTS.find(a => a.id === id);
