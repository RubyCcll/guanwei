// 盘面话术生成器测试：同一盘确定性输出、不同盘话术有差异、关键信息完整
import { describe, it, expect } from 'vitest';
import { baziCalc } from '../shared/core/engine/bazi';
import { ziweiCalc } from '../shared/core/engine/ziwei';
import { baziTone, ziweiTone } from '../src/utils/panTone';

describe('baziTone', () => {
  // 三个不同命盘（虚构样本）：己未日女命、己丑日男命、甲庚申日女命
  const p1 = baziCalc({ y: 1990, m: 6, d: 15, hourIndex: 8, time: '16:30', gender: '女', location: { lng: 116.4, lat: 39.9 } });
  const p2 = baziCalc({ y: 1995, m: 3, d: 9, hourIndex: 2, time: '05:30', gender: '男', location: { lng: 116.4, lat: 39.9 } });
  const p3 = baziCalc({ y: 1988, m: 12, d: 25, hourIndex: 10, time: '21:30', gender: '女', location: { lng: 121.47, lat: 31.23 } });

  it('确定性：同一盘两次生成完全一致', () => {
    const a = baziTone(p1);
    const b = baziTone(p1);
    expect(a).toEqual(b);
  });

  it('差异性：不同命盘话术不同（标题/总述/性格）', () => {
    const t1 = baziTone(p1), t2 = baziTone(p2), t3 = baziTone(p3);
    expect(t1.headline).not.toBe(t2.headline);
    expect(t1.overview).not.toBe(t2.overview);
    expect(t1.headline).not.toBe(t3.headline);
    // 至少一个盘的性格倾向与其他不同
    const joined = (t: typeof t1) => t.character.join('|');
    expect([joined(t1), joined(t2), joined(t3)].filter((v, i, a) => a.indexOf(v) === i).length).toBeGreaterThan(1);
  });

  it('关键信息完整：日主/用神/喜忌/大运指引/纳音', () => {
    const t = baziTone(p1);
    expect(t.headline).toContain('日主'); // 日主名来自盘面数据
    expect(t.overview).toContain('用神');
    expect(t.overview).toContain('喜');
    expect(t.overview).toContain('忌');
    expect(t.dayunNote).toContain('运');
    expect(t.nayinNote).toContain('纳音');
    expect(t.character.length).toBeGreaterThan(0);
    expect(t.wuxingNote.length).toBeGreaterThan(10);
  });

  it('时辰未知盘（三柱）也能生成话术', () => {
    const u = baziCalc({ y: 1990, m: 6, d: 15, hourIndex: -1, gender: '女', location: { lng: 116.4, lat: 39.9 } });
    const t = baziTone(u);
    expect(t.headline.length).toBeGreaterThan(10);
    expect(t.character.length).toBeGreaterThan(0);
  });
});

describe('ziweiTone', () => {
  it('命宫点睛含主星话术', () => {
    const r = ziweiCalc({ ganzhi: '戊辰', month: 5, day: 1, hour: 8, time: '16:30', location: { lng: 116.4, lat: 39.9 }, gender: '女', birthYear: 1988, solarDate: [1988, 6, 15] });
    const t = ziweiTone(r);
    expect(t.mingNote).toContain('命宫');
    expect(t.mingNote.length).toBeGreaterThan(15);
    expect(t.liunianNote).toContain('流年');
  });
});
