// 用户库（SQLite）：账号 / 出生档案 / 示例档案 / 云同步记录 / 登录态 token
//
// 历史（2026-09）：原为 JSON 文件（db.json）+ 进程内 Promise 串行锁。合并到统一 SQLite 后：
//  - 写操作走 BEGIN IMMEDIATE 事务：并发注册/建档不再互相覆盖，也不再依赖进程内锁
//  - 与占卜记录同库：跨进程一致（WAL + busy_timeout），外部工具可只读查看
//  - 旧 db.json 在 users 表为空时**一次性导入**（原文件保留，不删除，便于回滚）
import crypto from 'crypto';
import fs from 'fs';
import { getDb, withTx, getMeta, setMeta } from './db.js';
import { USERS_DB } from './dataDir.js';

export interface Sample { id: string; name: string; profile: Record<string, unknown> }
export interface UserRow {
  username: string;
  passHash: string;
  createdAt: number;
  profile: Record<string, unknown>;
  samples: Sample[];
  records: Record<string, unknown>[];
  /** 登录态 token（注册/登录签发）；占位账号为建档凭据 claimToken */
  token?: string;
  tokenExpires?: number;
}

const COLS = 'username, pass_hash, created_at, profile_json, samples_json, records_json, token, token_expires';

function parseJson<T>(s: unknown, fallback: T): T {
  if (typeof s !== 'string' || !s) return fallback;
  try {
    const v = JSON.parse(s);
    return (v ?? fallback) as T;
  } catch { return fallback; }
}

function rowToUser(r: any): UserRow {
  return {
    username: String(r.username),
    passHash: String(r.pass_hash || ''),
    createdAt: Number(r.created_at || 0),
    profile: parseJson<Record<string, unknown>>(r.profile_json, {}),
    samples: parseJson<Sample[]>(r.samples_json, []),
    records: parseJson<Record<string, unknown>[]>(r.records_json, []),
    token: r.token ? String(r.token) : undefined,
    tokenExpires: r.token_expires == null ? undefined : Number(r.token_expires),
  };
}

// ─── token 工具（原 users.ts 逻辑，统一到此处，供 routes/auth 复用）───
export function newToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** 恒时比较 token（含过期校验）：false = 无效 */
export function tokenMatches(user: Pick<UserRow, 'token' | 'tokenExpires'> | null | undefined, token: string | undefined): boolean {
  if (!user || !token || !user.token) return false;
  if (user.tokenExpires && Date.now() > user.tokenExpires) return false;   // 过期即失效
  const a = Buffer.from(token), b = Buffer.from(user.token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ─── 读 ───
export function getUser(username: string): UserRow | null {
  ensureInit();
  if (!username) return null;
  const row = getDb().prepare(`SELECT ${COLS} FROM users WHERE username = ?`).get(username) as any;
  return row ? rowToUser(row) : null;
}

export function userCount(): number {
  ensureInit();
  return Number((getDb().prepare('SELECT COUNT(*) AS c FROM users').get() as any)?.c || 0);
}

/** token → 用户（仅返回 token 完全匹配者；不匹配/不存在 → null） */
export function getUserByToken(token: string): UserRow | null {
  ensureInit();
  if (!token) return null;
  const row = getDb().prepare(`SELECT ${COLS} FROM users WHERE token = ?`).get(token) as any;
  if (!row) return null;
  const user = rowToUser(row);
  // 索引命中后再做一次恒时比较（防御性：避免长度差异等边信道）
  return tokenMatches(user, token) ? user : null;
}

// ─── 写 ───
export interface NewUser {
  username: string; passHash?: string; profile?: Record<string, unknown>;
  token?: string; tokenExpires?: number;
}

/** 新建账号（已存在 → false，不覆盖）；占位账号亦经此建（passHash 为空串） */
export function createUserIfAbsent(u: NewUser): boolean {
  ensureInit();
  const res = getDb().prepare(
    'INSERT OR IGNORE INTO users (username, pass_hash, created_at, profile_json, samples_json, records_json, token, token_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    u.username, u.passHash ?? '', Date.now(),
    JSON.stringify(u.profile ?? {}), '[]', '[]',
    u.token ?? null, u.tokenExpires ?? null,
  );
  return Number(res.changes || 0) > 0;
}

/** 占位账号升级为正式账号：写入密语哈希 + 轮换 token（须在事务内调用） */
export function upgradePlaceholder(username: string, passHash: string, token: string, tokenExpires: number, profilePatch?: Record<string, unknown>): void {
  const merged = profilePatch ? { ...(getUser(username)?.profile || {}), ...profilePatch } : null;
  getDb().prepare('UPDATE users SET pass_hash = ?, token = ?, token_expires = ? WHERE username = ?')
    .run(passHash, token, tokenExpires, username);
  if (merged) setProfileJson(username, merged);
}

/** 轮换 token（登录成功时） */
export function rotateToken(username: string, token: string, tokenExpires: number): void {
  getDb().prepare('UPDATE users SET token = ?, token_expires = ? WHERE username = ?').run(token, tokenExpires, username);
}

/** 升级密语哈希（旧格式登录命中时） */
export function setPassHash(username: string, passHash: string): void {
  getDb().prepare('UPDATE users SET pass_hash = ? WHERE username = ?').run(passHash, username);
}

function setProfileJson(username: string, profile: Record<string, unknown>): void {
  getDb().prepare('UPDATE users SET profile_json = ? WHERE username = ?').run(JSON.stringify(profile), username);
}

/** 档案合并写（浅合并）；返回新档案，用户不存在 → null */
export function mergeProfile(username: string, patch: Record<string, unknown>): Record<string, unknown> | null {
  ensureInit();
  return withTx(() => {
    const u = getUser(username);
    if (!u) return null;
    const merged = { ...u.profile, ...patch };
    setProfileJson(username, merged);
    return merged;
  });
}

/** 示例档案：追加 */
export function addSample(username: string, sample: Sample): Sample[] | null {
  ensureInit();
  return withTx(() => {
    const u = getUser(username);
    if (!u) return null;
    const samples = [...u.samples, sample];
    getDb().prepare('UPDATE users SET samples_json = ? WHERE username = ?').run(JSON.stringify(samples), username);
    return samples;
  });
}

/** 示例档案：删除 */
export function removeSample(username: string, id: string): Sample[] | null {
  ensureInit();
  return withTx(() => {
    const u = getUser(username);
    if (!u) return null;
    const samples = u.samples.filter(s => s.id !== id);
    getDb().prepare('UPDATE users SET samples_json = ? WHERE username = ?').run(JSON.stringify(samples), username);
    return samples;
  });
}

/** 云同步记录：整表覆盖 */
export function setRecords(username: string, records: Record<string, unknown>[]): number | null {
  ensureInit();
  return withTx(() => {
    const u = getUser(username);
    if (!u) return null;
    getDb().prepare('UPDATE users SET records_json = ? WHERE username = ?').run(JSON.stringify(records), username);
    return records.length;
  });
}

// ─── 旧 JSON 库一次性导入 ───
const IMPORT_MARK = 'users_imported_from_json';
let inited = false;

/** 幂等初始化：users 表为空且存在旧 db.json → 导入（原文件保留） */
export function ensureInit(): void {
  if (inited) return;
  inited = true;
  try {
    const imported = getMeta(IMPORT_MARK);
    if (imported) return;                       // 本库已导入过
    if (userCountRaw() > 0) { setMeta(IMPORT_MARK, 'skip:users-exist'); return; }
    let raw: string;
    try { raw = fs.readFileSync(USERS_DB, 'utf-8'); } catch { return; }   // 无旧库：全新安装
    const parsed = JSON.parse(raw);
    const users: any[] = Array.isArray(parsed?.users) ? parsed.users : [];
    if (!users.length) { setMeta(IMPORT_MARK, 'skip:json-empty'); return; }
    let n = 0;
    withTx(() => {
      for (const u of users) {
        if (!u || typeof u.username !== 'string' || !u.username) continue;
        const ok = insertLegacy(u);
        if (ok) n++;
      }
      setMeta(IMPORT_MARK, `imported:${n}:${USERS_DB}`);
    });
    console.log(`[usersStore] 已从旧 JSON 库导入 ${n} 个账号: ${USERS_DB}`);
  } catch (e: any) {
    console.error('[usersStore] 旧 JSON 库导入失败（跳过，不影响新库）:', e?.message || e);
  }
}

function userCountRaw(): number {
  return Number((getDb().prepare('SELECT COUNT(*) AS c FROM users').get() as any)?.c || 0);
}

function insertLegacy(u: any): boolean {
  const res = getDb().prepare(
    'INSERT OR IGNORE INTO users (username, pass_hash, created_at, profile_json, samples_json, records_json, token, token_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    String(u.username), String(u.passHash || ''), Number(u.createdAt || Date.now()),
    JSON.stringify(u.profile && typeof u.profile === 'object' ? u.profile : {}),
    JSON.stringify(Array.isArray(u.samples) ? u.samples : []),
    JSON.stringify(Array.isArray(u.records) ? u.records : []),
    u.token ? String(u.token) : null,
    u.tokenExpires == null ? null : Number(u.tokenExpires),
  );
  return Number(res.changes || 0) > 0;
}
