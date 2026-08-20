// 提示词构建：9 术 agent + Skills 编排 + 两套报告 Schema 模板 + 档案注入
import type { ChatMessage } from './llmProvider';
import { agentOf } from './skills';

// ===== 报告 Schema 模板（命盘类：八字/紫微/星盘） =====
const MINGPAN_SAMPLE = {
  title: '如：壬水日主命局解读报告',
  overview: '2-3 句核心论断，概括此命局/盘面的最大特点与一生基调。',
  rawReading: { summary: '把排盘原始结果翻译成通俗语言：此命何局、何星、何象，各是什么意思。', keyPoints: ['关键盘面信息 1（如：日主壬水坐申，金水相生）', '关键盘面信息 2'] },
  character: {
    summary: '命主性格总述（2-3 句）',
    traits: [
      { name: '特质一（如：外柔内刚）', desc: '说明该特质在盘中的依据与表现（2-3 句）' },
      { name: '特质二', desc: '说明...' },
      { name: '特质三', desc: '说明...' },
    ],
  },
  lifeStages: [
    { stage: '幼年·少年', age: '0-20 岁', summary: '依据年柱/命宫等解读该阶段' },
    { stage: '青年', age: '20-40 岁', summary: '依据月柱/大限等解读' },
    { stage: '中年', age: '40-60 岁', summary: '依据日柱/大限等解读' },
    { stage: '晚年', age: '60 岁后', summary: '依据时柱/大限等解读' },
  ],
  career: { summary: '学业/事业总述（求学阶段与职业生涯，两者皆须解读）', direction: '适宜方向（专业/行业/形态）', advice: '学业事业建议' },
  love: { summary: '感情总述', advice: '感情建议' },
  wealth: { summary: '财运总述', advice: '理财建议' },
  health: { summary: '健康状况总述（结合盘中五行/星曜/宫位所主，谈体质倾向与宜注意之处）', advice: '养生建议' },
  advice: '综合建议（3-5 条，分号分隔）',
  conclusion: '结语（温润收束）',
  disclaimer: '免责声明',
  suitability: { suitable: true, note: '此问与本法相契与否的说明（2-3 句，依下方注入的适配性分析）', suggestion: '如需更换问题方向，给出建议（无则空）' },
};

// ===== 报告 Schema 模板（占问类：奇门/梅花/六爻/六壬/小六壬/塔罗） =====
const ZHANWEN_SAMPLE = {
  title: '如：出行吉凶占断报告',
  overview: '2-3 句核心论断，直接回答所问之事的大势。',
  rawReading: { summary: '把起卦/起课/抽牌原始结果翻译成通俗语言（卦名/掌诀/牌义是什么、意味着什么）。', keyPoints: ['关键象意 1', '关键象意 2'] },
  situation: '当下局势：所问之事目前处于什么状态（结合体用/用神/牌位等）',
  trend: '发展趋势：近、中、远期各如何演变（结合变卦/三传/牌阵位置）',
  timing: '时机宜忌：何时宜动、何时宜守，方位/方法上有何宜忌',
  advice: '具体建议（3-5 条，分号分隔）',
  conclusion: '结语（温润收束）',
  disclaimer: '免责声明',
  suitability: { suitable: true, note: '此问与本法相契与否的说明（2-3 句，依下方注入的适配性分析）', suggestion: '如需更换问题方向，给出建议（无则空）' },
};

const MINGPAN_TEMPLATE = JSON.stringify(MINGPAN_SAMPLE, null, 2);
const ZHANWEN_TEMPLATE = JSON.stringify(ZHANWEN_SAMPLE, null, 2);
const MINGPAN_ARTS = ['bazi', 'ziwei', 'astrology'];

// 档案信息格式化
function profileText(profile?: unknown): string {
  if (!profile) return '（未提供出生档案）';
  const p = profile as any;
  return [
    '出生日期（公历）：' + (p.birthDate || '未录'),
    '时辰：' + (p.birthHourIndex !== undefined ? p.birthHourIndex + 1 + ' 时' : '未录'),
    '性别：' + (p.gender || '未录'),
    '出生地：' + (p.location ? (p.location.province || '') + (p.location.city || '') + (p.location.district || '') : '未录'),
  ].join('；');
}

// Skills 编排版：9 术 agent + 档案 + 排盘结果 → 结构化解读报告
export function buildReportMessages(
  artId: string,
  question: string,
  resultRaw: unknown,
  profile?: unknown,
  semantic?: unknown,
  fit?: { suitable: boolean | 'partial'; reason: string; suggestion: string },
): ChatMessage[] {
  const agent = agentOf(artId);
  const skillLines = agent.skills.map((s, i) => i + 1 + '. 【' + s.name + '】' + s.instruction).join('\n');
  const isMingpan = MINGPAN_ARTS.includes(artId);
  const schemaTemplate = isMingpan ? MINGPAN_TEMPLATE : ZHANWEN_TEMPLATE;
  const sectionRules = isMingpan
    ? 'character.traits 至少 3 条并给出盘中依据；lifeStages 分 4 段并结合年/月/日/时柱或大限；career（学业与事业皆须解读）/love/wealth/health 每项含 summary 与 advice；advice 3-5 条。'
    : 'situation/trend/timing 各 2-4 句；trend 须分近/中/远期；advice 3-5 条。';
  const system = [
    '你是一位' + agent.name + '。' + agent.role,
    '',
    '【输出要求 · 最高优先】必须只输出一个合法的 json 对象（按下方 Schema，字段名不可更改，不要输出 json 以外的任何文字、注释或 Markdown 代码块）。',
    '',
    '【格式规范 · 重要】所有正文均为纯文本，禁止使用任何 Markdown 标记（不要用 **、*、#、>、- 、1. 等符号排版；不要输出代码块）。内容直接以自然段落呈现。',
    '',
    '【盘面事实一致性 · 最高约束】解读中出现的所有盘面事实（如上升星座、太阳/月亮/行星落座与宫位、相位、四柱干支、十神、命宫/身宫、十四主星落宫、大限流年、卦名爻象等）必须与【排盘结果】中给出的数据完全一致，逐字引用，不得更改、不得编造、不得自行推算补全。若【排盘结果】未提供某项，则不得在解读中虚构该项（如未提供上升星座就不得写上升为何座）。rawReading 必须把排盘结果的每一项关键数据原样复述并翻译成人话。',
    '',
    '【Skills 编排 · 请依序调用以下技能，逐章成文】',
    skillLines,
    '',
    '【写作次序】先做原始解读（rawReading：把排盘/起卦结果翻译成人话并列出关键点），再依据 Skills 编排逐章深度分析' + (isMingpan ? '（性格/人生阶段/学业事业/爱情/财富/健康）' : '（现状/趋势/时机）') + '。',
    fit ? '【问题适配性分析】此问经适配判定为：' + (fit.suitable === true ? '相契' : fit.suitable === 'partial' ? '部分相契' : '不甚相契') + '。' + fit.reason + (fit.suggestion ? '建议：' + fit.suggestion : '') + '请将此分析如实写入报告的 suitability 字段（suitable 用 ' + (fit.suitable === true ? 'true' : fit.suitable === 'partial' ? 'partial' : 'false') + '），并在解读行文中温和呼应。' : '',
    '',
    '【语言规范 · 三层】',
    '1. 解读正文用现代白话，直白清晰有温度；不作绝对化断言（不说必/定/绝），涉及健康、法律、投资等话题温和提示仅供参考。',
    '2. 引经据典处以引用块呈现原文并附现代注译与出处。',
    '3. 输出结构：严格按以下 json Schema 输出（字段名不可更改，缺失字段填空值，不要输出 json 以外的任何内容）：',
    schemaTemplate,
    '4. 章节要求：' + sectionRules,
    '5. 结尾免责：凡占问所得，仅供修身养性、怡情遣兴之用，不构成决策依据。',
    '',
    'The final output must be a valid json object only.',
  ].join('\n');
  const user = [
    question ? '【所问之事（命主之问，当为全篇之纲）】' + question : '【所问之事】（未书，心念已至）',
    '',
    isMingpan ? '【出生档案】' + profileText(profile) : '',
    '',
    '【排盘结果（以下为不可更改的盘面事实，解读必须逐字引用、不得编造）】',
    JSON.stringify(resultRaw, null, 1),
    '',
    semantic ? '【问题语义分析】' + JSON.stringify(semantic, null, 1) : '',
    '',
    '请以 ' + agent.name + ' 的身份，依序调用全部技能，生成完整解读报告。',
    '重要：最终输出必须是一个合法的 json 对象（严格按上方 Schema）。',
  ].filter(Boolean).join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

// 简易解读（非报告模式，保留）
function systemPrompt(artId: string): string {
  const p = (agentOf(artId) as any);
  return [
    '你是一位' + (p?.name || '命理师') + '。' + (p?.role || ''),
    '',
    '【语言规范】现代白话，温润克制，不作绝对化断言；引经据典附出处；结尾附免责声明。',
    '输出结构：严格输出合法 json 对象（字段名不可更改）。',
    '【可引古籍】' + (p?.classics || ''),
  ].join('\n');
}

export function buildMessages(
  artId: string,
  question: string,
  resultRaw: unknown,
  semantic?: unknown,
): ChatMessage[] {
  const user = [
    question ? '【所问之事】' + question : '【所问之事】（未书，心念已至）',
    '',
    '【排盘结果】',
    JSON.stringify(resultRaw, null, 1),
    '',
    semantic ? '【问题语义分析】' + JSON.stringify(semantic, null, 1) : '',
    '',
    '请按语言规范生成解读。',
  ].filter(Boolean).join('\n');
  return [
    { role: 'system', content: systemPrompt(artId) },
    { role: 'user', content: user },
  ];
}