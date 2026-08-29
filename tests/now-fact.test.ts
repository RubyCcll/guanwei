// 当前时间事实注入测试：AI 必须被告知"现在是哪年"，防自行推算年份（2025-01 bug 回归）
import { describe, it, expect } from 'vitest';
import { buildReportMessages, buildStep1Messages } from '../server/src/services/promptBuilder';

describe('AI 解读 · 当前时间事实注入', () => {
  it('Step2 报告 prompt 含当前公历时间（年份不会错）', () => {
    const msgs = buildReportMessages('liuren', '未来一年运势如何', { dayGZ: '乙亥' } as any);
    const user = msgs[msgs.length - 1].content as string;
    expect(user).toContain('【当前时间 · 事实】');
    expect(user).toContain(new Date().getFullYear() + ' 年');
    expect(user).toContain('不得自行推算或编造年份');
  });

  it('Step1 盘面解析 prompt 同样注入', () => {
    const msgs = buildStep1Messages('liuren', '未来一年运势如何', { dayGZ: '乙亥' } as any);
    const user = msgs[msgs.length - 1].content as string;
    expect(user).toContain('【当前时间 · 事实】');
    expect(user).toContain(new Date().getFullYear() + ' 年');
  });

  it('八字（有出生档案）同样注入当前时间（流年论断需要）', () => {
    const msgs = buildReportMessages('bazi', '今年事业', { yearGZ: '戊辰' } as any, { gender: '男', birthDate: '1990-06-15' } as any);
    const user = msgs[msgs.length - 1].content as string;
    expect(user).toContain('【当前时间 · 事实】');
  });
});
