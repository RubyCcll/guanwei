// 观微 · shared/core 通用类型（前后端共享，物理单一副本）

export type ArtId =
  | 'bazi' | 'ziwei' | 'qimen' | 'meihua' | 'liuyao'
  | 'liuren' | 'xiaoliuren' | 'astrology' | 'tarot';

// 出生地点（省市县区 → 经纬度）
export interface GeoLocation {
  province: string;
  city: string;
  district: string;
  lng: number;   // 东经正数
  lat: number;   // 北纬正数
}

// 真太阳时结果
export interface TrueSolarTime {
  beijingHours: number;      // 北京时间（小时，含分钟小数）
  localMeanHours: number;    // 本地平太阳时
  trueSolarHours: number;    // 真太阳时
  eotMinutes: number;        // 均时差（分钟）
  hourIndex: number;         // 校正后时辰序 0=子
  dateOffset: number;        // 相对北京时间的日期偏移（0 或 ±1）
}

// 八字输入输出
export interface BaziInput {
  y: number; m: number; d: number;
  hourIndex: number;         // 0-11
  time?: string;              // 精确出生时刻 HH:MM（有 location 时以此做真太阳时校正）
  gender: '男' | '女';
  location?: GeoLocation;    // 提供时做真太阳时校正
}
export interface BaziResult {
  yearGZ: string; monthGZ: string; dayGZ: string; hourGZ: string;
  dayGan: string; dayGanWx: string;
  wxCount: Record<string, number>;
  shishen: { gan: string; name: string }[];
  strength: '身强' | '身弱' | '中和';
  support: number; drain: number;
  nayin: string;
  correctedHourIndex: number;
  trueSolar?: TrueSolarTime;
  // ─── 补齐层（2026-08-20 排盘要点调研）───
  canggan: { zhi: string; gans: { gan: string; wx: string; shishen: string; qi: '本气' | '中气' | '余气' }[] }[];  // 四支藏干 + 十神
  wxWeighted: Record<string, number>;          // 含藏干权重的五行分
  strengthDetail: { score: number; ling: number; gen: number; shi: number; reasons: string[] };  // 旺衰拆解
  yongshen: { wx: string; shishen: string; xi: string[]; ji: string[]; tiaohou: string; reason: string };  // 用神/喜忌
  dayun: { gz: string; ganShishen: string; zhiShishen: string; startAge: number; startYear: number; endYear: number; forward: boolean }[];  // 大运
  qiYun: { startAge: number; startMonth: number; detail: string };  // 起运
  liunian: { year: number; gz: string; ganShishen: string; zhiShishen: string };  // 流年（当前年）
  shensha: { name: string; zhi: string; type: '吉' | '平' | '凶' }[];  // 神煞
  taiyuan: string;   // 胎元
  minggong: string;  // 命宫
  shengong: string;  // 身宫
  geju: { name: string; gan: string; shishen: string; basis: string };  // 月令取格
}

// 紫微输入输出
export interface ZiweiInput {
  ganzhi: string;            // 如 癸酉
  month: number; day: number; hour: number;
  time?: string;              // 精确出生时刻 HH:MM（有 location 时以此校正时辰）
  location?: GeoLocation;
  gender?: '男' | '女';
  birthYear?: number;        // 公历出生年（算虚岁/流年用）
  solarDate?: [number, number, number];  // 公历出生日期（完整真太阳时含均时差用）
}
export interface ZiweiResult {
  ming: number;              // 命宫地支位 0=寅
  zwPos: number;             // 紫微宫位
  zwStars: Record<string, number>;
  palaces: Record<number, number>;
  juName: string; nayin: string;
  correctedHour: number;
  dayun?: { palaceIdx: number; start: number; end: number }[];
  curDayunIdx?: number;
  nominalAge?: number;
  liunianIdx?: number;
  liunianPalaceName?: string;
  liunianStars?: string[];
  startAge?: number;
  forward?: boolean;
  // ─── 补齐层（2026-08-20 排盘要点调研）───
  shen: number;                          // 身宫地支位 0=寅
  mingGZ: string;                         // 命宫干支（五行局之源）
  fuStars: Record<string, number>;       // 辅星位置（0=寅起）
  sihua: { lu: string; quan: string; ke: string; ji: string };   // 生年四化星名
  sihuaPos: { lu?: number; quan?: number; ke?: number; ji?: number };  // 四化落宫位
  brightness: Record<string, string>;    // 十四主星亮度（'庙'|'旺'|'得'|'利'|'平'|'陷'）
  geju: { key: string; name: string; ji: '吉' | '凶' | '平'; desc: string; why: string }[];  // 格局
}

// 奇门输入输出
export interface QimenInput { datetime: string | Date }
export interface QimenResult {
  yin: boolean; ju: number; jqName: string;
  dayGZ: string; hourGZ: string;
  xunShou: string; xunshouName: string;
  zfStar: string; zsMen: string; zfPalace: number;
  pan: Record<number, { yi: string; men: string; star: string }>;
  // ─── 补齐层（2026-08-20）───
  zsPalace: number;              // 值使门落宫（时干加临）
  tianYi: Record<number, string>; // 天盘奇仪（暗干）
  shen: Record<number, string>;   // 八神布宫
}

// 梅花输入输出
export interface MeihuaInput {
  mode: 'time' | 'num';
  n1?: number; n2?: number; n3?: number;
  now?: Date;
}
export interface MeihuaResult {
  upper: number; lower: number; move: number;
  benGua: GuaEntry; bianGua: GuaEntry; huGua: GuaEntry | null;
  tiGua: number; yongGua: number; tiWx: string; yongWx: string;
  shengke: string; benYao: number[];
  // ─── 补齐层（2026-08-20）───
  monthWx?: string;              // 起卦月支五行
  tiWangShuai?: '旺' | '相' | '休' | '囚' | '死';    // 体卦旺衰（月令）
  yongWangShuai?: '旺' | '相' | '休' | '囚' | '死';  // 用卦旺衰
  wangShuaiNote?: string;        // 旺衰吉凶加成说明
}

// 六十四卦条目
export interface GuaEntry {
  up: number; down: number;
  name: string; ci: string; xiang: string;
}

// 六爻输出
export interface LiuyaoResult {
  yao: number[];
  names: { v: number; nm: string; backs: number }[];
  benGua: GuaEntry; bianGua: GuaEntry; dongYao: number[];
  // ─── 补齐层（2026-08-20 纳甲筮法）───
  najia?: {
    gong: string;               // 卦宫
    lines: { gz: string; ganWx: string; zhiWx: string; liuqin: string; shen: string; isShi: boolean; isYing: boolean; kong: boolean }[];  // 初→上
    shiPos: number; yingPos: number;
    dayGZ: string; monthZhi: string;    // 起卦日干支/月支
    yuePo: string[];                    // 月破地支
    xunKong: string[];                  // 旬空地支
    shiLiQin: string;                   // 世爻六亲（用神参考）
  };
}

// 大六壬输出
export interface LiurenResult {
  dayGZ: string; hourGZ: string;
  jiang: string; jqName: string;
  tianpan: Record<number, string>;
  ganJi: string; ke1: string; ke2: string; ke3: string; ke4: string;
  chuan1: string; chuan2: string; chuan3: string;
  // ─── 补齐层（2026-08-20）───
  guiRen: string;                // 贵人（昼夜贵人地支）
  isDay: boolean;                // 昼占/夜占
  tianJiang: Record<number, string>;  // 十二天将布宫（地盘支 → 天将）
  chuanJiang: { chuan: string; jiang: string }[];  // 三传所乘天将
  keti: string;     // 课体（伏吟/反吟/常课）
  ketiNote: string; // 课体断语
}

// 小六壬输出
export interface XiaoliurenResult {
  a: number; b: number; c: number;
  idx: number; name: string;
  detail: { ji: string; wx: string; num: string; dir: string; poem: string; text: string };
}

// 星盘输出
export interface AstrologyResult {
  planets: [string, string, number, string][];
  asc: number; sun: number; moon: number;
  lstHours: number;
  aspects: [string, string, string, string][];
  mc?: number;         // 中天黄经
  epsilon?: number;    // 黄赤交角（度）
  // ─── 补齐层（2026-08-20 星盘细化）───
  houseSystem: 'whole-sign';      // 当前宫位制：整宫制（以上升点为 1 宫头，每宫 30°）
  houses: { num: number; cusp: number; sign: string; ruler: string; rulerLng: number }[];  // 十二宫
  planetDetails: {
    cn: string; sym: string; color: string;
    lng: number; sign: string; degree: number;   // 黄经/星座/宫内经度
    house: number;                                // 落宫 1-12
    retrograde: boolean;                          // 逆行
    dignity: { status: '庙' | '旺' | '陷' | '弱' | ''; note: string };  // 古典庙旺
  }[];
  ascSign: string; sunSign: string; moonSign: string;  // 上升/太阳/月亮星座
}

// 塔罗输出
export interface TarotCardData {
  name: string; en: string; num?: string;
  up: string; rev: string;
  major: boolean; suit?: string;
  reversed: boolean;
}

// 通用引擎契约
export interface ArtEngine<TInput, TResult> {
  id: ArtId;
  calc(input: TInput, rng?: () => number): TResult;
  validate?(input: TInput): string[];
}