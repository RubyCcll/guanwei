// 后端报告解析单测：模拟用户遇到的「AI 输出不完整」场景，验证 family/mind 被结构化保留且评分达标
import { describe, it, expect, vi } from 'vitest';

// 拦截 SQLite 存储模块（node:sqlite 无法在 vitest 中打包），parseReport/parseSections 不依赖它
vi.mock('../server/src/services/divineStore.js', () => ({
  getDivination: () => null,
  attachReport: () => {},
  markAiFailed: () => {},
}));

import { parseReport, parseSections } from '../server/src/routes/ai.js';

// 用户 2026-08-20 实测失败样本：AI 输出到 mind 即结束，缺 lifeStages/career/love/wealth/health/advice/conclusion
const INCOMPLETE_MINGPAN = JSON.stringify({
  title: '温和重情、贵人扶持的探索者',
  overview: '命主为男命，金四局，命宫在申，身宫在子，紫微落卯，大限逆行。命宫无主星，借对宫天同、太阴，性格温和重感情。',
  rawReading: { summary: '命主是金四局，命宫在申，没有主星，借对宫天同太阴来看，性格温和、重感情。', keyPoints: ['命宫在申，无主星，借对宫天同、太阴', '财帛宫在亥，武曲化禄'] },
  character: {
    summary: '命主气质底色是温和、重感情、有同情心，源自命宫借来的天同、太阴。',
    traits: [{ name: '温和重情', desc: '命宫无主星，借对宫天同、太阴，性情温和。' }, { name: '务实理财', desc: '武曲化禄，善于理财。' }, { name: '事业有声望', desc: '天梁化科，事业有声誉。' }],
    coreConflict: '内在核心冲突在于依赖与独立的拉扯。',
    emotion: '情绪底色敏感细腻，易受环境影响。',
  },
  family: {
    background: '原生家庭家境普通，但父母对命主关爱有加。父母宫在戌，主星天同平，家庭氛围和谐。',
    parents: '父母与命主关系良好，父母宫天同，代表父母和蔼可亲。',
    imprint: '家庭印记：原生家庭给予命主温暖和安全感，但过度保护导致命主自信心不足。',
  },
  mind: {
    action: '行动力偏弱，容易拖延，命宫无主星借天同主安逸，加上福德宫文曲化忌，想太多导致启动困难。',
    pattern: '行为循环：常陷入「想太多—拖延—焦虑—依赖他人」的循环。',
    growth: '成长方向：从知道到做到，关键在于增强行动力和减少内耗。',
  },
});

describe('parseReport：AI 输出不完整（缺 lifeStages/career 等）', () => {
  it('family/mind 被结构化保留，评分达标（不再判 poor）', () => {
    const r = parseReport(INCOMPLETE_MINGPAN, 'mingpan');
    expect(r.kind).toBe('mingpan');
    // family/mind 结构化字段
    expect(r.family?.background).toContain('家境普通');
    expect(r.family?.parents).toContain('和蔼可亲');
    expect(r.family?.imprint).toContain('家庭印记');
    expect(r.mind?.action).toContain('行动力偏弱');
    expect(r.mind?.pattern).toContain('行为循环');
    expect(r.mind?.growth).toContain('成长方向');
    // character 保留 coreConflict/emotion
    expect(r.character?.coreConflict).toContain('依赖与独立');
    expect(r.character?.emotion).toContain('敏感细腻');
    // 评分：overview15 + rawReading15 + character20 + family5 + mind5 = 60 → ok
    expect(r.quality).toBe('ok');
  });

  it('sections 兜底包含「原生家庭」「心智与行动模式」区块（内容不丢）', () => {
    const secs = parseSections(INCOMPLETE_MINGPAN);
    const titles = secs.map(s => s.title);
    expect(titles).toContain('原生家庭');
    expect(titles).toContain('心智与行动模式');
    const fam = secs.find(s => s.title === '原生家庭')!;
    expect(fam.content).toContain('家境与氛围');
    expect(fam.content).toContain('父母关系');
    expect(fam.content).toContain('家庭印记');
  });
});

describe('parseReport：完整报告仍正常判定 ok', () => {
  it('字段齐全 → ok 且 extraSections 为空', () => {
    const FULL = JSON.stringify({
      title: '完整报告',
      overview: '一段足够长的总述内容，引用盘面具体数据，超过十个字。',
      rawReading: { summary: '盘面事实白话解释，内容足够长，引用具体数据。', keyPoints: ['要点一', '要点二'] },
      character: { summary: '人格画像总述，足够长，气质底色与内在动力俱全，落到生活画面。', traits: [{ name: '特质', desc: '盘面依据与现实表现，3-4 句展开。' }] },
      lifeStages: [{ stage: '青年', age: '20-40', summary: '探索期分析，结合大限走势展开，足够长。' }],
      career: { summary: '事业总述，足够长，学业与事业皆解读并给出方向。', direction: '技术', advice: '深耕' },
      advice: '建议一：具体可执行动作，含盘面依据；建议二：同样具体可行。',
      conclusion: '结语，温润收束，给命主接纳与力量。',
      disclaimer: '免责声明',
    });
    const r = parseReport(FULL, 'mingpan');
    expect(r.quality).toBe('ok');
    expect((r as any).extraSections).toBeUndefined();
  });
});
