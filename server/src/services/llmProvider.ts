// LLM Provider 适配层：Gemini / Groq / DeepSeek / Qwen / 自定义 OpenAI 兼容端点
// Key 只存服务端环境变量，绝不进入前端

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type ProviderId = 'gemini' | 'groq' | 'deepseek' | 'qwen' | 'custom';

interface ProviderConfig {
  id: ProviderId;
  label: string;
  keyEnv: string;
  endpoint?: string;
  modelEnv?: string;
  defaultModel: string;
  // OpenAI 兼容（chat/completions）还是 Google 格式
  kind: 'openai' | 'google';
}

const PROVIDERS: ProviderConfig[] = [
  { id: 'gemini', label: 'Gemini', keyEnv: 'LLM_GEMINI_KEY', modelEnv: 'LLM_GEMINI_MODEL', defaultModel: 'gemini-2.0-flash', kind: 'google' },
  { id: 'groq', label: 'Groq', keyEnv: 'LLM_GROQ_KEY', modelEnv: 'LLM_GROQ_MODEL', defaultModel: 'llama-3.3-70b-versatile', kind: 'openai', endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
  { id: 'deepseek', label: 'DeepSeek', keyEnv: 'LLM_DEEPSEEK_KEY', modelEnv: 'LLM_DEEPSEEK_MODEL', defaultModel: 'deepseek-chat', kind: 'openai', endpoint: 'https://api.deepseek.com/v1/chat/completions' },
  { id: 'qwen', label: '通义千问', keyEnv: 'LLM_QWEN_KEY', modelEnv: 'LLM_QWEN_MODEL', defaultModel: 'qwen-turbo', kind: 'openai', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' },
  { id: 'custom', label: '自定义端点', keyEnv: 'LLM_CUSTOM_KEY', modelEnv: 'LLM_CUSTOM_MODEL', defaultModel: 'gpt-4o-mini', kind: 'openai' },
];

export function activeProvider(): ProviderConfig | null {
  const env = process.env.LLM_PROVIDER as ProviderId | undefined;
  if (env) {
    const p = PROVIDERS.find(x => x.id === env);
    if (p && process.env[p.keyEnv]) return p;
  }
  // 自动探测：第一个有 Key 的 Provider
  return PROVIDERS.find(p => process.env[p.keyEnv]) || null;
}

export function providerStatus(): { id: string; label: string; configured: boolean; model: string }[] {
  return PROVIDERS.map(p => ({
    id: p.id,
    label: p.label,
    configured: !!process.env[p.keyEnv],
    model: process.env[p.modelEnv || ''] || p.defaultModel,
  }));
}

async function callOpenAI(cfg: ProviderConfig, messages: ChatMessage[], stream: boolean): Promise<Response> {
  const endpoint = cfg.endpoint || process.env.LLM_CUSTOM_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env[cfg.keyEnv],
    },
    body: JSON.stringify({
      model: process.env[cfg.modelEnv || ''] || cfg.defaultModel,
      messages,
      stream,
      temperature: 0.8,
      // 输出上限：长报告（原始解读+性格+阶段+三域+建议）约需 3-6K tokens
      max_tokens: Number(process.env.LLM_MAX_TOKENS || 8192),
      // 关闭思考模式：pro 模型默认思考，reasoning_content 会占满输出预算导致正文截断（finish_reason: length）
      ...(cfg.id === 'deepseek' ? { thinking: { type: 'disabled' } } : {}),
      // 强制 JSON 输出（DeepSeek/Groq/Qwen 及 OpenAI 兼容端点均支持）
      response_format: { type: 'json_object' },
    }),
  });
}

async function callGoogle(cfg: ProviderConfig, messages: ChatMessage[], stream: boolean): Promise<Response> {
  const model = process.env[cfg.modelEnv || ''] || cfg.defaultModel;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env[cfg.keyEnv]}`;
  // 合并 messages 为 Google 格式：system → systemInstruction，其余 → contents
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      ...(stream ? { stream: true } : {}),
      generationConfig: { temperature: 0.8, responseMimeType: 'application/json' },
    }),
  });
}

// 瞬时错误重试（429/5xx/网络），最多 2 次
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (!/AI_HTTP_(429|5\d\d|400)/.test(e.message || '')) throw e;
      if (attempt < 2) {
        console.warn('[llm] ' + label + ' 第 ' + (attempt + 1) + ' 次失败(' + e.message + ')，重试…');
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

// 非流式调用：返回完整文本
export async function chatOnce(messages: ChatMessage[]): Promise<string> {
  const cfg = activeProvider();
  if (!cfg) throw new Error('AI_UNCONFIGURED');
  const res = await withRetry(async () => {
    const r0 = cfg.kind === 'google' ? await callGoogle(cfg, messages, false) : await callOpenAI(cfg, messages, false);
    if (!r0.ok) {
      const body = await r0.text().catch(() => '');
      console.error('[llm] HTTP ' + r0.status + ' 响应体:', body.slice(0, 500));
      throw new Error('AI_HTTP_' + r0.status);
    }
    return r0;
  }, 'chatOnce');
  const data = await res.json();
  if (cfg.kind === 'google') {
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    return text;
  }
  return data?.choices?.[0]?.message?.content ?? '';
}

// 最近一次流式调用的结束原因（'stop' | 'length' 截断 | null）
export let lastFinishReason: string | null = null;

// 流式调用：逐块输出文本
export async function* chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const cfg = activeProvider();
  if (!cfg) throw new Error('AI_UNCONFIGURED');
  const res = await withRetry(async () => {
    const r0 = cfg.kind === 'google' ? await callGoogle(cfg, messages, true) : await callOpenAI(cfg, messages, true);
    if (!r0.ok) {
      const body = await r0.text().catch(() => '');
      console.error('[llm] stream HTTP ' + r0.status + ' 响应体:', body.slice(0, 500));
      throw new Error('AI_HTTP_' + r0.status);
    }
    return r0;
  }, 'chatStream');
  lastFinishReason = null;
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // 按行解析 SSE
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('data:')) {
        const payload = t.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          if (cfg.kind === 'google') {
            const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
            if (text) yield text;
          } else {
            const choice = json?.choices?.[0];
            if (choice?.finish_reason) lastFinishReason = choice.finish_reason;
            const delta = choice?.delta?.content ?? '';
            if (delta) yield delta;
          }
        } catch { /* 忽略非 JSON 行 */ }
      }
    }
  }
}