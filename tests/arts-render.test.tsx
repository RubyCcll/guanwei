// 各术结果组件渲染验证（真实 calc 数据 → 渲染 → 关键内容断言）
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { baziCalc } from '../shared/core/engine/bazi';
import { ziweiCalc } from '../shared/core/engine/ziwei';
import { qimenCalc } from '../shared/core/engine/qimen';
import { meihuaCalc } from '../shared/core/engine/meihua';
import { liuyaoCalc, mulberry32 } from '../shared/core/engine/liuyao';
import { liurenCalc } from '../shared/core/engine/liuren';
import { xiaoliurenCalc } from '../shared/core/engine/xiaoliuren';
import { BaziResult } from '../src/components/arts/BaziArt';
import { ZiweiResult } from '../src/components/arts/ZiweiArt';
import { QimenResultView } from '../src/components/arts/QimenArt';
import { MeihuaResult } from '../src/components/arts/MeihuaArt';
import { LiuyaoResult } from '../src/components/arts/LiuyaoArt';
import { LiurenResult } from '../src/components/arts/LiurenArt';
import { XiaoliurenResult } from '../src/components/arts/XiaoliurenArt';
import { AstrologyResult } from '../src/components/arts/AstrologyArt';
import { TarotResult } from '../src/components/arts/TarotArt';
import { astrologyCalc } from '../shared/core/engine/astrology';
import { tarotDraw } from '../shared/core/engine/tarot';
import { TAROT_SPREADS } from '../shared/core/data/tarotSpreads';

describe('七东玄结果渲染', () => {
  it('八字结果：四柱命盘/五行流转/十神六亲', () => {
    const data = baziCalc({ y: 1990, m: 6, d: 15, hourIndex: 6, gender: '男' });
    const { container } = render(<BaziResult data={data} />);
    const t = container.textContent || '';
    expect(t).toContain('庚午');
    expect(t).toContain('壬午');
    expect(t).toContain('壬申');
    expect(t).toContain('丙午');
    expect(t).toContain('五行流转');
    expect(t).toContain('十神六亲');
  });
  it('八字结果：乌鲁木齐真太阳时校正提示', () => {
    const data = baziCalc({ y: 2024, m: 6, d: 15, hourIndex: 6, gender: '男', location: { province: '新疆', city: '乌鲁木齐', district: '城区', lng: 87.62, lat: 43.79 } });
    const { container } = render(<BaziResult data={data} />);
    expect(container.textContent).toContain('真太阳时');
  });
  it('紫微结果：命宫/紫微盘网格/主星释义', () => {
    const data = ziweiCalc({ ganzhi: '癸酉', month: 1, day: 1, hour: 0 });
    const { container } = render(<ZiweiResult data={data} />);
    const t = container.textContent || '';
    expect(t).toContain('命宫安于');
    expect(t).toContain('紫微简盘');
    expect(t).toContain('命盘总述');
    expect(container.querySelectorAll('.zw-cell').length).toBe(13); // 12宫+中宫
    expect(t).not.toContain('[object Object]'); // 主星渲染无 join bug
  });
  it('奇门结果：九宫盘 9 格 + 值符值使', () => {
    const data = qimenCalc({ datetime: '2024-08-18T12:00' });
    const { container } = render(<QimenResultView data={data} />);
    expect(container.querySelectorAll('.qm-cell').length).toBe(9);
    expect(container.textContent).toContain('值符');
    expect(container.textContent).toContain('九宫盘');
  });
  it('梅花结果：本卦天泽履/体用生克/卦辞', () => {
    const data = meihuaCalc({ mode: 'num', n1: 1, n2: 2, n3: 3 });
    const { container } = render(<MeihuaResult data={data} />);
    const t = container.textContent || '';
    expect(t).toContain('天泽履');
    expect(t).toContain('体用生克');
    expect(t).toContain('卦辞指引');
  });
  it('六爻结果：爻线 6 行 + 本卦变卦', () => {
    const data = liuyaoCalc(mulberry32(42));
    const { container } = render(<LiuyaoResult data={data} />);
    expect(container.querySelectorAll('.yao-row').length).toBe(6);
    expect(container.textContent).toContain('本卦');
  });
  it('大六壬结果：天地盘 12 宫 + 四课三传', () => {
    const data = liurenCalc('2024-08-18T12:00');
    const { container } = render(<LiurenResult data={data} />);
    expect(container.querySelectorAll('.liuren-item').length).toBe(12);
    expect(container.textContent).toContain('四课三传');
    expect(container.textContent).toContain('初传');
  });
  it('星盘结果：上升/行星/相位/十二宫', () => {
    const data = astrologyCalc(1990, 6, 15, 12, 0, 116.4);
    const { container } = render(<AstrologyResult data={data} />);
    const t = container.textContent || '';
    expect(t).toContain('命盘之纲');
    expect(t).toContain('行星经纬');
    expect(t).toContain('相位经纬');
    expect(t).toContain('十二宫位（整宫制）');
  });
  it('塔罗结果：3 张牌可翻 + 牌阵之示（未翻开不示牌名）', () => {
    const spread = TAROT_SPREADS.find(s => s.id === 'three')!;
    const data = { spread, cards: tarotDraw(3, mulberry32(9)) };
    const { container } = render(<TarotResult data={data} />);
    expect(container.querySelectorAll('.tarot-card').length).toBe(3);
    expect(container.textContent).toContain('牌阵之示');
    // 未翻开：牌阵之示中三张均示「牌未翻启」
    const show = container.querySelectorAll('.result-card')[container.querySelectorAll('.result-card').length - 1];
    expect(show.textContent).toContain('牌未翻启');
    // 点击翻开第一张 → 牌阵之示显示牌名
    fireEvent.click(container.querySelectorAll('.tarot-card')[0]);
    expect(show.textContent).toContain(data.cards[0].name);
    expect(show.textContent).not.toContain(data.cards[1].name);
  });
  it('塔罗结果：单张今日之示', () => {
    const spread = TAROT_SPREADS.find(s => s.id === 'one')!;
    const data = { spread, cards: tarotDraw(1, mulberry32(10)) };
    const { container } = render(<TarotResult data={data} />);
    expect(container.textContent).toContain('今日之示');
  });
  it('小六壬结果：掌诀卡 + 推演轨迹', () => {
    const data = xiaoliurenCalc('time', 1, 1, 1);
    const { container } = render(<XiaoliurenResult data={data} />);
    const t = container.textContent || '';
    expect(t).toContain('大安');
    expect(t).toContain('推演轨迹');
  });
});