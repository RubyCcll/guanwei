// 提示词构建：9 术角色 persona（单轮注入，多 Agent 编排规划中）+ 两套报告 Schema 模板 + 档案注入
import type { ChatMessage } from './llmProvider';
import { agentOf } from './skills';
import { chartBrief } from './chartBrief';
import { sixRelativesFacts } from './sixRelatives';

// ===== 报告 Schema 模板（命盘类：八字/紫微/星盘） =====
const MINGPAN_SAMPLE = {
  title: '报告标题，120 字内',
  overview: '人物画像核心论断，150 字以上，引用盘面具体数据',
  rawReading: { summary: '盘面最关键事实的白话概括，100-150 字，只讲最要紧的 3-5 点，不逐项罗列', keyPoints: ['最关键盘面事实1（一句话白话）', '关键盘面事实2', '关键盘面事实3'] },
  character: {
    summary: '人格画像总述，180 字以上：气质底色+内在动力+核心矛盾，落到生活画面',
    traits: [{ name: '气质特质', desc: '盘面依据+现实表现，3-4 句' }],
    coreConflict: '内在核心冲突：张力+盘面机制，3-4 句',
    emotion: '情绪与心理模式：情绪底色/压力反应/安全感来源，3-4 句',
  },
  family: {
    background: '原生家庭画像：家境实况/家庭氛围/父母关系模式，150 字以上，含盘面依据',
    parents: '父母与命主关系：父母星位状态/实际支持方式/命主主观感受的落差，150 字以上',
    imprint: '家庭印记：原生家庭对安全感/信任/自我价值的影响，120 字以上',
  },
  mind: {
    action: '行动力与坚持力：启动/拖延/半途而废的机制+何时改善，150 字以上',
    pattern: '行为循环：反复出现的人生模式+破局方向，120 字以上',
    growth: '成长方向：从知道到做到的路径（对应用神五行在现实中的行动），120 字以上',
  },
  lifeStages: [
    { stage: '幼年·少年', age: '0-20 岁', summary: '家庭背景与早年经历，120 字以上' },
    { stage: '青年', age: '20-40 岁', summary: '人生探索期，允许非常规轨迹并分析机制，120 字以上' },
    { stage: '中年', age: '40-60 岁', summary: '沉淀与转折，120 字以上' },
    { stage: '晚年', age: '60 岁后', summary: '归宿与心境，120 字以上' },
  ],
  career: { summary: '学业事业总述+行动力与持续力专项分析，150 字以上', direction: '适宜方向，允许非常规路径', advice: '针对启动难/坚持难的对策，具体可执行' },
  love: { summary: '情感与亲密关系：亲密模式/吸引类型/性别气质与亲密取向(温和描述不标签)/对婚姻态度，180 字以上，全部含盘面依据', advice: '亲密关系建议，尊重非常规选择' },
  wealth: { summary: '财运总述，120 字以上', advice: '理财建议' },
  health: { summary: '健康状况：体质倾向+心理身体关联，120 字以上', advice: '养生建议' },
  advice: '综合建议 5-7 条，分号分隔，含盘面依据与可执行动作',
  conclusion: '结语，80 字以上，给命主接纳与力量',
  disclaimer: '免责声明',
  suitability: { suitable: true, note: '适问性说明 2-3 句', suggestion: '换问建议或无' },
};
const ZHANWEN_SAMPLE = {
  title: '报告标题，100 字内',
  overview: '核心论断 3-4 句（120 字以上），直接回答所问之事的大势，必须引用卦/课/牌的具体象意（卦名/掌诀/牌名/天将/门星等）',
  rawReading: { summary: '盘面象意白话概括（100-150 字）：卦名/掌诀/牌义等最要紧的 3-5 点，不逐项罗列', keyPoints: ['关键象意 1（含具体盘面数据）', '关键象意 2', '关键象意 3'] },
  situation: '当下局势（180 字以上）：所问之事现状 + 当事人在此局中的真实处境与心理状态（如：表面平静实则进退两难），结合体用/用神/牌位/课传等具体要素',
  trend: '发展趋势：近/中/远期各 80 字以上，结合变卦/三传/牌阵位置/旺衰变化，写明各阶段的转折点与关键信号',
  timing: '时机宜忌：何时宜动、何时宜守（结合旺衰/门星/天将吉凶/课体），方位/方法上有何宜忌，给具体建议',
  advice: '具体建议 4-6 条，分号分隔，每条含象意依据与可执行动作',
  conclusion: '结语，80 字以上，温润收束给力量',
  disclaimer: '免责声明',
  suitability: { suitable: true, note: '适问性说明 2-3 句', suggestion: '换问建议或无' },
};
const MINGPAN_TEMPLATE = JSON.stringify(MINGPAN_SAMPLE, null, 2);
const ZHANWEN_TEMPLATE = JSON.stringify(ZHANWEN_SAMPLE, null, 2);
const MINGPAN_ARTS = ['bazi', 'ziwei', 'astrology'];

// 档案信息格式化
function profileText(profile?: unknown): string {
  if (!profile) return '（未提供出生档案）';
  const p = profile as any;
  const hourKnown = !(p.birthTimeUnknown === true || p.birthHourIndex === undefined || p.birthHourIndex === null || p.birthHourIndex < 0);
  return [
    '出生日期（公历）：' + (p.birthDate || '未录'),
    '时辰：' + (hourKnown ? (p.birthHourIndex + 1) + ' 时' : '未知（未录）'),
    '性别：' + (p.gender || '未录'),
    '出生地：' + (p.location ? (p.location.province || '') + (p.location.city || '') + (p.location.district || '') : '未录'),
  ].join('；');
}

// 时辰未知 → 解读约束（禁止编造时柱/子女宫/晚年等时辰依赖信息）
function hourUnknownNote(profile?: unknown): string {
  const p = (profile || {}) as any;
  const unknown = p.birthTimeUnknown === true || p.birthHourIndex === undefined || p.birthHourIndex === null || p.birthHourIndex < 0;
  if (!unknown) return '';
  return '【时辰未知 · 最高约束】命主出生时辰未知，命盘未排时柱。严禁编造、推断或默认时柱（出生时刻、时柱干支、时支藏干），严禁据此断言子女宫、子女缘分、晚年运、暮年际遇等依赖时辰的信息；所有论断只能基于年/月/日三柱与命局整体展开。凡涉及子女、暮年等维度，必须明确写「因时辰未知，此维度从略」，不得自行假设一个时辰来圆说。';
}

// 命主已知人生经历 → 解读校准注入（报告须呼应该年份事件、不得与其矛盾）
function lifeEventsNote(profile?: unknown): string {
  const evs: { year: number; text: string }[] = (profile as any)?.lifeEvents;
  if (!Array.isArray(evs) || evs.length === 0) return '';
  const clean = evs
    .filter(e => e && Number.isFinite(e.year) && e.year >= 1900 && e.year <= 2100 && e.text)
    .sort((a, b) => a.year - b.year)
    .map(e => e.year + ' 年：' + String(e.text).slice(0, 50));
  if (clean.length === 0) return '';
  return '【命主已知人生经历 · 解读校准】以下为命主本人确认的人生事件，解读必须与此相符：\n' + clean.join('\n') + '\n要求：① 凡解读涉及这些年份（或与之相邻的大运流年）时，必须呼应对应事件（如该年患病手术，则论健康/流年时须呼应）；② 严禁写出与已知经历相矛盾的内容（如已知 2024 年重大健康事件，就不得断言该年平安无事）；③ 已知经历未覆盖的年份正常论命，不得为了呼应而编造具体事件细节。';
}

// 角色化解读版：9 术 persona（单轮注入）+ 档案 + 排盘结果 → 结构化解读报告
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
  const relativesFacts = sixRelativesFacts(artId, resultRaw, (profile as any)?.gender);
  const sectionRules = isMingpan
    ? 'character.traits 至少 3 条并给出盘中依据；lifeStages 分 4 段并结合年/月/日/时柱或大限；career（学业与事业皆须解读）/love/wealth/health 每项含 summary 与 advice；advice 3-5 条。'
    : 'situation/trend/timing 各 2-4 句；trend 须分近/中/远期；advice 3-5 条。';
  const system = [
    '你是一位' + agent.name + '。' + agent.role,
    '',
    '【输出要求 · 最高优先】必须只输出一个合法的 json 对象（按下方 Schema，字段名不可更改，不要输出 json 以外的任何文字、注释或 Markdown 代码块）。',
    '',
    '【篇幅与细节 · 重要】报告充实详尽，总字数 2500 字以上，但充实靠「新信息」而非「重复旧话」：每个区块至少要给出一个前面未出现过的角度或数据点；论断须引用盘面中的具体数据（干支/星曜/宫位/卦名/天将/牌名等），禁止空泛套话，但同一数据只在首次出现的区块完整展开（盘面依据 → 命理逻辑 → 现实投射），后续区块点题引用即可（如「如前所析，命宫借星……」，一句话带过，不得重述全段）。',
    '【去重与分工 · 重要】全篇是一份报告，不是各区块的独立作文，严禁把同一段内容换着说法再写一遍。区块分工：总览（overview）只给 3-4 句核心论断，不罗列盘面数据；原始解读（rawReading）是全篇唯一「完整翻译盘面」的地方，只做白话复述不评价；性格/事业/爱情/财富/健康等各区块只写自己领域独有的内容，引用相关盘面数据时用简略表述；人生阶段（lifeStages）按时间线推进，与性格/事业区块内容不重叠。整篇应层层递进、信息增量递减。',
    '【字数预算 · 总量控制】全篇 2000-2500 字即可，参考预算：总览 120-180、原始解读 100-150、性格 200-280、原生家庭 200-280、心智模式 200-280、人生阶段 300-400、事业 150-220、爱情 150-220、财富 100-160、健康 100-150、建议 100-150、结语 60-100。预算为参考上限：某区块无新内容可低于预算，但不得为凑字数重复前文。',
    '【宁短勿凑 · 重要】若某区块相对前文没有新信息可写，写短（3-4 句）甚至从略，绝不为了凑字数重复前文；字数下限是「可写内容充足时的下限」，不是「凑字任务」。',
    '【用词规范】术语使用要准确（十神/旺衰/庙陷/四化/格局/六亲/世应/四课三传/天将/体用/旺相休囚死等），对普通用户要用白话解释（术语后括注通俗解释）；语气温润克制，不作绝对化断言，不制造恐惧。',
    '',
    '【具体化 · 最重要】禁止空泛套话：每一段都要把盘面数据翻译成「这个人在真实生活中会怎样」——具体到场景、行为、感受（如：不是写「印重身弱主依赖」，而是写「他想法很多、临事却总在准备阶段反复，别人催他他更想逃，事情常常开了头就慢慢无声无息」）。宁可具体到让命主一眼认出自己，也不要安全但无用的泛泛之谈。',
    '【人生轨迹】不得默认「人人工作/结婚/生子」的常规模板：命局允许非常规轨迹（长期不工作、独身、非传统亲密关系、多次转行等），要分析这些轨迹的盘面机制并给建设性建议，不得评判。',
    '【敏感维度】涉及性取向、性别气质、亲密关系选择等：以尊重、接纳、不作判断的方式温和描述，从盘面阴阳结构/桃花/夫妻宫等给出气质性线索即可，不贴标签、不病理化、不引导。',
    '',
    '【必需字段 · 硬性要求】输出必须包含以下所有字段，缺一不可：' + (isMingpan
      ? 'character.coreConflict、character.emotion、family.background、family.parents、family.imprint、mind.action、mind.pattern、mind.growth、love.summary（含亲密模式与亲密取向的气质性描述）'
      : 'rawReading.summary（含具体象意数据）、situation（含当事人真实处境与心理状态）、trend（近/中/远期三段）、timing（具体时机方位宜忌）、advice（4-6 条含依据）') + '。若 Schema 模板中某字段缺失，也须按此清单补足输出。',
    '【现代语境】不得使用「配偶宫主配偶」「第三者介入」「克妻克夫」「刑夫克子」等旧式偏见措辞；亲密关系一律以现代、尊重、非预设异性恋婚姻的语境描述。',
    '',
    '【六亲星位（子平惯例，八字适用）】男命：偏财为父、正印为母、正财为妻、官杀为子女；女命：正财为父、偏印为母、正官为夫、食伤为子女。分析父母/伴侣时按此映射取星位，星位不显可结合宫位（年柱为祖上父母、月柱为父母兄弟）灵活推断，并注明依据。',
    '',
    '【格式规范 · 重要】所有正文均为纯文本，禁止使用任何 Markdown 标记（不要用 **、*、#、>、- 、1. 等符号排版；不要输出代码块）。内容直接以自然段落呈现。',
    '',
    '【盘面事实一致性 · 最高约束】解读中出现的所有盘面事实（如上升星座、太阳/月亮/行星落座与宫位、相位、四柱干支、十神、命宫/身宫、十四主星落宫、大限流年、卦名爻象等）必须与【排盘结果】中给出的数据完全一致，逐字引用，不得更改、不得编造、不得自行推算补全。若【排盘结果】未提供某项，则不得在解读中虚构该项（如未提供上升星座就不得写上升为何座）。rawReading 只需概括最关键 3-5 条盘面事实并翻译成人话，不必逐项罗列。',
    '【论断锚定 · 最重要】每个核心论断（性格底色、父母关系、感情模式、事业方向、健康倾向）都必须能回溯到具体盘面数据，给出「数据 → 推论」的推导链，不得无依据自由发挥。特别地：',
    '1. 六亲论断（父母/子女/配偶）必须基于父母宫与六亲星位（八字看年柱/月柱与六亲十神，紫微看父母宫/兄弟宫等）的客观状态（主星、旺衰、四化、十神），并注明依据；',
    '2. 禁止使用「严格/宽松/慈爱/冷漠/严厉/溺爱」等主观程度词，除非能从盘面推出并注明依据（例：正官坐月柱主规矩约束，可写「家教较严」并注明正官依据；父母宫化忌可写「关系有隔阂」；若盘面无明确指向，写「盘面未明示」，绝不编造程度）；',
    '3. 全篇论断须自洽：性格/家庭/事业/感情各区块相互呼应，不得前后矛盾（同一维度两次出现必须口径一致）。',
    relativesFacts,
    '',
    hourUnknownNote(profile),
    '',
    '【Skills 编排 · 请依序调用以下技能，逐章成文】',
    skillLines,
    '',
    '【写作次序】先做原始解读（rawReading：概括最关键盘面事实并翻译成人话），再依据 Skills 编排逐章深度分析' + (isMingpan ? '（性格/人生阶段/学业事业/爱情/财富/健康）' : '（现状/趋势/时机）') + '。',
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
    '【盘面事实（以下为不可更改的排盘结果，解读必须逐字引用、不得编造）】',
    chartBrief(artId, resultRaw),
    '',
    lifeEventsNote(profile),
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


// ===== 两步管线（2026-08-20）：Step1 盘面解析 → Step2 深度报告 =====
// 目的：① 盘面先明、再论人事，分步聚焦提升质量 ② 每步 prompt 更短、失败重试粒度细 ③ Step1 结果可复用
const STEP1_TEMPLATE = JSON.stringify({
  art: '术名（如：八字）',
  chartSummary: '盘面骨架的白话总述（200 字以上）：何命何局、关键要素齐列。',
  pillars: ['盘面事实 1（如：日主壬水身弱，喜金水，忌火土）', '盘面事实 2（如：午月火旺失令，地支通根于申）', '盘面事实 3（如：大运甲申 28-37 岁，食神生财）'],
  keyFacts: ['对论断最重要的 3-5 条盘面事实（供后续分析引用，含具体数据）'],
}, null, 2);

export function buildStep1Messages(
  artId: string,
  question: string,
  resultRaw: unknown,
  profile?: unknown,
): ChatMessage[] {
  const agent = agentOf(artId);
  const system = [
    '你是一位' + agent.name + '。' + agent.role,
    '',
    '【任务】你是解读管线的第一步：只做「盘面解析」——把排盘结果整理成结构化的事实清单，供第二步深度分析引用。',
    '【要求】只陈述盘面事实与通行命理含义，不做人生论断、不给建议；每条事实必须来自下方盘面数据，不得编造；术语后括注白话。',
    hourUnknownNote(profile),
    '【输出】只输出一个合法 json 对象（按下方 Schema，字段名不可更改）：',
    STEP1_TEMPLATE,
  ].filter(Boolean).join('\n');
  const user = [
    '【命主档案】性别：' + ((profile as any)?.gender || '未录') + '（报告人称与性别语境以此为准，不得臆断为其他性别）',
    '',
    question ? '【所问之事】' + question + '（仅作背景，本步不回答）' : '【所问之事】（未书，仅作背景）',
    '',
    '【盘面事实】',
    chartBrief(artId, resultRaw),
    '',
    '请输出盘面解析 json。',
  ].filter(Boolean).join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export function buildStep2Messages(
  artId: string,
  question: string,
  resultRaw: unknown,
  step1Text: string,
  profile?: unknown,
  semantic?: unknown,
  fit?: { suitable: boolean | 'partial'; reason: string; suggestion: string },
): ChatMessage[] {
  const agent = agentOf(artId);
  const skillLines = agent.skills.map((s, i) => i + 1 + '. 【' + s.name + '】' + s.instruction).join('\n');
  const isMingpan = MINGPAN_ARTS.includes(artId);
  const schemaTemplate = isMingpan ? MINGPAN_TEMPLATE : ZHANWEN_TEMPLATE;
  const relativesFacts = sixRelativesFacts(artId, resultRaw, (profile as any)?.gender);
  const sectionRules = isMingpan
    ? 'character.traits 至少 3 条并给出盘中依据；lifeStages 分 4 段并结合年/月/日/时柱或大限；career（学业与事业皆须解读）/love/wealth/health 每项含 summary 与 advice；advice 4-6 条。'
    : 'situation/trend/timing 各 150 字以上；trend 须分近/中/远期；advice 4-6 条。';
  const system = [
    '你是一位' + agent.name + '。' + agent.role,
    '',
    '【任务】你是解读管线的第二步：在「盘面解析」基础上进行深度解读，输出完整报告。',
    '【输出要求 · 最高优先】必须只输出一个合法的 json 对象（按下方 Schema，字段名不可更改，不要输出 json 以外的任何文字、注释或 Markdown 代码块）。',
    hourUnknownNote(profile),
    '',
    '【篇幅与细节 · 重要】报告充实详尽，总字数 2500 字以上，但充实靠「新信息」而非「重复旧话」：每个区块至少要给出一个前面未出现过的角度或数据点；论断须引用盘面解析与盘面事实中的具体数据，禁止空泛套话，但同一数据只在首次出现的区块完整展开（盘面依据 → 命理逻辑 → 现实投射），后续区块点题引用即可（如「如前所析，命宫借星……」，一句话带过，不得重述全段）。',
    '【去重与分工 · 重要】全篇是一份报告，不是各区块的独立作文，严禁把同一段内容换着说法再写一遍。区块分工：总览（overview）只给 3-4 句核心论断，不罗列盘面数据；原始解读（rawReading）是全篇唯一「完整翻译盘面」的地方，只做白话复述不评价；性格/事业/爱情/财富/健康等各区块只写自己领域独有的内容，引用相关盘面数据时用简略表述；人生阶段（lifeStages）按时间线推进，与性格/事业区块内容不重叠。整篇应层层递进、信息增量递减。',
    '【字数预算 · 总量控制】全篇 2000-2500 字即可，参考预算：总览 120-180、原始解读 100-150、性格 200-280、原生家庭 200-280、心智模式 200-280、人生阶段 300-400、事业 150-220、爱情 150-220、财富 100-160、健康 100-150、建议 100-150、结语 60-100。预算为参考上限：某区块无新内容可低于预算，但不得为凑字数重复前文。',
    '【宁短勿凑 · 重要】若某区块相对前文没有新信息可写，写短（3-4 句）甚至从略，绝不为了凑字数重复前文；字数下限是「可写内容充足时的下限」，不是「凑字任务」。',
    '【用词规范】术语使用要准确（十神/旺衰/庙陷/四化/格局/六亲/世应/四课三传/天将/体用/旺相休囚死等），对普通用户要用白话解释（术语后括注通俗解释）；语气温润克制，不作绝对化断言，不制造恐惧。',
    '【论断锚定 · 最重要】每个核心论断（性格底色、父母关系、感情模式、事业方向、健康倾向）都必须能回溯到具体盘面数据，给出「数据 → 推论」的推导链，不得无依据自由发挥。特别地：',
    '1. 六亲论断（父母/子女/配偶）必须基于父母宫与六亲星位（八字看年柱/月柱与六亲十神，紫微看父母宫/兄弟宫等）的客观状态（主星、旺衰、四化、十神），并注明依据；',
    '2. 禁止使用「严格/宽松/慈爱/冷漠/严厉/溺爱」等主观程度词，除非能从盘面推出并注明依据（例：正官坐月柱主规矩约束，可写「家教较严」并注明正官依据；父母宫化忌可写「关系有隔阂」；若盘面无明确指向，写「盘面未明示」，绝不编造程度）；',
    '3. 全篇论断须自洽：性格/家庭/事业/感情各区块相互呼应，不得前后矛盾（同一维度两次出现必须口径一致）。',
    relativesFacts,
    '',
    '【技能编排】依序运用以下技能完成报告（每一步的结论都要落进对应章节）：',
    skillLines,
    '',
    '【格式规范 · 重要】所有正文均为纯文本，禁止使用Markdown 符号（#、*、-、> 等），列表项用「1. 2. 3.」或分号分隔；引经据典附出处（书名·篇名）。',
    '',
    '【必需字段 · 硬性要求】输出必须包含以下所有字段，缺一不可：' + (isMingpan
      ? 'character.coreConflict、character.emotion、family.background、family.parents、family.imprint、mind.action、mind.pattern、mind.growth、lifeStages（4 段）、career.summary、love.summary、wealth.summary、health.summary、advice（4-6 条）、conclusion'
      : 'rawReading.summary（含具体象意数据）、situation（含当事人真实处境与心理状态）、trend（近/中/远期三段）、timing（具体时机方位宜忌）、advice（4-6 条含依据）、conclusion') + '。若 Schema 模板中某字段缺失，也须按此清单补足输出。',
    '',
    '【报告 Schema 模板（字段名与结构不可更改）】',
    schemaTemplate,
    '',
    '【章节要求】' + sectionRules,
  ].filter(Boolean).join('\n');
  const user = [
    '【命主档案】性别：' + ((profile as any)?.gender || '未录') + '——报告人称、六亲、亲密关系等所有涉及性别的表述一律以此为准（如女命则用「她/女士」，不得写成男命）。',
    '',
    question ? '【所问之事】' + question : '【所问之事】（未书，心念已至）',
    '',
    '【盘面解析（第一步结果 · 唯一事实源，所有解读结论必须能在此找到依据，不得另立新的事实）】',
    step1Text,
    '',
    '【盘面事实（原始排盘，引用须一致）】',
    chartBrief(artId, resultRaw),
    '',
    lifeEventsNote(profile),
    '',
    semantic ? '【问题语义分析】' + JSON.stringify(semantic, null, 1) : '',
    '',
    fit ? '【适问分析】' + JSON.stringify(fit, null, 1) : '',
    '',
    '请依序运用全部技能，生成完整解读报告 json。',
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