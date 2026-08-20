// 人生经历校准输入：记录命主已知人生事件（年份 + 事件），AI 解读时呼应并不得矛盾
import { useState } from 'react';

export interface LifeEvent { year: number; text: string }

interface Props {
  value: LifeEvent[];
  onChange: (events: LifeEvent[]) => void;
}

const toText = (evs: LifeEvent[]) => evs.map(e => e.year + ' ' + e.text).join('\n');

const parseText = (s: string): LifeEvent[] => s
  .split('\n').map(l => l.trim()).filter(Boolean)
  .map(l => {
    const m = /^(\d{4})\s*(.*)$/.exec(l);
    return m ? { year: Number(m[1]), text: (m[2] || '重要事件').slice(0, 40) } : null;
  })
  .filter((e): e is LifeEvent => !!e && e.year >= 1900 && e.year <= 2100)
  .sort((a, b) => a.year - b.year);

export default function LifeEventsInput({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(toText(value));

  const commit = () => onChange(parseText(draft));

  return (
    <div className="life-events" style={{ marginTop: '.4rem' }}>
      <button type="button" className="btn-seal btn-ghost" style={{ fontSize: '.82rem', padding: '.4rem 1rem' }} onClick={() => setOpen(v => !v)}>
        {open ? '收 起' : '📌 补充人生经历（解读校准）'}
        {value.length > 0 && <span className="tag-cool" style={{ marginLeft: '.4rem' }}>已录 {value.length} 条</span>}
      </button>
      {open && (
        <div style={{ marginTop: '.6rem' }}>
          <p className="tiny muted" style={{ marginBottom: '.3rem' }}>每行一条：「年份 关键事件」——AI 解读将在对应流年处呼应这些经历，且不与它们矛盾（3-10 条为宜）</p>
          <textarea className="input-line" rows={5} value={draft} onChange={e => setDraft(e.target.value)}
            placeholder={'2004 家庭变故\n2016 换城市\n2020 换工作\n2022 结婚\n2024 健康问题'} />
          <div className="btn-row" style={{ marginTop: '.4rem' }}>
            <button className="btn-seal" style={{ fontSize: '.82rem', padding: '.35rem 1rem' }} onClick={commit}>保 存 校 准</button>
            {value.length > 0 && <span className="tiny muted" style={{ alignSelf: 'center' }}>共 {value.length} 条，随排盘一同提交</span>}
          </div>
        </div>
      )}
    </div>
  );
}
