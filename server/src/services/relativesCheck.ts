// 六亲表述校验与修正：报告生成后检测六亲宫位表述是否与盘面事实矛盾，矛盾则定向重写
// 背景：实测模型在长报告中对「父母宫主星」等事实屡屡编造（写无主星/错误地支），提示词约束不可靠，需工程兜底
import type { AIReportNormalized } from '../routes/ai.js';
import { chatOnce, type ChatMessage } from './llmProvider.js';

const DIZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']; // 引擎宫位索引：0=寅
const SIHUA_KEY: Record<string, string> = { lu: '化禄', quan: '化权', ke: '化科', ji: '化忌' };

interface PalaceFact { name: string; zhi: string; stars: string[]; fus: string[]; sihua: string }

function ziweiPalace(r: any, palaceIdx: number, name: string): PalaceFact {
  const zhiIdx = r.palaces?.[palaceIdx] ?? ((r.ming - palaceIdx + 24) % 12);
  const stars = Object.entries(r.zwStars).filter(([, p]) => p === zhiIdx).map(([s]) => s);
  const fus = Object.entries(r.fuStars || {}).filter(([, p]) => p === zhiIdx).map(([s]) => s);
  const sihua = Object.entries(r.sihuaPos || {}).filter(([, p]) => p === zhiIdx).map(([k]) => SIHUA_KEY[k]).join('、');
  return { name, zhi: DIZHI[zhiIdx], stars, fus, sihua };
}

function ziweiFacts(r: any): PalaceFact[] {
  return [ziweiPalace(r, 11, '父母宫'), ziweiPalace(r, 2, '夫妻宫'), ziweiPalace(r, 3, '子女宫')];
}

/** 校验报告文本中某宫的表述是否与事实矛盾（出现「宫名」且关键要素全错即矛盾） */
function checkPalace(text: string, fact: PalaceFact, r: any): string[] {
  const errs: string[] = [];
  // 窗口限 10 字且排除全/半角标点，避免跨句误匹配（如「子女宫天相,父母宫在酉」把酉算进子女宫）
  const re = new RegExp(fact.name + '[^，。；、,.;\\n\\s]{0,10}', 'g');
  let m: RegExpExecArray | null;
  const mentions: string[] = [];
  while ((m = re.exec(text)) !== null) mentions.push(m[0]);
  // 对宫主星（借星校验用）：本宫无主星时 AI 常写「借对宫X」——对宫主星是客观事实
  const oppZhi = (DIZHI.indexOf(fact.zhi) + 6) % 12;
  const oppStars = Object.entries(r?.zwStars || {}).filter(([, p]) => p === oppZhi).map(([s]) => s);
  for (const seg of mentions) {
    const body = seg.slice(fact.name.length); // 宫名本身可能含地支字（如「子女宫」的「子」），只查其后内容
    const zhiMentioned = DIZHI.filter(z => body.includes(z));
    const wrongZhi = zhiMentioned.filter(z => z !== fact.zhi);
    if (wrongZhi.length) errs.push(`${fact.name}地支写错（${seg.slice(0, 20)}…应为${fact.zhi}宫）`);
    if (fact.stars.length > 0 && body.includes('无主星')) {
      errs.push(`${fact.name}写成无主星（实际主星${fact.stars.join('、')}）`);
    }
    // 借星校验：写「借对宫X」时 X 必须与实际对宫主星一致（跨逗号匹配到句号为止）
    if (oppStars.length) {
      const jiRe = new RegExp(fact.name + '[^。；\\n]{0,28}借对宫([^，。；、,.;\\s"{}]{1,8})', 'g');
      let jm: RegExpExecArray | null;
      while ((jm = jiRe.exec(text)) !== null) {
        const borrowed = jm[1];
        const matched = oppStars.some(s => borrowed.includes(s));
        if (!matched) {
          errs.push(`${fact.name}借星写错（借对宫${borrowed}…实际对宫主星为${oppStars.join('、')}）`);
        }
      }
    }
  }
  return errs;
}

/** 四化一致性：只校验生年四化星名（巨门/太阳/文曲/文昌）的化名是否写错。
 * 例：生年文昌化忌，报告写「文曲化忌」→ 错；「武曲化禄」可能是大限/流年四化 → 不校验 */
function checkSihua(text: string, r: any): string[] {
  const errs: string[] = [];
  const sihua = r?.sihua;
  if (!sihua) return errs;
  const SI_MAP: Record<string, string> = {
    [sihua.lu]: '化禄', [sihua.quan]: '化权', [sihua.ke]: '化科', [sihua.ji]: '化忌',
  };
  const siStars = Object.keys(SI_MAP);
  const re = /([^，。；、,.;\n\s"{}:]{1,4})(化禄|化权|化科|化忌)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const label = m[2];
    const written = m[1].replace(/[，。；、,.;"{}:\s]/g, '').slice(-2); // 星名最多 2 字，取末尾
    if (siStars.includes(written) && SI_MAP[written] !== label) {
      errs.push(`${written}${label}写错（实际应为${written}${SI_MAP[written]}）`);
    }
  }
  return errs;
}

/** 校验 AI 报告中的六亲表述，返回矛盾清单（空数组 = 通过） */
export function verifyRelatives(artId: string, resultRaw: unknown, report: AIReportNormalized): string[] {
  try {
    if (artId !== 'ziwei' && artId !== 'bazi') return [];
    const text = JSON.stringify(report, null, 1);
    if (artId === 'ziwei' && resultRaw && (resultRaw as any).palaces) {
      const facts = ziweiFacts(resultRaw);
      const errs: string[] = [];
      for (const f of facts) {
        if (f.name === '夫妻宫' && f.stars.length === 0) continue; // 无主星是合法状态
        errs.push(...checkPalace(text, f, resultRaw));
      }
      errs.push(...checkSihua(text, resultRaw));
      return errs;
    }
  } catch { /* 校验失败不阻塞 */ }
  return [];
}

function factsText(artId: string, resultRaw: unknown): string {
  if (artId === 'ziwei' && resultRaw && (resultRaw as any).palaces) {
    return ziweiFacts(resultRaw)
      .map(f => `${f.name}：${f.zhi}宫，${f.stars.length ? '主星' + f.stars.join('、') : '无主星'}${f.fus.length ? '，辅星' + f.fus.join('、') : ''}${f.sihua ? '，' + f.sihua : ''}`)
      .join('；');
  }
  return '';
}

/** 定向重写 family 区块：仅当校验发现矛盾时调用（一次短调用，只输出修正后的 family JSON） */
export async function fixFamilyRelatives(artId: string, resultRaw: unknown, report: AIReportNormalized, errors: string[]): Promise<unknown | null> {
  try {
    const facts = factsText(artId, resultRaw);
    if (!facts) return null;
    const oldFamily = JSON.stringify(report.family || {}, null, 1);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: [
          '你是紫微斗数报告校正助手。以下是命盘六亲宫位事实（不可更改、必须逐字引用）：',
          facts,
          '',
          '原报告的家庭段落存在与事实矛盾的表述：' + errors.join('；'),
          '请只重写报告的「原生家庭 family」区块，输出一个合法 JSON 对象（字段 background/parents/imprint，结构与原区块一致）：',
          '1. 所有盘面描述（宫位地支、主星、辅星、四化）必须与上述六亲事实完全一致；',
          '2. 解读结论可保留原意，但盘面依据必须更正；',
          '3. 只输出 JSON 对象本身，不要任何其他文字。',
        ].join('\n'),
      },
      { role: 'user', content: '原 family 区块：\n' + oldFamily + '\n\n请输出修正后的 family JSON。' },
    ];
    const text = await chatOnce(messages);
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    const obj = JSON.parse(cleaned);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
    return null;
  } catch (e: any) {
    console.warn('[relatives-fix] 修正失败:', e.message);
    return null;
  }
}
