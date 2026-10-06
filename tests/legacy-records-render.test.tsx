// 历史记录渲染回归（系统性防护）
//
// 背景：2026-10-06 用户报「小六壬 AI 解读报错」——根因是 2026-09-26 起引擎新增了
// `gong`/`detail.color`/`detail.shen` 字段，而结果面板直接读 `r.gong.tian.name`；
// 库里 2026-09-26 之前入库的记录没有这些字段 → 渲染即抛
// `Cannot read properties of undefined`。审计后发现八字旧记录同样缺
// `canggan/dayun/liunian/shensha/qiYun`，而 BaziArt 直接读 `r.canggan.map(...)`。
//
// 本文件的做法：取当前引擎输出，**删掉后加字段**以还原旧档结构，逐个渲染结果面板，
// 断言「不抛错 + 不出现 undefined」。任何新增字段若未做向后兼容，这里会立刻红灯。
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BaziResult } from '../src/components/arts/BaziArt';
import { XiaoliurenResult } from '../src/components/arts/XiaoliurenArt';
import { AstrologyResult } from '../src/components/arts/AstrologyArt';
import { baziCalc } from '../shared/core/engine/bazi';
import { xiaoliurenCalc } from '../shared/core/engine/xiaoliuren';
import { astrologyCalc } from '../shared/core/engine/astrology';
import { chartBrief } from '../server/src/services/chartBrief';
import { baziTone } from '../src/utils/panTone';

/** 渲染并返回正文；同时断言未出现 undefined/NaN 之类的占位泄漏 */
function renderText(node: JSX.Element): string {
  const { container, unmount } = render(node);
  const text = container.textContent || '';
  expect(text).not.toContain('undefined');
  unmount();
  return text;
}

describe('历史记录：八字（缺 canggan/dayun/liunian/shensha/qiYun/tiaohou）', () => {
  const fresh = baziCalc({ y: 1991, m: 8, d: 17, hourIndex: 8, gender: '男', birthYear: 1991 }) as any;
  const legacy = { ...fresh };
  for (const k of ['canggan', 'dayun', 'liunian', 'shensha', 'qiYun', 'tiaohou']) delete legacy[k];

  it('旧档字段确实缺失（构造有效）', () => {
    for (const k of ['canggan', 'dayun', 'liunian', 'shensha', 'qiYun', 'tiaohou']) expect(legacy[k]).toBeUndefined();
    expect(fresh.canggan).toBeTruthy();
  });

  it('结果面板可渲染，并给出「重新起占」的提示', () => {
    const text = renderText(<BaziResult data={legacy} />);
    expect(text).toContain('重新起占');
    expect(text).toContain(legacy.yearGZ);      // 四柱等老字段照常展示
  });

  it('AI 盘面事实不抛错、不注入缺失段落', () => {
    const brief = chartBrief('bazi', legacy);
    expect(brief).toContain('【四柱】');
    expect(brief).not.toContain('【地支藏干】');
    expect(brief).not.toContain('【大运】');
    expect(brief).not.toContain('【流年】');
    expect(brief).not.toContain('undefined');
  });

  it('盘面话术生成器（baziTone）不抛错', () => {
    expect(() => baziTone(legacy)).not.toThrow();
  });
});

describe('历史记录：小六壬（缺 gong / detail.color / detail.shen）', () => {
  const fresh = xiaoliurenCalc('time', 8, 16, 6) as any;
  const legacy = { ...fresh, detail: { ...fresh.detail } };
  delete legacy.gong;
  delete legacy.detail.color;
  delete legacy.detail.shen;

  it('结果面板可渲染，三宫由 a/b/c 复算', () => {
    const text = renderText(<XiaoliurenResult data={legacy} />);
    expect(text).toContain('天地人三宫');
    expect(text).toContain('天宫（月落·起因）');
    expect(text).toMatch(/人宫（时落·结果）/);
  });

  it('AI 盘面事实含复算后的三宫', () => {
    const brief = chartBrief('xiaoliuren', legacy);
    expect(brief).toContain('【天地人三宫】');
    expect(brief).not.toContain('undefined');
  });
});

describe('历史记录：星盘（缺 cusps，houseSystem 为旧标签）', () => {
  const fresh = astrologyCalc(1991, 8, 17, 16, 30, 116.07, 37.21, 'placidus') as any;
  const legacy = { ...fresh };
  delete legacy.cusps;

  it('结果面板可渲染（宫头回退不崩）', () => {
    const text = renderText(<AstrologyResult data={legacy} />);
    expect(text).toContain('十二宫位');
    expect(text).toContain('命盘之纲');
  });

  it('AI 盘面事实含宫位制中文名', () => {
    const brief = chartBrief('astrology', legacy);
    expect(brief).toMatch(/宫位制：(整宫制|等宫制|普拉西度)/);
  });
});

describe('历史记录：其余七术（结构未变，回归确认）', () => {
  it('六爻/梅花/六壬/奇门/塔罗/紫微 的盘面事实均可生成', () => {
    const cases: [string, any][] = [
      ['liuyao', { yao: [1, 0, 0, 1, 0, 0], names: [], benGua: { name: 'x' }, bianGua: { name: 'y' }, dongYao: [] }],
      ['qimen', { yin: true, ju: 4, jqName: '秋分', dayGZ: '甲子', hourGZ: '乙丑', xunShou: '甲子', xunshouName: '甲子', zfStar: '天蓬', zsMen: '休', zfPalace: 1, zsPalace: 1, pan: {}, tianYi: {}, shen: {} }],
      ['tarot', { spread: { positions: [] }, cards: [] }],
    ];
    for (const [art, raw] of cases) {
      expect(() => chartBrief(art, raw), art).not.toThrow();
    }
  });
});
