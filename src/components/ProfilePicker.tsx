// 档案选择器：从已存档案（主档案 + 示例档案）填充面板输入
import { useState } from 'react';
import { currentUser, type UserProfile } from '@/utils/userStore';
import SongSelect from '@/components/SongSelect';

interface Props {
  onPick: (p: UserProfile, source?: { id: string; name: string }) => void;
  onPicked?: () => void;
}

export default function ProfilePicker({ onPick, onPicked }: Props) {
  const user = currentUser();
  const [value, setValue] = useState('');
  if (!user) return null;
  const items = [
    { value: 'primary', label: '主档案 · ' + (user.profile.birthDate || '未录') },
    ...user.samples.map(s => ({ value: s.id, label: s.name + ' · ' + (s.profile.birthDate || '未录') })),
  ];
  if (items.length <= 1) return null;
  const pick = (v: string) => {
    if (v === 'primary') onPick(user.profile, { id: 'main', name: '主档案' });
    else {
      const s = user.samples.find(x => x.id === v);
      if (s) onPick(s.profile, { id: s.id, name: s.name });
    }
    setValue('');
    onPicked?.();
  };
  return (
    <div className="field" style={{ marginTop: 'var(--sp-2)' }}>
      <label>取自档案</label>
      <SongSelect
        value={value}
        placeholder="择档案以填…"
        options={items}
        onChange={pick}
      />
    </div>
  );
}