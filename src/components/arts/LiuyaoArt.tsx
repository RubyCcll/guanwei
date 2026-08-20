// 六爻：铜钱摇卦面板 + 六爻/卦象渲染
import { useState } from 'react';
import { liuyaoCalc } from '@core/engine/liuyao';
import type { LiuyaoResult } from '@core/types';
import { ResultCard } from '@/components/ResultCard';
import SongSelect from '@/components/SongSelect';

interface PanelProps { onDivine: (inputs: unknown, profile?: unknown, question?: string) => void; }

export function LiuyaoPanel({ onDivine }: PanelProps) {
  const [q, setQ] = useState('');
  const [qType, setQType] = useState('other');
  const go = () => onDivine({}, undefined, q.trim());
  return (
    <>
      <p className="small muted" style={{ marginTop: '.6rem', lineHeight: 2 }}>默念所问之事，静心片刻。以三枚铜钱掷之，共六次，自下而上成卦。</p>
      <div className="coins" aria-hidden="true" style={{ padding: 'var(--sp-3) 0' }}>
        <div className="coin"><span className="face">宋<br />通宝</span></div>
        <div className="coin"><span className="face">宋<br />通宝</span></div>
        <div className="coin"><span className="face">宋<br />通宝</span></div>
      </div>
      <div className="field"><label htmlFor="ly-qtype">所问之属</label>
        <SongSelect id="ly-qtype" value={qType} options={[{ value: 'love', label: '情感姻缘' }, { value: 'career', label: '事业学业' }, { value: 'wealth', label: '财运投资' }, { value: 'health', label: '健康' }, { value: 'travel', label: '出行方位' }, { value: 'lost', label: '寻物' }, { value: 'decision', label: '抉择决策' }, { value: 'other', label: '其他' }]} onChange={setQType} />
      </div>
      <div className="field"><label htmlFor="q-input">所问之事</label>
        <input className="input-line" id="q-input" placeholder="默念所问，书之于此…" maxLength={60} value={q} onChange={e => setQ(e.target.value)} /></div>
      <button className="btn-divine" onClick={go}>掷 钱 成 卦<span className="small">六掷成卦 · 观变断象</span></button>
    </>
  );
}

const YAO_LABELS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

export function LiuyaoResult({ data }: { data: LiuyaoResult }) {
  const r = data;
  return (
    <>
      <ResultCard title={r.dongYao.length ? `${r.dongYao.length} 爻发动` : '六爻安静'}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          {r.yao.map((v, i) => {
            const nm = r.names[i].nm;
            const moving = nm === '老阴' || nm === '老阳';
            return (
              <div className="yao-row" key={i}>
                <span className="yao-label">{YAO_LABELS[i]}</span>
                <span className="yao-glyph">
                  {v ? <span className="yang" style={{ display: 'block', width: '2.6rem', height: '.55rem', background: 'var(--ink)', borderRadius: '1px' }} />
                    : <span className="yin" style={{ display: 'block', width: '2.6rem', height: '.55rem', borderTop: '1.5px solid var(--ink)', borderBottom: '1.5px solid var(--ink)' }} />}
                </span>
                <span className="yao-move">{moving ? `${nm}${nm === '老阳' ? '○' : '×'} 变` : nm}{moving ? <span className="dot" /> : null}</span>
              </div>
            );
          })}
        </div>
      </ResultCard>
      <div className="result-grid">
        <div className="result-cell">
          <div className="k">本卦</div>
          <div className="v big">{r.benGua.name}</div>
          <div className="tiny muted mt-1">{r.benGua.xiang}</div>
        </div>
        <div className="result-cell">
          <div className="k">变卦</div>
          <div className={"v big " + (r.dongYao.length ? 'hot' : '')}>{r.bianGua.name}</div>
          <div className="tiny muted mt-1">{r.dongYao.length ? '动爻之变，事之趋向' : '无事不变'}</div>
        </div>
      </div>
      <ResultCard title={`卦辞 · ${r.benGua.name}`} className="mt-3">
        <p>「{r.benGua.ci}」</p>
        <p>{r.benGua.xiang}。{r.dongYao.length ? `今有 ${r.dongYao.map(i => '第' + i + '爻').join('、')} 发动，${r.bianGua.name}为事之归趋；动而变者，其势在「${r.bianGua.xiang}」。` : '六爻安静，事依现局而行，宜守其常。'}</p>
        <p className="mt-2"><strong>爻位参详：</strong>{yaoDetail(r.dongYao)}</p>
      </ResultCard>
    </>
  );
}
// 爻位参详（初爻至上爻的分位语义，现代语言）
function yaoDetail(dongYao: number[]): string {
  if (dongYao.length === 0) return '六爻皆静，事在当下，宜守成观察，不轻动。';
  const map: Record<number, string> = {
    1: '初爻发动——事发于微，根基初动，宜察其始。',
    2: '二爻发动——事涉自身与内宅，宜安内而后攘外。',
    3: '三爻发动——事逢转折关口，多劳多思，宜慎择。',
    4: '四爻发动——事近上层或外局，进退之间，宜度势。',
    5: '五爻发动——事居中枢，主事者之决断，宜当机立断。',
    6: '上爻发动——事已至末，宜知止知足，防盛极而衰。',
  };
  return dongYao.map(i => map[i] || '').join('');
}