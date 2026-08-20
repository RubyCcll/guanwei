import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BaziPanel } from '../src/components/arts/BaziArt';
import { register } from '../src/utils/userStore';

beforeEach(() => { localStorage.clear(); });

describe('排盘输入逻辑（档案预填不覆盖用户输入）', () => {
  it('登录档案 1995-08-08，用户改输入 2000-01-01 → 排盘用输入值', async () => {
    register('观微客', '1234', { birthDate: '1995-08-08', birthHourIndex: 4, gender: '女', location: null });
    let captured: any = null;
    const { container } = render(
      <MemoryRouter><BaziPanel onDivine={(inputs, profile) => { captured = { inputs, profile }; }} /></MemoryRouter>
    );
    // 预填应为档案
    const dateInput = container.querySelector('#bz-date') as HTMLInputElement;
    expect(dateInput?.value).toBe('1995-08-08');
    // 用户修改日期
    await act(async () => { fireEvent.change(dateInput, { target: { value: '2000-01-01' } }); });
    expect((container.querySelector('#bz-date') as HTMLInputElement).value).toBe('2000-01-01');
    // 起占
    await act(async () => { fireEvent.click(container.querySelector('.btn-divine')!); });
    await waitFor(() => expect(captured).toBeTruthy());
    // Panel 只收集输入并上送后端；输入应为用户所改的值
    expect(captured.inputs.y).toBe(2000);
    expect(captured.inputs.m).toBe(1);
    expect(captured.inputs.d).toBe(1);
    expect(captured.profile.birthDate).toBe('2000-01-01');
  });
});