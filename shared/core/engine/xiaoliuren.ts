// 小六壬：掌诀推算（大安起月 → 月上起日 → 日上起时）
import { XLR, XLR_ORDER } from '../data/xiaoliuren';
import { mod } from '../data/ganzhi';
import type { XiaoliurenResult } from '../types';

export function xiaoliurenCalc(
  mode: 'time' | 'num',
  m: number, d: number, h: number,
  n1?: number, n2?: number, n3?: number,
): XiaoliurenResult {
  let a: number, b: number, c: number;
  if (mode === 'time') {
    a = m; b = d;
    // 时辰序统一为 0=子（与 chart.ts 契约及其余八术一致）；口诀自「大安起子时」故此处 +1
    // 2026-09 修 P1：此前 Demo 页传 0-based、面板传 1-based、测试传原始钟点，三套口径并存
    c = mod(Math.floor(h), 12) + 1;
  } else { a = n1 ?? 1; b = n2 ?? 1; c = n3 ?? 1; }
  const p1 = mod(a - 1, 6);
  const p2 = mod(p1 + (b - 1), 6);
  const p3 = mod(p2 + (c - 1), 6);
  const name = XLR_ORDER[p3];
  return { a, b, c, idx: p3, name, detail: XLR[name] };
}