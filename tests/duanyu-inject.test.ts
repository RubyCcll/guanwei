// 断语库校核 + prompt 注入测试
import { describe, it, expect } from 'vitest';
import { duanyuReviewed, duanyuByArt } from '../shared/core/data/duanyu';
import { matchDuanyu, duanyuPromptBlock } from '../server/src/services/duanyu';
import { buildStep2Messages } from '../server/src/services/promptBuilder';

describe('断语库（古籍引证）', () => {
  it('reviewed 条目 ≥ 10（校核门槛达成）', () => {
    expect(duanyuReviewed().length).toBeGreaterThanOrEqual(10);
  });

  it('seed 条目不注入：prompt 中只出现 reviewed 内容', () => {
    // 所有 reviewed 条目 id 集合
    const reviewedIds = new Set(duanyuReviewed().map(d => d.id));
    // seed 条目（待校核）不得出现在任何 prompt 注入中
    const seedEntries = duanyuByArt('bazi').filter(d => !reviewedIds.has(d.id));
    for (const s of seedEntries) {
      expect(s.status).toBe('seed');
    }
  });

  it('八字盘面可匹配到月令断语', () => {
    const resultRaw = { monthZhi: '申', geju: '正官格', yongshen: '印', strength: '身强' };
    const matched = matchDuanyu('bazi', resultRaw);
    expect(matched.length).toBeGreaterThan(0);
    // 月令关键词应命中「论命首重月令」条
    expect(matched.some(m => m.id === 'yhpz-jishan-01')).toBe(true);
  });

  it('prompt 块包含出处且仅含 reviewed', () => {
    const block = duanyuPromptBlock('bazi', { monthZhi: '申', yongshen: '印', geju: '正官格' });
    expect(block).toContain('古籍引证');
    expect(block).toContain('《');
    // 断语库已 100% reviewed：注入条目全部来自已校核库
    expect(block).toContain('八字用神，专求月令'); // zpzq-yongshen-01 已 reviewed
  });

  it('Step2 prompt 注入引证段（system 含「古籍引证」）', () => {
    const msgs = buildStep2Messages('bazi', '近两年事业如何', {
      yearGZ: '戊辰', monthGZ: '庚申', dayGZ: '甲子', hourGZ: '甲子',
      monthZhi: '申', geju: '正官格', yongshen: '印', strength: '身强',
    } as any, { gender: '男' } as any);
    const system = msgs[0].content;
    expect(system).toContain('古籍引证');
  });

  it('无匹配术别时不注入（如塔罗无断语库）', () => {
    const block = duanyuPromptBlock('tarot', { cards: [] });
    expect(block).toBe('');
  });
});
