// 小六壬：掐指占时面板 + 掌诀/推演轨迹渲染
import { useState } from 'react';
import { XLR_ORDER } from '@core/data/xiaoliuren';
import { mod } from '@core/data/ganzhi';
import type { XiaoliurenResult } from '@core/types';
import { ResultCard } from '@/components/ResultCard';
import SongSelect from '@/components/SongSelect';

interface PanelProps { onDivine: (inputs: unknown, profile?: unknown, question?: string) => void; }

export function XiaoliurenPanel({ onDivine }: PanelProps) {
  const [mode, setMode] = useState<'time' | 'num'>('time');
  const [m, setM] = useState(1);
  const [d, setD] = useState(1);
  const [h, setH] = useState(1);
  const [n1, setN1] = useState(3);
  const [n2, setN2] = useState(5);
  const [n3, setN3] = useState(7);
  const [q, setQ] = useState('');
  const [qType, setQType] = useState('other');
  const go = () => onDivine({ mode, m, d, h, n1, n2, n3 }, undefined, q.trim());
  return (
    <>
      <div className="field"><label htmlFor="xlr-mode">取数之法</label>
        <SongSelect id="xlr-mode" value={mode} options={[{ value: 'time', label: '以当下农历月、日、时占' }, { value: 'num', label: '随取三数占（1–12）' }]} onChange={v => setMode(v as 'time' | 'num')} />
      </div>
      {mode === 'time' ? (
        <div className="field-row">
          <div className="field"><label htmlFor="xlr-m">月</label>
            <SongSelect id="xlr-m" value={String(m)} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} onChange={v => setM(Number(v))} />
          </div>
          <div className="field"><label htmlFor="xlr-d">日</label>
            <SongSelect id="xlr-d" value={String(d)} options={Array.from({ length: 30 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} onChange={v => setD(Number(v))} />
          </div>
        </div>
      ) : (
        <div className="field-row">
          <div className="field"><label htmlFor="xlr-n1">一数</label><input className="input-line" type="number" id="xlr-n1" min={1} max={12} value={n1} onChange={e => setN1(Number(e.target.value))} /></div>
          <div className="field"><label htmlFor="xlr-n2">二数</label><input className="input-line" type="number" id="xlr-n2" min={1} max={12} value={n2} onChange={e => setN2(Number(e.target.value))} /></div>
        </div>
      )}
      <div className="field"><label htmlFor="xlr-h">时（时辰序）</label>
        <SongSelect id="xlr-h" value={String(h)} options={['子(1)', '丑(2)', '寅(3)', '卯(4)', '辰(5)', '巳(6)', '午(7)', '未(8)', '申(9)', '酉(10)', '戌(11)', '亥(12)'].map((t, i) => ({ value: String(i + 1), label: t }))} onChange={v => setH(Number(v))} />
      </div>
      {mode === 'num' && (
        <div className="field"><label htmlFor="xlr-n3">三数</label><input className="input-line" type="number" id="xlr-n3" min={1} max={12} value={n3} onChange={e => setN3(Number(e.target.value))} /></div>
      )}
      <div className="field"><label htmlFor="xlr-qtype">所问之属</label>
        <SongSelect id="xlr-qtype" value={qType} options={[{ value: 'love', label: '情感姻缘' }, { value: 'career', label: '事业学业' }, { value: 'wealth', label: '财运投资' }, { value: 'health', label: '健康' }, { value: 'travel', label: '出行方位' }, { value: 'lost', label: '寻物' }, { value: 'decision', label: '抉择决策' }, { value: 'other', label: '其他' }]} onChange={setQType} />
      </div>
      <div className="field"><label htmlFor="q-input">所问之事</label>
        <input className="input-line" id="q-input" placeholder="默念所问，书之于此…" maxLength={60} value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <button className="btn-divine" onClick={go}>掐 指 一 算<span className="small">大安起月 · 月上起日 · 日上起时</span></button>
    </>
  );
}

export function XiaoliurenResult({ data }: { data: XiaoliurenResult }) {
  const r = data;
  const jiClass = r.detail.ji === '吉' ? 'tag-cool' : 'tag-hot';
  const step1 = mod(r.a - 1, 6);
  const step2 = mod(step1 + (r.b - 1), 6);
  return (
    <>
      <ResultCard title={`掌诀 · ${r.name}`}
        cells={[
          { k: '吉凶', v: r.detail.ji, big: true, cool: r.detail.ji === '吉', hot: r.detail.ji !== '吉' },
          { k: '五行', v: r.detail.wx },
          { k: '主数', v: r.detail.num },
          { k: '方位', v: r.detail.dir },
        ]}>
        <p><span className={jiClass}><strong>{r.name}</strong></span> · {r.detail.poem}</p>
        <p>「{r.detail.text}」</p>
      </ResultCard>
      <ResultCard title="推演轨迹">
        <p>{r.a} 月 {r.b} 日 {r.c} 时占：大安起月 → 月{r.a}落 <strong>{XLR_ORDER[step1]}</strong> → 日{r.b}落 <strong>{XLR_ORDER[step2]}</strong> → 时{r.c}终落 <strong className={jiClass}>{r.name}</strong>。</p>
        <p className="mt-2"><strong>断语参详：</strong>{xlrAdvice(r)}</p>
      </ResultCard>
    </>
  );
}
// 小六壬断语参详（结合吉凶/五行/方位，现代语言）
function xlrAdvice(r: any): string {
  const d = r.detail;
  const parts: string[] = [];
  parts.push('此占得' + r.name + '，为' + (d.ji === '吉' ? '吉占' : '凶占') + '。');
  if (d.ji === '吉') parts.push('主数' + d.num + '、方位' + d.dir + '，谋事于' + d.dir + '向或' + d.num.replace(/、/g, '、') + '之数日时，多有应合。');
  else parts.push('此占宜静不宜动，避' + d.dir + '向之事，慎口舌之争；事缓则圆，过此一时再图。');
  parts.push('五行属' + d.wx + '，' + (d.wx === '火' ? '火性急，事可速决' : d.wx === '水' ? '水性流，事有迁延' : d.wx === '木' ? '木性生，事有转机' : d.wx === '金' ? '金性刚，事须决断' : '土性厚，事在积累') + '。');
  return parts.join('');
}