// DateInput：出生日期输入（公历 / 农历双历法，lunar-typescript 互转，实时联动）
import { useEffect, useState } from 'react';
import { Solar, Lunar } from 'lunar-typescript';
import SongSelect from '@/components/SongSelect';
import CalendarInput from '@/components/CalendarInput';

interface Props {
  value: string;        // 公历 YYYY-MM-DD（对外统一输出公历）
  onChange: (solarISO: string) => void;
  id?: string;
}

const LUNAR_YEARS = Array.from({ length: 201 }, (_, i) => 1900 + i);
const pad2 = (n: number) => String(n).padStart(2, '0');

export default function DateInput({ value, onChange, id }: Props) {
  const [mode, setMode] = useState<'solar' | 'lunar'>('solar');
  const [y, m, d] = value ? value.split('-').map(Number) : [1990, 1, 1];

  // 农历状态（由当前公历派生）
  const [ly, setLy] = useState(1990);
  const [lm, setLm] = useState(1);
  const [ld, setLd] = useState(1);
  const [leap, setLeap] = useState(false);

  // 公历变化 → 同步农历
  useEffect(() => {
    try {
      const l = Solar.fromYmd(y, m, d).getLunar();
      const rawMonth = l.getMonth();
      setLy(l.getYear());
      setLm(Math.abs(rawMonth));
      setLd(l.getDay());
      setLeap(rawMonth < 0);
    } catch { /* ignore */ }
  }, [y, m, d]);

  const lunarToSolar = (yy: number, mm: number, dd: number, isLeap: boolean): string => {
    try {
      // 闰月以负数月表示
      const s = Lunar.fromYmd(yy, isLeap ? -mm : mm, dd).getSolar();
      return s.getYear() + '-' + pad2(s.getMonth()) + '-' + pad2(s.getDay());
    } catch {
      return value;
    }
  };

  // 农历选择变化 → 实时转公历输出（父组件 value 变化会再同步农历，闭环稳定）
  useEffect(() => {
    if (mode === 'lunar') {
      const iso = lunarToSolar(ly, lm, ld, leap);
      if (iso !== value) onChange(iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ly, lm, ld, leap]);

  // 当年闰月检测（探测负数月）
  const leapMonth = (() => {
    for (let m = 1; m <= 12; m++) {
      try { Lunar.fromYmd(ly, -m, 1); return m; } catch { /* 非闰月 */ }
    }
    return 0;
  })();
  const isLeapNow = leapMonth > 0 && lm === leapMonth;

  const daysInMonth = (() => {
    for (let dd = 30; dd >= 29; dd--) {
      try { Lunar.fromYmd(ly, leap ? -lm : lm, dd); return dd; } catch { /* 继续探测 */ }
    }
    return 30;
  })();

  return (
    <div>
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem', maxWidth: 130 }}>
        <SongSelect
          value={mode}
          options={[{ value: 'solar', label: '公历' }, { value: 'lunar', label: '农历' }]}
          onChange={v => setMode(v as 'solar' | 'lunar')}
        />
      </div>
      {mode === 'solar' ? (
        <CalendarInput id={id} value={value} onChange={onChange} />
      ) : (
        <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="field"><SongSelect value={String(ly)} options={LUNAR_YEARS.map(v => ({ value: String(v), label: String(v) + '年' }))} onChange={v => setLy(Number(v))} /></div>
          <div className="field"><SongSelect value={String(lm)} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: (i + 1) + '月' }))} onChange={v => { setLm(Number(v)); setLeap(false); }} /></div>
          <div className="field"><SongSelect value={String(ld)} options={Array.from({ length: Math.max(daysInMonth, ld) }, (_, i) => ({ value: String(i + 1), label: (i + 1) + '日' }))} onChange={v => setLd(Number(v))} /></div>
        </div>
      )}
      {mode === 'lunar' && (
        <p className="hint">
          {ly}年{leap ? '闰' : ''}{lm}月{ld}日 即公历 <strong>{lunarToSolar(ly, lm, ld, leap)}</strong>
          {isLeapNow && (
            <button type="button" style={{ marginLeft: '.6rem', color: 'var(--cinnabar)', textDecoration: 'underline' }} onClick={() => setLeap(v => !v)}>
              {leap ? '取平月' : '取闰月'}
            </button>
          )}
        </p>
      )}
    </div>
  );
}