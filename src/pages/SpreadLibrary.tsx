import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Sparkles, Filter, X, Star } from 'lucide-react';
import { defaultSpreads } from '@/data/spreads';
import { getCustomSpreads } from '@/utils/spreadStorage';
import type { Spread } from '@/types';
import { useEffect } from 'react';

const SCENE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'love', label: '爱情' },
  { value: 'career', label: '事业' },
  { value: 'wealth', label: '财运' },
  { value: 'health', label: '健康' },
  { value: 'general', label: '通用' },
];

const COMPLEXITY_FILTERS = [
  { value: 'all', label: '全部复杂度' },
  { value: 'simple', label: '简单 (1-3张)' },
  { value: 'medium', label: '中等 (4-7张)' },
  { value: 'complex', label: '复杂 (8张+)' },
];

interface SpreadLibraryProps {
  onSelect?: (spread: Spread) => void;
  showCustomButton?: boolean;
}

export default function SpreadLibrary({ onSelect, showCustomButton = true }: SpreadLibraryProps) {
  const [search, setSearch] = useState('');
  const [sceneFilter, setSceneFilter] = useState('all');
  const [complexityFilter, setComplexityFilter] = useState('all');
  const [customSpreads, setCustomSpreads] = useState<Spread[]>([]);

  useEffect(() => {
    setCustomSpreads(getCustomSpreads());
  }, []);

  const allSpreads = useMemo(() => [...defaultSpreads, ...customSpreads], [customSpreads]);

  const filtered = useMemo(() => {
    return allSpreads.filter((spread) => {
      if (search && !spread.name.toLowerCase().includes(search.toLowerCase()) && !spread.description.includes(search)) {
        return false;
      }
      if (sceneFilter !== 'all' && spread.scene && !spread.scene.includes(sceneFilter)) {
        return false;
      }
      const cardCount = spread.positions.length;
      if (complexityFilter === 'simple' && cardCount > 3) return false;
      if (complexityFilter === 'medium' && (cardCount < 4 || cardCount > 7)) return false;
      if (complexityFilter === 'complex' && cardCount < 8) return false;
      return true;
    });
  }, [allSpreads, search, sceneFilter, complexityFilter]);

  const presetCount = filtered.filter(s => !s.isCustom).length;
  const customCount = filtered.filter(s => s.isCustom).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-ancient tracking-wider flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            牌阵库
          </h2>
          <p className="text-stardust/50 text-xs mt-1">共 {allSpreads.length} 个牌阵 · {presetCount} 预设 · {customCount} 自定义</p>
        </div>
        {showCustomButton && (
          <Link
            to="/spread-editor"
            className="inline-flex items-center gap-2 px-4 py-2 bg-ancient/20 border border-ancient/50 text-ancient hover:bg-ancient/30 transition-all rounded-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            创建自定义牌阵
          </Link>
        )}
      </div>

      {/* Search & Filter */}
      <div className="glass-panel p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stardust/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索牌阵名称或描述..."
            className="w-full bg-void/50 border border-ancient/20 rounded pl-10 pr-10 py-2 text-sm text-stardust placeholder-stardust/30 focus:border-ancient/60 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stardust/40 hover:text-stardust"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Filter className="w-3 h-3 text-ancient/60" />
            <span className="text-xs text-ancient/60">场景</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SCENE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setSceneFilter(f.value)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  sceneFilter === f.value
                    ? 'bg-ancient/20 border border-ancient/50 text-ancient'
                    : 'border border-stardust/20 text-stardust/60 hover:border-ancient/30'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-ancient/60">复杂度</span>
          <div className="flex flex-wrap gap-2">
            {COMPLEXITY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setComplexityFilter(f.value)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  complexityFilter === f.value
                    ? 'bg-ancient/20 border border-ancient/50 text-ancient'
                    : 'border border-stardust/20 text-stardust/60 hover:border-ancient/30'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spread Grid */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-stardust/50 text-sm">没有匹配的牌阵</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((spread) => (
            <SpreadCard key={spread.id} spread={spread} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function SpreadCard({ spread, onSelect }: { spread: Spread; onSelect?: (s: Spread) => void }) {
  const isCustom = spread.isCustom;
  const cardCount = spread.positions.length;

  return (
    <button
      onClick={() => onSelect?.(spread)}
      className={`glass-panel p-4 text-left hover:border-ancient/40 transition-all ${
        isCustom ? 'border-mystic/30' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-stardust text-sm flex items-center gap-2">
          {spread.name}
          {isCustom && <Star className="w-3 h-3 text-mystic/60" />}
        </h3>
        <span className="text-xs text-stardust/40">{cardCount}张</span>
      </div>
      <p className="text-stardust/50 text-xs leading-relaxed mb-3 line-clamp-3">
        {spread.description}
      </p>
      <div className="flex flex-wrap gap-1">
        {spread.scene?.slice(0, 2).map((s) => (
          <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-ancient/5 border border-ancient/20 text-ancient/60">
            {SCENE_FILTERS.find(f => f.value === s)?.label || s}
          </span>
        ))}
        <span className={`px-2 py-0.5 rounded text-[10px] border ${
          cardCount <= 3 ? 'border-green-500/20 text-green-400/60' :
          cardCount <= 7 ? 'border-yellow-500/20 text-yellow-400/60' :
          'border-red-500/20 text-red-400/60'
        }`}>
          {cardCount <= 3 ? '简单' : cardCount <= 7 ? '中等' : '复杂'}
        </span>
      </div>
    </button>
  );
}
