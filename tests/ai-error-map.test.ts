// AI 错误码映射单测：服务商 HTTP 错误 → 用户可行动的引导码
import { describe, it, expect, vi } from 'vitest';

vi.mock('../server/src/services/divineStore.js', () => ({
  getDivination: () => null,
  attachReport: () => {},
  markAiFailed: () => {},
}));

import { mapLlmError } from '../server/src/routes/ai.js';

describe('mapLlmError', () => {
  it('401 → Key 无效引导码', () => {
    const r = mapLlmError(new Error('AI_HTTP_401'));
    expect(r?.code).toBe('AI_HTTP_401');
    expect(r?.message).toContain('Key');
  });

  it('403 → 权限引导', () => {
    const r = mapLlmError(new Error('AI_HTTP_403'));
    expect(r?.code).toBe('AI_HTTP_403');
  });

  it('404 → 模型名引导', () => {
    const r = mapLlmError(new Error('AI_HTTP_404'));
    expect(r?.code).toBe('AI_HTTP_404');
    expect(r?.message).toContain('模型');
  });

  it('402/429 → 额度/限流引导（统一 429 码）', () => {
    expect(mapLlmError(new Error('AI_HTTP_402'))?.code).toBe('AI_HTTP_429');
    expect(mapLlmError(new Error('AI_HTTP_429'))?.code).toBe('AI_HTTP_429');
  });

  it('5xx → 服务商故障引导，保留原始码', () => {
    for (const s of [500, 502, 503, 504]) {
      const r = mapLlmError(new Error('AI_HTTP_' + s));
      expect(r?.code).toBe('AI_HTTP_' + s);
      expect(r?.message).toContain('不可用');
    }
  });

  it('其他码 → 通用异常引导', () => {
    const r = mapLlmError(new Error('AI_HTTP_418'));
    expect(r?.code).toBe('AI_HTTP_418');
    expect(r?.message).toContain('418');
  });

  it('非 HTTP 错误 → null（走 AI_FAILED 兜底）', () => {
    expect(mapLlmError(new Error('AI_UNCONFIGURED'))).toBeNull();
    expect(mapLlmError(new Error('别的错误'))).toBeNull();
    expect(mapLlmError(undefined)).toBeNull();
  });
});
