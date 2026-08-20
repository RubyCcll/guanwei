import type { QuestionCategory, Spread, DrawnCard } from '@/types';
import type { InterpretationResult } from '@/utils/tarotEngine';

// 开发环境直连后端（规避 proxy/IPv6 组合的 SSE 不确定性）；生产同域 /api
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';
// 诊断：全局暴露当前 API 基址
if (typeof window !== 'undefined') { (window as any).__API_BASE__ = API_BASE; }
console.log('[观微] API_BASE =', API_BASE);

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  
  return res.json();
}

export const api = {
  health: () => request<{ status: string; timestamp: number }>('/health'),
  
  tarot: {
    getCards: () => request<{ cards: any[] }>('/tarot/cards'),
    
    getSpreads: () => request<{ spreads: Spread[] }>('/tarot/spreads'),
    
    draw: (spreadId: string, customSpread?: Spread) => request<{ cards: DrawnCard[]; spread: Spread }>('/tarot/draw', {
      method: 'POST',
      body: JSON.stringify({ spreadId, customSpread }),
    }),
    
    interpret: (cards: DrawnCard[], spread: Spread, question: string, category: QuestionCategory) => 
      request<InterpretationResult>('/tarot/interpret', {
        method: 'POST',
        body: JSON.stringify({ cards, spread, question, category }),
      }),
    
    analyze: (question: string, category?: string) => request('/tarot/analyze', {
      method: 'POST',
      body: JSON.stringify({ question, category }),
    }),
    
    streamInterpret: (
      cards: DrawnCard[],
      spread: Spread,
      question: string,
      category: QuestionCategory,
      onEvent: (event: any) => void,
      onDone: () => void,
      onError?: (error: Error) => void
    ) => {
      const eventSource = new EventSource(`${API_BASE}/tarot/interpret/stream`);
      
      const postData = async () => {
        try {
          const res = await fetch(`${API_BASE}/tarot/interpret/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cards, spread, question, category }),
          });
          
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          
          if (!reader) {
            onError?.(new Error('无法读取响应'));
            return;
          }
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  onDone();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  onEvent(parsed);
                } catch (e) {
                  console.error('解析SSE数据失败:', e);
                }
              }
            }
          }
          onDone();
        } catch (e: any) {
          onError?.(e);
        }
      };
      
      postData();
      
      return () => {
        eventSource.close();
      };
    },
  },
};

// AI 解读客户端

export interface AIInterpretSection { title: string; content: string }

export interface AIInterpretResult {
  provider?: string;
  sections: AIInterpretSection[];
}

export interface AIReport {
  kind: 'mingpan' | 'zhanwen';
  title: string;
  overview: string;
  rawReading: { summary: string; keyPoints: string[] };
  character?: { summary: string; traits: { name: string; desc: string }[] };
  lifeStages?: { stage: string; age: string; summary: string }[];
  career?: { summary: string; direction: string; advice: string };
  love?: { summary: string; advice: string };
  wealth?: { summary: string; advice: string };
  health?: { summary: string; advice: string };
  situation?: string;
  trend?: string;
  timing?: string;
  advice: string;
  conclusion: string;
  disclaimer: string;
  suitability?: { suitable: boolean | 'partial'; note: string; suggestion: string };
  chapters?: { skill: string; content: string }[];  // 兼容旧结构
  extraSections?: { skill: string; content: string }[];  // AI 自定义字段兜底
}

/**
 * 流式 AI 解读：POST /api/ai/interpret/stream
 * onEvent: 收到字符块；onDone: 结束（含结构化 sections）；onError: 失败
 */
export async function aiInterpretStream(
  params: { artId: string; divineId?: string; question?: string; resultRaw?: unknown; semantic?: unknown; profile?: unknown; reportMode?: boolean; fit?: { suitable: boolean | 'partial'; reason: string; suggestion: string } },
  onEvent: (char: string) => void,
  onDone: (sections: AIInterpretSection[], full: string, report?: AIReport, truncated?: boolean, quality?: 'ok' | 'poor') => void,
  onError?: (code: string, message: string) => void,
): Promise<void> {
  let timeoutTimer: ReturnType<typeof setInterval> | null = null;
  try {
    const res = await fetch(API_BASE + '/ai/interpret/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      onError?.(err.error || 'AI_HTTP_' + res.status, err.message || 'AI 解读暂未应机');
      return;
    }
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastDataAt = Date.now();
    if (!reader) {
      onError?.('NO_STREAM', '无法读取响应');
      return;
    }
    // 60s 无数据 → 视为超时（DeepSeek 长报告生成较慢，放宽到 90s）
    timeoutTimer = setInterval(() => {
      if (Date.now() - lastDataAt > 90000) {
        clearInterval(timeoutTimer);
        onError?.('STREAM_TIMEOUT', 'AI 生成逾时，请重试');
      }
    }, 5000);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lastDataAt = Date.now();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        try {
          const data = JSON.parse(payload);
          if (data.type === 'char') onEvent(data.char);
          else if (data.type === 'done') onDone(data.sections || [], data.full || '', data.report, data.truncated === true, data.quality === 'poor' ? 'poor' : 'ok');
          else if (data.type === 'error') onError?.(data.code, data.message);
        } catch { /* 忽略 */ }
      }
    }
    if (timeoutTimer) clearInterval(timeoutTimer);
    // 若未收到 done 事件，也视为结束（useAIInterpret 以 flag 防重）
    onDone([], '', undefined, false, 'ok');
  } catch (e: any) {
    if (timeoutTimer) clearInterval(timeoutTimer);
    console.error('[观微 AI] 流式调用异常:', e);
    onError?.('NETWORK', e?.message || '网络异常');
  }
}

// 解读报告导出（Markdown 下载）
// 解读报告导出（Markdown 下载）
// ===== 排盘（v6：后端计算 + 入库） =====
export interface DivineResult {
  ok: boolean;
  divineId: string;
  resultRaw: unknown;
  display?: unknown;
}

export async function apiDivine(username: string, artId: string, inputs: unknown, profile?: unknown, question?: string): Promise<DivineResult> {
  const res = await fetch(API_BASE + '/divine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, artId, inputs, profile, question }),
  });
  if (!res.ok) {
    let msg = '推演未应机';
    try { const e = await res.json(); msg = e.message || e.error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

export interface DivineHistoryItem {
  divineId: string;
  artId: string;
  question: string | null;
  createdAt: number;
  hasReport: boolean;
  status: string;
}

export async function apiDivineHistory(username: string, page = 1, pageSize = 20): Promise<{ list: DivineHistoryItem[]; total: number }> {
  const res = await fetch(API_BASE + '/divine?username=' + encodeURIComponent(username) + '&page=' + page + '&pageSize=' + pageSize);
  if (!res.ok) return { list: [], total: 0 };
  return res.json();
}

export async function apiDivineDetail(id: string, username: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(API_BASE + '/divine/' + id + '?username=' + encodeURIComponent(username));
  if (!res.ok) return null;
  return res.json();
}

export async function apiDivineDelete(id: string, username: string): Promise<boolean> {
  const res = await fetch(API_BASE + '/divine/' + id + '?username=' + encodeURIComponent(username), { method: 'DELETE' });
  return res.ok;
}

export function downloadReport(report: AIReport, artName: string, question: string): void {
  const lines = [
    '# ' + report.title,
    '',
    '> 术别：' + artName + '　·　所问：' + (question || '（未书，心念已至）'),
    '',
    '## 总述',
    '',
    report.overview,
    '',
    ...report.chapters.flatMap(c => ['## ' + (c.skill || '参详'), '', c.content, '']),
    '## 结语',
    '',
    report.conclusion,
    '',
    '---',
    report.disclaimer,
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (report.title || '观微报告') + '.md';
  a.click();
  URL.revokeObjectURL(url);
}

export async function aiProviderStatus(): Promise<{ providers: { id: string; label: string; configured: boolean; model: string }[]; active: string | null }> {
  const res = await fetch(API_BASE + '/ai/providers');
  return res.ok ? res.json() : { providers: [], active: null };
}