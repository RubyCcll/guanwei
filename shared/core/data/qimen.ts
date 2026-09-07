// 奇门遁甲数据（九宫/八门/九星/八神）

export const QM_NAMES = ['坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'];
export const QM_MEN = ['休', '死', '伤', '杜', '中', '开', '惊', '生', '景'];
export const QM_STARS = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];
export const QM_SHEN = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
export const QM_QIYI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

// 节气 → 阴阳遁局数（上/中/下三元，权威口径，对照 qimen-dunjia《遁甲演義/寶鑒御定》局表）
// 阳遁：冬至~芒种（12 节）；阴遁：夏至~大雪。春分~芒种仍阳遁（勿误作阴）。
// 2026-09 修正：原表春分起误标阴遁且局数系统性错误
export const QM_SEASONS: { name: string; yin: boolean; ju: number[] }[] = [
  { name: '冬至', yin: false, ju: [1, 7, 4] }, { name: '小寒', yin: false, ju: [2, 8, 5] }, { name: '大寒', yin: false, ju: [3, 9, 6] },
  { name: '立春', yin: false, ju: [8, 5, 2] }, { name: '雨水', yin: false, ju: [9, 6, 3] }, { name: '惊蛰', yin: false, ju: [1, 7, 4] },
  { name: '春分', yin: false, ju: [3, 9, 6] }, { name: '清明', yin: false, ju: [4, 1, 7] }, { name: '谷雨', yin: false, ju: [5, 2, 8] },
  { name: '立夏', yin: false, ju: [4, 1, 7] }, { name: '小满', yin: false, ju: [5, 2, 8] }, { name: '芒种', yin: false, ju: [6, 3, 9] },
  { name: '夏至', yin: true, ju: [9, 3, 6] }, { name: '小暑', yin: true, ju: [8, 2, 5] }, { name: '大暑', yin: true, ju: [7, 1, 4] },
  { name: '立秋', yin: true, ju: [2, 5, 8] }, { name: '处暑', yin: true, ju: [1, 4, 7] }, { name: '白露', yin: true, ju: [9, 3, 6] },
  { name: '秋分', yin: true, ju: [7, 1, 4] }, { name: '寒露', yin: true, ju: [6, 9, 3] }, { name: '霜降', yin: true, ju: [5, 8, 2] },
  { name: '立冬', yin: true, ju: [6, 9, 3] }, { name: '小雪', yin: true, ju: [5, 8, 2] }, { name: '大雪', yin: true, ju: [4, 7, 1] },
];

// 节气近似日期（公历，演示级排盘与奇门定遁用）
export const JIEQI_APPROX: [string, number, number][] = [
  ['小寒', 1, 6], ['立春', 2, 4], ['惊蛰', 3, 6], ['清明', 4, 5], ['立夏', 5, 6], ['芒种', 6, 6],
  ['小暑', 7, 7], ['立秋', 8, 8], ['白露', 9, 8], ['寒露', 10, 8], ['立冬', 11, 7], ['大雪', 12, 7],
];

export const LUOSHU = [1, 8, 3, 4, 9, 2, 7, 6]; // 绕中五