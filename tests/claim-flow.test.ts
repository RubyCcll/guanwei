// L-NEW1 闭环回归：起占下发的 claimToken 落本地 → app 内注册时携带它升级占位账号（拿云同步 token）
// 同时覆盖安全侧：仅「本次新建」下发 claimToken（已存在账号不回吐），故前端不会重复保存他人凭据
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiDivine, claimTokenOf, clearClaimToken, saveClaimToken } from '../src/services/api';
import { register } from '../src/utils/userStore';

const TOKEN64 = 'a'.repeat(64);

describe('claimToken 闭环（起占建档 → 本地注册升级）', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('起占响应含 claimToken → 保存到本地；不含则不动', async () => {
    const calls: any[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init: any) => {
      calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
      return new Response(JSON.stringify({ ok: true, divineId: 'd1', resultRaw: {}, claimToken: TOKEN64 }), { status: 200 });
    });
    await apiDivine('闭环用户', 'liuyao', {});
    expect(claimTokenOf('闭环用户')).toBe(TOKEN64);

    // 第二次起占（后端不再下发）→ 本地保留原值、不被清空/覆盖
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ ok: true, divineId: 'd2', resultRaw: {} }), { status: 200 }));
    await apiDivine('闭环用户', 'liuyao', {});
    expect(claimTokenOf('闭环用户')).toBe(TOKEN64);
  });

  it('app 内注册：先 login 失败 → register 携带 claimToken 并成功后清除本地凭据', async () => {
    saveClaimToken('升级用户', TOKEN64);
    const seen: any[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init: any) => {
      const u = String(url);
      seen.push({ u, body: init?.body ? JSON.parse(init.body) : null });
      if (u.endsWith('/login')) return new Response(JSON.stringify({ error: '名号或密语未合' }), { status: 401 });
      if (u.endsWith('/register')) return new Response(JSON.stringify({ ok: true, upgraded: true, token: 'server-token', user: { username: '升级用户' } }), { status: 200 });
      return new Response('{}', { status: 200 });
    });
    const res = register('升级用户', 'pass1234');
    expect(res.ok).toBe(true);
    // 等 fetchServerToken 异步完成
    await vi.waitFor(() => {
      const reg = seen.find(s => s.u.endsWith('/register'));
      expect(reg?.body?.claimToken).toBe(TOKEN64);
    });
    await vi.waitFor(() => expect(claimTokenOf('升级用户')).toBe(''));   // 一次性，成功后清除
  });

  it('无本地凭据时注册不带 claimToken 字段（不伪造）', async () => {
    clearClaimToken('全新用户');
    const seen: any[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init: any) => {
      const u = String(url);
      seen.push({ u, body: init?.body ? JSON.parse(init.body) : null });
      if (u.endsWith('/login')) return new Response('{}', { status: 401 });
      return new Response(JSON.stringify({ ok: true, token: 't', user: { username: '全新用户' } }), { status: 200 });
    });
    register('全新用户', 'pass1234');
    await vi.waitFor(() => {
      const reg = seen.find(s => s.u.endsWith('/register'));
      expect(reg).toBeTruthy();
      expect('claimToken' in (reg!.body || {})).toBe(false);
    });
  });
});
