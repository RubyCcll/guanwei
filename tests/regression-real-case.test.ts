// 回归集 · 结构等价虚构案例（入库版·零隐私）：
// 用虚构出生信息验证引擎功能不退化（排盘/夏令时边界/大运/时辰反推/六亲星位/流年十神）
// 真实人事例（含出生信息与经历）见 tests/tmp-test-real-case.test.ts（git 忽略，不入库）
import { describe, it, expect } from 'vitest';
import { baziCalc, shishen as engineShishen } from '../shared/core/engine/bazi';
import { inferHour } from '../server/src/services/hourInference.js';
import { GAN, ZHI } from '../shared/core/data/ganzhi';

// 虚构出生：1988-06-15 北京 女（实测盘：戊辰 戊午 辛丑 丙申，辛金日主，4 岁起运）
const BEIJING = { lng: 116.4, lat: 39.9, province: '北京市', city: '北京市', district: '东城区' };
const BIRTH = { y: 1988, m: 6, d: 15, gender: '女' as const, location: BEIJING };

// 虚构案例的事件（年份 + 类别，无任何真实经历）
const CASE_EVENTS: { year: number; text: string; type?: 'health' | 'love' | 'job' | 'family' | 'money' | 'study' | 'move' | 'breakup' }[] = [
  { year: 2000, text: '受伤', type: 'health' },
  { year: 2004, text: '家庭变故', type: 'family' },
  { year: 2008, text: '复学', type: 'study' },
  { year: 2012, text: '升学', type: 'study' },
  { year: 2014, text: '恋爱', type: 'love' },
  { year: 2016, text: '变动 远行', type: 'move' },
  { year: 2016, text: '分手', type: 'breakup' },
  { year: 2020, text: '辞职 财务挫折', type: 'job' },
  { year: 2022, text: '健康变故', type: 'health' },
  { year: 2022, text: '恋爱', type: 'love' },
  { year: 2024, text: '手术', type: 'health' },
  { year: 2025, text: '职场压力', type: 'job' },
  { year: 2026, text: '公司解散 得财', type: 'job' },
];

describe('回归集 · 虚构案例（排盘/夏令时边界/大运/反推）', () => {
  it('R1 排盘基础：1988-06-15 北京女 → 戊辰 戊午 辛丑 丙申（辛金日主）', () => {
    const r = baziCalc({ ...BIRTH, hourIndex: 8, time: '16:30' });
    expect(r.yearGZ).toBe('戊辰');
    expect(r.monthGZ).toBe('戊午');
    expect(r.dayGZ).toBe('辛丑');
    expect(r.hourGZ).toBe('丙申');
    expect(r.dayGanWx).toBe('金');
    expect(r.dayun.length).toBe(8);
    expect(r.dayun[0].startAge).toBe(4);
  });

  it('R2 真太阳时边界：1988 夏令时期间，15:30 校正后落未时、16:30/17:50 落申时（同时辰内分钟无影响）', () => {
    const a = baziCalc({ ...BIRTH, hourIndex: 8, time: '15:30' });
    const b = baziCalc({ ...BIRTH, hourIndex: 8, time: '16:30' });
    const c = baziCalc({ ...BIRTH, hourIndex: 8, time: '17:50' });
    expect(a.hourGZ).toBe('乙未'); // 夏令时-1h + 经度-14min → 14:15 未时
    expect(b.hourGZ).toBe('丙申');
    expect(c.hourGZ).toBe('丙申');
    expect(b.hourGZ).toBe(c.hourGZ); // 同时辰内分钟差异不影响
  });

  it('R3 大运序列不受时辰影响（申时 vs 戌时候选完全一致）', () => {
    const shen = baziCalc({ ...BIRTH, hourIndex: 8, time: '16:30' });
    const xu = baziCalc({ ...BIRTH, hourIndex: 10, time: '20:30' });
    expect(shen.dayun.map(d => d.gz + '@' + d.startAge).join()).toBe(xu.dayun.map(d => d.gz + '@' + d.startAge).join());
  });

  it('R4 时辰反推：经历年份推演 → 申时（丙申）排第一', () => {
    const result = inferHour({ ...BIRTH, events: CASE_EVENTS });
    const rank = result.candidates.findIndex(c => c.hourIndex === 8);
    const shen = result.candidates.find(c => c.hourIndex === 8)!;
    console.log('虚构案例 推演排序:', result.candidates.slice(0, 3).map(c => c.shichen + '时(' + c.hourGZ + ')=' + c.score).join(' '));
    expect(rank).toBe(0);
    expect(shen.score).toBeGreaterThan(0);
  });

  it('R5 六亲星位提取（女命：父星=财星、母星=偏印，干支藏干可寻）', () => {
    const r = baziCalc({ ...BIRTH, hourIndex: 8, time: '16:30' });
    // 辛金日主：财星（木）与偏印（土）应在四柱或藏干中可寻
    const names = r.shishen.map(s => s.name);
    const hasFather = names.includes('正财') || names.includes('偏财') || r.canggan.some(c => c.gans.some(g => g.shishen === '正财' || g.shishen === '偏财'));
    const hasMother = names.includes('偏印') || r.canggan.some(c => c.gans.some(g => g.shishen === '偏印'));
    expect(hasFather).toBe(true);
    expect(hasMother).toBe(true);
  });

  it('R6 流年十神映射正确（日主辛金：2024 甲辰=正财、2026 丙午=正官）', () => {
    const r = baziCalc({ ...BIRTH, hourIndex: 8, time: '16:30' });
    const gz = (y: number) => { const i = ((y - 4) % 60 + 60) % 60; return { gan: GAN[i % 10], zhi: ZHI[i % 12] }; };
    expect(engineShishen(r.dayGan, gz(2024).gan)).toBe('正财');
    expect(engineShishen(r.dayGan, gz(2026).gan)).toBe('正官');
  });
});
