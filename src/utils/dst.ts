// 中国夏令时（1986-1991，北京时间 02:00 起止）——排盘时提示用户按钟表时间填写
const DST_PERIODS: [number, number, number, number, number, number][] = [
  [1986, 5, 4, 1986, 9, 14],
  [1987, 4, 12, 1987, 9, 13],
  [1988, 4, 10, 1988, 9, 11],
  [1989, 4, 16, 1989, 9, 17],
  [1990, 4, 15, 1990, 9, 16],
  [1991, 4, 14, 1991, 9, 15],
];

/** 判断公历日期是否处于中国夏令时期间（此时钟表拨快 1 小时，排盘需按钟表时间填写） */
export function isChinaDSTDate(dateStr: string): boolean {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateStr || '');
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (y < 1986 || y > 1991) return false;
  const t = new Date(y, mo - 1, d, 12, 0, 0).getTime();
  for (const [sy, sm, sd, ey, em, ed] of DST_PERIODS) {
    const start = new Date(sy, sm - 1, sd, 2, 0, 0).getTime();
    const end = new Date(ey, em - 1, ed, 2, 0, 0).getTime();
    if (t >= start && t <= end) return true;
  }
  return false;
}
