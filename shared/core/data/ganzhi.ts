// 干支 / 五行 / 纳音 / 六十甲子（移植参考项目 data.js）

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export const WUXING: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

export const SHISHEN_MAP: Record<string, string> = {
  比肩: '同类', 劫财: '同类', 食神: '我生', 伤官: '我生',
  偏财: '我克', 正财: '我克', 七杀: '克我', 正官: '克我', 偏印: '生我', 正印: '生我',
};

export const NAYIN = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土',
  '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金',
  '山下火', '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金',
  '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
];

// 五行局（纳音 → 局）
export const NAYIN_JU: Record<string, string> = {
  海中金: '金四局', 剑锋金: '金四局', 白蜡金: '金四局', 沙中金: '金四局', 金箔金: '金四局', 钗钏金: '金四局',
  炉中火: '火六局', 山头火: '火六局', 霹雳火: '火六局', 山下火: '火六局', 覆灯火: '火六局', 天上火: '火六局',
  大林木: '木三局', 杨柳木: '木三局', 松柏木: '木三局', 平地木: '木三局', 桑柘木: '木三局', 石榴木: '木三局',
  路旁土: '土五局', 城头土: '土五局', 屋上土: '土五局', 壁上土: '土五局', 大驿土: '土五局', 沙中土: '土五局',
  涧下水: '水二局', 泉中水: '水二局', 长流水: '水二局', 天河水: '水二局', 大溪水: '水二局', 大海水: '水二局',
};

export const mod = (a: number, n: number) => ((a % n) + n) % n;

export function jiaziIndex(year: number): number {
  return ((year - 4) % 60 + 60) % 60;
}

export function nayinOf(year: number): string {
  return NAYIN[Math.floor(jiaziIndex(year) / 2) % 30];
}

export function ganzhiOfYear(year: number): string {
  const i = jiaziIndex(year);
  return GAN[i % 10] + ZHI[i % 12];
}

// 60 甲子序（0-59），用于紫微五行局
export function ganZhiIndex(gz: string): number {
  const g = GAN.indexOf(gz[0] as any);
  const z = ZHI.indexOf(gz[1] as any);
  for (let k = 0; k < 6; k++) if (mod(g + 10 * k, 12) === z) return g + 10 * k;
  return g;
}