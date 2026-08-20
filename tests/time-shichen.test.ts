import { describe, it, expect } from 'vitest';
import { timeToHourIndex, timeToShichenLabel } from '../src/data/shichen';
import { baziCalc } from '../shared/core/engine/bazi';
import { currentUser } from '../src/utils/userStore';

describe('精确时刻与时辰', () => {
  it('时间 → 时辰：08:30 → 辰时(4)；23:30 → 子时(0)', () => {
    expect(timeToHourIndex('08:30')).toBe(4);
    expect(timeToHourIndex('23:30')).toBe(0);
    expect(timeToShichenLabel('08:30')).toContain('辰时');
    expect(timeToShichenLabel('23:30')).toContain('子时');
  });
  it('八字：精确时刻校正真太阳时（乌鲁木齐 12:30 → 巳时）', () => {
    const r = baziCalc({ y: 2024, m: 6, d: 15, hourIndex: 6, time: '12:30', gender: '男', location: { province: '新疆', city: '乌鲁木齐', district: '城区', lng: 87.62, lat: 43.79 } });
    // 12:30 - 2.16h ≈ 10:14 → 巳时(5)
    expect(r.correctedHourIndex).toBe(5);
  });
  it('八字：北京 12:30 → 校正后仍午时', () => {
    const r = baziCalc({ y: 2024, m: 6, d: 15, hourIndex: 6, time: '12:30', gender: '男', location: { province: '北京', city: '北京市', district: '东城区', lng: 116.4, lat: 39.9 } });
    expect(r.correctedHourIndex).toBe(6);
  });
  it('档案迁移：旧数据（无 birthTime）自动补时辰中点', () => {
    localStorage.clear();
    localStorage.setItem('guanwei_users', JSON.stringify([{ username: '老客', passHash: 'h1', createdAt: 1, profile: { birthDate: '1990-01-01', birthHourIndex: 2, gender: '男', location: null }, samples: [] }]));
    localStorage.setItem('guanwei_session', JSON.stringify({ username: '老客', loginAt: 1 }));
    const u = currentUser();
    expect(u?.profile.birthTime).toBe('04:00'); // 寅时(2)中点
  });
});