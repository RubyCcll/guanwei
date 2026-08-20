// AI 解读状态机：idle → streaming（逐字累积）→ done（结构化段落）/ error
import { useCallback, useRef, useState } from 'react';
import { aiInterpretStream, type AIInterpretSection, type AIReport } from '@/services/api';

export type AIStatus = 'idle' | 'streaming' | 'done' | 'error';

export function useAIInterpret() {
  const [status, setStatus] = useState<AIStatus>('idle');
  const [text, setText] = useState('');
  const [sections, setSections] = useState<AIInterpretSection[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [report, setReport] = useState<AIReport | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [quality, setQuality] = useState<'ok' | 'poor'>('ok');
  const abortRef = useRef<boolean>(false);
  const doneRef = useRef<boolean>(false);

  const interpret = useCallback(async (params: { artId: string; divineId?: string; question?: string; resultRaw?: unknown; semantic?: unknown; profile?: unknown; reportMode?: boolean; fit?: { suitable: boolean | 'partial'; reason: string; suggestion: string } }) => {
    abortRef.current = false;
    doneRef.current = false;
    setStatus('streaming');
    setText('');
    setSections([]);
    setReport(null);
    setTruncated(false);
    setQuality('ok');
    setErrorMsg('');
    await aiInterpretStream(
      params,
      (char) => setText(prev => prev + char),
      (secs, _full, rep, trunc, qual) => {
        // done 事件与兜底都可能触发，仅第一次生效（flag 防重）
        if (doneRef.current) return;
        doneRef.current = true;
        setSections(secs);
        if (rep) setReport(rep);
        else if (secs.length === 0 && !rep) setReport(null);
        if (trunc) setTruncated(true);
        if (qual === 'poor') setQuality('poor');
        setStatus('done');
      },
      (code, message) => {
        // 出错即锁定终态：流结束后若再触发兜底 onDone，也不得覆盖错误状态（否则会误把流式累积的原始文字当结果展示）
        doneRef.current = true;
        setErrorMsg(message || code);
        setStatus('error');
      },
    );
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setStatus('idle');
    setText('');
    setSections([]);
    setErrorMsg('');
  }, []);

  return { status, text, sections, report, truncated, quality, errorMsg, interpret, reset };
}