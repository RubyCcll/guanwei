// 所问之事的统一输入：类型选择 + 问题输入（占问类必填区，命盘类可留白）
import { useState } from 'react';
import SongSelect from '@/components/SongSelect';

const DEFAULT_TYPES = [
  { value: 'love', label: '情感姻缘' },
  { value: 'career', label: '事业学业' },
  { value: 'wealth', label: '财运投资' },
  { value: 'health', label: '健康' },
  { value: 'travel', label: '出行方位' },
  { value: 'lost', label: '寻物' },
  { value: 'decision', label: '抉择决策' },
  { value: 'other', label: '其他' },
];

interface Props {
  question: string;
  onQuestion: (q: string) => void;
  qType?: string;
  onQType?: (t: string) => void;
  showType?: boolean;      // 占问类：先选类型
  placeholder?: string;
}

export default function QuestionFields({ question, onQuestion, qType, onQType, showType = true, placeholder }: Props) {
  return (
    <div>
      {showType && onQType && qType !== undefined && (
        <div className="field">
          <label htmlFor="q-type">所问之属</label>
          <SongSelect id="q-type" value={qType} options={DEFAULT_TYPES} onChange={onQType} />
        </div>
      )}
      <div className="field">
        <label htmlFor="q-input">所问之事</label>
        <input
          className="input-line"
          id="q-input"
          placeholder={placeholder || '默念所问，书之于此，心念自随…'}
          maxLength={60}
          value={question}
          onChange={e => onQuestion(e.target.value)}
        />
      </div>
    </div>
  );
}