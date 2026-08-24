// 奇门遁甲数据（九宫/八门/九星/八神）

export const QM_NAMES = ['坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'];
export const QM_MEN = ['休', '死', '伤', '杜', '中', '开', '惊', '生', '景'];
export const QM_STARS = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];
export const QM_SHEN = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
export const QM_QIYI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

// 节气 → 阴阳遁局数（简表：按节令三分）
export const QM_SEASONS: { name: string; yin: boolean; ju: number[] }[] = [
  { name: '冬至', yin: false, ju: [1, 2, 3] }, { name: '小寒', yin: false, ju: [2, 3, 4] }, { name: '大寒', yin: false, ju: [3, 4, 5] },
  { name: '立春', yin: false, ju: [8, 9, 1] }, { name: '雨水', yin: false, ju: [9, 1, 2] }, { name: '惊蛰', yin: false, ju: [1, 2, 3] },
  { name: '春分', yin: true, ju: [3, 2, 1] }, { name: '清明', yin: true, ju: [4, 3, 2] }, { name: '谷雨', yin: true, ju: [5, 4, 3] },
  { name: '立夏', yin: true, ju: [4, 3, 2] }, { name: '小满', yin: true, ju: [5, 4, 3] }, { name: '芒种', yin: true, ju: [6, 5, 4] },
  { name: '夏至', yin: true, ju: [9, 8, 7] }, { name: '小暑', yin: true, ju: [8, 7, 6] }, { name: '大暑', yin: true, ju: [7, 6, 5] },
  { name: '立秋', yin: true, ju: [2, 1, 9] }, { name: '处暑', yin: true, ju: [1, 9, 8] }, { name: '白露', yin: true, ju: [9, 8, 7] },
  { name: '秋分', yin: true, ju: [7, 8, 9] }, { name: '寒露', yin: true, ju: [6, 7, 8] }, { name: '霜降', yin: true, ju: [5, 6, 7] },
  { name: '立冬', yin: true, ju: [6, 7, 8] }, { name: '小雪', yin: true, ju: [5, 6, 7] }, { name: '大雪', yin: true, ju: [4, 5, 6] },
];

// 节气近似日期（公历，演示级排盘与奇门定遁用）
export const JIEQI_APPROX: [string, number, number][] = [
  ['小寒', 1, 6], ['立春', 2, 4], ['惊蛰', 3, 6], ['清明', 4, 5], ['立夏', 5, 6], ['芒种', 6, 6],
  ['小暑', 7, 7], ['立秋', 8, 8], ['白露', 9, 8], ['寒露', 10, 8], ['立冬', 11, 7], ['大雪', 12, 7],
];

export const LUOSHU = [1, 8, 3, 4, 9, 2, 7, 6]; // 绕中五