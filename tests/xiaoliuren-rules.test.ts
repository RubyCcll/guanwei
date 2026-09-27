// 小六壬起课规则回归（对照外部教程的原始例题）
//
// 权威源：《小六壬基础（一）》(yesandnoandperhaps) —— 起卦/算卦/解卦全流程，含手诀落宫与两组例题；
//         《小六壬基础（二）》—— 闰月处理（作本月）、三宫（天/地/人 = 起因/经过/结果）与两组案例。
//   https://yesandnoandperhaps.cn/posts/4bedfa1f.html
//   https://yesandnoandperhaps.cn/posts/a7247f88.html
//
// 规则要点：
//   · 六宫循环：大安(1) → 留连(2) → 速喜(3) → 赤口(4) → 小吉(5) → 空亡(6≡0)，手诀顺时针点；
//     掌位：大安食指根（寅）、留连食指指尖（卯）、速喜中指指尖（辰）、
//           赤口无名指指尖（巳）、小吉无名指根（午）、空亡中指根（未）
//   · 时间起卦：以「农历 月、日、时辰」三步推——大安起正月，月落之宫起初一，日落之宫起子时，
//     落宫即下一步的起点（故每步只数 n−1）；时辰序 子=1…亥=12
//   · 数字起卦：随取三数（本引擎取 1–12），同样以三数为步数
//   · 闰月：作本月（不并入下月）
//   · 三宫：天宫=月落（起因）、地宫=日落（经过）、人宫=时落（结果，占断所取）
import { describe, it, expect } from 'vitest';
import { xiaoliurenCalc } from '../shared/core/engine/xiaoliuren';
import { XLR_ORDER } from '../shared/core/data/xiaoliuren';

/** 依传统口诀独立推导三宫（与引擎实现无关：显式落宫即起点） */
function classicGong(steps: number[]): string[] {
  let pos = 0;                 // 大安
  const out: string[] = [];
  steps.forEach((n, i) => {
    pos = i === 0 ? (n - 1) % 6 : (pos + n - 1) % 6;
    out.push(XLR_ORDER[pos]);
  });
  return out;
}

describe('小六壬：六宫循环与基本口径', () => {
  it('六宫顺序与手诀一致（大安→留连→速喜→赤口→小吉→空亡）', () => {
    expect(XLR_ORDER).toEqual(['大安', '留连', '速喜', '赤口', '小吉', '空亡']);
  });

  it('正月/初一/子时起于大安；同月起日、同日起时皆以落宫为起点', () => {
    expect(classicGong([1, 1, 1])).toEqual(['大安', '大安', '大安']);
    expect(xiaoliurenCalc('time', 1, 1, 0).name).toBe('大安');            // h 为 0-based 时辰序：子=0
    expect(xiaoliurenCalc('time', 2, 1, 0).name).toBe('留连');            // 二月起于留连，初一同落
    expect(xiaoliurenCalc('time', 7, 1, 0).name).toBe('大安');            // 满六归位：七月同正月
    expect(xiaoliurenCalc('time', 1, 7, 0).name).toBe('大安');            // 初七同理
  });

  it('时辰序 0=子 … 11=亥 与口诀「子=1…亥=12」对齐', () => {
    for (let h = 0; h < 12; h++) {
      // 正月/初一 + 该时辰 → 落宫应为该时辰序号（子=大安、丑=留连…）
      const r = xiaoliurenCalc('time', 1, 1, h);
      expect(r.c, `h=${h}`).toBe(h + 1);
      expect(r.name, `h=${h}`).toBe(XLR_ORDER[h % 6]);
    }
  });
});

describe('小六壬：外部教程例题复算', () => {
  it('闰六月廿六亥时 → 天宫空亡 · 地宫大安 · 人宫空亡（顺证「闰月作本月」）', () => {
    const r = xiaoliurenCalc('time', 6, 26, 11);   // 亥时 = 0-based 11
    expect([r.gong.tian.name, r.gong.di.name, r.gong.ren.name]).toEqual(['空亡', '大安', '空亡']);
    expect(classicGong([6, 26, 12])).toEqual(['空亡', '大安', '空亡']);
  });

  it('数字起课 6·5·4 → 空亡 · 赤口 · 大安', () => {
    const r = xiaoliurenCalc('num', 1, 1, 0, 6, 5, 4);
    expect([r.gong.tian.name, r.gong.di.name, r.gong.ren.name]).toEqual(['空亡', '赤口', '大安']);
    expect(classicGong([6, 5, 4])).toEqual(['空亡', '赤口', '大安']);
  });

  it('数字起课 3·2·3 → 速喜 · 赤口 · 空亡（本引擎所从的「落宫为起点」流派）', () => {
    const r = xiaoliurenCalc('num', 1, 1, 0, 3, 2, 3);
    expect([r.gong.tian.name, r.gong.di.name, r.gong.ren.name]).toEqual(['速喜', '赤口', '空亡']);
    // 另一流派「三步皆自大安起、累加总数」同例作 速喜·小吉·留连——本引擎不取，此处显式记录差异
    const other = [3, 3 + 2, 3 + 2 + 3].map(s => XLR_ORDER[(s - 1) % 6]);
    expect(other).toEqual(['速喜', '小吉', '留连']);
  });
});

describe('小六壬：与其余八术的输入口径一致性', () => {
  it('时间起卦只吃「农历月/日 + 时辰序」，不含任何出生信息', () => {
    // 同一个月日时，无论调用方传入什么（引擎签名里根本没有出生字段）结果恒定
    const a = xiaoliurenCalc('time', 8, 16, 6);
    const b = xiaoliurenCalc('time', 8, 16, 6);
    expect(a).toEqual(b);
    expect(Object.keys(a)).not.toContain('profile');
    expect(Object.keys(a)).not.toContain('birthTime');
    // 反证：改动月/日/时之外无任何入口能影响结果
    expect(a.name).toBe(classicGong([8, 16, 7])[2]);
  });

  it('数字起课以三数为步，且与时间起卦共用同一落宫规则', () => {
    const t = xiaoliurenCalc('time', 3, 2, 2);        // 月3 日2 巳时(0-based 2 → 时辰序3)
    const n = xiaoliurenCalc('num', 1, 1, 0, 3, 2, 3);
    expect(t.name).toBe(n.name);
    expect(t.gong).toEqual(n.gong);
  });
});
