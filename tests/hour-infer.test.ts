// 时辰反推引擎单测：用虚构案例（1988-06-15 北京 女）验证推演逻辑
import { describe, it, expect } from 'vitest';
import { inferHour } from '../server/src/services/hourInference.js';
import { baziCalc } from '../shared/core/engine/bazi.js';
import { buildStep2Messages, buildReportMessages } from '../server/src/services/promptBuilder.js';

const BEIJING = { lng: 116.4, lat: 39.9, province: '北京市', city: '北京市', district: '东城区' };

// 案例关键事件（来自真实人生经历）
const EVENTS = [
  { year: 2000, text: '受伤', type: 'health' as const },
  { year: 2004, text: '家庭变故', type: 'family' as const },
  { year: 2012, text: '升学', type: 'study' as const },
  { year: 2014, text: '恋爱', type: 'love' as const },
  { year: 2016, text: '变动 远行 分手', type: 'move' as const },
  { year: 2020, text: '辞职 财务挫折', type: 'job' as const },
  { year: 2022, text: '健康变故 恋爱', type: 'health' as const },
  { year: 2024, text: '手术', type: 'health' as const },
  { year: 2026, text: '公司解散 得财', type: 'job' as const },
];

describe('inferHour', () => {
  it('虚构案例：申时（壬申）应显著领先', () => {
    const r = inferHour({ y: 1988, m: 6, d: 15, gender: '女', location: BEIJING, events: EVENTS });
    // 打印全部候选
    console.log('候选排序:', r.candidates.map(c => c.shichen + '时(' + c.hourGZ + ')=' + c.score).join(' '));
    // 申时（hourIndex 8）应进入前两名，且 best 得分领先
    expect(r.best.hourIndex).toBe(8);
    expect(r.best.score).toBeGreaterThan(0);
    // 验证大运不受时辰影响（引擎级断言）
    const rShen = baziCalc({ y: 1988, m: 6, d: 15, hourIndex: 8, gender: '女', location: BEIJING });
    const rXu = baziCalc({ y: 1988, m: 6, d: 15, hourIndex: 10, gender: '女', location: BEIJING });
    expect(rShen.dayun.map(d => d.gz).join()).toBe(rXu.dayun.map(d => d.gz).join());
    expect(rShen.qiYun.startAge).toBe(rXu.qiYun.startAge);
  });

  it('时辰未知（hourIndex=-1）排盘：时柱为未知、三柱正常、大运照排', () => {
    const r = baziCalc({ y: 1988, m: 6, d: 15, hourIndex: -1, gender: '女', location: BEIJING });
    expect(r.hourGZ).toBe('未知');
    expect(r.yearGZ).toBe('戊辰');
    expect(r.monthGZ).toBe('戊午');
    expect(r.dayGZ).toBe('辛丑');
    expect(r.dayun.length).toBe(8);
    expect(r.shensha.length).toBeGreaterThan(0);
    expect(r.wxCount['土']).toBe(4); // 三柱：戊辰/戊午/辛丑 → 天干戊戊+地支辰丑 = 4
    expect(r.minggong).toBe('未知');
    expect(r.shengong).toBe('未知');
  });

  it('时辰未知时 AI 提示词注入约束（禁止编造时柱/子女宫/晚年）', () => {
    const profile = { birthDate: '1988-06-15', birthTime: '', birthHourIndex: -1, birthTimeUnknown: true, gender: '女', location: null };
    const step2 = buildStep2Messages('bazi', '', {}, '【盘面解析】', profile);
    const system = step2[0].content;
    expect(system).toContain('时辰未知 · 最高约束');
    expect(system).toContain('严禁编造');
    expect(system).toContain('子女宫');
    expect(system).toContain('因时辰未知，此维度从略');
    // 时辰已知 → 无约束
    const known = buildStep2Messages('bazi', '', {}, '【盘面解析】', { birthDate: '1988-06-15', birthTime: '16:30', birthHourIndex: 8, gender: '女', location: null });
    expect(known[0].content).not.toContain('时辰未知 · 最高约束');
    // 单步报告路径同样注入
    const rep = buildReportMessages('bazi', '', {}, profile);
    expect(rep[0].content).toContain('时辰未知 · 最高约束');
  });

  it('报告提示词含去重与分工约束（避免区块间内容重复）', () => {
    const profile = { birthDate: '1988-06-15', birthTime: '16:30', birthHourIndex: 8, gender: '女', location: null };
    const s2 = buildStep2Messages('bazi', '问事业', {}, '【盘面解析】', profile)[0].content;
    const rep = buildReportMessages('bazi', '问事业', {}, profile)[0].content;
    for (const s of [s2, rep]) {
      expect(s).toContain('去重与分工');
      expect(s).toContain('严禁把同一段内容换着说法再写一遍');
      expect(s).toContain('宁短勿凑');
      expect(s).toContain('首次出现的区块完整展开');
      expect(s).toContain('字数预算');
      expect(s).toContain('论断锚定');
      expect(s).toContain('严格/宽松/慈爱');
      expect(s).not.toContain('每个字段按 Schema 标注的字数下限写作');
    }
    // 六亲论断必须带盘面依据、禁止无依据主观程度词
    expect(s2).toContain('六亲论断');
    expect(s2).toContain('盘面未明示');
    // rawReading 不再要求逐项复述
    expect(rep).not.toContain('每一项关键数据原样复述');
    expect(rep).toContain('最关键 3-5 条');
  });

  it('命主已知经历注入：解读须呼应并不得矛盾（注入在 user 消息）', () => {
    const profile = { birthDate: '1988-06-15', birthTime: '16:30', birthHourIndex: 8, gender: '女', location: null,
      lifeEvents: [{ year: 2024, text: '健康问题' }, { year: 2022, text: '结婚' }] };
    const s2 = buildStep2Messages('bazi', '问事业', {}, '【盘面解析】', profile);
    const rep = buildReportMessages('bazi', '问事业', {}, profile);
    for (const msgs of [s2, rep]) {
      const user = msgs[1].content;
      expect(user).toContain('命主已知人生经历 · 解读校准');
      expect(user).toContain('2024 年：健康问题');
      expect(user).toContain('2022 年：结婚');
      expect(user).toContain('严禁写出与已知经历相矛盾的内容');
      expect(user).toContain('正常论命');
    }
    // 无经历时不注入
    const plain = buildReportMessages('bazi', '问事业', {}, { birthDate: '1988-06-15', birthTime: '16:30', birthHourIndex: 8, gender: '女', location: null })[1].content;
    expect(plain).not.toContain('命主已知人生经历');
  });
});
