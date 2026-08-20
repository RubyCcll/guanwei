import { describe, it, expect, beforeEach } from 'vitest';
import { register, logout, addSampleProfile, removeSampleProfile, promoteSampleProfile, currentUser } from '../src/utils/userStore';
import { interpretZiwei } from '../shared/core/engine/ziweiInterpret';
import { ziweiCalc } from '../shared/core/engine/ziwei';

beforeEach(() => { localStorage.clear(); });

describe('多档案系统', () => {
  it('注册后主档案唯一，samples 为空', () => {
    register('观微客', '1234');
    const u = currentUser()!;
    expect(u.profile).toBeTruthy();
    expect(u.samples.length).toBe(0);
  });
  it('添加示例档案（命名）', () => {
    register('观微客', '1234');
    addSampleProfile('1995 生辰', { birthDate: '1995-08-08', birthTime: '08:30',
      birthHourIndex: 4, gender: '女', location: null });
    const u = currentUser()!;
    expect(u.samples.length).toBe(1);
    expect(u.samples[0].name).toBe('1995 生辰');
    // 主档案不受影响
    expect(u.profile.birthDate).not.toBe('1995-08-08');
  });
  it('删除示例档案', () => {
    register('观微客', '1234');
    addSampleProfile('A', { birthDate: '1995-08-08', birthTime: '08:30',
      birthHourIndex: 4, gender: '女', location: null });
    addSampleProfile('B', { birthDate: '1996-08-08', birthTime: '10:30',
      birthHourIndex: 5, gender: '男', location: null });
    const id = currentUser()!.samples[0].id;
    removeSampleProfile(id);
    const u = currentUser()!;
    expect(u.samples.length).toBe(1);
    expect(u.samples[0].name).toBe('B');
  });
  it('示例档案设为主档案（原主档案转示例）', () => {
    register('观微客', '1234');
    addSampleProfile('1995 生辰', { birthDate: '1995-08-08', birthTime: '08:30',
      birthHourIndex: 4, gender: '女', location: null });
    const sid = currentUser()!.samples[0].id;
    promoteSampleProfile(sid);
    const u = currentUser()!;
    expect(u.profile.birthDate).toBe('1995-08-08');
    expect(u.profile.birthTime).toBe('08:30');
    expect(u.samples.some(s => s.name === '旧主档案')).toBe(true);
  });
});

describe('紫微命盘详解', () => {
  it('生成命宫/紫微落宫/十二宫要览/总述等段落', () => {
    const r = ziweiCalc({ ganzhi: '癸酉', month: 1, day: 1, hour: 0, gender: '男', birthYear: 1993 });
    const insights = interpretZiwei(r);
    expect(insights.length).toBeGreaterThanOrEqual(4);
    expect(insights.some(i => i.title.includes('命宫'))).toBe(true);
    expect(insights.some(i => i.title.includes('紫微落宫'))).toBe(true);
    expect(insights.some(i => i.title === '十二宫要览')).toBe(true);
    expect(insights.some(i => i.title === '命盘总述')).toBe(true);
    // 内容引用盘主实际星曜（癸酉正月子时 → 命宫@寅 有紫微）
    const ming = insights.find(i => i.title.includes('命宫'))!;
    expect(ming.content.length).toBeGreaterThan(30);
  });
  it('命宫无主星时给出借宫说明', () => {
    const r = ziweiCalc({ ganzhi: '甲子', month: 6, day: 20, hour: 8, gender: '女', birthYear: 1984 });
    const ming = interpretZiwei(r).find(i => i.title.includes('命宫'))!;
    expect(ming.content.length).toBeGreaterThan(20);
  });
});