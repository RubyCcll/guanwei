// CalendarInput：公历日期输入（可手输 YYYY-MM-DD，也可点开自绘月历选择）
import { useEffect, useRef, useState } from 'react';

const WEEK_HEAD = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

interface Props {
  value: string;
  onChange: (iso: string) => void;
  id?: string;
}

function parseISO(v: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [1990, 1, 1];
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

export default function CalendarInput({ value, onChange, id }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [y, m, d] = parseISO(value);
  const [viewY, setViewY] = useState(y);
  const [viewM, setViewM] = useState(m);

  useEffect(() => {
    setText(value);
    const [vy, vm] = parseISO(value);
    setViewY(vy); setViewM(vm);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const commit = (iso: string) => {
    onChange(iso);
    setText(iso);
    setError(false);
  };

  const handleText = (v: string) => {
    setText(v);
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
    if (m) {
      const yy = Number(m[1]), mm = Number(m[2]), dd = Number(m[3]);
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= daysInMonth(yy, mm)) {
        commit(yy + '-' + String(mm).padStart(2, '0') + '-' + String(dd).padStart(2, '0'));
        return;
      }
    }
    setError(true);
  };

  // 月历网格：从周日开始
  const firstDay = new Date(viewY, viewM - 1, 1).getDay();
  const total = daysInMonth(viewY, viewM);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const nav = (delta: number) => {
    let ny = viewY, nm = viewM + delta;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    setViewY(ny); setViewM(nm);
  };

  const isSelected = (dd: number) => viewY === y && viewM === m && dd === d;

  return (
    <div className="cal-input" ref={ref}>
      <div className="cal-field">
        <input
          className={"input-line" + (error ? ' cal-error' : '')}
          id={id}
          placeholder="1990-06-15"
          value={text}
          onChange={e => handleText(e.target.value)}
        />
        <button type="button" className="cal-toggle" onClick={() => setOpen(v => !v)} aria-label="开月历">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
      </div>
      {error && <p className="hint" style={{ color: 'var(--cinnabar)' }}>历日未合 · 请书如 1990-06-15</p>}
      {open && (
        <div className="cal-panel">
          <div className="cal-head">
            <button type="button" className="cal-nav" onClick={() => nav(-1)} aria-label="上月">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <span className="cal-title">{viewY}年 {MONTHS[viewM - 1]}</span>
            <button type="button" className="cal-nav" onClick={() => nav(1)} aria-label="下月">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
          <div className="cal-week">
            {WEEK_HEAD.map(w => <span key={w}>{w}</span>)}
          </div>
          <div className="cal-grid">
            {cells.map((c, i) => c === null ? <span key={i} /> : (
              <button
                key={i}
                type="button"
                className={isSelected(c) ? 'sel' : ''}
                onClick={() => { commit(viewY + '-' + String(viewM).padStart(2, '0') + '-' + String(c).padStart(2, '0')); setOpen(false); }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}