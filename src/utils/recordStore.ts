// 占问记录存储（localStorage，上限 200 条 LRU 淘汰，按用户隔离）
import { recordsKey, currentUser, pushRecordsToServer } from './userStore';

export interface DivinationRecord {
  id: string;
  artId: string;
  createdAt: number;
  result: unknown;
  location?: { lng: number; lat: number; province?: string; city?: string; district?: string };
}

const MAX = 200;

export function getRecords(): DivinationRecord[] {
  try {
    const data = localStorage.getItem(recordsKey());
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRecord(rec: Omit<DivinationRecord, 'id'>): DivinationRecord {
  const records = getRecords();
  const full: DivinationRecord = { ...rec, id: rec.artId + '-' + rec.createdAt };
  records.unshift(full);
  localStorage.setItem(recordsKey(), JSON.stringify(records.slice(0, MAX)));
  // 云同步（登录用户）
  const u = currentUser();
  if (u) { pushRecordsToServer(u.username, records.slice(0, MAX)).catch(() => {}); }
  return full;
}

export function deleteRecord(id: string): void {
  localStorage.setItem(recordsKey(), JSON.stringify(getRecords().filter(r => r.id !== id)));
}

export function clearRecords(): void {
  localStorage.removeItem(recordsKey());
}

export function getRecord(id: string): DivinationRecord | undefined {
  return getRecords().find(r => r.id === id);
}

export async function syncRecordsFromServer(): Promise<void> {
  const u = currentUser();
  if (!u) return;
  try {
    const { pullRecordsFromServer } = await import('./userStore');
    const remote = await pullRecordsFromServer(u.username);
    if (remote && Array.isArray(remote) && remote.length > 0) {
      localStorage.setItem(recordsKey(), JSON.stringify(remote.slice(0, MAX)));
    }
  } catch { /* ignore */ }
}