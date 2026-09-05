#!/usr/bin/env tsx
// 观微 × MingLi-Bench 评测 harness
// 用法（在 server/ 目录下）：
//   npx tsx scripts/eval/harness.ts --mode baseline --limit 20   裸模型对照
//   npx tsx scripts/eval/harness.ts --mode guanwei  --limit 20   观微管线（盘面事实注入 + 一致性约束）
//   npx tsx scripts/eval/harness.ts --mode guanwei               全量 160 题
// 参数：--mode baseline|guanwei（默认 guanwei）--limit N（0=全量）--category 婚姻 --workers N（默认 3）--verbose
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 轻量 .env 加载（与 server/src/index.ts 一致，脚本直跑不依赖服务）
(() => {
  try {
    const envFile = path.join(__dirname, '..', '..', '.env');
    const content = fs.readFileSync(envFile, 'utf-8');
    content.split('\n').forEach(line => {
      const m = /^\s*([A-Z_]+)\s*=\s*(.+)\s*$/.exec(line);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  } catch { /* 无 .env 时忽略 */ }
})();

const { chatOnce } = await import('../../src/services/llmProvider.js');
const { baziCalc } = await import('../../../shared/core/engine/bazi.ts');

// ─── 参数解析 ───
const args = process.argv.slice(2);
const getArg = (name: string, def = '') => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] ?? def : def; };
const hasArg = (name: string) => args.includes(name);
const MODE = getArg('--mode', 'guanwei');
const LIMIT = parseInt(getArg('--limit', '0'), 10) || 0;
const CATEGORY = getArg('--category');
const WORKERS = Math.max(1, parseInt(getArg('--workers', '3'), 10) || 3);
const VERBOSE = hasArg('--verbose');
const FOCUS = hasArg('--focus');
const MIN_ACC = parseFloat(getArg('--min-accuracy', '0'));  // 低于该准确率则退出码 1（CI 告警闭环用）
const ENGINE = getArg('--engine', 'iztro'); // iztro（基准预排紫微盘）| own（观微自研八字引擎）

if (MODE !== 'baseline' && MODE !== 'guanwei') { console.error('--mode 仅支持 baseline|guanwei'); process.exit(1); }
if (ENGINE !== 'iztro' && ENGINE !== 'own') { console.error('--engine 仅支持 iztro|own'); process.exit(1); }

// ─── 数据加载 ───
const DATASETS = path.join(__dirname, 'datasets');
interface Option { letter: string; text: string }
interface Question {
  id: string; question_number: number; case_id: string;
  birth_info: { raw: string; gender: string; year: number; month: number; day: number; hour: number; minute: number; calendar_type: string };
  question: string; options: Option[]; answer: string; category: string;
}
const data = JSON.parse(fs.readFileSync(path.join(DATASETS, 'data.json'), 'utf-8'));
const astro: any[] = JSON.parse(fs.readFileSync(path.join(DATASETS, 'fortune_api_results.json'), 'utf-8'));
const allQuestions = (data.questions as Question[]).filter(q => q.has_answer);
const astroByCase = new Map(astro.map(c => [c.case_id, c]));

// ─── iztro 盘面 → 紧凑事实文本（--astro 等价物：排盘与推理解耦） ───
// 类别 → 相关宫位白名单（聚焦注入实验：只注入与问题相关的宫位 + 命宫/身宫）
const CATEGORY_FOCUS: Record<string, string[]> = {
  '婚姻': ['命宫', '夫妻', '福德', '子女'],
  '家庭': ['命宫', '父母', '兄弟', '田宅'],
  '子女': ['命宫', '子女', '夫妻'],
  '事业': ['命宫', '官禄', '财帛', '迁移'],
  '健康': ['命宫', '疾厄', '父母'],
  '性格': ['命宫', '福德'],
  '财运': ['命宫', '财帛', '官禄', '田宅'],
  '学业': ['命宫', '官禄', '父母', '福德'],
  '外貌': ['命宫', '迁移'],
  '运势': [], '灾劫': [], '官非': [],
};

function chartSummary(ac: any, category: string): string {
  const d = ac?.api_response?.data?.data;
  if (!d) return '';
  const focus = FOCUS ? CATEGORY_FOCUS[category] ?? [] : [];
  const lines: string[] = ['【命盘事实（iztro 预排，必须严格依据，不得编造）】'];
  if (d.chineseDate) lines.push('四柱：' + d.chineseDate);
  if (d.time) lines.push('时辰：' + d.time + '（' + (d.timeRange || '') + '）');
  for (const p of d.palaces ?? []) {
    if (focus.length && !focus.includes(p.name)) continue;
    const majors = (p.majorStars ?? []).map((s: any) => s.name + (s.brightness ? '(' + s.brightness + ')' : '')).join('、');
    const minors = (p.minorStars ?? []).map((s: any) => s.name).join('、');
    const adjs = (p.adjectiveStars ?? []).map((s: any) => s.name).join('、');
    let line = '- ' + p.name + '宫（' + (p.heavenlyStem || '') + (p.earthlyBranch || '') + '）' + (p.isBodyPalace ? '[身宫]' : '') + '：主星[' + (majors || '无') + ']';
    if (minors) line += ' 辅星[' + minors + ']';
    if (adjs) line += ' 杂曜[' + adjs + ']';
    lines.push(line);
  }
  return lines.join('\n');
}

// ─── 流年注入：从题目提取事件年份 → 定位覆盖该年龄的大限宫位 ───
function extractEventYear(question: string): number | null {
  const m = question.match(/(19|20)\d{2}\s*年/);
  return m ? parseInt(m[0].replace('年', ''), 10) : null;
}

function findDecadal(d: any, age: number): string {
  for (const p of d.palaces ?? []) {
    const rg = p.decadal?.range;
    if (rg && Array.isArray(rg) && rg.length === 2 && age >= rg[0] && age <= rg[1]) {
      const majors = (p.majorStars ?? []).map((s: any) => s.name + (s.brightness ? '(' + s.brightness + ')' : '')).join('、');
      const minors = (p.minorStars ?? []).map((s: any) => s.name).join('、');
      return p.name + '宫 大限（' + (p.decadal.heavenlyStem || '') + (p.decadal.earthlyBranch || '') + '，' + rg[0] + '-' + rg[1] + '岁）：主星[' + (majors || '无') + ']' + (minors ? ' 辅星[' + minors + ']' : '');
    }
  }
  return '';
}

// ─── 观微自研八字引擎盘注入（--engine own）───
function ownBaziSummary(q: Question): string {
  try {
    const b = baziCalc({ y: q.birth_info.year, m: q.birth_info.month, d: q.birth_info.day, hourIndex: Math.floor(q.birth_info.hour / 2), gender: q.birth_info.gender === '女' ? '女' : '男' });
    const gz = b.yearGZ + ' ' + b.monthGZ + ' ' + b.dayGZ + ' ' + b.hourGZ;
    const lines: string[] = ['【命盘事实（观微八字引擎，必须严格依据，不得编造）】'];
    lines.push('四柱：' + gz);
    lines.push('日主：' + b.dayGan + b.dayGanWx + '，' + b.strength + '（旺衰分 ' + b.strengthDetail.score.toFixed(1) + '）');
    lines.push('天干十神：' + b.shishen.map((s, i) => ['年', '月', '日', '时'][i] + s.gan + s.name).join('、'));
    lines.push('地支藏干：' + b.canggan.map(c => c.zhi + '藏' + c.gans.map(g => g.gan + g.shishen).join('')).join('；'));
    lines.push('用神：' + b.yongshen.wx + '(' + b.yongshen.shishen + ')，喜' + b.yongshen.xi.join('/') + '，忌' + b.yongshen.ji.join('/'));
    lines.push('调候：' + b.yongshen.tiaohou);
    return lines.join('\n');
  } catch {
    return '';
  }
}

// ─── Prompt 构建 ───
const SYSTEM_BASE = '你是参加全球算命师大赛（HKJFMA）考核的专业命理师。题目为单项选择题，必须严格依据命理规则推理作答。\n输出必须为严格 JSON（不要输出任何多余文字）：{"answer":"A","reason":"200字以内的推理依据"}';

const GUANWEI_RULES = '【观微盘面事实一致性约束】\n1. 只能引用命盘事实中出现的四柱/宫位/星曜，禁止编造不存在的星曜、宫位、神煞或干支；\n2. 分步推理：先看命盘结构，再结合所问事件与该宫位星曜生克，最后判定选项；\n3. 若盘面事实不足以区分选项，按最贴近的命理规则择优作答，并在 reason 中说明不确定性。';

function buildUserPrompt(q: Question, chart: string, decadal: string): string {
  const opts = q.options.map(o => o.letter + '. ' + o.text).join('\n');
  const head = MODE === 'guanwei' ? chart + '\n\n' : '出生信息：' + q.birth_info.raw + '\n\n';
  const liu = decadal ? '【事件流年】' + decadal + '\n\n' : '';
  return head + liu + '【题目】' + q.question + '\n【选项】\n' + opts + '\n\n请输出 JSON：{"answer":"A","reason":"..."}';
}

// ─── 判分（宽容提取答案字母） ───
function extractAnswer(text: string): string | null {
  const m1 = text.match(/"answer"\s*:\s*"([A-Da-d])"/);
  if (m1) return m1[1].toUpperCase();
  const m2 = text.match(/答案[:：是]\s*[（(]?([A-Da-d])[）)]?/);
  if (m2) return m2[1].toUpperCase();
  const m3 = text.match(/(?:^|[\n])\s*([A-Da-d])[.、:：\s]/);
  if (m3) return m3[1].toUpperCase();
  return null;
}

// ─── 并发池 ───
async function runPool<T>(items: T[], worker: (item: T, i: number) => Promise<void>, size: number) {
  let next = 0;
  const jobs: Promise<void>[] = [];
  for (let w = 0; w < Math.min(size, items.length); w++) {
    jobs.push((async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        try { await worker(items[i], i); } catch (e: any) { console.error('[worker] 题 ' + i + ' 失败:', e.message); }
      }
    })());
  }
  await Promise.all(jobs);
}

// ─── 主流程 ───
const pool = MODE === 'guanwei' ? '观微管线（' + (ENGINE === 'own' ? '观微自研八字盘' : 'iztro 紫微盘') + '注入 + 事实一致性约束 + 事件流年' + (FOCUS ? ' + 相关宫位聚焦' : '') + '）' : '裸模型（仅出生信息）';
console.log('== 观微 × MingLi-Bench 评测 ==');
console.log('模式: ' + pool + ' | 题数: ' + (LIMIT ? LIMIT : '全量' + allQuestions.length) + (CATEGORY ? ' | 类别: ' + CATEGORY : '') + ' | 并发: ' + WORKERS);

let selected = allQuestions;
if (CATEGORY) selected = selected.filter(q => q.category === CATEGORY);
if (LIMIT) selected = selected.slice(0, LIMIT);

const results: { id: string; category: string; question: string; expected: string; answer: string | null; pass: boolean; raw?: string }[] = [];
let done = 0;

await runPool(selected, async (q) => {
  const chart = MODE === 'guanwei' ? (ENGINE === 'own' ? ownBaziSummary(q) : chartSummary(astroByCase.get(q.case_id), q.category)) : '';
  let decadal = '';
  if (MODE === 'guanwei') {
    const d = astroByCase.get(q.case_id)?.api_response?.data?.data;
    const ev = extractEventYear(q.question);
    if (d && ev) {
      const age = ev - q.birth_info.year;
      if (age > 0) decadal = findDecadal(d, age);
    }
  }
  const messages = [
    { role: 'system', content: SYSTEM_BASE + (MODE === 'guanwei' ? '\n\n' + GUANWEI_RULES : '') },
    { role: 'user', content: buildUserPrompt(q, chart, decadal) },
  ];
  const out = await chatOnce(messages as any);
  const answer = extractAnswer(out);
  results.push({ id: q.id, category: q.category, question: q.question, expected: q.answer, answer, pass: answer === q.answer.toUpperCase(), ...(VERBOSE ? { raw: out } : {}) });
  done++;
  if (done % 10 === 0 || done === selected.length) console.log('  进度 ' + done + '/' + selected.length);
}, WORKERS);

// ─── 汇总报告 ───
const pass = results.filter(r => r.pass).length;
const total = results.length;
const byCat: Record<string, { pass: number; total: number }> = {};
for (const r of results) {
  byCat[r.category] = byCat[r.category] || { pass: 0, total: 0 };
  byCat[r.category].total++;
  if (r.pass) byCat[r.category].pass++;
}
const report = {
  generatedAt: new Date().toISOString(),
  mode: MODE + (ENGINE === 'own' ? '-own-bazi' : ''),
  model: process.env.LLM_DEEPSEEK_MODEL || 'deepseek-chat',
  total, pass, accuracy: total ? +(pass / total).toFixed(4) : 0,
  byCategory: Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, { ...v, accuracy: +(v.pass / v.total).toFixed(4) }])),
  results,
};
const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
const fname = path.join(reportsDir, MODE + '-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json');
fs.writeFileSync(fname, JSON.stringify(report, null, 2));

console.log('\n===== 评测报告 =====');
console.log('模型: ' + report.model + ' | 模式: ' + MODE);
console.log('总准确率: ' + (report.accuracy * 100).toFixed(1) + '% （' + pass + '/' + total + '）');
console.log('\n分项（按类别）:');
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1].total - a[1].total)) {
  console.log('  ' + k.padEnd(4) + ' ' + ((v.pass / v.total) * 100).toFixed(1) + '%  (' + v.pass + '/' + v.total + ')');
}
console.log('\n报告已保存: ' + fname);
if (MIN_ACC > 0 && report.accuracy < MIN_ACC) {
  console.error('\n❌ 准确率 ' + (report.accuracy * 100).toFixed(1) + '% 低于阈值 ' + (MIN_ACC * 100).toFixed(0) + '%——质量回退，退出码 1');
  process.exit(1);
}
if (!VERBOSE) {
  const misses = results.filter(r => !r.pass);
  console.log('\n答错样本（前 10）:');
  for (const r of misses.slice(0, 10)) {
    console.log('  [' + r.id + '] ' + r.category + ' 期望 ' + r.expected + ' 实答 ' + (r.answer ?? '无') + ' | ' + r.question.slice(0, 30));
  }
}