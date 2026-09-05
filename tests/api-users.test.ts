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

  it('登录轮换 token：新 token 有效、旧 token 失效（M-NEW2）', async () => {
    const name = '轮换' + Date.now().toString().slice(-4);
    let res = await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: 'pw1234' }),
    });
    const reg = await res.json();
    const oldToken = reg.token;
    // 旧 token 读档案 → 200（注册后未轮换仍有效）
    res = await fetch(BASE + '/' + name + '/profile', { headers: { 'X-Guanwei-Token': oldToken } });
    expect(res.status).toBe(200);
    // 登录 → 应返回新 token（轮换）
    res = await fetch(BASE + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: 'pw1234' }),
    });
    const login = await res.json();
    expect(login.token).toBeTruthy();
    expect(login.token).not.toBe(oldToken);
    // 旧 token 已失效 → 401
    res = await fetch(BASE + '/' + name + '/profile', { headers: { 'X-Guanwei-Token': oldToken } });
    expect(res.status).toBe(401);
    // 新 token 有效 → 200
    res = await fetch(BASE + '/' + name + '/profile', { headers: { 'X-Guanwei-Token': login.token } });
    expect(res.status).toBe(200);
  });
});


describe('H1 安全加固（claimToken 抢占防护 + 越权防护）', () => {
  const BASE = 'http://localhost:3018/api/users';

  it('占位账号无 claimToken 无法被抢占；持 claimToken 可升级', async () => {
    const name = '占位' + Date.now().toString().slice(-4);
    // ① 通过 divine 自动建档（产生占位账号 + claimToken）
    let res = await fetch('http://localhost:3018/api/divine', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, artId: 'liuyao', inputs: {} }),
    });
    expect(res.status).toBe(200);
    // 从 db.json 读 claimToken（测试辅助）
    const fs = await import('fs');
    const path = await import('path');
    const dbPath = path.join(process.cwd(), 'server', 'src', 'data', 'db.json');
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const u = db.users.find((x: any) => x.username === name);
    expect(u?.token).toBeTruthy();
    const claimToken = u.token;
    // ② 攻击者无 claimToken 注册 → 409
    res = await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: 'hacked123' }),
    });
    expect(res.status).toBe(409);
    // ③ 持 claimToken 注册 → upgraded 成功
    res = await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: 'hacked123', claimToken }),
    });
    expect(res.status).toBe(200);
    const reg = await res.json();
    expect(reg.upgraded).toBe(true);
    expect(reg.token).toBeTruthy();
    // ④ 升级后可用新密码登录
    res = await fetch(BASE + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: 'hacked123' }),
    });
    expect(res.status).toBe(200);
  });

  it('divine 详情归属：自报他人 username 无 token 可读自己记录；他人 token 被拒', async () => {
    // 注册甲、乙
    const a = '甲' + Date.now().toString().slice(-4);
    const b = '乙' + Date.now().toString().slice(-4);
    let res = await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: a, password: 'pw1234' }),
    });
    const tokA = (await res.json()).token;
    const regB = await (await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: b, password: 'pw1234' }),
    })).json();
    // 甲起占
    res = await fetch('http://localhost:3018/api/divine', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Guanwei-Token': tokA },
      body: JSON.stringify({ username: a, artId: 'bazi', inputs: { y: 1990, m: 6, d: 15, hourIndex: 6, gender: '男' } }),
    });
    expect(res.status).toBe(200);
    const divineId = (await res.json()).divineId;
    // 无 token + 目标是正式账号甲 → 401（H-NEW1：不再允许自报 username 越权）
    res = await fetch('http://localhost:3018/api/divine/' + divineId + '?username=' + a);
    expect(res.status).toBe(401);
    // 乙的 token 读甲的记录 → 403（token 归属不匹配）
    res = await fetch('http://localhost:3018/api/divine/' + divineId + '?username=' + a, {
      headers: { 'X-Guanwei-Token': regB.token },
    });
    expect(res.status).toBe(403);
    // 甲自己的 token 读自己记录 → 200
    res = await fetch('http://localhost:3018/api/divine/' + divineId + '?username=' + a, {
      headers: { 'X-Guanwei-Token': tokA },
    });
    expect(res.status).toBe(200);
  });
});

describe('H-NEW2/3：divine 历史列表与删除鉴权', () => {
  const BASE = 'http://localhost:3018/api/users';

  it('正式账号：无 token 列/删被拒；他人 token 列/删被拒；本人 token 放行', async () => {
    const a = '列删' + Date.now().toString().slice(-4);
    const b = '删乙' + Date.now().toString().slice(-4);
    let res = await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: a, password: 'pw1234' }),
    });
    const tokA = (await res.json()).token;
    const regB = await (await fetch(BASE + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: b, password: 'pw1234' }),
    })).json();
    // 甲起占两条
    for (let i = 0; i < 2; i++) {
      res = await fetch('http://localhost:3018/api/divine', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Guanwei-Token': tokA },
        body: JSON.stringify({ username: a, artId: 'liuyao', inputs: {} }),
      });
      expect(res.status).toBe(200);
    }
    // 无 token 列甲历史 → 401（H-NEW2）
    res = await fetch('http://localhost:3018/api/divine?username=' + a);
    expect(res.status).toBe(401);
    // 乙 token 列"甲的 URL" → 按 token 用户（乙）返回，拿不到甲数据（空列表 200）
    res = await fetch('http://localhost:3018/api/divine?username=' + a, { headers: { 'X-Guanwei-Token': regB.token } });
    expect(res.status).toBe(200);
    expect((await res.json()).list.length).toBe(0);
    // 甲 token 列自己历史 → 200 且 2 条
    res = await fetch('http://localhost:3018/api/divine?username=' + a, { headers: { 'X-Guanwei-Token': tokA } });
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list.list.length).toBe(2);
    const id = list.list[0].divineId;
    // 无 token 删 → 401（H-NEW3）
    res = await fetch('http://localhost:3018/api/divine/' + id + '?username=' + a, { method: 'DELETE' });
    expect(res.status).toBe(401);
    // 甲 token 删自己 → 200
    res = await fetch('http://localhost:3018/api/divine/' + id + '?username=' + a, { method: 'DELETE', headers: { 'X-Guanwei-Token': tokA } });
    expect(res.status).toBe(200);
  });
});
