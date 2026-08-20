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
}

// 紫微输入输出
export interface ZiweiInput {
  ganzhi: string;            // 如 癸酉
  month: number; day: number; hour: number;
  time?: string;              // 精确出生时刻 HH:MM（有 location 时以此校正时辰）
  location?: GeoLocation;
  gender?: '男' | '女';
  birthYear?: number;        // 公历出生年（算虚岁/流年用）
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
}

// 奇门输入输出
export interface QimenInput { datetime: string | Date }
export interface QimenResult {
  yin: boolean; ju: number; jqName: string;
  dayGZ: string; hourGZ: string;
  xunShou: string; xunshouName: string;
  zfStar: string; zsMen: string; zfPalace: number;
  pan: Record<number, { yi: string; men: string; star: string }>;
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
}

// 大六壬输出
export interface LiurenResult {
  dayGZ: string; hourGZ: string;
  jiang: string; jqName: string;
  tianpan: Record<number, string>;
  ganJi: string; ke1: string; ke2: string; ke3: string; ke4: string;
  chuan1: string; chuan2: string; chuan3: string;
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