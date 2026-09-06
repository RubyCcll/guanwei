// 编排器单测：mock chatOnce，验证三步链调用顺序、步间传递与汇总
import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock llmProvider（编排器依赖 chatOnce）与 chartBrief（不依赖真实盘）
vi.mock('../server/src/services/llmProvider.js', () => ({
  chatOnce: vi.fn(),
}));

import { orchestrateZiweiDeep } from '../server/src/services/orchestrator.js';
import { chatOnce } from '../server/src/services/llmProvider.js';

const mockChatOnce = vi.mocked(chatOnce);

// 简化紫微盘（真实结构子集即可，chartBrief 内部对缺字段有容错）
const ZIWEI_RAW = {
  juName: '金四局', nayin: '剑锋金', ming: 8, shen: 4, zwPos: 3, forward: false,
  sihua: { lu: '武曲', quan: '天同', ke: '廉贞', ji: '太阳' },
  zwStars: { 紫微: 3, 天机: 4, 太阳: 5, 武曲: 10, 天同: 11, 廉贞: 2, 天府: 9, 太阴: 8, 贪狼: 1, 巨门: 7, 天相: 6, 天梁: 5, 七杀: 12, 破军: 2 },
  fuStars: { 左辅: 8, 右弼: 2, 文昌: 4, 文曲: 10, 天魁: 6, 天钺: 12, 禄存: 3, 擎羊: 9, 陀罗: 1, 火星: 7, 铃星: 5, 地空: 11, 地劫: 3, 天马: 2 },
  brightness: { 紫微: '旺', 武曲: '庙' },
  geju: [{ name: '紫府同宫格', ji: '吉' }],
  dayun: [{ start: 5, end: 14, palaceIdx: 7, gz: '丁丑' }],
  curDayunIdx: 0, nominalAge: 36, liunianIdx: 2, liunianPalaceName: '父母宫', liunianStars: ['天梁'],
  palaces: [8, 7, 6, 5, 4, 3, 2, 1, 12, 11, 10, 9],
  sihuaPos: { lu: 10, quan: 11, ke: 2, ji: 5 },
};

describe('orchestrateZiweiDeep（三步编排）', () => {
  beforeEach(() => { mockChatOnce.mockReset(); });

  it('依次调用 4 次（Step A/B/C + 汇总），步间传递上步结论', async () => {
    mockChatOnce
      .mockResolvedValueOnce('{"points":["命宫无主星借天同太阴","金四局"]}')
      .mockResolvedValueOnce('{"points":["夫妻宫太阳落陷","财帛武曲化禄"]}')
      .mockResolvedValueOnce('{"points":["当前大限父母宫天梁","流年行至父母宫"]}')
      .mockResolvedValueOnce('{"title":"测试报告","overview":"总述","rawReading":{"summary":"原始","keyPoints":[]},"advice":"建议","conclusion":"结语","disclaimer":"免责"}');
    const { full, steps } = await orchestrateZiweiDeep(ZIWEI_RAW as any, '近两年事业如何', '{}', '男');
    expect(mockChatOnce).toHaveBeenCalledTimes(4);
    expect(steps.length).toBe(3);
    // 第 2/3/4 次调用的 user 内容必须包含上一步结论（步间传递）
    const user2 = mockChatOnce.mock.calls[1][0].find((m: any) => m.role === 'user').content;
    expect(user2).toContain('【上一步结论 1】');
    expect(user2).toContain('命宫无主星借天同太阴');
    // 汇总步 user 含分步推演与盘面事实
    const user4 = mockChatOnce.mock.calls[3][0].find((m: any) => m.role === 'user').content;
    expect(user4).toContain('【分步推演');
    expect(user4).toContain('【盘面事实');
    expect(full).toContain('测试报告');
  });

  it('每一步 prompt 含当前时间事实与盘面事实（防推算）', async () => {
    mockChatOnce.mockResolvedValue('{"points":["x"]}');
    await orchestrateZiweiDeep(ZIWEI_RAW as any, undefined, '{}', '女');
    const user1 = mockChatOnce.mock.calls[0][0].find((m: any) => m.role === 'user').content;
    expect(user1).toContain('【当前时间 · 事实】');
    expect(user1).toContain('【盘面事实（不可更改）】');
    expect(user1).toContain('不得推算');
  });
});
