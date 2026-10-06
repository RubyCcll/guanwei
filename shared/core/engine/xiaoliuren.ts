// 小六壬：掌诀推算（大安起月 → 月上起日 → 日上起时）
import { XLR, XLR_ORDER } from '../data/xiaoliuren';
import { mod } from '../data/ganzhi';
import type { XiaoliurenResult } from '../types';

/**
 * 天地人三宫（天=月落·起因，地=日落·经过，人=时落·结果＝占断所取）。
 * 独立导出：历史记录（2026-09-26 前）不含 gong 字段，展示与 AI 盘面事实须由 a/b/c 复算，保证同一口径。
 */
export function xiaoliurenGong(a: number, b: number, c: number) {
  const p1 = mod(a - 1, 6);
  const p2 = mod(p1 + (b - 1), 6);
  const p3 = mod(p2 + (c - 1), 6);
  return {
    p1, p2, p3,
    gong: {
      tian: { idx: p1, name: XLR_ORDER[p1] },
      di: { idx: p2, name: XLR_ORDER[p2] },
      ren: { idx: p3, name: XLR_ORDER[p3] },
    },
  };
}

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
  // 三步推法（传统「大安起月 → 月上起日 → 日上起时」）：
  // 落宫即下一步的起点（月落之宫即是初一、日落之宫即是子时），故每一步减一。
  // 另有「三步皆从大安起、累加总数」的流派（相当于不减一），本引擎从主流口诀。
  const { p3, gong } = xiaoliurenGong(a, b, c);
  const name = XLR_ORDER[p3];
  return { a, b, c, idx: p3, name, gong, detail: XLR[name] };
}