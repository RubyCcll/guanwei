import { describe, it, expect } from 'vitest';
import { analyzeQuestionFit, detectDomain } from '../shared/core/engine/questionFit';

describe('问题适配性分析', () => {
  it('问题域识别：时机/情感/决策/心理', () => {
    expect(detectDomain('我何时跳槽比较好').domain).toBe('timing');
    expect(detectDomain('我和他会复合吗').domain).toBe('love');
    expect(detectDomain('该不该接受新 offer').domain).toBe('career'); // offer 更长优先，属事业抉择
    expect(detectDomain('该不该借钱给他').domain).toBe('decision');
    expect(detectDomain('我最近很迷茫怎么办').domain).toBe('mind');
  });
  it('奇门问感情 → 不适合（false）且有建议', () => {
    const fit = analyzeQuestionFit('qimen', '我和他会复合吗');
    expect(fit.suitable).toBe(false);
    expect(fit.reason).toContain('不甚相契');
    expect(fit.suggestion.length).toBeGreaterThan(10);
    expect(fit.betterArts).toContain('tarot');
  });
  it('奇门问出行 → 适合（true）', () => {
    const fit = analyzeQuestionFit('qimen', '明天出行去广州可以吗');
    expect(fit.suitable).toBe(true);
    expect(fit.suggestion).toBe('');
  });
  it('塔罗问感情 → 适合；塔罗问失物 → 不适合', () => {
    expect(analyzeQuestionFit('tarot', '我们的感情还能挽回吗').suitable).toBe(true);
    const f = analyzeQuestionFit('tarot', '我的东西丢了能找到吗');
    expect(f.suitable).toBe(false);
    expect(f.betterArts).toContain('liuyao');
  });
  it('六爻问事业 → 适合；八字问即时出行 → 部分相契', () => {
    expect(analyzeQuestionFit('liuyao', '这个项目能不能成').suitable).toBe(true);
    expect(analyzeQuestionFit('bazi', '明天出门顺不顺').suitable).toBe('partial');
  });
  it('小六壬问长期人生 → 不适合', () => {
    const fit = analyzeQuestionFit('xiaoliuren', '我的人生方向该往哪里走');
    expect(fit.suitable).toBe(false);
  });
});