import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ReportView from '../src/components/ReportView';
import type { AIReport } from '../src/services/api';

const MOCK_MINGPAN: AIReport = {
  kind: 'mingpan',
  title: '壬水日主命局解读报告',
  overview: '金水相生，智慧流通之命，一生贵在坚持与深潜。',
  rawReading: { summary: '日主壬水坐申金，金生水旺，聪慧灵动。', keyPoints: ['壬水主智，性喜流动', '申金为印，学识之基'] },
  character: {
    summary: '外柔内刚，思虑深远。',
    traits: [
      { name: '聪慧灵动', desc: '壬水主智，反应敏捷，善于变通。' },
      { name: '内敛坚韧', desc: '水势深藏，外显温和而内心坚定。' },
      { name: '重情重义', desc: '金水相生，于情于义皆有坚守。' },
    ],
  },
  lifeStages: [
    { stage: '幼年·少年', age: '0-20 岁', summary: '印星庇荫，学业顺遂。' },
    { stage: '青年', age: '20-40 岁', summary: '财官显现，事业起步。' },
    { stage: '中年', age: '40-60 岁', summary: '身强任财，格局渐显。' },
    { stage: '晚年', age: '60 岁后', summary: '食伤泄秀，名望有成。' },
  ],
  career: { summary: '宜专业技术或学术之路。', direction: '技术/研究/教育', advice: '深耕一域，勿贪多求快。' },
  love: { summary: '感情内敛而深情。', advice: '主动表达，避免沉默误会。' },
  wealth: { summary: '正财为主，稳中有进。', advice: '宜长线理财，忌投机。' },
  advice: '深耕专业；主动表达感情；长线理财；保持运动。',
  conclusion: '此命如水，顺势而为则通达。',
  disclaimer: '凡占问所得，仅供修身养性、怡情遣兴之用，不构成决策依据。',
};

const MOCK_ZHANWEN: AIReport = {
  kind: 'zhanwen',
  title: '出行吉凶占断报告',
  overview: '速喜临身，出行顺遂。',
  rawReading: { summary: '得速喜掌诀，主喜讯迅捷。', keyPoints: ['速喜属火，主动而明'] },
  situation: '当下时机已至，宜行。',
  trend: '近期顺遂，中期有小波折，远期平顺。',
  timing: '宜午时出行，避酉时。',
  advice: '早作准备；途中慎言；归后复盘。',
  conclusion: '吉占，放心前行。',
  disclaimer: '凡占问所得，仅供修身养性、怡情遣兴之用，不构成决策依据。',
};

describe('报告结构化展示', () => {
  it('命盘类：性格/人生阶段时间线/事业爱情财富分栏/建议/结语', () => {
    const { container } = render(<ReportView report={MOCK_MINGPAN} artName="四柱八字" onExport={() => {}} />);
    const t = container.textContent || '';
    expect(t).toContain('壬水日主命局解读报告');
    expect(t).toContain('原始解读 · 先明盘面');
    expect(t).toContain('命主性格');
    expect(t).toContain('聪慧灵动');
    expect(t).toContain('人生阶段');
    expect(t).toContain('幼年·少年');
    expect(t).toContain('事业 · 爱情 · 财富');
    expect(t).toContain('宜向：技术/研究/教育');
    expect(t).toContain('参详建议');
    expect(t).toContain('结语');
    // 结构化元素
    expect(container.querySelectorAll('.trait-cell').length).toBe(3);
    expect(container.querySelectorAll('.tl-item').length).toBe(4);
    expect(container.querySelectorAll('.domain-cell').length).toBe(3);
  });
  it('占问类：局势/趋势/时机分栏', () => {
    const { container } = render(<ReportView report={MOCK_ZHANWEN} artName="小六壬" onExport={() => {}} />);
    const t = container.textContent || '';
    expect(t).toContain('当下局势');
    expect(t).toContain('发展趋势');
    expect(t).toContain('时机宜忌');
    expect(t).toContain('速喜');
  });
  it('字段缺失时优雅降级（不渲染空卡）', () => {
    const partial: AIReport = { ...MOCK_MINGPAN, career: undefined, love: undefined, wealth: undefined, lifeStages: undefined, advice: '', character: { summary: '简', traits: [] } };
    const { container } = render(<ReportView report={partial} artName="四柱八字" onExport={() => {}} />);
    const t = container.textContent || '';
    expect(t).not.toContain('事业 · 爱情 · 财富');
    expect(t).not.toContain('人生阶段');
    expect(t).not.toContain('参详建议');
  });
  it('AI 输出不完整时：原生家庭/心智模式/自定义字段内容不丢失', () => {
    const partial: AIReport = {
      ...MOCK_MINGPAN,
      lifeStages: undefined, career: undefined, love: undefined, wealth: undefined, advice: '',
      family: { background: '家境普通，父母关爱有加。', parents: '父母和蔼可亲。', imprint: '温暖但过度保护。' },
      mind: { action: '行动力偏弱。', pattern: '拖延循环。', growth: '增强行动力。' },
      extraSections: [{ skill: '流年运势', content: '今年财运稳中有升。' }],
    };
    const { container } = render(<ReportView report={partial} artName="紫微斗数" onExport={() => {}} />);
    const t = container.textContent || '';
    expect(t).toContain('原生家庭');
    expect(t).toContain('家境普通');
    expect(t).toContain('心智与行动模式');
    expect(t).toContain('行为循环');
    expect(t).toContain('更多参详');
    expect(t).toContain('流年运势');
    expect(t).toContain('今年财运稳中有升');
    // 仍不渲染缺失区块
    expect(t).not.toContain('事业 · 爱情 · 财富');
  });
});