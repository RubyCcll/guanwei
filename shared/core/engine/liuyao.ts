// 六爻：三枚铜钱摇卦（rng 可注入，保证测试可复现）+ 纳甲筮法（补齐层）
import { GUA_LOOKUP } from '../data/gua64';
import { GONG_SH, NAJIA, GONG_WX, SHEN_LIU, GAN_WX, ZHI_WX, liuqin } from '../data/liuyao';
import { daysSince, monthBranchOf } from './calendar';
import type { LiuyaoResult } from '../types';

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const mod = (a: number, n: number) => ((a % n) + n) % n;

// 起卦日期信息（可选）：日干支/月支 → 六神/月破/旬空
export interface LiuyaoDateInfo { y: number; m: number; d: number }

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

export function liuyaoCalc(rng: () => number = Math.random, date?: LiuyaoDateInfo): LiuyaoResult {
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

  // ─── 补齐层：纳甲筮法（需起卦日期）───
  let najia: LiuyaoResult['najia'] = undefined;
  if (date) {
    const gs = GONG_SH[benGua.name];
    if (gs) {
      const gz6 = NAJIA[gs.gong] || [];
      // 日干支（历元 +55）与月支
      const dIdx = mod(daysSince(date.y, date.m, date.d) + 55, 60);
      const dayGZ = GAN[dIdx % 10] + ZHI[dIdx % 12];
      const monthZhi = ZHI[mod(2 + monthBranchOf(date.y, date.m, date.d, 12), 12)];
      // 六神（日干起，初爻→上爻）
      const shenSeq = SHEN_LIU[dayGZ[0]] || [];
      // 月破：月支之冲（±6）
      const mIdx = ZHI.indexOf(monthZhi);
      const yuePo = [ZHI[mod(mIdx + 6, 12)]];
      // 旬空：日柱所在旬
      const xunStart = dIdx - (dIdx % 10);
      const xunKong = [ZHI[mod(xunStart + 10, 12)], ZHI[mod(xunStart + 11, 12)]];
      // 世应
      const shiPos = gs.shi;
      const yingPos = mod(shiPos + 2, 6) + 1;
      const gongWx = GONG_WX[gs.gong] || '金';
      const lines = gz6.map((gz, i) => {
        const zhi = gz[1];
        return {
          gz,
          ganWx: GAN_WX[gz[0]] || '',
          zhiWx: ZHI_WX[zhi] || '',
          liuqin: liuqin(gongWx, ZHI_WX[zhi] || ''),
          shen: shenSeq[i] || '',
          isShi: i + 1 === shiPos,
          isYing: i + 1 === yingPos,
          kong: xunKong.includes(zhi),
        };
      });
      najia = {
        gong: gs.gong, lines, shiPos, yingPos,
        dayGZ, monthZhi, yuePo, xunKong,
        shiLiQin: lines[shiPos - 1]?.liuqin || '',
      };
    }
  }
  return { yao, names, benGua, bianGua, dongYao, najia };
}