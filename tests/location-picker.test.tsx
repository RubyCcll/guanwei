// LocationPicker 回显回归：档案切换后省市区应同步显示（2026-08-20 bug 修复）
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LocationPicker from '../src/components/LocationPicker';

describe('LocationPicker 档案回显', () => {
  it('外部 value 变化（档案切换）后回显新省市区', () => {
    const { rerender, container } = render(<LocationPicker value={null} onChange={() => {}} />);
    const text = () => (container as HTMLElement).textContent || '';
    rerender(<LocationPicker value={{ province: '辽宁省', city: '锦州市', district: '北镇市', lng: 121.796, lat: 41.599 }} onChange={() => {}} />);
    expect(text()).toContain('辽宁省');
    expect(text()).toContain('锦州市');
    expect(text()).toContain('北镇市');
    // 再切换档案（广东）
    rerender(<LocationPicker value={{ province: '广东省', city: '广州市', district: '天河区', lng: 113.335, lat: 23.136 }} onChange={() => {}} />);
    expect(text()).toContain('广东省');
    expect(text()).toContain('广州市');
    expect(text()).toContain('天河区');
    // 不应残留旧值
    expect(text()).not.toContain('辽宁省');
  });
  it('手动定位档案（省名为空）回显手动坐标', () => {
    const { container } = render(<LocationPicker value={{ province: '', city: '', district: '手动定位', lng: 121.5, lat: 41.8 }} onChange={() => {}} />);
    const text = (container as HTMLElement).textContent || '';
    expect(text).toContain('121.5');
    expect(text).toContain('41.8');
  });
});
