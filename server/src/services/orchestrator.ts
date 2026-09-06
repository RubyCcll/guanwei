// 真·多 Agent 编排 v1（guanwei-pro 雏形）：
// 命盘类分步链式推理——Step A 结构解构 → Step B 宫位/星曜专题 → Step C 汇总成报告
// 与单轮/两步管线区别：每一步独立 LLM 调用、上一步输出作为下一步唯一事实源，步间事实约束
// 设计：每步 prompt 短而聚焦（降低单次输出幻觉面），关键事实链（chartBrief 十二宫清单）全程逐字引用
import { chartBrief } from './chartBrief.js';
import { duanyuPromptBlock } from './duanyu.js';
import { chatOnce } from './llmProvider.js';
import { nowFact } from './promptBuilder.js';

export type OrchestrateMode = 'off' | 'ziwei-deep';

// 每步输出 ≤ 400 字的事实性专题，不做人生论断（论断集中在最后汇总步）
function stepMessages(agentName: string, step: string, brief: string, prior: string[], question?: string): { role: string; content: string }[] {
  const priorBlock = prior.length
    ? prior.map((p, i) => `【上一步结论 ${i + 1}】${p}`).join('\n')
    : '（本步为首步）';
  const system = [
    '你是一位' + agentName + '，负责紫微斗数分步推理中的一个环节。',
    '【最高约束】所有盘面事实（宫位/主星/辅星/四化/亮度）必须逐字引用下方【盘面事实】，不得推算、不得编造。',
    '【本步任务】' + step,
    '【输出】只输出一个 JSON 对象 {"points": ["要点1", "要点2", ...]}（3-6 条，每条 ≤80 字，只陈述盘面结构与通义，不做人生论断）。',
  ].join('\n');
  const user = [
    question ? '【所问】' + question + '（仅作背景，本步不回答）' : '',
    '【盘面事实（不可更改）】',
    brief,
    '',
    nowFact(),
    '',
    priorBlock,
    '',
    '请输出本步 JSON。',
  ].filter(Boolean).join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function parsePoints(text: string): string[] {
  try {
    const obj = JSON.parse(text);
    if (Array.isArray(obj.points)) return obj.points.map(String);
  } catch { /* 非 JSON 时按行切 */ }
  return text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('{') && !l.startsWith('}')).slice(0, 8);
}

// 汇总步：把前面各步要点 + 盘面事实汇总成完整解读
function finalMessages(agentName: string, artName: string, schemaTemplate: string, brief: string, steps: string[], question?: string, gender?: string): { role: string; content: string }[] {
  const stepBlock = steps.map((s, i) => `【分步推演 ${i + 1}】${s}`).join('\n\n');
  const system = [
    '你是一位' + agentName + '。',
    '【任务】基于下面给出的【盘面事实】与【分步推演结论】，生成完整解读报告（JSON）。',
    '【盘面事实一致性 · 最高约束】所有盘面事实必须与【盘面事实】逐字一致，不得编造或自行推算；六亲/宫位论断须注明盘面依据。',
    '【质量】内容充实、具体到场景与行为；不作绝对化断言；结尾附免责声明。',
    '【输出 Schema（字段名不可更改）】' + schemaTemplate,
  ].join('\n');
  const user = [
    '【性别语境】' + (gender || '未录'),
    question ? '【所问之事】' + question : '',
    '【盘面事实（不可更改）】',
    brief,
    '',
    stepBlock,
    '',
    '请输出完整解读报告 JSON。',
  ].filter(Boolean).join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/**
 * 紫微深度编排：三步独立推理后汇总。
 * 返回 { full, steps }（full 为最终报告文本；steps 为各步要点便于调试/审计）
 */
export async function orchestrateZiweiDeep(
  resultRaw: unknown,
  question: string | undefined,
  schemaTemplate: string,
  gender?: string,
): Promise<{ full: string; steps: string[] }> {
  const brief = chartBrief('ziwei', resultRaw);
  const duanyu = duanyuPromptBlock('ziwei', resultRaw);
  const steps: string[] = [];

  const STEPS = [
    '解构命盘骨架：命宫地支/五行局/紫微落宫/身宫/生年四化/主星布局格局，提炼盘的总体气质。',
    '专题拆解：依十二宫主题（命/兄弟/夫妻/子女/财帛/疾厄/迁移/交友/官禄/田宅/福德/父母）逐宫提炼其星曜组合的侧重，命宫重点。',
    '行运推演：结合当前大限（年龄段/宫位/主星）与流年宫位，提炼行运主题与关键节点。',
  ];
  const prior: string[] = [];
  for (const [i, step] of STEPS.entries()) {
    const msgs = stepMessages('紫微斗数专家', step, brief, prior, question);
    const text = await chatOnce(msgs as any);
    const pts = parsePoints(text);
    prior.push(pts.join('；'));
    steps.push(pts.join('；'));
    console.log(`[orchestrator] Step ${i + 1} 完成（${pts.length} 要点）`);
  }
  // 汇总步：含断语引证
  const finalSys = finalMessages('紫微斗数专家', '紫微斗数', schemaTemplate, brief + (duanyu ? '\n' + duanyu : ''), prior, question, gender);
  const full = await chatOnce(finalSys as any);
  return { full, steps };
}
