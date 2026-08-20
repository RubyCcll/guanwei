// 塔罗：问镜面板（牌阵选择）+ 扇形翻牌（未翻开不示牌名）+ 牌阵之示
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tarotDraw, SUIT } from '@core/engine/tarot';
import { allTarotSpreads, type TarotSpread } from '@core/data/tarotSpreads';
import type { TarotCardData } from '@core/types';
import { ResultCard } from '@/components/ResultCard';
import SongSelect from '@/components/SongSelect';

interface PanelProps { onDivine: (inputs: unknown, profile?: unknown, question?: string) => void; }

export function TarotPanel({ onDivine }: PanelProps) {
  const [q, setQ] = useState('');
  const [qType, setQType] = useState('other');
  const spreads = allTarotSpreads();
  const [spreadId, setSpreadId] = useState('three');
  const spread = spreads.find(s => s.id === spreadId) || spreads[0];
  const go = () => onDivine({ spread: spread.id, n: spread.positions.length }, undefined, q.trim());
  return (
    <>
      <p className="small muted" style={{ marginTop: '.6rem', lineHeight: 2 }}>静思所问，心中默念。洗牌之后，凭直觉取牌。</p>
      <div className="field"><label htmlFor="tarot-qtype">所问之属</label>
        <SongSelect id="tarot-qtype" value={qType} options={[{ value: 'love', label: '情感姻缘' }, { value: 'career', label: '事业学业' }, { value: 'wealth', label: '财运投资' }, { value: 'health', label: '健康' }, { value: 'travel', label: '出行方位' }, { value: 'lost', label: '寻物' }, { value: 'decision', label: '抉择决策' }, { value: 'other', label: '其他' }]} onChange={setQType} />
      </div>
      <div className="field"><label htmlFor="q-input">所问之事</label>
        <input className="input-line" id="q-input" placeholder="默念所问，书之于此…" maxLength={60} value={q} onChange={e => setQ(e.target.value)} /></div>
      <div className="field"><label htmlFor="tarot-spread">牌阵</label>
        <SongSelect id="tarot-spread" value={spreadId} options={spreads.map(s => ({ value: s.id, label: s.name + ' · ' + s.positions.length + '张' }))} onChange={setSpreadId} />
        <span className="hint">{spread.description}</span>
      </div>
      <button className="btn-divine" onClick={go}>洗 牌 抽 牌<span className="small">静心默问 · 凭心取牌</span></button>
      <div className="mt-2" style={{ textAlign: 'center' }}>
        <Link className="tiny muted" to="/spread-editor" style={{ letterSpacing: '.15em' }}>自 创 牌 阵 ›</Link>
      </div>
    </>
  );
}

interface DrawResult {
  spread: TarotSpread;
  cards: TarotCardData[];
}

export function TarotResult({ data }: { data: DrawResult }) {
  const { spread, cards } = data;
  const [revealed, setRevealed] = useState<boolean[]>(cards.map(() => false));
  const flip = (i: number) => setRevealed(prev => prev.map((v, j) => j === i ? true : v));
  const allUp = revealed.every(Boolean);
  return (
    <>
      <ResultCard title={`洗牌 · 抽牌 · 翻牌 · ${spread.name}`}>
        <p>{spread.description} —— 凭心取 {cards.length} 张，点击牌面翻启。</p>
      </ResultCard>
      <div className="tarot-stage">
        <div className="tarot-fan" style={{ flexWrap: cards.length > 5 ? 'wrap' : 'nowrap', maxWidth: cards.length > 5 ? 520 : undefined, gap: cards.length > 5 ? '1.2rem' : '2px' }}>
          {cards.map((c, i) => (
            <div className="tarot-slot" key={i}>
              <button
                className={"tarot-card " + (revealed[i] ? 'revealed picked' : 'face-down')}
                onClick={() => flip(i)}
                aria-label={"翻牌 " + c.name}
              >
                <div className="card-inner">
                  <span className="en">{c.en}</span>
                  <span className="sigil">{c.major ? (c.num ?? '') : (c.suit ? c.suit[0] : '')}</span>
                  <span className="cn">{c.name}</span>
                  <span className="en">{c.reversed ? '逆位' : '正位'}</span>
                </div>
              </button>
              <span className="slot-label">{spread.positions[i]?.name || ('位' + (i + 1))}</span>
            </div>
          ))}
        </div>
      </div>
      <ResultCard title="牌阵之示">
        {cards.map((c, i) => {
          const pos = spread.positions[i];
          // 未翻开：只示位置，不示牌名
          if (!revealed[i]) {
            return <p key={i} className="muted"><strong>{pos?.name || ('位' + (i + 1))}</strong> —— <span className="tiny">牌未翻启，静候君手</span></p>;
          }
          return (
            <p key={i}>
              <strong>{pos?.name || ('位' + (i + 1))}</strong> · {c.name}（{c.reversed ? '逆位' : '正位'}）：{c.reversed ? c.rev : c.up}{c.suit ? ` · ${SUIT[c.suit].e} · ${SUIT[c.suit].mean}` : ''}
            </p>
          );
        })}
        {allUp && (
          <>
            <p className="mt-2"><strong>全阵参详：</strong>{tarotSummary(cards, spread)}</p>
            <p>塔罗非断命之器，乃照心之镜。观照自身，反求诸己。</p>
          </>
        )}
      </ResultCard>
    </>
  );
}
// 塔罗全阵参详（正逆位比例 + 元素侧重，现代语言）
function tarotSummary(cards: any[], spread: any): string {
  const rev = cards.filter(c => c.reversed).length;
  const majors = cards.filter(c => c.major).length;
  const parts: string[] = [];
  if (majors === cards.length) parts.push('全为大阿卡纳，此事于你人生分量颇重，非寻常小事。');
  else if (majors > 0) parts.push('大阿卡纳' + majors + '张，此事有' + (majors > cards.length / 2 ? '较深' : '一定') + '的命途意味，宜郑重观之。');
  else parts.push('皆小阿卡纳，此事多系日常实务，脚踏实地即可。');
  if (rev === 0) parts.push('诸牌皆正，能量顺畅外放，时机可进。');
  else if (rev <= cards.length / 2) parts.push('逆位' + rev + '张，有' + (rev === 1 ? '一处' : '几处') + '内耗或阻滞，宜先理顺再行。');
  else parts.push('逆位居多，此事内在功课为重，先安己心，外境自转。');
  return parts.join('');
}