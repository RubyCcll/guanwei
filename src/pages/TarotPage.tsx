import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shuffle, Edit3, ChevronDown, ChevronUp, RotateCcw, Search, Plus, Library, X, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import type { QuestionCategory, Spread, DrawnCard, TarotCard as TarotCardType } from '@/types';
import { defaultSpreads } from '@/data/spreads';
import { tarotCards } from '@/data/tarotCards';
import { drawCards, generateInterpretation } from '@/utils/tarotEngine';
import { generateComboResult } from '@/utils/comboEngine';
import { saveRecord } from '@/utils/storage';
import { getCustomSpreads } from '@/utils/spreadStorage';
import { api } from '@/services/api';
import { useDivinationStore } from '@/stores/useDivinationStore';
import TarotCard from '@/components/TarotCard';
import SpreadLibrary from './SpreadLibrary';

const categories: { value: QuestionCategory; label: string }[] = [
  { value: 'love', label: '爱情' },
  { value: 'career', label: '事业' },
  { value: 'wealth', label: '财运' },
  { value: 'health', label: '健康' },
  { value: 'study', label: '学业' },
  { value: 'family', label: '家庭' },
  { value: 'spiritual', label: '灵性' },
  { value: 'general', label: '综合' },
];

const comboMethods = [
  { value: 'xiaoliuren', label: '小六壬' },
  { value: 'liuyao', label: '六爻' },
  { value: 'meihua', label: '梅花易数' },
  { value: 'daliuren', label: '大六壬' },
  { value: 'qimen', label: '奇门遁甲' },
];

const SUIT_TABS = [
  { value: 'all', label: '全部' },
  { value: 'major', label: '大阿卡纳' },
  { value: 'wands', label: '权杖' },
  { value: 'cups', label: '圣杯' },
  { value: 'swords', label: '宝剑' },
  { value: 'pentacles', label: '星币' },
];

function TypewriterText({ text, speed = 50, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    indexRef.current = 0;

    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span className={isComplete ? '' : 'border-r border-ancient/50'}>
      {displayText}
    </span>
  );
}

export default function TarotPage() {
  const navigate = useNavigate();
  const { setCurrentReading, setComboResult, isComboEnabled, setIsComboEnabled } = useDivinationStore();

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<QuestionCategory>('general');
  const [allSpreads, setAllSpreads] = useState<Spread[]>(defaultSpreads);
  const [selectedSpread, setSelectedSpread] = useState<Spread>(defaultSpreads[0]);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [interpretation, setInterpretation] = useState<any>(null);
  const [selectedComboMethod, setSelectedComboMethod] = useState('xiaoliuren');
  const [comboResultLocal, setComboResultLocal] = useState<any>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCards, setManualCards] = useState<{ cardId: number; isReversed: boolean }[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [cardSearch, setCardSearch] = useState('');
  const [activeSuit, setActiveSuit] = useState('all');

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displaySpeed, setDisplaySpeed] = useState(50);
  const [completedSections, setCompletedSections] = useState<number[]>([]);

  useEffect(() => {
    setAllSpreads([...defaultSpreads, ...getCustomSpreads()]);
  }, [showLibrary]);

  const filteredCards = useMemo(() => {
    let cards = tarotCards;
    if (activeSuit === 'major') {
      cards = cards.filter(c => c.arcana === 'major');
    } else if (activeSuit !== 'all') {
      cards = cards.filter(c => c.suit === activeSuit);
    }
    if (cardSearch) {
      const q = cardSearch.toLowerCase();
      cards = cards.filter(c => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.keywords.some(k => k.includes(q)));
    }
    return cards;
  }, [activeSuit, cardSearch]);

  useEffect(() => {
    if (isPlaying && interpretation && currentSectionIndex < interpretation.sections.length) {
      const section = interpretation.sections[currentSectionIndex];
      const duration = (section.content.length * displaySpeed) + 2000;
      
      const timer = setTimeout(() => {
        setCompletedSections(prev => [...prev, currentSectionIndex]);
        if (currentSectionIndex < interpretation.sections.length - 1) {
          setTimeout(() => {
            setCurrentSectionIndex(prev => prev + 1);
          }, 1000);
        } else {
          setIsPlaying(false);
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentSectionIndex, interpretation, displaySpeed]);

  const handleInterpret = useCallback(async (drawMode: 'random' | 'manual') => {
    if (!question.trim()) return;
    if (drawMode === 'manual' && manualCards.length !== selectedSpread.positions.length) return;

    setIsDrawing(true);
    setIsInterpreting(false);
    setShowResult(false);
    setComboResultLocal(null);
    setCurrentSectionIndex(0);
    setCompletedSections([]);
    setIsPlaying(false);

    setTimeout(async () => {
      setIsDrawing(false);
      setIsInterpreting(true);

      let cards: DrawnCard[];
      try {
        if (drawMode === 'random') {
          const drawResult = await api.tarot.draw(selectedSpread.id, selectedSpread.isCustom ? selectedSpread : undefined);
          cards = drawResult.cards;
        } else {
          cards = manualCards.map((mc, index) => ({
            cardId: mc.cardId,
            isReversed: mc.isReversed,
            positionId: selectedSpread.positions[index].id,
          }));
        }
        setDrawnCards(cards);

        const result = await api.tarot.interpret(cards, selectedSpread, question, category);
        setInterpretation(result);
        setShowResult(true);
        setIsInterpreting(false);

        const reading = {
          question,
          category,
          spreadId: selectedSpread.id,
          cards,
          interpretation: result.fullText,
        };
        setCurrentReading(reading);

        saveRecord({
          id: Date.now().toString(),
          type: 'tarot',
          question,
          category,
          spreadId: selectedSpread.id,
          cards,
          interpretation: result.fullText,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('API 调用失败:', error);
        setIsInterpreting(false);
      }
    }, 1500);
  }, [question, manualCards, selectedSpread, category, setCurrentReading]);

  const handleCombo = useCallback(() => {
    const result = generateComboResult(selectedComboMethod);
    setComboResultLocal(result);
    setComboResult(result);
  }, [selectedComboMethod, setComboResult]);

  const reset = () => {
    setQuestion('');
    setDrawnCards([]);
    setShowResult(false);
    setInterpretation(null);
    setComboResultLocal(null);
    setIsComboEnabled(false);
    setManualMode(false);
    setManualCards([]);
    setExpandedSection(null);
    setCurrentSectionIndex(0);
    setCompletedSections([]);
    setIsPlaying(false);
  };

  const toggleManualCard = (cardId: number) => {
    if (manualCards.length >= selectedSpread.positions.length) {
      setManualCards([...manualCards.slice(0, -1), { cardId, isReversed: false }]);
    } else {
      setManualCards([...manualCards, { cardId, isReversed: false }]);
    }
  };

  const toggleManualReversed = (idx: number) => {
    setManualCards(manualCards.map((c, i) => i === idx ? { ...c, isReversed: !c.isReversed } : c));
  };

  const removeManualCard = (idx: number) => {
    setManualCards(manualCards.filter((_, i) => i !== idx));
  };

  const handleSelectSpread = (spread: Spread) => {
    setSelectedSpread(spread);
    setShowLibrary(false);
    setManualCards([]);
  };

  const goToSection = (index: number) => {
    setCurrentSectionIndex(index);
    setIsPlaying(false);
  };

  const renderInterpretationSection = (section: any, index: number) => {
    const isCurrent = index === currentSectionIndex;
    const isCompleted = completedSections.includes(index);
    const isActive = isCurrent || isCompleted;

    return (
      <div 
        key={section.title} 
        className={`mb-4 transition-all duration-500 ${
          isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            isCurrent ? 'bg-ancient text-void animate-pulse' : 
            isCompleted ? 'bg-ancient/20 text-ancient' : 'bg-abyss text-stardust/30'
          }`}>
            {index + 1}
          </div>
          <h3 className={`font-display text-sm tracking-wider ${
            isCurrent ? 'text-ancient' : 'text-ancient/60'
          }`}>{section.title}</h3>
          {isCurrent && !isPlaying && (
            <button 
              onClick={() => setIsPlaying(true)}
              className="ml-auto flex items-center gap-1 text-xs text-ancient/60 hover:text-ancient transition-colors"
            >
              <Play className="w-3 h-3" />
              继续
            </button>
          )}
        </div>
        <div className="ml-11 text-stardust/70 text-sm leading-relaxed space-y-3 bg-abyss/20 rounded-lg p-4">
          {section.content.split('\n\n').map((block: string, i: number) => (
            <div key={i} className="animate-fade-in">
              {isCurrent && !isCompleted ? (
                <TypewriterText 
                  text={block.replace(/\*\*/g, '')} 
                  speed={displaySpeed}
                />
              ) : (
                <p className={block.startsWith('**') ? 'text-ancient/80 font-medium' : ''}>
                  {block.replace(/\*\*/g, '')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (showLibrary) {
    return (
      <div className="relative min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setShowLibrary(false)}
            className="inline-flex items-center gap-2 text-stardust/60 hover:text-ancient text-sm mb-6"
          >
            <X className="w-4 h-4" />
            关闭牌阵库
          </button>
          <SpreadLibrary onSelect={handleSelectSpread} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl md:text-4xl text-ancient tracking-wider mb-3">
            塔罗占卜
          </h1>
          <p className="text-stardust/50 text-sm">向宇宙提出你的问题，让牌面揭示答案</p>
        </div>

        <div className="glass-panel p-6 md:p-8 mb-8">
          <div className="mb-4">
            <label className="block text-ancient/80 text-sm mb-2 tracking-wider">你的问题</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="在心中默念你的问题，然后输入..."
              className="w-full bg-void/50 border border-ancient/20 rounded-lg p-4 text-stardust placeholder-stardust/30 focus:border-ancient/60 focus:outline-none transition-colors resize-none h-24"
            />
          </div>

          <div className="mb-4">
            <label className="block text-ancient/80 text-sm mb-2 tracking-wider">问题分类</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all duration-300 ${
                    category === cat.value
                      ? 'bg-ancient/20 border border-ancient/50 text-ancient'
                      : 'border border-stardust/20 text-stardust/60 hover:border-ancient/30 hover:text-ancient/80'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setManualMode(!manualMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm transition-all ${
                manualMode
                  ? 'bg-mystic/20 border border-mystic/50 text-mystic'
                  : 'border border-stardust/20 text-stardust/60 hover:border-ancient/30'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              {manualMode ? '关闭手动选牌' : '手动选牌'}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 rounded-sm border border-stardust/20 text-stardust/60 hover:border-ancient/30 hover:text-ancient/80 transition-all text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          </div>
        </div>

        {!showResult && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-ancient tracking-wider">选择牌阵</h2>
              <button
                onClick={() => setShowLibrary(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-ancient/30 text-ancient/80 hover:border-ancient/60 hover:text-ancient text-xs rounded-sm transition-all"
              >
                <Library className="w-3 h-3" />
                浏览牌阵库
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {allSpreads.map((spread) => {
                const isSelected = selectedSpread.id === spread.id;
                return (
                  <button
                    key={spread.id}
                    onClick={() => {
                      setSelectedSpread(spread);
                      setManualCards([]);
                    }}
                    className={`relative p-2.5 pt-2 text-left rounded-md border h-24 flex flex-col transition-all duration-200 overflow-hidden ${
                      isSelected
                        ? 'border-ancient bg-ancient/10 shadow-[0_0_12px_rgba(201,162,39,0.25)]'
                        : spread.isCustom
                          ? 'border-mystic/30 hover:border-mystic/60 hover:bg-mystic/5'
                          : 'border-stardust/15 hover:border-ancient/40 hover:bg-ancient/5'
                    }`}
                  >
                    <span className={`absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded border ${
                      isSelected
                        ? 'bg-ancient/20 border-ancient/40 text-ancient'
                        : 'bg-abyss/60 border-stardust/10 text-stardust/60'
                    }`}>
                      {spread.positions.length}张
                    </span>
                    {spread.isCustom && (
                      <span className="absolute top-1.5 left-1.5 text-[10px] text-mystic/80 leading-none">自定义</span>
                    )}
                    <h3 className={`font-display text-xs tracking-wide truncate pr-10 ${spread.isCustom ? 'mt-3.5' : 'mt-0'} ${
                      isSelected ? 'text-ancient' : 'text-stardust'
                    }`}>
                      {spread.name}
                    </h3>
                    <p className={`mt-auto text-[11px] leading-tight line-clamp-1 ${
                      isSelected ? 'text-ancient/60' : 'text-stardust/40'
                    }`}>
                      {spread.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {manualMode && !showResult && (
          <div className="glass-panel p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="font-display text-ancient text-sm tracking-wider">
                手动选牌 ({manualCards.length}/{selectedSpread.positions.length})
              </h3>
              <button
                onClick={() => {
                  if (manualCards.length === selectedSpread.positions.length) {
                    handleInterpret('manual');
                  }
                }}
                disabled={manualCards.length !== selectedSpread.positions.length}
                className="px-4 py-1.5 bg-ancient/20 border border-ancient/50 text-ancient hover:bg-ancient/30 transition-all rounded-sm text-sm disabled:opacity-30"
              >
                {manualCards.length === selectedSpread.positions.length ? '确认并解读' : `选满${selectedSpread.positions.length}张`}
              </button>
            </div>

            {manualCards.length > 0 && (
              <div className="mb-4 p-3 bg-abyss/30 rounded border border-ancient/20">
                <div className="text-xs text-ancient/60 mb-2">已选牌位（点击切换正逆位，点击×删除）</div>
                <div className="flex flex-wrap gap-2">
                  {manualCards.map((mc, idx) => {
                    const card = tarotCards.find(c => c.id === mc.cardId);
                    const pos = selectedSpread.positions[idx];
                    return (
                      <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-abyss border border-ancient/30 rounded">
                        <span className="text-xs text-ancient/60">{pos?.name || `#${idx+1}`}:</span>
                        <button
                          onClick={() => toggleManualReversed(idx)}
                          className={`text-xs ${mc.isReversed ? 'text-crimson' : 'text-stardust'}`}
                        >
                          {card?.name}{mc.isReversed ? '(逆)' : ''}
                        </button>
                        <button onClick={() => removeManualCard(idx)} className="text-stardust/40 hover:text-crimson">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stardust/40" />
                <input
                  type="text"
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  placeholder="搜索牌名..."
                  className="w-full bg-void/50 border border-ancient/20 rounded pl-10 pr-3 py-2 text-sm text-stardust focus:border-ancient/60 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {SUIT_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveSuit(tab.value)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    activeSuit === tab.value
                      ? 'bg-ancient/20 border border-ancient/50 text-ancient'
                      : 'border border-stardust/20 text-stardust/60 hover:border-ancient/30'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-96 overflow-y-auto">
              {filteredCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => toggleManualCard(card.id)}
                  className={`p-2 rounded border text-xs transition-all hover:border-ancient/50 ${
                    manualCards.some(mc => mc.cardId === card.id)
                      ? 'border-ancient bg-ancient/20 text-ancient'
                      : 'border-stardust/10 text-stardust/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg mb-1">
                      {card.arcana === 'major' ? '☽' : card.suit === 'wands' ? '⚡' : card.suit === 'cups' ? '🏆' : card.suit === 'swords' ? '⚔️' : '💰'}
                    </div>
                    <div className="text-[10px] truncate">{card.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!manualMode && !showResult && (
          <div className="text-center mb-12">
            <button
              onClick={() => handleInterpret('random')}
              disabled={!question.trim() || isDrawing}
              className="inline-flex items-center gap-3 px-10 py-4 bg-ancient/20 border border-ancient/60 text-ancient hover:bg-ancient/30 hover:border-ancient transition-all duration-500 rounded-sm disabled:opacity-30 disabled:cursor-not-allowed tracking-wider"
            >
              {isDrawing ? (
                <>
                  <Shuffle className="w-5 h-5 animate-spin" />
                  抽牌中...
                </>
              ) : isInterpreting ? (
                <>
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  解读中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  抽牌并解读
                </>
              )}
            </button>
          </div>
        )}

        {drawnCards.length > 0 && (
          <div className="mb-12">
            <h2 className="font-display text-lg text-ancient tracking-wider mb-6 text-center">
              {selectedSpread.name}
            </h2>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {drawnCards.map((drawn, index) => {
                const card = tarotCards.find((c) => c.id === drawn.cardId);
                if (!card) return null;
                return (
                  <div key={index} className="flex flex-col items-center">
                    <TarotCard
                      card={card}
                      isReversed={drawn.isReversed}
                      isFlipped={showResult}
                      size="md"
                    />
                    <span className="mt-3 text-xs text-stardust/50 text-center max-w-24">
                      {selectedSpread.positions.find((p) => p.id === drawn.positionId)?.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isInterpreting && !showResult && (
          <div className="glass-panel p-12 mb-8 text-center">
            <div className="inline-block animate-pulse">
              <Sparkles className="w-12 h-12 text-ancient/60 mx-auto mb-4" />
            </div>
            <p className="text-ancient/70 text-sm">正在解析问题能量...</p>
            <p className="text-stardust/40 text-xs mt-2">基于语义分析与牌面信息的整合解读</p>
          </div>
        )}

        {showResult && interpretation && (
          <div className="glass-panel p-6 md:p-8 mb-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <h2 className="font-display text-xl text-ancient tracking-wider">解读结果</h2>
              <label className="flex items-center gap-2 text-sm text-stardust/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isComboEnabled}
                  onChange={(e) => setIsComboEnabled(e.target.checked)}
                  className="rounded border-ancient/30 bg-void text-ancient focus:ring-ancient"
                />
                开启组合占卜
              </label>
            </div>

            {interpretation.semantic && (
              <div className="mb-6 p-4 bg-ancient/5 border border-ancient/20 rounded-lg">
                <div className="text-xs text-ancient/60 mb-3">本次解读识别到：</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-ancient/10 border border-ancient/20 text-ancient text-xs">
                    场景：{interpretation.semantic.sceneLabel}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-mystic/10 border border-mystic/20 text-mystic text-xs">
                    情绪：{interpretation.semantic.emotionLabel}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-abyss border border-stardust/20 text-stardust/60 text-xs">
                    时态：{interpretation.semantic.tenseLabel}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-abyss border border-stardust/20 text-stardust/60 text-xs">
                    对象：{interpretation.semantic.subjectLabel}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-abyss/30 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 rounded-full bg-ancient/20 text-ancient hover:bg-ancient/30 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setCurrentSectionIndex(prev => Math.max(0, prev - 1))}
                    className="p-2 rounded-full bg-abyss border border-stardust/20 text-stardust/60 hover:border-ancient/30 hover:text-ancient transition-colors"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentSectionIndex(prev => Math.min(interpretation.sections.length - 1, prev + 1))}
                    className="p-2 rounded-full bg-abyss border border-stardust/20 text-stardust/60 hover:border-ancient/30 hover:text-ancient transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stardust/40">显示速度</span>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={displaySpeed}
                    onChange={(e) => setDisplaySpeed(Number(e.target.value))}
                    className="w-24 accent-ancient"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {interpretation.sections.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToSection(idx)}
                    className={`flex-1 h-1.5 rounded-full transition-all ${
                      idx === currentSectionIndex ? 'bg-ancient' :
                      idx < currentSectionIndex ? 'bg-ancient/40' : 'bg-abyss'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              {interpretation.sections.map((s: any, idx: number) => renderInterpretationSection(s, idx))}
            </div>

            {isComboEnabled && (
              <div className="mt-8 pt-6 border-t border-ancient/20">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <h3 className="font-display text-ancient text-sm tracking-wider">东方术数</h3>
                  <select
                    value={selectedComboMethod}
                    onChange={(e) => setSelectedComboMethod(e.target.value)}
                    className="bg-void/50 border border-ancient/20 rounded px-3 py-1 text-sm text-stardust focus:border-ancient/60 focus:outline-none"
                  >
                    {comboMethods.map((method) => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCombo}
                    className="px-4 py-1 bg-mystic/20 border border-mystic/50 text-mystic hover:bg-mystic/30 transition-all rounded-sm text-sm"
                  >
                    起卦
                  </button>
                </div>

                {comboResultLocal && (
                  <div className="bg-abyss/40 rounded-lg p-4 border border-mystic/20">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-mystic font-display text-sm">{comboResultLocal.methodName}</span>
                      <span className="text-ancient text-sm">{comboResultLocal.result}</span>
                    </div>
                    <p className="text-stardust/60 text-sm mb-2">{comboResultLocal.detail}</p>
                    <p className="text-mystic/70 text-sm">{comboResultLocal.relationToTarot}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-ancient/10">
              <button
                onClick={reset}
                className="flex items-center gap-2 px-6 py-2 border border-ancient/40 text-ancient hover:bg-ancient/10 transition-all rounded-sm text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                再次占卜
              </button>
              <button
                onClick={() => navigate('/history')}
                className="flex items-center gap-2 px-6 py-2 border border-stardust/20 text-stardust/60 hover:border-stardust/40 hover:text-stardust transition-all rounded-sm text-sm"
              >
                查看历史
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}