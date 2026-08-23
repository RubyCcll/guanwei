// 大六壬：起课面板 + 天地盘/四课三传渲染
import { useState } from 'react';
import { jiangName } from '@core/engine/liuren';
import { ZHI } from '@core/data/ganzhi';
import { LR_JIANG_SYMBOL, LR_JIANG_WX } from '@core/data/liuren';
import type { LiurenResult } from '@core/types';
import { ResultCard } from '@/components/ResultCard';
import SongSelect from '@/components/SongSelect';

const USES = ['问出行', '问财利', '问讼事', '问姻缘', '问疾病', '问失物', '问家宅', '其他'];

function nowLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface PanelProps { onDivine: (inputs: unknown, profile?: unknown, question?: string) => void; }

export function LiurenPanel({ onDivine }: PanelProps) {
  const [dt, setDt] = useState(nowLocal());
  const [use, setUse] = useState('问出行');
  const [question, setQuestion] = useState('');
  const go = () => onDivine({ datetime: dt }, undefined, question.trim());
  return (
    <>
      <div className="field"><label htmlFor="lr-datetime">占时（公历）</label>
        <input className="input-line" type="datetime-local" id="lr-datetime" value={dt} onChange={e => setDt(e.target.value)} /></div>
      <div className="field"><label htmlFor="lr-q">所占之属</label>
        <SongSelect id="lr-q" value={use} options={USES.map(u => ({ value: u, label: u }))} onChange={setUse} />
      </div>
      <div className="field"><label htmlFor="q-input">所占之事</label>
        <input className="input-line" id="q-input" placeholder="默念所问，书之于此…" maxLength={60} value={question} onChange={e => setQuestion(e.target.value)} />
      </div>
      <button className="btn-divine" onClick={go}>起 课<span className="small">立天地盘 · 布四课 · 取三传</span></button>
      <p className="hint" style={{ marginTop: '.8rem' }}>月将随太阳过宫（中气定将）；简式取传。</p>
    </>
  );
}

export function LiurenResult({ data }: { data: LiurenResult }) {
  const r = data;
  return (
    <>
      <ResultCard title={`${r.jqName} · ${jiangName(r.jiang)}（${r.jiang}）加 ${r.hourGZ[1]}时`}>
        <p>日干 <strong>{r.dayGZ}</strong>，占时 <strong>{r.hourGZ}</strong>（{r.hourGZ[1]}时）。月将 <strong>{jiangName(r.jiang)}</strong>。</p>
      </ResultCard>
      <div className="result-card">
        <h3>天地盘</h3>
        <div className="liuren-stage mt-2">
          {ZHI.map((z, i) => {
            const up = r.tianpan[i];
            return (
              <div className="liuren-item" key={z}>
                <div className="k">{z}宫（{LR_JIANG_SYMBOL[z]}）</div>
                <div className="v">{up}{LR_JIANG_SYMBOL[up]}</div>
                <div className="tiny muted">{LR_JIANG_WX[up]} · {jiangName(up)}</div>
              </div>
            );
          })}
        </div>
      </div>
      <ResultCard title="四课三传"
        cells={[
          { k: '一课 · 干上', v: r.ke1, big: true },
          { k: '二课 · 干阴', v: r.ke2, big: true },
          { k: '三课 · 支上', v: r.ke3, big: true },
          { k: '四课 · 支阴', v: r.ke4, big: true },
        ]}>
        <p>三传（简式）：<strong className="tag-hot">初传 {r.chuan1}</strong> → <strong className="tag-cool">中传 {r.chuan2}</strong> → <strong>末传 {r.chuan3}</strong>。</p>
        <p>初传为事发之端，中传为事进之中，末传为事成之归。干为外、支为内，四课之内外，即人事之表里。</p>
        <p className="mt-2"><strong>三传参详：</strong>{liurenAdvice(r)}</p>
      </ResultCard>
    </>
  );
}
// 三传参详（结合五行/月将，现代语言）
function liurenAdvice(r: any): string {
  const wxMap: Record<string, string> = { 亥: '水', 子: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  const parts: string[] = [];
  parts.push('初传' + r.chuan1 + '（' + (wxMap[r.chuan1] || '') + '）为事之始，' + (['水'].includes(wxMap[r.chuan1] || '') ? '水主流动，事有周折' : wxMap[r.chuan1] === '金' ? '金主决断，事起于刚' : wxMap[r.chuan1] === '火' ? '火主急速，事发于明' : wxMap[r.chuan1] === '木' ? '木主生发，事起于新' : '土主迟重，事起于稳') + '。');
  if (r.chuan1 === r.chuan3) parts.push('初末同神，事体回环，首尾相应，宜守初心。');
  else if (r.chuan2 === r.chuan3) parts.push('中末同神，事中已定，后续之势多在把握。');
  else parts.push('三传递进，事势渐明，宜循序而行。');
  parts.push('月将' + r.jiang + '加时，天地盘已定，观其生克以断吉凶。');
  return parts.join('');
}