// 交互走查：九术完整流程（填表 → 起占 → 结果）+ 关键交互
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ModulePage from '../src/pages/ModulePage';
import { clearRecords } from '../src/utils/recordStore';
import { register, DEFAULT_PROFILE } from '../src/utils/userStore';
import { installDivineFetchMock } from './helpers/divineMock';

const renderArt = (artId: string) =>
  render(
    <MemoryRouter initialEntries={['/art/' + artId]}>
      <Routes><Route path="/art/:artId" element={<ModulePage />} /></Routes>
    </MemoryRouter>
  );

const clickDivine = async (container: HTMLElement) => {
  const btn = container.querySelector('.btn-divine');
  expect(btn).toBeTruthy();
  await act(async () => { fireEvent.click(btn!); });
  await waitFor(() => {
    // 等待凝神结束且结果卡出现
    const t = container.querySelector('.altar-result')?.textContent || '';
    expect(t).not.toContain('凝神');
    expect(container.querySelectorAll('.altar-result .result-card').length).toBeGreaterThan(0);
  }, { timeout: 3000 });
};

beforeEach(() => {
  clearRecords();
  localStorage.clear();
  register('观微客', '1234', DEFAULT_PROFILE);
  // mock 后端起占（/api/divine），AI 流保持真实 fetch（测试环境会失败 → 降级提示路径）
  const orig = globalThis.fetch;
  (globalThis as any).fetch = installDivineFetchMock(orig);
});

describe('九术交互走查', () => {
  it('八字：默认值 → 起占 → 四柱结果 + 自动存档', async () => {
    const { container } = renderArt('bazi');
    await clickDivine(container);
    const t = container.textContent || '';
    expect(t).toContain('四柱命盘');
    expect(t).toContain('五行流转');
    expect(t).toContain('十神六亲');
    expect(t).toContain('召 AI 成报告');
    const { getRecords } = await import('../src/utils/recordStore');
    expect(getRecords().length).toBeGreaterThan(0);
  });
  it('紫微：起占 → 紫微盘网格渲染', async () => {
    const { container } = renderArt('ziwei');
    await clickDivine(container);
    expect(container.querySelectorAll('.zw-cell').length).toBe(13);
  });
  it('奇门：起占 → 九宫盘 + 值符', async () => {
    const { container } = renderArt('qimen');
    await clickDivine(container);
    expect(container.querySelectorAll('.qm-cell').length).toBe(9);
    expect(container.textContent).toContain('值符');
  });
  it('梅花：报数起卦 → 本卦渲染', async () => {
    const { container } = renderArt('meihua');
    await clickDivine(container);
    expect(container.textContent).toContain('体用生克');
  });
  it('六爻：摇卦 → 六爻爻线', async () => {
    const { container } = renderArt('liuyao');
    await clickDivine(container);
    expect(container.querySelectorAll('.yao-row').length).toBe(6);
  });
  it('大六壬：起课 → 天地盘 12 宫', async () => {
    const { container } = renderArt('liuren');
    await clickDivine(container);
    expect(container.querySelectorAll('.liuren-item').length).toBe(12);
  });
  it('小六壬：掐指 → 掌诀 + 推演轨迹', async () => {
    const { container } = renderArt('xiaoliuren');
    await clickDivine(container);
    expect(container.textContent).toContain('推演轨迹');
  });
  it('星盘：起占 → 命盘之纲（LST 上升）', async () => {
    const { container } = renderArt('astrology');
    await clickDivine(container);
    expect(container.textContent).toContain('命盘之纲');
  });
  it('塔罗：抽 3 张 → 未翻不示牌名 → 点击翻牌', async () => {
    const { container } = renderArt('tarot');
    await clickDivine(container);
    const cards = container.querySelectorAll('.tarot-card');
    expect(cards.length).toBe(3);
    // 未翻开前：卡片为背面态、牌阵之示只示位置不示牌义（不断言具体牌名——DOM 含隐藏文本，视觉由 CSS 控制）
    expect(cards[0].classList.contains('face-down')).toBe(true);
    expect(container.textContent).toContain('牌未翻启');
    // 点击翻第一张
    await act(async () => { fireEvent.click(cards[0]); });
    expect(cards[0].classList.contains('revealed')).toBe(true);
    // 翻启后牌阵之示显示牌义（至少显示『位』标题）
    expect(container.textContent).toContain('位');
  });
  it('AI 入口：无 Key 时点击 → 降级提示', async () => {
    const { container } = renderArt('bazi');
    await clickDivine(container);
    const aiBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('召 AI 成报告'));
    expect(aiBtn).toBeTruthy();
    await act(async () => { fireEvent.click(aiBtn!); });
    await waitFor(() => {
      expect(container.textContent).toContain('AI 未应机');
    }, { timeout: 3000 });
  });
});