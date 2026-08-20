import { describe, it, expect, beforeEach } from 'vitest';
import { register, login, logout, currentUser, updateProfile, hashPassword } from '../src/utils/userStore';
import { clearRecords, saveRecord, getRecords } from '../src/utils/recordStore';

beforeEach(() => {
  localStorage.clear();
});

describe('本地用户体系', () => {
  it('注册 → 会话 → 当前用户', () => {
    const r = register('观微客', '1234');
    expect(r.ok).toBe(true);
    expect(currentUser()?.username).toBe('观微客');
  });
  it('注册校验：名号过短/重复/密语过短', () => {
    expect(register('a', '1234').ok).toBe(false);
    expect(register('观微客', '12').ok).toBe(false);
    register('观微客', '1234');
    expect(register('观微客', '5678').ok).toBe(false);
  });
  it('登录/登出/密码校验', () => {
    register('观微客', '1234');
    logout();
    expect(currentUser()).toBeNull();
    expect(login('观微客', 'wrong').ok).toBe(false);
    expect(login('观微客', '1234').ok).toBe(true);
    expect(currentUser()?.username).toBe('观微客');
  });
  it('档案更新（出生信息）', () => {
    register('观微客', '1234');
    updateProfile({ birthDate: '1995-08-08', birthTime: '08:30',
      birthHourIndex: 4, location: { province: '广东', city: '广州', district: '城区', lng: 113.26, lat: 23.13 } });
    const u = currentUser()!;
    expect(u.profile.birthDate).toBe('1995-08-08');
    expect(u.profile.birthTime).toBe('08:30');
    expect(u.profile.location?.lng).toBe(113.26);
  });
  it('密码哈希确定性', () => {
    expect(hashPassword('1234')).toBe(hashPassword('1234'));
    expect(hashPassword('1234')).not.toBe(hashPassword('5678'));
  });
});

describe('记录按用户隔离', () => {
  it('未登录与登录用户记录互不可见', () => {
    clearRecords();
    saveRecord({ artId: 'bazi', createdAt: 1, result: { a: 1 } });
    expect(getRecords().length).toBe(1);
    // 注册新用户（会话切换）
    register('观微客', '1234');
    expect(getRecords().length).toBe(0); // 新用户的记录为空
    saveRecord({ artId: 'tarot', createdAt: 2, result: { b: 2 } });
    expect(getRecords().length).toBe(1);
    expect(getRecords()[0].artId).toBe('tarot');
    // 登出回访客
    logout();
    expect(getRecords().length).toBe(1);
    expect(getRecords()[0].artId).toBe('bazi');
  });
});