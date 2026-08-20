// 时辰常量（统一标注时间范围）
export const SHICHEN_HOURS = [
  '子时 23–01', '丑时 01–03', '寅时 03–05', '卯时 05–07',
  '辰时 07–09', '巳时 09–11', '午时 11–13', '未时 13–15',
  '申时 15–17', '酉时 17–19', '戌时 19–21', '亥时 21–23',
];

export const SHICHEN_CN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 精确时间 → 时辰序（0=子）
export function timeToHourIndex(time: string): number {
  const [h] = time.split(':').map(Number);
  return Math.floor(((h + 1) % 24) / 2);
}

export function hourIndexLabel(idx: number): string {
  return SHICHEN_HOURS[idx] || '未知';
}

export function timeToShichenLabel(time: string): string {
  return hourIndexLabel(timeToHourIndex(time));
}