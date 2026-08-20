// 九术组件注册表：面板与结果渲染（ModulePage 与 HistoryPage 共用）
import type { ComponentType } from 'react';
import { BaziPanel, BaziResult } from '@/components/arts/BaziArt';
import { ZiweiPanel, ZiweiResult } from '@/components/arts/ZiweiArt';
import { QimenPanel, QimenResultView } from '@/components/arts/QimenArt';
import { MeihuaPanel, MeihuaResult } from '@/components/arts/MeihuaArt';
import { LiuyaoPanel, LiuyaoResult } from '@/components/arts/LiuyaoArt';
import { LiurenPanel, LiurenResult } from '@/components/arts/LiurenArt';
import { XiaoliurenPanel, XiaoliurenResult } from '@/components/arts/XiaoliurenArt';
import { AstrologyPanel, AstrologyResult } from '@/components/arts/AstrologyArt';
import { TarotPanel, TarotResult } from '@/components/arts/TarotArt';

export interface ArtPair {
  Panel: ComponentType<{ onDivine: (fn: () => unknown) => void }>;
  Result: ComponentType<{ data: any }>;
  placeholder: string;
}

export const ART_PAIRS: Record<string, ArtPair> = {
  bazi:       { Panel: BaziPanel, Result: BaziResult, placeholder: '静候四柱 · 观五行流转' },
  ziwei:      { Panel: ZiweiPanel, Result: ZiweiResult, placeholder: '静候星布 · 观十四主星' },
  qimen:      { Panel: QimenPanel, Result: QimenResultView, placeholder: '静候局成 · 观九宫遁甲' },
  meihua:     { Panel: MeihuaPanel, Result: MeihuaResult, placeholder: '静候心动 · 观梅花开落' },
  liuyao:     { Panel: LiuyaoPanel, Result: LiuyaoResult, placeholder: '静候钱落 · 观六爻成象' },
  liuren:     { Panel: LiurenPanel, Result: LiurenResult, placeholder: '静候课起 · 观天地人盘' },
  xiaoliuren: { Panel: XiaoliurenPanel, Result: XiaoliurenResult, placeholder: '静候指落 · 观掌诀玄机' },
  astrology:  { Panel: AstrologyPanel, Result: AstrologyResult, placeholder: '静候星布 · 观天穹为书' },
  tarot:      { Panel: TarotPanel, Result: TarotResult, placeholder: '静候牌启 · 观镜照本心' },
};

export const artPairOf = (artId: string): ArtPair | undefined => ART_PAIRS[artId];