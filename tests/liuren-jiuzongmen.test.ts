// 大六壬九宗门起三传精度测试：穷举扫描确认的真实课例（手工推演验证）
import { describe, it, expect } from 'vitest';
import { liurenCalc, jiuzongmen } from '../shared/core/engine/liuren';
import { ZHI, WUXING } from '../shared/core/data/ganzhi';
import { LR_GANJI } from '../shared/core/data/liuren';

const zi = (z: string) => ZHI.indexOf(z as any);
const WX_KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const ke = (a: string, b: string) => WX_KE[a] === b;

// 构造天盘（月将加时顺布）
function buildTianpan(hourIndex: number, jiangIdx: number): Record<number, string> {
  const tp: Record<number, string> = {};
  for (let i = 0; i < 12; i++) tp[(hourIndex + i) % 12] = ZHI[(jiangIdx + i) % 12];
  return tp;
}

describe('大六壬·九宗门起三传（真实课例）', () => {
  it('元首课：甲子日 寅将 巳时——多上克下取涉害', () => {
    const tp = buildTianpan(4, 2);
    // ke1=tianpan[寅]=子, ke2=tianpan[子]=戌, ke3=tianpan[子]=戌, ke4=tianpan[戌]=申
    // 课2 戌(土)克子(水)→上克下；课3 同 → 两上克下 → 比用（甲阳，戌阳/戌阳皆比）→ 涉害
    const r = jiuzongmen(tp, '寅', '子', '甲', 4, '寅');
    expect(r.method).toBe('涉害课');
    expect(r.chuan1).toBe('戌');
    expect(r.chuan2).toBe('申');
    expect(r.chuan3).toBe('午');
  });

  it('伏吟课：甲子日 子将 子时——无克取刑（寅→巳→申）', () => {
    const tp = buildTianpan(0, 0);
    const r = jiuzongmen(tp, '寅', '子', '甲', 0, '子');
    expect(r.method).toBe('伏吟课');
    expect(r.chuan1).toBe('寅');
    expect(r.chuan2).toBe('巳');
    expect(r.chuan3).toBe('申');
  });

  it('蒿矢课（遥克）：甲丑日 子将 卯时——日干遥克上神', () => {
    const tp = buildTianpan(3, 0); // 卯时(3)，子将(0)
    const r = jiuzongmen(tp, '寅', '丑', '甲', 3, '子');
    expect(r.method).toBe('蒿矢课');
    expect(r.chuan1).toBe('戌');
    expect(r.chuan2).toBe('未');
    expect(r.chuan3).toBe('辰');
  });

  it('昴星课：丙辰日 子将 亥时——无克无遥取酉', () => {
    const tp = buildTianpan(11, 0); // 亥时(11)，子将(0)
    // 丙寄巳：kes = [午/巳, 未/午, 巳/辰, 午/巳]
    const r = jiuzongmen(tp, '巳', '辰', '丙', 11, '子');
    expect(r.method).toBe('昴星课');
    // 阳日取酉上神（天盘加临地盘酉者）：tianpan[酉]=戌
    expect(r.chuan1).toBe('戌');
    expect(r.chuan2).toBe('巳');
    expect(r.chuan3).toBe('午');
  });

  it('八专课：乙辰日 子将 亥时——干支同位（乙寄辰）', () => {
    const tp = buildTianpan(11, 0);
    // 乙寄辰 = 日支辰 → 八专；阴日取支上神
    const r = jiuzongmen(tp, '辰', '辰', '乙', 11, '子');
    expect(r.method).toBe('八专课');
    expect(r.chuan1).toBe('巳');
    expect(r.chuan2).toBe('午');
    expect(r.chuan3).toBe('未');
  });

  it('返吟课：庚午日 子将 午时——对冲盘有克取贼克（涉害）', () => {
    const tp = buildTianpan(6, 0);
    // 庚寄申：课1 寅vs申（申金克寅木→下克上）；课2 申vs寅（金克木→上克下）；课3 子vs午（水克火→上克下）；课4 午vs子（火克水→下克上）
    // 上克下：课2申、课3子 → 比用（庚阳：申阳、子阳皆比）→ 涉害
    const r = jiuzongmen(tp, '申', '午', '庚', 6, '子');
    expect(r.method).toBe('涉害课');
    expect(r.chuan1).toBe('子');
    expect(r.chuan2).toBe('午');
    expect(r.chuan3).toBe('子');
  });

  it('liurenCalc 完整链路：输出含起传法门', () => {
    const r = liurenCalc('2026-08-23T10:30:00');
    expect(r.chuanMethod).toBeTruthy();
    expect(r.chuanNote).toBeTruthy();
    expect(r.chuan1 && r.chuan2 && r.chuan3).toBeTruthy();
  });

  it('三传必须是天盘神', () => {
    const r = liurenCalc('1990-05-15T14:00:00');
    const tpVals = Object.values(r.tianpan);
    expect(tpVals).toContain(r.chuan1);
    expect(tpVals).toContain(r.chuan2);
    expect(tpVals).toContain(r.chuan3);
  });

  it('干寄宫正确性', () => {
    expect(LR_GANJI['甲']).toBe('寅');
    expect(LR_GANJI['戊']).toBe('巳');
    expect(LR_GANJI['庚']).toBe('申');
    expect(LR_GANJI['壬']).toBe('亥');
    expect(LR_GANJI['癸']).toBe('丑');
  });

  it('穷举全盘面不抛异常：所有 日干×日支×月将×时辰 组合', () => {
    const gans = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    for (const g of gans) {
      const ganJi = LR_GANJI[g];
      for (let dz = 0; dz < 12; dz++) {
        for (let j = 0; j < 12; j++) {
          for (let h = 0; h < 12; h++) {
            const tp = buildTianpan(h, j);
            const r = jiuzongmen(tp, ganJi, ZHI[dz], g, h, ZHI[j]);
            expect(r.method).toBeTruthy();
            expect(r.chuan1).toBeTruthy();
          }
        }
      }
    }
  });

  it('五行相克表自洽：木→土→水→火→金→木', () => {
    expect(ke('木', '土')).toBe(true);
    expect(ke('土', '水')).toBe(true);
    expect(ke('水', '火')).toBe(true);
    expect(ke('火', '金')).toBe(true);
    expect(ke('金', '木')).toBe(true);
    expect(ke('木', '金')).toBe(false);
  });
});
