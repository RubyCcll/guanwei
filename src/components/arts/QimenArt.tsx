// 奇门遁甲：起局面板 + 九宫盘渲染
import { useState } from 'react';
import { qimenCalc } from '@core/engine/qimen';
import type { QimenResult } from '@core/types';
import { ResultCard } from '@/components/ResultCard';
import SongSelect from '@/components/SongSelect';

const USES = ['择时出行', '谋事求财', '讼事纠纷', '考试功名', '婚恋姻缘', '疾病求医', '其他'];
const QM_POS: Record<number, [number, number]> = { 1: [0, 2], 8: [1, 2], 3: [2, 2], 4: [2, 1], 5: [1, 1], 9: [2, 0], 2: [0, 0], 7: [1, 0], 6: [0, 1] };
const QM_NAME: Record<number, string> = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离' };

function nowLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface PanelProps { onDivine: (inputs: unknown, profile?: unknown, question?: string) => void; }

export function QimenPanel({ onDivine }: PanelProps) {
  const [dt, setDt] = useState(nowLocal());
  const [use, setUse] = useState('择时出行');
  const [question, setQuestion] = useState('');
  const go = () => onDivine({ datetime: dt }, undefined, question.trim());
  return (
    <>
      <div className="field"><label htmlFor="qm-datetime">用事时刻（公历）</label>
        <input className="input-line" type="datetime-local" id="qm-datetime" value={dt} onChange={e => setDt(e.target.value)} /></div>
      <div className="field"><label htmlFor="qm-use">所问之属</label>
        <SongSelect id="qm-use" value={use} options={USES.map(u => ({ value: u, label: u }))} onChange={setUse} />
      </div>
      <div className="field"><label htmlFor="q-input">所问之事</label>
        <input className="input-line" id="q-input" placeholder="默念所问，书之于此…" maxLength={60} value={question} onChange={e => setQuestion(e.target.value)} />
      </div>
      <button className="btn-divine" onClick={go}>起 局<span className="small">定时 · 定局 · 布三奇六仪</span></button>
      <p className="hint" style={{ marginTop: '.8rem' }}>节气取精确万年历定阴阳遁，三候取局，九宫布盘。</p>
    </>
  );
}

export function QimenResultView({ data }: { data: QimenResult }) {
  const r = data;
  return (
    <>
      <ResultCard title={`${r.jqName} · ${r.yin ? '阴遁' : '阳遁'}${r.ju}局 · ${r.dayGZ}日 ${r.hourGZ}时`}>
        <p>旬首 <strong>{r.xunshouName}</strong>（{r.xunShou}），值符 <strong>{r.zfStar}</strong>，值使 <strong>{r.zsMen}</strong>。</p>
        <p>三奇六仪以 {r.yin ? '逆' : '顺'}布于九宫，{r.yin ? '阴遁主静，宜守' : '阳遁主动，宜进'}。用神所临之宫，即事之机枢。</p>
      </ResultCard>
      <div className="result-card">
        <h3>九宫盘</h3>
        <div className="qimen-grid" style={{ marginTop: '1rem' }}>
          {[1, 8, 3, 4, 9, 2, 7, 6, 5].map(p => {
            const cell = r.pan[p];
            const [c, rw] = QM_POS[p];
            return (
              <div className="qm-cell" key={p} style={{ gridColumn: c + 1, gridRow: rw + 1 }}>
                <div className="qm-name">{QM_NAME[p]}{p === 5 ? ' · 中' : ''}</div>
                <div className="qm-items">{p === 5 ? '中五寄坤' : `${cell.yi} · ${cell.men}门`}</div>
                <div className="qm-star">{p === 5 ? '天禽' : cell.star}</div>
              </div>
            );
          })}
        </div>
      </div>
      <ResultCard title="用事之示">
        <p>九宫之中，值符 {r.zfStar} 所在之{QM_NAME[r.zfPalace]}宫为发端；{r.zsMen}门为使，主行事之出入。择时用事，宜察 {r.yin ? '开、休、生' : '景、惊、伤'} 之吉凶（简示）。</p>
        <p className="mt-2"><strong>用神参详：</strong>{qimenAdvice(r)}</p>
      </ResultCard>
    </>
  );
}
// 奇门用神参详（值符宫/值使门/门星组合，现代语言）
function qimenAdvice(r: any): string {
  const dirMap: Record<number, string> = { 1: '北', 2: '西南', 3: '东', 4: '东南', 5: '中', 6: '西北', 7: '西', 8: '东北', 9: '南' };
  const parts: string[] = [];
  parts.push('值符' + r.zfStar + '落' + QM_NAME[r.zfPalace] + '宫（' + dirMap[r.zfPalace] + '方），为当下气场之枢纽，谋事可借' + dirMap[r.zfPalace] + '方之势。');
  const door: Record<string, string> = {
    开: '开门吉门，主动通达，宜开创进取', 休: '休门吉门，主修养安顿，宜休整待机',
    生: '生门吉门，主生机财源，宜经营求财', 伤: '伤门凶门，主损伤争斗，宜避其锋',
    杜: '杜门平门，主闭塞隐藏，宜守不宜攻', 景: '景门平门，主文书声名，宜宣传谋名',
    死: '死门凶门，主停滞死寂，宜止不宜行', 惊: '惊门凶门，主惊恐口舌，宜慎言防变',
  };
  parts.push('值使' + r.zsMen + '门，' + (door[r.zsMen] || '主行事出入') + '。');
  parts.push(r.yin ? '阴遁之局，气机内收，宜守成蓄势，谋定后动。' : '阳遁之局，气机外放，宜主动作为，顺势而进。');
  return parts.join('');
}