import { create } from 'zustand';
import type { TarotReading, ComboResult } from '@/types';

interface DivinationState {
  currentReading: TarotReading | null;
  comboResult: ComboResult | null;
  isComboEnabled: boolean;
  setCurrentReading: (reading: TarotReading | null) => void;
  setComboResult: (result: ComboResult | null) => void;
  setIsComboEnabled: (enabled: boolean) => void;
  clearReading: () => void;
}

export const useDivinationStore = create<DivinationState>((set) => ({
  currentReading: null,
  comboResult: null,
  isComboEnabled: false,
  setCurrentReading: (reading) => set({ currentReading: reading }),
  setComboResult: (result) => set({ comboResult: result }),
  setIsComboEnabled: (enabled) => set({ isComboEnabled: enabled }),
  clearReading: () => set({ currentReading: null, comboResult: null, isComboEnabled: false }),
}));
