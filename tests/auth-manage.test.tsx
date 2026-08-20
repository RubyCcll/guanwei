import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from '../src/pages/AuthPage';
import { register, addSampleProfile, updateSampleProfile, promoteSampleProfile, currentUser } from '../src/utils/userStore';

beforeEach(() => { localStorage.clear(); });

describe('档案管理（列表/编辑/切换）', () => {
  it('注册后档案列表显示主档案 + 示例档案卡片', () => {
    register('观微客', '1234');
    addSampleProfile('1995 生辰', { birthDate: '1995-08-08', birthTime: '08:30', birthHourIndex: 4, gender: '女', location: null });
    const { container } = render(<MemoryRouter><AuthPage /></MemoryRouter>);
    const t = container.textContent || '';
    expect(t).toContain('主档案 · 观微客');
    expect(t).toContain('1995 生辰');
    expect(t).toContain('08:30');
    expect(container.querySelectorAll('.profile-card').length).toBe(2);
  });
  it('编辑示例档案：改日期后保存生效', () => {
    register('观微客', '1234');
    const s = addSampleProfile('样例', { birthDate: '1995-08-08', birthTime: '08:30', birthHourIndex: 4, gender: '女', location: null })!;
    const id = s.samples[0].id;
    updateSampleProfile(id, { birthDate: '1996-01-01', birthTime: '08:30', birthHourIndex: 4, gender: '女', location: null });
    const u = currentUser()!;
    expect(u.samples[0].profile.birthDate).toBe('1996-01-01');
  });
  it('切换主档案：示例变主，原主转示例「旧主档案」', () => {
    register('观微客', '1234');
    const s = addSampleProfile('1995 生辰', { birthDate: '1995-08-08', birthTime: '08:30', birthHourIndex: 4, gender: '女', location: null })!;
    promoteSampleProfile(s.samples[0].id);
    const u = currentUser()!;
    expect(u.profile.birthDate).toBe('1995-08-08');
    expect(u.samples.some(x => x.name === '旧主档案')).toBe(true);
  });
  it('档案页渲染：列表态卡片可点击进入编辑态', () => {
    register('观微客', '1234');
    const { container } = render(<MemoryRouter><AuthPage /></MemoryRouter>);
    // 点击主档案卡 → 编辑态
    act(() => { fireEvent.click(container.querySelector('.profile-card.primary')!); });
    expect(container.textContent).toContain('编 辑');
    expect(container.textContent).toContain('主档案（默认账号档案）');
  });
});