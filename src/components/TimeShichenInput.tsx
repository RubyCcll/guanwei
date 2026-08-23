// 精确出生时刻输入：time 输入 + 自动匹配时辰（东玄以此时辰排盘，星盘用精确时刻）
import { timeToShichenLabel, timeToHourIndex } from '@/data/shichen';

interface Props {
  value: string;      // HH:MM
  onChange: (time: string) => void;
  id?: string;
  label?: string;
}

export default function TimeShichenInput({ value, onChange, id, label = '出生时刻（精确）' }: Props) {
  void label;
  return (
    <div>
      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'stretch' }}>
        <input
          className="input-line"
          type="time"
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1 }}
        />
        <span className="shichen-chip">{timeToShichenLabel(value)}</span>
      </div>
    </div>
  );
}

export { timeToHourIndex };