// 梅花易数：时间 / 报数起卦（本卦/互卦/变卦 + 体用生克）
import { GUA_LOOKUP, BAGUA, type GuaEntry } from '../data/gua64';
import { ZHI, mod } from '../data/ganzhi';
import { Solar } from 'lunar-typescript';
import type { MeihuaInput, MeihuaResult } from '../types';

// 八卦 0-7 编码（自下而上，阳1阴0）
const GUA_BITS: Record<number, number[]> = { 1: [1,1,1], 2: [1,1,0], 3: [1,0,1], 4: [1,0,0], 5: [0,1,1], 6: [0,1,0], 7: [0,0,1], 8: [0,0,0] };
const BIT_TO_BA: Record<number, number> = { 7: 1, 6: 2, 5: 3, 4: 4, 3: 5, 2: 6, 1: 7, 0: 8 };

function guaFromYao(yao: number[]): GuaEntry | null {
  const l = yao[0] * 4 + yao[1] * 2 + yao[2];
  const u = yao[3] * 4 + yao[4] * 2 + yao[5];
  return GUA_LOOKUP[BIT_TO_BA[u] * 10 + BIT_TO_BA[l]] || null;
}

export function meihuaCalc(input: MeihuaInput): MeihuaResult {
  let upper: number, lower: number, move: number;
  if (input.mode === 'time') {
    const d = input.now || new Date();
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate(), h = d.getHours();
    const hourIndex = Math.floor(((h + 1) % 24) / 2) + 1;
    // 传统邵雍法：年支数 + 农历月 + 农历日（2026-08-20 修正：原误用公历月日）
    const lunar = Solar.fromYmdHms(y, m, day, h, 0, 0).getLunar();
    const lm = Math.abs(lunar.getMonth());
    const lday = lunar.getDay();
    const yzNum = ZHI.indexOf(lunar.getYearInGanZhi()[1] as any) + 1;
    const sum1 = yzNum + lm + lday;
    upper = mod(sum1 - 1, 8) + 1;
    const sum2 = sum1 + hourIndex;
    lower = mod(sum2 - 1, 8) + 1;
    move = mod(sum2 - 1, 6) + 1;
  } else {
    upper = mod(((input.n1 ?? 1) - 1), 8) + 1;
    lower = mod(((input.n2 ?? 1) - 1), 8) + 1;
    move = mod(((input.n3 ?? 1) - 1), 6) + 1;
  }
  const lb = GUA_BITS[lower], ub = GUA_BITS[upper];
  const benYao = [lb[0], lb[1], lb[2], ub[0], ub[1], ub[2]];
  const bianYao = benYao.map((v, i) => i === move - 1 ? 1 - v : v);
  const huLower = [benYao[1], benYao[2], benYao[3]];
  const huUpper = [benYao[2], benYao[3], benYao[4]];
  const benGua = guaFromYao(benYao)!;
  const bianGua = guaFromYao(bianYao)!;
  const huGua = GUA_LOOKUP[BIT_TO_BA[huUpper[0] * 4 + huUpper[1] * 2 + huUpper[2]] * 10 + BIT_TO_BA[huLower[0] * 4 + huLower[1] * 2 + huLower[2]]] || null;
  /* 体用：动爻在初/二/三爻 → 用在下卦；四/五/上 → 用在上卦 */
  const yongIsLower = move <= 3;
  const tiGua = yongIsLower ? upper : lower;
  const yongGua = yongIsLower ? lower : upper;
  const tiWx = BAGUA[tiGua].wx, yongWx = BAGUA[yongGua].wx;
  const wxOrder2 = ['木', '火', '土', '金', '水'];
  const rel = mod(wxOrder2.indexOf(yongWx) - wxOrder2.indexOf(tiWx), 5);
  const shengkeMap: Record<number, string> = { 1: '用生体，吉', 4: '体克用，吉', 2: '用克体，凶', 3: '体生用，泄气' };
  const shengke = shengkeMap[rel] || '体用比和，平';
  return { upper, lower, move, benGua, bianGua, huGua, tiGua, yongGua, tiWx, yongWx, shengke, benYao };
}