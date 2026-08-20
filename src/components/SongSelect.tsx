// SongSelect：宋式自定义下拉（替代系统 select）
import { useEffect, useRef, useState } from 'react';

export interface SongOption { value: string; label: string }

interface Props {
  value: string;
  options: SongOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export default function SongSelect({ value, options, onChange, placeholder = '择…', disabled, id }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const sel = options.find(o => o.value === value);
  return (
    <div className={'song-select' + (open ? ' open' : '')} ref={ref}>
      <button
        type="button"
        className="trigger"
        id={id}
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{sel ? sel.label : placeholder}</span>
        <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="panel" role="listbox">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              className={o.value === value ? 'sel' : ''}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}