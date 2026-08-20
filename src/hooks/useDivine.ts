import { useCallback, useState } from 'react';

export type DivineStatus = 'idle' | 'casting' | 'done' | 'error';

export function useDivine() {
  const [status, setStatus] = useState<DivineStatus>('idle');
  const [result, setResult] = useState<unknown>(null);
  const [divineId, setDivineId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // fn 为异步计算（后端 /api/divine 调用），返回 { resultRaw, divineId }
  const divine = useCallback(async (fn: () => Promise<{ resultRaw: unknown; divineId: string }>) => {
    setStatus('casting');
    setResult(null);
    setDivineId(null);
    setErrorMsg('');
    // 凝神片刻（保留仪式感）
    await new Promise(r => setTimeout(r, 420));
    try {
      const r = await fn();
      setResult(r.resultRaw);
      setDivineId(r.divineId);
      setStatus('done');
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || '推演未应机');
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setDivineId(null);
    setErrorMsg('');
  }, []);

  return { status, result, divineId, errorMsg, divine, reset };
}
