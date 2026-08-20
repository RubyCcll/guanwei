// 梅花易数：起卦面板（时间/报数）+ 卦象渲染（本卦/互卦/变卦 + 体用）
import { useState } from 'react';
import { meihuaCalc } from '@core/engine/meihua';
import { BAGUA } from '@core/data/gua64';
import type { MeihuaResult } from '@core/types';
import { ResultCard } from '@/components/ResultCard';
import SongSelect from '@/components/SongSelect';

interface PanelProps { onDivine: (inputs: unknown, profile?: unknown, question?: string) => void; }

export function MeihuaPanel({ onDivine }: PanelProps) {
  const [mode, setMode] = useState<'time' | 'num'>('time');
  const [n1, setN1] = useState(3);
  const [n2, setN2] = useState(7);
  const [n3, setN3] = useState(5);
  const [q, setQ] = useState('');
  const [qType, setQType] = useState('other');
  const go = () => onDivine({ mode, n1, n2, n3, now: new Date().toISOString() }, undefined, q.trim());
  return (
    <>
      <div className="field"><label htmlFor="mh-mode">起卦之法</label>
        <SongSelect id="mh-mode" value={mode} options={[{ value: 'time', label: '时间起卦（以当下年月日时）' }, { value: 'num', label: '报数起卦（默念所问，取三数）' }]} onChange={v => setMode(v as 'time' | 'num')} />
      </div>
      {mode === 'num' ? (
        <div className="field-row">
          <div className="field"><label htmlFor="mh-n1">一数</label><input className="input-line" type="number" id="mh-n1" min={1} max={999} value={n1} onChange={e => setN1(Number(e.target.value))} /></div>
          <div className="field"><label htmlFor="mh-n2">二数</label><input className="input-line" type="number" id="mh-n2" min={1} max={999} value={n2} onChange={e => setN2(Number(e.target.value))} /></div>
        </div>
      ) : null}
      <div className="field"><label htmlFor="mh-n3">三数（动爻）</label>
        <input className="input-line" type="number" id="mh-n3" min={1} max={999} value={n3} onChange={e => setN3(Number(e.target.value))} /></div>
      <div className="field"><label htmlFor="mh-qtype">所问之属</label>
        <SongSelect id="mh-qtype" value={qType} options={[{ value: 'love', label: '情感姻缘' }, { value: 'career', label: '事业学业' }, { value: 'wealth', label: '财运投资' }, { value: 'health', label: '健康' }, { value: 'travel', label: '出行方位' }, { value: 'lost', label: '寻物' }, { value: 'decision', label: '抉择决策' }, { value: 'other', label: '其他' }]} onChange={setQType} />
      </div>
      <div className="field"><label htmlFor="q-input">所问之事</label>
        <input className="input-line" id="q-input" placeholder="默念所问，书之于此…" maxLength={60} value={q} onChange={e => setQ(e.target.value)} /></div>
      <button className="btn-divine" onClick={go}>起 卦<span className="small">定本卦 · 推互变 · 辨体用</span></button>
    </>
  );
}

function YaoGlyph({ yaos }: { yaos: number[] }) {
  return (
    <div className="yao-glyph" style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
      {yaos.map((v, i) => v ? <span key={i} className="yang" style={{ display: 'block', width: '2.6rem', height: '.55rem', background: 'var(--ink)', borderRadius: '1px' }} />
        : <span key={i} className="yin" style={{ display: 'block', width: '2.6rem', height: '.55rem', borderTop: '1.5px solid var(--ink)', borderBottom: '1.5px solid var(--ink)' }} />)}
    </div>
  );
}

export function MeihuaResult({ data }: { data: MeihuaResult }) {
  const r = data;
  const guaName = (g: number | undefined) => (g !== undefined && BAGUA[g] ? BAGUA[g].name : '—');
  return (
    <>
      <ResultCard title={`起卦 · ${r.benGua.name}`}
        cells={[
          { k: '上卦 · ' + guaName(r.upper), v: BAGUA[r.upper].symbol, big: true },
          { k: '下卦 · ' + guaName(r.lower), v: BAGUA[r.lower].symbol, big: true },
          { k: '动爻', v: '第 ' + r.move + ' 爻', big: true, hot: true },
        ]}>
        <p>本卦 <strong>{r.benGua.name}</strong>：{r.benGua.xiang}。动而观变，{r.bianGua.name}为演进之端。</p>
      </ResultCard>
      <div className="result-card">
        <h3>本卦 · 互卦 · 变卦</h3>
        <div className="result-grid" style={{ marginTop: '1rem' }}>
          <div className="result-cell">
            <div className="k">本卦 · {r.benGua.name}</div>
            <YaoGlyph yaos={r.benYao} />
            <div className="tiny muted mt-1">{r.benGua.ci}</div>
          </div>
          <div className="result-cell">
            <div className="k">互卦 · {r.huGua ? r.huGua.name : '—'}</div>
            <div className="tiny muted mt-1">中四爻交互之象</div>
            <div className="tiny muted mt-1">{r.huGua ? r.huGua.xiang : ''}</div>
          </div>
          <div className="result-cell">
            <div className="k">变卦 · {r.bianGua.name}</div>
            <div className="tiny muted mt-1">动爻变后之象</div>
            <div className="tiny muted mt-1">{r.bianGua.xiang}</div>
          </div>
        </div>
      </div>
      <ResultCard title="体用生克">
        <p>体卦为 <strong>{guaName(r.tiGua)}{BAGUA[r.tiGua].symbol}</strong>（{r.tiWx}，主事主自身），用卦为 <strong>{guaName(r.yongGua)}{BAGUA[r.yongGua].symbol}</strong>（{r.yongWx}，主所问之事）。</p>
        <p>体用之间：<span className={r.shengke.includes('吉') ? 'tag-cool' : r.shengke.includes('凶') ? 'tag-hot' : ''}><strong>{r.shengke}</strong></span>。{r.shengke.includes('生') ? '生者如风送帆，事有助力；' : r.shengke.includes('克') ? '克者如舟行逆水，宜缓宜守；' : '比和者势均，事在人为。'}</p>
      </ResultCard>
      <ResultCard title={`卦辞指引 · ${r.benGua.name}`}>
        <p>「{r.benGua.ci}」</p>
        <p>{r.benGua.xiang}</p>
        <p className="mt-2"><strong>占断参详：</strong>{meihuaAdvice(r)}</p>
      </ResultCard>
    </>
  );
}
// 梅花占断参详（结合动爻/体用/变卦，现代语言）
function meihuaAdvice(r: any): string {
  const parts: string[] = [];
  parts.push('此卦动于第' + r.move + '爻，' + (r.move <= 3 ? '动在下卦，所问之事多系于内、关于自身之念' : '动在上卦，所问之事多系于外、关于彼方之势') + '。');
  if (r.shengke.includes('吉')) parts.push('体用之间' + r.shengke + '，事有助力，宜顺势推进，但不可恃势而骄。');
  else if (r.shengke.includes('凶')) parts.push('体用之间' + r.shengke + '，事有阻力，宜缓图慎行，先安己而后谋事。');
  else parts.push('体用比和，' + r.shengke + '，事在人为，成败系于一心之诚。');
  if (r.bianGua) parts.push('变卦' + r.bianGua.name + '为事之归趋，其象「' + r.bianGua.xiang + '」，可作收束之鉴。');
  return parts.join('');
}