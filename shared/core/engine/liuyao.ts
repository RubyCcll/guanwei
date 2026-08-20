// 六爻：三枚铜钱摇卦（rng 可注入，保证测试可复现）
import { GUA_LOOKUP } from '../data/gua64';
import type { LiuyaoResult } from '../types';

const BIT_TO_BA: Record<number, number> = { 7: 1, 6: 2, 5: 3, 4: 4, 3: 5, 2: 6, 1: 7, 0: 8 };

// mulberry32 固定种子随机（测试用）
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function liuyaoCalc(rng: () => number = Math.random): LiuyaoResult {
  const yao: number[] = [];
  const names: { v: number; nm: string; backs: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const backs = Math.floor(rng() * 4); // 0-3
    let v: number, nm: string;
    if (backs === 0) { v = 0; nm = '老阴'; }
    else if (backs === 1) { v = 1; nm = '少阳'; }
    else if (backs === 2) { v = 0; nm = '少阴'; }
    else { v = 1; nm = '老阳'; }
    yao.push(v);
    names.push({ v, nm, backs });
  }
  const lB = BIT_TO_BA[yao[0] * 4 + yao[1] * 2 + yao[2]];
  const uB = BIT_TO_BA[yao[3] * 4 + yao[4] * 2 + yao[5]];
  const benGua = GUA_LOOKUP[uB * 10 + lB]!;
  const bianYao = yao.map((v, i) => (names[i].nm === '老阴' || names[i].nm === '老阳') ? 1 - v : v);
  const lB2 = BIT_TO_BA[bianYao[0] * 4 + bianYao[1] * 2 + bianYao[2]];
  const uB2 = BIT_TO_BA[bianYao[3] * 4 + bianYao[4] * 2 + bianYao[5]];
  const bianGua = GUA_LOOKUP[uB2 * 10 + lB2]!;
  const dongYao: number[] = [];
  names.forEach((n, i) => { if (n.nm === '老阴' || n.nm === '老阳') dongYao.push(i + 1); });
  return { yao, names, benGua, bianGua, dongYao };
}