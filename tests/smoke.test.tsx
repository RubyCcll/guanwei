import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HomePage from '../src/pages/HomePage';
import ModulePage from '../src/pages/ModulePage';
import AboutPage from '../src/pages/AboutPage';
import ClassicsPage from '../src/pages/ClassicsPage';
import AcademyPage from '../src/pages/AcademyPage';
import HistoryPage from '../src/pages/HistoryPage';
import SiteNav from '../src/components/SiteNav';
import SiteFooter from '../src/components/SiteFooter';

describe('观微 · 第一步骨架冒烟', () => {
  it('首页：Hero + 九术册页 ×9 + 观微三法 + 黄历星运占位', () => {
    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    expect(container.textContent).toContain('观微知著');
    expect(container.textContent).toContain('九术册页');
    expect(container.querySelectorAll('.art-card').length).toBe(9);
    expect(container.textContent).toContain('四柱八字');
    expect(container.textContent).toContain('紫微斗数');
    expect(container.textContent).toContain('观微三法');
    expect(container.textContent).toContain('今日黄历');
    expect(container.textContent).toContain('今日星运');
  });

  it('八字模块：标题/诗句/起占按钮/溯源/返册页/免责声明', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/art/bazi']}>
        <Routes>
          <Route path="/art/:artId" element={<ModulePage />} />
        </Routes>
      </MemoryRouter>
    );
    const t = container.textContent || '';
    expect(t).toContain('四柱八字');
    expect(t).toContain('排 盘');
    expect(t).toContain('布四柱 · 观五行 · 推十神');
    expect(t).toContain('李虚中');
    expect(t).toContain('返册页');
    expect(t).toContain('观微三戒');
  });

  it('塔罗模块：问镜面板 + 抽取张数', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/art/tarot']}>
        <Routes>
          <Route path="/art/:artId" element={<ModulePage />} />
        </Routes>
      </MemoryRouter>
    );
    const t = container.textContent || '';
    expect(t).toContain('问镜');
    expect(t).toContain('洗 牌 抽 牌');
    expect(t).toContain('牌阵');
  });
  it('星盘模块：出生时刻与地点输入', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/art/astrology']}>
        <Routes>
          <Route path="/art/:artId" element={<ModulePage />} />
        </Routes>
      </MemoryRouter>
    );
    const t = container.textContent || '';
    expect(t).toContain('布 星 图');
    expect(t).toContain('出生时刻');
    expect(t).toContain('上升点需经纬度');
  });

  it('八字面板：出生日期/时辰/性别/出生地点选择器', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/art/bazi']}>
        <Routes>
          <Route path="/art/:artId" element={<ModulePage />} />
        </Routes>
      </MemoryRouter>
    );
    const t = container.textContent || '';
    expect(t).toContain('出生日期（公历 / 农历）');
    expect(t).toContain('出生时刻');
    expect(t).toContain('性别');
    expect(t).toContain('出生地点（真太阳时校正）');
    expect(t).toContain('省份');
    expect(t).toContain('公历');
  });

  it('小六壬面板：掐指占时按钮与取数方式', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/art/xiaoliuren']}>
        <Routes>
          <Route path="/art/:artId" element={<ModulePage />} />
        </Routes>
      </MemoryRouter>
    );
    const t = container.textContent || '';
    expect(t).toContain('掐 指 一 算');
    expect(t).toContain('大安起月 · 月上起日 · 日上起时');
  });

  it('未知术名：优雅降级提示', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/art/unknown']}>
        <Routes>
          <Route path="/art/:artId" element={<ModulePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container.textContent).toContain('术无此名');
  });

  it('导航：7 菜单齐全', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteNav />
      </MemoryRouter>
    );
    const t = container.textContent || '';
    ['首页', '九术', '古籍', '学馆', '缘起'].forEach(m => expect(t).toContain(m));
    expect(t).toContain('入 馆'); // 档案区入口
  });

  it('导航高亮：/art/bazi → 九术激活', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/art/bazi']}>
        <SiteNav />
      </MemoryRouter>
    );
    const active = container.querySelectorAll('.nav-links a.active');
    expect(active.length).toBe(1);
    expect(active[0].textContent).toContain('九术');
  });

  it('导航高亮：/classics → 古籍激活', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/classics']}>
        <SiteNav />
      </MemoryRouter>
    );
    const active = container.querySelectorAll('.nav-links a.active');
    expect(active.length).toBe(1);
    expect(active[0].textContent).toBe('古籍');
  });

  it('其余页面：缘起/古籍/学馆/历史/页脚', () => {
    const a = render(<MemoryRouter><AboutPage /></MemoryRouter>);
    expect(a.container.textContent).toContain('观微缘起');
    const c = render(<MemoryRouter><ClassicsPage /></MemoryRouter>);
    expect(c.container.textContent).toContain('渊海子平');
    const ac = render(<MemoryRouter><AcademyPage /></MemoryRouter>);
    expect(ac.container.textContent).toContain('五行生克');
    const h = render(<MemoryRouter><HistoryPage /></MemoryRouter>);
    expect(h.container.textContent).toContain('占问记录');
    const f = render(<MemoryRouter><SiteFooter /></MemoryRouter>);
    expect(f.container.textContent).toContain('凡占问所得，仅供修身养性');
  });
});