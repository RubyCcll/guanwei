// AI 解读状态机：idle → streaming（逐字累积）→ done（结构化段落）/ error
import { useCallback, useRef, useState } from 'react';
import { aiInterpretStream, type AIInterpretSection, type AIReport } from '@/services/api';

export type AIStatus = 'idle' | 'streaming' | 'done' | 'error';

export function useAIInterpret() {
  const [status, setStatus] = useState<AIStatus>('idle');
  const [text, setText] = useState('');
  const [sections, setSections] = useState<AIInterpretSection[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [report, setReport] = useState<AIReport | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [quality, setQuality] = useState<'ok' | 'poor'>('ok');
  const abortRef = useRef<boolean>(false);
  const doneRef = useRef<boolean>(false);
  // 请求代际号：起占/重置会使在途请求失效，防止旧档案的流式结果回流覆盖新状态
  const reqIdRef = useRef(0);

  const interpret = useCallback(async (params: { artId: string; divineId?: string; question?: string; resultRaw?: unknown; semantic?: unknown; profile?: unknown; reportMode?: boolean; fit?: { suitable: boolean | 'partial'; reason: string; suggestion: string } }) => {
    const myId = ++reqIdRef.current;
    abortRef.current = false;
    doneRef.current = false;
    setStatus('streaming');
    setText('');
    setSections([]);
    setReport(null);
    setTruncated(false);
    setQuality('ok');
    setErrorMsg('');
    setErrorCode('');
    await aiInterpretStream(
      params,
      (char) => { if (reqIdRef.current === myId) setText(prev => prev + char); },
      (secs, _full, rep, trunc, qual) => {
        // 已重置/发起新请求 → 旧流结果作废
        if (reqIdRef.current !== myId) return;
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
        if (reqIdRef.current !== myId) return;
        // 出错即锁定终态：流结束后若再触发兜底 onDone，也不得覆盖错误状态（否则会误把流式累积的原始文字当结果展示）
        doneRef.current = true;
        setErrorMsg(message || code);
        setErrorCode(code);
        setStatus('error');
      },
    );
  }, []);

  const reset = useCallback(() => {
    // 使在途请求失效（旧档案的流式回调不再写入状态）
    reqIdRef.current++;
    abortRef.current = true;
    doneRef.current = true;
    setStatus('idle');
    setText('');
    setSections([]);
    setErrorMsg('');
    setErrorCode('');
    setReport(null);
    setTruncated(false);
    setQuality('ok');
  }, []);

  return { status, text, sections, report, truncated, quality, errorMsg, errorCode, interpret, reset };
}
