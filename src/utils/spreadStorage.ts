import type { Spread } from '@/types';

const STORAGE_KEY = 'xuanming_custom_spreads';

export function saveCustomSpread(spread: Spread): void {
  const spreads = getCustomSpreads();
  const existingIndex = spreads.findIndex(s => s.id === spread.id);
  if (existingIndex >= 0) {
    spreads[existingIndex] = spread;
  } else {
    spreads.push(spread);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spreads));
}

export function getCustomSpreads(): Spread[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteCustomSpread(id: string): void {
  const spreads = getCustomSpreads().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spreads));
}

export function getAllSpreads(): Spread[] {
  return [...getCustomSpreads()];
}
