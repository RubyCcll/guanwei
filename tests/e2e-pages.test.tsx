// 交互走查 2：导航切换 / 古籍详情 / 学馆练习 / 历史记录
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from '../src/App';
import ClassicsPage from '../src/pages/ClassicsPage';
import AcademyPage from '../src/pages/AcademyPage';
import HistoryPage from '../src/pages/HistoryPage';
import { clearRecords, saveRecord, getRecords } from '../src/utils/recordStore';
import { baziCalc } from '../shared/core/engine/bazi';
import { meihuaCalc } from '../shared/core/engine/meihua';

beforeEach(() => { clearRecords(); });

// 每个用例独立渲染（MemoryRouter initialEntries 只在挂载时生效）
const renderAt = (path: string, page: React.ComponentType) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/classics" element={<ClassicsPage />} />
        <Route path="/classics/:id" element={<ClassicsPage />} />
        <Route path="/academy/:id" element={<AcademyPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<HistoryPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('导航与内容页走查', () => {
  it('古籍：列表 12 部 → 搜索筛选 → 详情（原文+注译+出处）', () => {
    const c1 = renderAt('/classics', ClassicsPage);
    expect(c1.container.textContent).toContain('渊海子平');
    expect(c1.container.textContent).toContain('紫微斗数全书');
    // 搜索
    const input = c1.container.querySelector('input.input-line')!;
    fireEvent.change(input, { target: { value: '周易' } });
    expect(c1.container.textContent).toContain('周易');
    expect(c1.container.textContent).not.toContain('渊海子平');
    // 详情（独立渲染）
    const c2 = renderAt('/classics/zhouyi', ClassicsPage);
    const t = c2.container.textContent || '';
    expect(t).toContain('天行健，君子以自强不息');
    expect(t).toContain('注译');
    expect(t).toContain('《周易·乾卦》');
    expect(t).toContain('版本说明');
    expect(t).toContain('观 六爻');  // 关联术数跳转
  });
  it('学馆：课程详情 → 练习自检（对 + 错）', () => {
    const c1 = renderAt('/academy/foundation-wuxing', AcademyPage);
    const t0 = c1.container.textContent || '';
    expect(t0).toContain('木生火、火生土');
    const input = c1.container.querySelector('input.input-line')!;
    fireEvent.change(input, { target: { value: '火生土；火克金' } });
    fireEvent.click(Array.from(c1.container.querySelectorAll('button')).find(b => b.textContent?.includes('自 检'))!);
    expect(c1.container.textContent).toContain('对 · 甚善');
    // 错误答案
    const c2 = renderAt('/academy/foundation-ganzhi', AcademyPage);
    const input2 = c2.container.querySelector('input.input-line')!;
    fireEvent.change(input2, { target: { value: '甲辰年' } });
    fireEvent.click(Array.from(c2.container.querySelectorAll('button')).find(b => b.textContent?.includes('自 检'))!);
    const t2 = c2.container.textContent || '';
    expect(t2).toContain('未中 · 再思');
    expect(t2).toContain('参考答案：乙巳年');
  });
  it('历史：列表 → 筛选 → 详情回看', () => {
    saveRecord({ artId: 'bazi', createdAt: 1000, result: baziCalc({ y: 1990, m: 6, d: 15, hourIndex: 6, gender: '男' }) });
    saveRecord({ artId: 'meihua', createdAt: 2000, result: meihuaCalc({ mode: 'num', n1: 1, n2: 2, n3: 3 }) });
    const c1 = renderAt('/history', HistoryPage);
    let t = c1.container.textContent || '';
    expect(t).toContain('2 次占问');
    expect(t).toContain('庚午年');
    // 筛选：点击 SongSelect 触发器 → 选择八字
    const trigger = c1.container.querySelectorAll('.song-select .trigger')[0] as HTMLElement;
    fireEvent.click(trigger);
    const opt = Array.from(c1.container.querySelectorAll('.song-select .panel button')).find(b => b.textContent === '四柱八字');
    fireEvent.click(opt!);
    t = c1.container.textContent || '';
    expect(t).toContain('庚午年');
    expect(t).not.toContain('天泽履');
    // 详情回看
    const recs = getRecords();
    const meihuaRec = recs.find(r => r.artId === 'meihua');
    const c2 = renderAt('/history/' + meihuaRec.id, HistoryPage);
    t = c2.container.textContent || '';
    expect(t).toContain('天泽履');
    expect(t).toContain('体用生克');
    expect(t).toContain('删 此 记 录');
  });
  it('App 整体：首页渲染（今日黄历真实数据）', () => {
    const { container } = render(<App />);
    const t = container.textContent || '';
    expect(t).toContain('观微知著');
    expect(t).toContain('今日黄历');
    expect(t).toMatch(/农历|月相|宜：/);
  });
});