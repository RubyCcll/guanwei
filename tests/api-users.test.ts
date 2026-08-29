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
    // 登录（拿 token）
    res = await fetch(BASE + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: '1234' }),
    });
    expect(res.status).toBe(200);
    const loginData = await res.json();
    const token = loginData.token;
    expect(token).toBeTruthy();
    const user = loginData.user;
    expect(user.profile.birthDate).toBe('1995-08-08');
    // 错误密码
    res = await fetch(BASE + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: 'wrong' }),
    });
    expect(res.status).toBe(401);
    // 带 token 的写/读操作（v1.2.2+：无 token 一律 401）
    const auth = { 'Content-Type': 'application/json', 'X-Guanwei-Token': token };
    // 档案更新
    res = await fetch(BASE + '/' + name + '/profile', {
      method: 'PUT', headers: auth,
      body: JSON.stringify({ profile: { birthDate: '1996-09-09', birthHourIndex: 5, gender: '男', location: null } }),
    });
    expect((await res.json()).profile.birthDate).toBe('1996-09-09');
    // 示例档案
    res = await fetch(BASE + '/' + name + '/samples', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ name: '样例甲', profile: { birthDate: '2000-01-01', birthHourIndex: 0, gender: '女', location: null } }),
    });
    const sid = (await res.json()).samples[0].id;
    // 记录同步
    res = await fetch(BASE + '/' + name + '/records', {
      method: 'PUT', headers: auth,
      body: JSON.stringify({ records: [{ artId: 'bazi', createdAt: 1, result: { dayGZ: '壬申' } }] }),
    });
    expect((await res.json()).count).toBe(1);
    // 读取记录（带 token）
    res = await fetch(BASE + '/' + name + '/records', { headers: auth });
    expect((await res.json()).records.length).toBe(1);
    // 删除示例档案
    res = await fetch(BASE + '/' + name + '/samples/' + sid, { method: 'DELETE', headers: auth });
    expect((await res.json()).samples.length).toBe(0);
    // 无 token 读档案 → 401（越权防护）
    res = await fetch(BASE + '/' + name + '/profile');
    expect(res.status).toBe(401);
  });
});


describe('云同步鉴权（写他人档案须本人 token）', () => {
  const BASE = 'http://localhost:3018/api/users';

  it('注册返回 token；无 token 读写档案被拒；带 token 放行', async () => {
    const name = '鉴权' + Date.now().toString().slice(-4);
    // 注册拿 token
    let res = await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: 'pw1234' }),
    });
    expect(res.status).toBe(200);
    const reg = await res.json();
    expect(reg.token).toBeTruthy();

    // 无 token 读档案 → 401
    res = await fetch(BASE + '/' + name + '/profile');
    expect(res.status).toBe(401);

    // 错误 token 写档案 → 401
    res = await fetch(BASE + '/' + name + '/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Guanwei-Token': 'wrong-token' },
      body: JSON.stringify({ profile: { birthDate: '1999-01-01' } }),
    });
    expect(res.status).toBe(401);

    // 正确 token 写档案 → 200
    res = await fetch(BASE + '/' + name + '/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Guanwei-Token': reg.token },
      body: JSON.stringify({ profile: { birthDate: '1999-01-01' } }),
    });
    expect(res.status).toBe(200);

    // 正确 token 读档案 → 200 且数据一致
    res = await fetch(BASE + '/' + name + '/profile', { headers: { 'X-Guanwei-Token': reg.token } });
    expect(res.status).toBe(200);
    const prof = await res.json();
    expect(prof.profile.birthDate).toBe('1999-01-01');

    // 他人 token 读我的档案 → 401（越权防护）
    const otherName = '他人' + Date.now().toString().slice(-4);
    res = await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: otherName, password: 'pw1234' }),
    });
    const other = await res.json();
    res = await fetch(BASE + '/' + name + '/profile', { headers: { 'X-Guanwei-Token': other.token } });
    expect(res.status).toBe(401);
  });

  it('登录返回与注册一致的 token（同一账号可登录换 token）', async () => {
    const name = '登鉴' + Date.now().toString().slice(-4);
    let res = await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: 'pw1234' }),
    });
    const reg = await res.json();
    res = await fetch(BASE + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: 'pw1234' }),
    });
    expect(res.status).toBe(200);
    const login = await res.json();
    expect(login.token).toBe(reg.token);
  });
});
