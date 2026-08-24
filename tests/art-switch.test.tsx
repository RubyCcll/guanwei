// 术数切换回归：/art/qimen 起局后切到 /art/ziwei，不得崩溃（旧 result 不得传给新术 Result 组件）
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import ModulePage from '../src/pages/ModulePage';
import { installDivineFetchMock } from './helpers/divineMock';

// 路由跳转器：真实模拟同一路由组件实例下 artId 变化（挂在 Routes 外层，始终渲染）
function NavBridge({ onNav }: { onNav: (n: (p: string) => void) => void }) {
  const navigate = useNavigate();
  onNav(navigate);
  return null;
}

describe('ModulePage 术数切换稳定性', () => {
  beforeEach(() => { cleanup(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('奇门起局后切换到紫微：同一组件实例，不崩溃且回到待命态', async () => {
    const origFetch = globalThis.fetch;
    const divineMock = installDivineFetchMock(origFetch);
    (globalThis as any).fetch = divineMock;
    let nav: (p: string) => void = () => {};
    try {
      const { container } = render(
        <MemoryRouter initialEntries={['/art/qimen']}>
          <NavBridge onNav={(n) => { nav = n; }} />
          <Routes>
            <Route path="/art/:artId" element={<ModulePage />} />
          </Routes>
        </MemoryRouter>
      );
      // 奇门起局
      const btn = container.querySelector('.btn-divine')!;
      await act(async () => { fireEvent.click(btn); });
      await waitFor(() => expect(container.textContent).toContain('奇门遁甲'), { timeout: 3000 });
      // 确认已有排盘结果
      expect(container.textContent).not.toContain('静候星布');

      // 同一实例内路由跳转：奇门 → 紫微
      await act(async () => { nav('/art/ziwei'); });
      await act(async () => { await new Promise(r => setTimeout(r, 80)); });

      // 不崩溃：无错误占位；回到紫微待命态（静候星布），且不残留奇门结果
      expect(container.textContent).not.toContain('此页一时未应机');
      expect(container.textContent).not.toContain('滞');
      expect(container.textContent).toContain('静候星布');
    } finally {
      (globalThis as any).fetch = origFetch;
    }
  });
});
