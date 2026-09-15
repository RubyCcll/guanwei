// 鉴权统一入口：token → 用户（含过期校验）、请求来源判定
//
// 背景（2026-09 安全审查）：
//  - 三处路由各自实现 authedUsername，口径漂移：ai.ts 漏校验 tokenExpires（过期 token 在 AI 链路永久可用）
//  - 旧记录可能没有 tokenExpires 字段（1.3.3 前签发）→ 原逻辑视作「永不过期」；
//    这些 token 已随 npm 1.3.2 包公开泄漏，故一律按失效处理（用户重新登录即可获新 token）
import crypto from 'crypto';
import { readUsersDb } from './usersDb.js';

export interface TokenUser { username: string; user: any }

/** 请求携带的 token → 用户（无 token / 不匹配 / 已过期 → null） */
export function resolveTokenUser(req: any): TokenUser | null {
  const tk = String(req.headers['x-guanwei-token'] || '');
  if (!tk) return null;
  try {
    const db = readUsersDb();
    const user = db.users.find((u: any) =>
      u.token && u.token.length === tk.length && crypto.timingSafeEqual(Buffer.from(u.token), Buffer.from(tk)));
    if (!user) return null;
    // 过期即失效；无 tokenExpires 的旧记录（含已泄漏 token）同样视为失效
    if (!user.tokenExpires || Date.now() > user.tokenExpires) return null;
    return { username: user.username, user };
  } catch { return null; }
}

/** 请求来源是否可信内网（回环 / RFC1918 / ULA）：匿名建档与占位账号放行仅限此类来源 */
export function isTrustedOrigin(req: any): boolean {
  const raw = String(req.ip || req.socket?.remoteAddress || '');
  const ip = raw.replace(/^::ffff:/, '');
  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true;   // fc00::/7
  return false;
}

/** 显式放开匿名访问（公网部署且自担风险时设 GUANWEI_ALLOW_ANON=1） */
export function anonAllowed(): boolean {
  return process.env.GUANWEI_ALLOW_ANON === '1';
}

/** 强制所有匿名访问携带 token（公网部署更严；GUANWEI_REQUIRE_TOKEN=1） */
export function requireTokenAlways(): boolean {
  return process.env.GUANWEI_REQUIRE_TOKEN === '1';
}

/** 是否允许「无 token 的匿名操作」（建档/读占位账号） */
export function allowAnonymous(req: any): boolean {
  if (requireTokenAlways()) return false;
  return anonAllowed() || isTrustedOrigin(req);
}
