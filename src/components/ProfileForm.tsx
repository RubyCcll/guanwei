// 档案编辑表单：出生日期（公历/农历）+ 精确时刻 + 性别 + 出生地点
import { useState } from 'react';
import DateInput from '@/components/DateInput';
import TimeShichenInput from '@/components/TimeShichenInput';
import LocationPicker from '@/components/LocationPicker';
import SongSelect from '@/components/SongSelect';
import type { GeoLocation } from '@core/types';
import type { UserProfile } from '@/utils/userStore';
import { timeToHourIndex } from '@/data/shichen';

interface Props {
  initial: UserProfile;
  onChange: (p: UserProfile) => void;
}

export default function ProfileForm({ initial, onChange }: Props) {
  const [date, setDate] = useState(initial.birthDate);
  const [time, setTime] = useState(initial.birthTime || '12:00');
  const [gender, setGender] = useState<'男' | '女'>(initial.gender);
  const [loc, setLoc] = useState<GeoLocation | null>(initial.location);
  const emit = (patch: Partial<UserProfile>) => {
    onChange({
      birthDate: patch.birthDate ?? date,
      birthTime: patch.birthTime ?? time,
      birthHourIndex: timeToHourIndex(patch.birthTime ?? time),
      gender: patch.gender ?? gender,
      location: patch.location !== undefined ? patch.location : loc,
    });
  };
  return (
    <>
      <div className="field"><label>出生日期（公历 / 农历）</label><DateInput value={date} onChange={v => { setDate(v); emit({ birthDate: v }); }} /></div>
      <div className="field"><label>出生时刻（精确）</label><TimeShichenInput value={time} onChange={v => { setTime(v); emit({ birthTime: v }); }} /></div>
      <div className="field-row">
        <div className="field"><label>性别</label><SongSelect value={gender} options={[{ value: '男', label: '男' }, { value: '女', label: '女' }]} onChange={v => { setGender(v as '男' | '女'); emit({ gender: v as '男' | '女' }); }} /></div>
      </div>
      <div className="field"><label>出生地点</label><LocationPicker value={loc} onChange={v => { setLoc(v); emit({ location: v }); }} previewHourIndex={timeToHourIndex(time)} /></div>
    </>
  );
}