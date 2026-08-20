// 本地用户体系（演示级）：注册/登录/会话/出生档案
// 注意：仅本地存储（localStorage），密码为演示级哈希，不适用于生产环境
import type { GeoLocation } from '@core/types';

export interface UserProfile {
  birthDate: string;          // YYYY-MM-DD（公历）
  birthTime: string;          // 精确出生时刻 HH:MM（东玄匹配时辰，星盘直接用）
  birthHourIndex: number;     // 0-11 时辰序（兼容旧数据；新数据由 birthTime 派生）
  birthTimeUnknown?: boolean; // 时辰未知（true 时不排时柱，AI 解读仅依年月日三柱）
  gender: '男' | '女';
  location: GeoLocation | null;
  /** 命主已知人生经历（用于 AI 解读校准：报告须呼应该年份事件，不得与其矛盾） */
  lifeEvents?: { year: number; text: string }[];
}

export interface NamedProfile {
  id: string;
  name: string;      // 示例档案名称
  profile: UserProfile;
}

export interface User {
  username: string;
  passHash: string;
  createdAt: number;
  profile: UserProfile;      // 主档案（唯一，默认账号档案）
  samples: NamedProfile[];   // 示例档案（命名保存）
}

const USERS_KEY = 'guanwei_users';

// ===== 云同步（前后端联调：后端可用时自动同步） =====
const API = '/api/users';

async function apiOk(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch { return false; }
}

export async function syncProfileToServer(username: string, profile: UserProfile, samples: NamedProfile[]): Promise<void> {
  if (!(await apiOk())) return;
  try {
    await fetch(API + '/' + encodeURIComponent(username) + '/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, samples }),
    });
  } catch { /* 离线忽略 */ }
}

export async function pushRecordsToServer(username: string, records: unknown[]): Promise<void> {
  if (!(await apiOk())) return;
  try {
    await fetch(API + '/' + encodeURIComponent(username) + '/records', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    });
  } catch { /* 离线忽略 */ }
}

export async function pullRecordsFromServer(username: string): Promise<unknown[] | null> {
  if (!(await apiOk())) return null;
  try {
    const res = await fetch(API + '/' + encodeURIComponent(username) + '/records');
    if (!res.ok) return null;
    const data = await res.json();
    return data.records || null;
  } catch { return null; }
}
const SESSION_KEY = 'guanwei_session';

// 演示级确定性哈希（djb2）
export function hashPassword(pw: string): string {
  let h = 5381;
  const s = 'guanwei::' + pw;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return 'h' + h.toString(16);
}

function loadUsers(): User[] {
  try {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    // 数据迁移：旧版本用户无 samples 字段
    return users.map(u => ({
      ...u,
      profile: migrateProfile(u.profile),
      samples: (u.samples || []).map(s => ({ ...s, profile: migrateProfile(s.profile) })),
    }));
  }
  catch { return []; }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export const DEFAULT_PROFILE: UserProfile = {
  birthDate: '1990-06-15',
  birthTime: '12:00',
  birthHourIndex: 6,
  gender: '男',
  location: null,
}

export interface AuthResult { ok: boolean; message: string; user?: User }

export function register(username: string, password: string, profile: UserProfile = DEFAULT_PROFILE): AuthResult {
  const name = username.trim();
  if (name.length < 2) return { ok: false, message: '名号至少二字' };
  if (password.length < 4) return { ok: false, message: '密语至少四位' };
  const users = loadUsers();
  if (users.some(u => u.username === name)) return { ok: false, message: '此名号已有人用' };
  const user: User = { username: name, passHash: hashPassword(password), createdAt: Date.now(), profile, samples: [] };
  users.push(user);
  saveUsers(users);
  setSession(name);
  return { ok: true, message: '入馆成功', user };
}

export function login(username: string, password: string): AuthResult {
  const users = loadUsers();
  const user = users.find(u => u.username === username.trim());
  if (!user || user.passHash !== hashPassword(password)) return { ok: false, message: '名号或密语未合' };
  setSession(user.username);
  return { ok: true, message: '入馆成功', user };
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

function setSession(username: string): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username, loginAt: Date.now() }));
}

export function currentUser(): User | null {
  try {
    const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!sess?.username) return null;
    return loadUsers().find(u => u.username === sess.username) || null;
  } catch { return null; }
}

export function updateProfile(profile: Partial<UserProfile>): User | null {
  const user = currentUser();
  if (!user) return null;
  const users = loadUsers();
  const idx = users.findIndex(u => u.username === user.username);
  if (idx < 0) return null;
  users[idx] = { ...users[idx], profile: { ...users[idx].profile, ...profile } };
  saveUsers(users);
  return users[idx];
}

// ===== 示例档案管理 =====

// 追加示例档案（命名保存）
export function addSampleProfile(name: string, profile: UserProfile): User | null {
  const user = currentUser();
  if (!user) return null;
  const users = loadUsers();
  const idx = users.findIndex(u => u.username === user.username);
  if (idx < 0) return null;
  users[idx] = {
    ...users[idx],
    samples: [...users[idx].samples, { id: 's' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), name: name.trim() || '未名档案', profile }],
  };
  saveUsers(users);
  return users[idx];
}

// 编辑示例档案
export function updateSampleProfile(id: string, profile: UserProfile): User | null {
  const user = currentUser();
  if (!user) return null;
  const users = loadUsers();
  const idx = users.findIndex(u => u.username === user.username);
  if (idx < 0) return null;
  users[idx] = {
    ...users[idx],
    samples: users[idx].samples.map(s => s.id === id ? { ...s, profile: { ...s.profile, ...profile } } : s),
  };
  saveUsers(users);
  return users[idx];
}

// 删除示例档案
export function removeSampleProfile(id: string): User | null {
  const user = currentUser();
  if (!user) return null;
  const users = loadUsers();
  const idx = users.findIndex(u => u.username === user.username);
  if (idx < 0) return null;
  users[idx] = { ...users[idx], samples: users[idx].samples.filter(s => s.id !== id) };
  saveUsers(users);
  return users[idx];
}

// 示例档案设为主档案（原主档案转为示例档案）
export function promoteSampleProfile(id: string): User | null {
  const user = currentUser();
  if (!user) return null;
  const users = loadUsers();
  const idx = users.findIndex(u => u.username === user.username);
  if (idx < 0) return null;
  const sample = users[idx].samples.find(s => s.id === id);
  if (!sample) return null;
  const oldPrimary = users[idx].profile;
  users[idx] = {
    ...users[idx],
    profile: sample.profile,
    samples: [
      ...users[idx].samples.filter(s => s.id !== id),
      { id: 's' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), name: '旧主档案', profile: oldPrimary },
    ],
  };
  saveUsers(users);
  return users[idx];
}

// 记录隔离 key（未登录 → guest）
export function recordsKey(): string {
  return 'guanwei_records_' + (currentUser()?.username || 'guest');
}
// 旧档案迁移：无 birthTime 时由时辰序推算（取时辰中点）
function migrateProfile(p: UserProfile): UserProfile {
  if (!p) return DEFAULT_PROFILE;
  if (p.birthTime) return p;
  const hour = ((p.birthHourIndex ?? 4) * 2) % 24;
  return { ...p, birthTime: String(hour).padStart(2, '0') + ':00' };
}