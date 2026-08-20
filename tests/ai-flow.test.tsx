import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ModulePage from '../src/pages/ModulePage';
import { installDivineFetchMock } from './helpers/divineMock';
import { register, DEFAULT_PROFILE } from '../src/utils/userStore';


// mock SSE 流式响应
function mockSSE(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach(c => controller.enqueue(encoder.encode(c)));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const MOCK_REPORT = {
  kind: 'mingpan' as const,
  title: '壬水日主命局解读报告',
  overview: '金水相生，智慧流通之命。',
  rawReading: { summary: '日主壬水坐申金，金生水旺。', keyPoints: ['壬水主智'] },
  character: { summary: '外柔内刚。', traits: [{ name: '聪慧', desc: '反应敏捷' }] },
  lifeStages: [{ stage: '青年', age: '20-40', summary: '事业起步' }],
  career: { summary: '宜技术之路', direction: '技术', advice: '深耕' },
  love: { summary: '深情内敛', advice: '主动表达' },
  wealth: { summary: '正财为主', advice: '长线' },
  advice: '深耕专业；主动表达。',
  conclusion: '如水顺势。',
  disclaimer: '仅供修身养性。',
};

beforeEach(() => { localStorage.clear(); register('观微客', '1234', DEFAULT_PROFILE); });

describe('AI 报告全流程（点击→流式→ReportView）', () => {
  it('起占后点击召 AI 成报告 → 显示结构化报告', async () => {
    // mock fetch：POST /api/divine → 本地排盘；POST /api/ai/interpret/stream → SSE
    const origFetch = globalThis.fetch;
    const divineMock = installDivineFetchMock(origFetch);
    (globalThis as any).fetch = (url: any, opts: any) => {
      if (String(url).includes('/api/ai/interpret/stream')) {
        const payload = JSON.stringify(MOCK_REPORT);
        const chunks = [
          'data: {"type":"start"}\n\n',
          'data: {"type":"char","char":"{"}\n\n',
          'data: ' + JSON.stringify({ type: 'done', report: MOCK_REPORT, full: payload, truncated: false, quality: 'ok' }) + '\n\n',
        ];
        return Promise.resolve(mockSSE(chunks));
      }
      return divineMock(url, opts);
    };
    try {
      const { container } = render(
        <MemoryRouter initialEntries={['/art/bazi']}>
          <Routes><Route path="/art/:artId" element={<ModulePage />} /></Routes>
        </MemoryRouter>
      );
      // 起占
      const btn = container.querySelector('.btn-divine')!;
      await act(async () => { fireEvent.click(btn); });
      await waitFor(() => expect(container.textContent).toContain('四柱命盘'), { timeout: 3000 });
      // 点 AI 按钮
      const aiBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('召 AI 成报告'))!;
      expect(aiBtn).toBeTruthy();
      await act(async () => { fireEvent.click(aiBtn); });
      // 等待报告渲染
      await waitFor(() => {
        expect(container.textContent).toContain('壬水日主命局解读报告');
      }, { timeout: 5000 });
      expect(container.textContent).toContain('命主性格');
      expect(container.textContent).toContain('人生阶段');
      expect(container.textContent).toContain('事业 · 爱情 · 财富');
      expect(container.textContent).toContain('导 出 报 告');
    } finally {
      (globalThis as any).fetch = origFetch;
    }
  });

  it('换档案重新起占后，内容区不再残留上一档案的 AI 报告', async () => {
    const origFetch = globalThis.fetch;
    const divineMock = installDivineFetchMock(origFetch);
    (globalThis as any).fetch = (url: any, opts: any) => {
      if (String(url).includes('/api/ai/interpret/stream')) {
        const payload = JSON.stringify(MOCK_REPORT);
        const chunks = [
          'data: {"type":"start"}\n\n',
          'data: ' + JSON.stringify({ type: 'done', report: MOCK_REPORT, full: payload, truncated: false, quality: 'ok' }) + '\n\n',
        ];
        return Promise.resolve(mockSSE(chunks));
      }
      return divineMock(url, opts);
    };
    try {
      const { container } = render(
        <MemoryRouter initialEntries={['/art/bazi']}>
          <Routes><Route path="/art/:artId" element={<ModulePage />} /></Routes>
        </MemoryRouter>
      );
      // 第一次起占 → 召 AI → 报告渲染
      const btn = container.querySelector('.btn-divine')!;
      await act(async () => { fireEvent.click(btn); });
      await waitFor(() => expect(container.textContent).toContain('四柱命盘'), { timeout: 3000 });
      const aiBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('召 AI 成报告'))!;
      await act(async () => { fireEvent.click(aiBtn); });
      await waitFor(() => expect(container.textContent).toContain('壬水日主命局解读报告'), { timeout: 5000 });

      // 第二次起占（换档案重新排盘）→ 旧 AI 报告必须清空，回到「可召 AI」待命态
      await act(async () => { fireEvent.click(btn); });
      await waitFor(() => expect(container.textContent).toContain('四柱命盘'), { timeout: 3000 });
      // 新排盘完成后：AI 卡片应回到 idle 文案，而非旧报告
      await waitFor(() => expect(container.textContent).toContain('可召 AI 以现代语言为君详解'), { timeout: 3000 });
      expect(container.textContent).not.toContain('壬水日主命局解读报告');
      expect(container.textContent).not.toContain('命主性格');
    } finally {
      (globalThis as any).fetch = origFetch;
    }
  });
});