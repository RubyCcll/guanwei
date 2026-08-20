export interface TarotCard {
  id: number;
  name: string;
  nameEn: string;
  arcana: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
  number?: number;
  keywords: string[];
  meanings: {
    upright: string;
    reversed: string;
  };
  deepMeaning: {
    coreTheme: string;
    psychological: string;
    spiritual: string;
    shadow: string;
    lifeAreas: {
      love: string;
      career: string;
      wealth: string;
      health: string;
      growth: string;
    };
    advice: string;
    warning: string;
  };
  imageSymbols: string[];
  story: string;
  astrology: {
    zodiac?: string;
    planet?: string;
    element?: string;
  };
  kabbalah: {
    path?: number;
    sephirah?: string;
  };
  alchemy: {
    stage?: string;
    element?: string;
  };
  numerology: {
    number: number;
    meaning: string;
  };
  image: string;
}

export interface SpreadPosition {
  id: number;
  name: string;
  description: string;
  x: number;
  y: number;
}

export interface Spread {
  id: string;
  name: string;
  description: string;
  positions: SpreadPosition[];
  category: 'basic' | 'advanced' | 'custom';
  scene?: string[];
  isCustom?: boolean;
}

export interface DrawnCard {
  cardId: number;
  isReversed: boolean;
  positionId: number;
}

export interface DivinationRecord {
  id: string;
  type: 'tarot' | 'combo' | 'ziwei' | 'bazi' | 'astrology';
  question: string;
  category: string;
  spreadId?: string;
  cards?: DrawnCard[];
  comboMethod?: string;
  comboResult?: string;
  interpretation: string;
  timestamp: number;
}

export interface ComboResult {
  method: 'xiaoliuren' | 'daliuren' | 'liuyao' | 'meihua' | 'qimen';
  methodName: string;
  result: string;
  detail: string;
  relationToTarot: string;
}

export type QuestionCategory = 'love' | 'career' | 'wealth' | 'health' | 'study' | 'family' | 'friendship' | 'spiritual' | 'travel' | 'general';

export interface TarotReading {
  question: string;
  category: QuestionCategory;
  spreadId: string;
  cards: DrawnCard[];
  interpretation: string;
  comboResult?: ComboResult;
}
