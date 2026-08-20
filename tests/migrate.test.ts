import { describe, it, expect } from 'vitest';
import { currentUser, register } from '../src/utils/userStore';

describe('旧数据迁移', () => {
  it('旧格式用户（无 samples）读取不崩溃', () => {
    // 写入旧格式用户
    localStorage.setItem('guanwei_users', JSON.stringify([{ username: '老客', passHash: 'h123', createdAt: 1, profile: { birthDate: '1990-01-01', birthHourIndex: 0, gender: '男', location: null } }]));
    localStorage.setItem('guanwei_session', JSON.stringify({ username: '老客', loginAt: 1 }));
    const u = currentUser();
    expect(u?.username).toBe('老客');
    expect(Array.isArray(u?.samples)).toBe(true);
    expect(u?.samples.length).toBe(0);
  });
});