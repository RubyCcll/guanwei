// P2 集成走查：登录用户个性化（首页运势 + 面板预填）
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../src/pages/HomePage';
import { BaziPanel } from '../src/components/arts/BaziArt';
import { register, logout, currentUser } from '../src/utils/userStore';

beforeEach(() => { localStorage.clear(); });

describe('用户个性化', () => {
  it('未登录：首页运势为通用版（按当日太阳星座）', () => {
    const { container } = render(<MemoryRouter><HomePage /></MemoryRouter>);
    const t = container.textContent || '';
    expect(t).toContain('入馆录生辰档案');
  });
  it('登录后：首页运势个性化（依档案生辰）', () => {
    register('观微客', '1234', {
      birthDate: '1990-06-15',
      birthTime: '12:00',
      birthHourIndex: 6,
      gender: '男',
      location: { province: '北京', city: '北京市', district: '东城区', lng: 116.4, lat: 39.9 },
    });
    const { container } = render(<MemoryRouter><HomePage /></MemoryRouter>);
    const t = container.textContent || '';
    // 1990-06-15 太阳落双子座
    expect(t).toContain('双子座运势');
    expect(t).toContain('依馆中生辰档案而示');
  });
  it('面板预填：登录后八字面板默认值取自档案', () => {
    register('观微客', '1234', {
      birthDate: '1995-08-08',
      birthTime: '08:30',
      birthHourIndex: 4,   // 辰时
      gender: '女',
      location: { province: '广东', city: '广州', district: '城区', lng: 113.26, lat: 23.13 },
    });
    const { container } = render(
      <MemoryRouter>
        <BaziPanel onDivine={() => {}} />
      </MemoryRouter>
    );
    const dateInput = container.querySelector('#bz-date') as HTMLInputElement;
    expect(dateInput?.value).toBe('1995-08-08'); // CalendarInput 文本输入
    const chip = container.querySelector('.shichen-chip') as HTMLElement;
    expect(chip.textContent).toContain('辰时'); // 08:30 → 辰时徽章
    expect(container.textContent).toContain('广东');
  });
  it('登出后恢复访客态', () => {
    register('观微客', '1234');
    expect(currentUser()?.username).toBe('观微客');
    logout();
    expect(currentUser()).toBeNull();
  });
});