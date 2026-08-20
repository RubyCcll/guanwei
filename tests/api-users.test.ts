import { describe, it, expect } from 'vitest';
// 后端 API 测试（通过 vite 代理不可用，直接调用本地 server 3018）

const BASE = 'http://localhost:3018/api/users';

describe('后端用户/档案/记录 API（联调）', () => {
  it('注册/登录/档案更新/示例档案/记录同步 全链路', async () => {
    const name = '联调' + Date.now().toString().slice(-4);
    // 注册
    let res = await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: '1234', profile: { birthDate: '1995-08-08', birthHourIndex: 4, gender: '女', location: null } }),
    });
    expect(res.status).toBe(200);
    // 重复注册拒绝
    res = await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: '5678' }),
    });
    expect(res.status).toBe(400);
    // 登录
    res = await fetch(BASE + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: '1234' }),
    });
    expect(res.status).toBe(200);
    const user = (await res.json()).user;
    expect(user.profile.birthDate).toBe('1995-08-08');
    // 错误密码
    res = await fetch(BASE + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: 'wrong' }),
    });
    expect(res.status).toBe(401);
    // 档案更新
    res = await fetch(BASE + '/' + name + '/profile', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: { birthDate: '1996-09-09', birthHourIndex: 5, gender: '男', location: null } }),
    });
    expect((await res.json()).profile.birthDate).toBe('1996-09-09');
    // 示例档案
    res = await fetch(BASE + '/' + name + '/samples', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '样例甲', profile: { birthDate: '2000-01-01', birthHourIndex: 0, gender: '女', location: null } }),
    });
    const sid = (await res.json()).samples[0].id;
    // 记录同步
    res = await fetch(BASE + '/' + name + '/records', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ artId: 'bazi', createdAt: 1, result: { dayGZ: '壬申' } }] }),
    });
    expect((await res.json()).count).toBe(1);
    // 读取记录
    res = await fetch(BASE + '/' + name + '/records');
    expect((await res.json()).records.length).toBe(1);
    // 删除示例档案
    res = await fetch(BASE + '/' + name + '/samples/' + sid, { method: 'DELETE' });
    expect((await res.json()).samples.length).toBe(0);
  });
});