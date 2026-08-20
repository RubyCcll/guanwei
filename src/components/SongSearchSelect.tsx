// SongSearchSelect：可搜索的自定义下拉（自有 UI，替代系统 select）
import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  allowCustom?: boolean;  // 允许输入未收录之项（以输入值为准）
}

export default function SongSearchSelect({ value, options, onChange, placeholder = '择…', disabled, id, allowCustom }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // 打开时聚焦搜索框
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return options;
    return options.filter(o => o.label.includes(q));
  }, [options, query]);

  const sel = options.find(o => o.value === value);
  return (
    <div className={'song-select song-search' + (open ? ' open' : '')} ref={ref}>
      <button type="button" className="trigger" id={id} disabled={disabled} onClick={() => setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{sel ? sel.label : placeholder}</span>
        <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="panel" role="listbox">
          <div className="ss-search">
            <input
              ref={inputRef}
              className="ss-input"
              placeholder="输入以搜…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="ss-list">
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                className={o.value === value ? 'sel' : ''}
                onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (allowCustom && query.trim() ? (
              <button type="button" className="ss-custom" onClick={() => { onChange(query.trim()); setOpen(false); setQuery(''); }}>
                取「{query.trim()}」为区县（以城坐标计）
              </button>
            ) : <div className="ss-empty">无契合之项</div>)}
          </div>
        </div>
      )}
    </div>
  );
}