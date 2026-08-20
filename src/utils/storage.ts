import type { DivinationRecord } from '@/types';

const STORAGE_KEY = 'xuanming_divination_records';

export function saveRecord(record: DivinationRecord): void {
  const records = getRecords();
  records.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 100)));
}

export function getRecords(): DivinationRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteRecord(id: string): void {
  const records = getRecords().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function clearRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
}
