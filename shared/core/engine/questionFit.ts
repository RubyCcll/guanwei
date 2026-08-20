// 问题适配性分析：识别问题域 → 对照九术适配矩阵 → 判定适合度与建议

export type QuestionDomain =
  | 'timing' | 'direction' | 'lost' | 'decision' | 'love'
  | 'career' | 'wealth' | 'health' | 'person' | 'mind' | 'general';

export interface QuestionFit {
  domain: QuestionDomain;
  domainLabel: string;
  suitable: boolean | 'partial';
  reason: string;
  suggestion: string;
  betterArts: string[];
}

const DOMAIN_KEYWORDS: { domain: QuestionDomain; label: string; words: string[] }[] = [
  { domain: 'timing', label: '时机择日', words: ['何时', '什么时候', '几时', '时机', '宜不宜', '该不该现在', '择日', '哪天'] },
  { domain: 'direction', label: '方位出行', words: ['方位', '方向', '往哪', '去哪里', '哪个方向', '出行', '旅行', '出差', '搬家', '风水', '搬迁'] },
  { domain: 'lost', label: '寻物', words: ['失物', '丢了', '找不到', '丢哪', '找回', '寻找', '不见了'] },
  { domain: 'decision', label: '抉择决策', words: ['该不该', '要不要', '能不能', '是否', '选择', '抉择', '答应', '接受', '拒绝', '跳槽', '辞职', '值不值得', '可不可以'] },
  { domain: 'love', label: '情感婚姻', words: ['感情', '爱情', '恋爱', '复合', '分手', '喜欢', '表白', '婚姻', '结婚', '前任', '对象', '暧昧', '相亲'] },
  { domain: 'career', label: '事业学业', words: ['工作', '事业', '面试', '升职', 'offer', '老板', '同事', '创业', '考试', '考研', '晋升', '加薪', '项目', '合作'] },
  { domain: 'wealth', label: '财运投资', words: ['钱', '财运', '投资', '股票', '基金', '赚钱', '收入', '债务', '还债', '买房', '理财', '生意'] },
  { domain: 'health', label: '健康', words: ['健康', '病', '身体', '失眠', '手术', '治疗', '检查', '康复'] },
  { domain: 'person', label: '人事关系', words: ['同事', '朋友', '合伙', '关系', '对方', '团队', '领导', '上司', '客户', '贵人', '婆媳'] },
  { domain: 'mind', label: '心理自我', words: ['性格', '心理', '迷茫', '焦虑', '成长', '灵性', '自我', '状态', '怎么办', '心里', '情绪', '人生方向'] },
];

const FIT_MATRIX: Record<string, Partial<Record<QuestionDomain, boolean | 'partial'>>> = {
  qimen:      { timing: true, direction: true, decision: true, wealth: true, career: true, lost: 'partial', person: 'partial', love: false, mind: false, health: false },
  liuyao:     { decision: true, career: true, wealth: true, lost: true, person: true, love: 'partial', health: 'partial', timing: 'partial', direction: 'partial', mind: false },
  meihua:     { decision: true, career: true, wealth: true, lost: true, love: true, person: true, timing: 'partial', direction: 'partial', health: 'partial', mind: 'partial' },
  xiaoliuren: { timing: true, decision: true, lost: true, direction: 'partial', career: 'partial', wealth: 'partial', love: 'partial', mind: false, person: 'partial' },
  liuren:     { person: true, career: true, decision: true, love: true, wealth: true, lost: true, health: 'partial', timing: 'partial', direction: 'partial', mind: 'partial' },
  tarot:      { love: true, mind: true, decision: true, career: 'partial', wealth: 'partial', person: 'partial', health: 'partial', timing: false, direction: false, lost: false },
  bazi:       { career: true, wealth: true, love: true, health: true, mind: true, person: 'partial', decision: 'partial', timing: 'partial', direction: 'partial', lost: false },
  ziwei:      { career: true, wealth: true, love: true, health: true, mind: true, person: 'partial', decision: 'partial', timing: 'partial', direction: 'partial', lost: false },
  astrology:  { career: true, wealth: true, love: true, health: true, mind: true, person: 'partial', decision: 'partial', timing: 'partial', direction: 'partial', lost: false },
};

export function detectDomain(question: string): { domain: QuestionDomain; label: string } {
  const q = question || '';
  // 最长关键词优先（更具体的语义胜出，如「人生方向」优先于「往哪」）
  let best: { domain: QuestionDomain; label: string; len: number } | null = null;
  for (const d of DOMAIN_KEYWORDS) {
    for (const w of d.words) {
      if (q.includes(w) && (!best || w.length > best.len)) {
        best = { domain: d.domain, label: d.label, len: w.length };
      }
    }
  }
  return best ? { domain: best.domain, label: best.label } : { domain: 'general', label: '综合' };
}
const ART_STRENGTH: Record<string, { good: string; bad: string; suggest: string }> = {
  qimen: { good: '择时出行、方位趋避、谋事成败、财运契机——凡问时机方位者最契', bad: '情感内心、性格心理之事', suggest: '若问感情，宜改为问「与某人发展之机，何时宜动、何方可往」；若问心理成长，宜用塔罗或命盘观照。' },
  liuyao: { good: '一事之吉凶成败、谋事、寻物、考试、求财、讼事——凡问具体事务者最契', bad: '抽象的心理性格、长期人生格局', suggest: '若问性格人生，宜以八字/紫微/星盘观格局；若问内心状态，塔罗更宜观照。' },
  meihua: { good: '心动即占，万象皆可问——时、事、情、财皆可成卦', bad: '（几乎无所不包，仅深度有限）', suggest: '若需更深之命理格局，可再以八字/紫微参详。' },
  xiaoliuren: { good: '一时一事之吉凶、即时决策、寻物、出行——快捷问占最契', bad: '长期人生格局、深层心理', suggest: '若问长期格局，宜用八字/紫微排盘；若问深层心理，塔罗更宜。' },
  liuren: { good: '人事往来、合作、婚姻、出行、疾病、失物——人事之王，人事问题最契', bad: '（所长人事，抽象心理为次）', suggest: '若问纯心理状态，塔罗或命盘观照更宜。' },
  tarot: { good: '情感关系、内心观照、选择困惑、自我成长——镜鉴之心最契', bad: '择时、方位、失物等客观吉凶', suggest: '若问何时宜动、何方可往，宜用奇门遁甲；若问失物，六爻或小六壬更契。' },
  bazi: { good: '性格格局、事业财运、婚姻感情、人生阶段——命理之经纬', bad: '一时一事的即时吉凶', suggest: '若问即时之事（如出行吉凶、能否成事），宜用六爻/小六壬/奇门起占。' },
  ziwei: { good: '命盘格局、十二宫人生领域、大限流年——星命之宫垣', bad: '一时一事的即时吉凶', suggest: '若问即时之事，宜用六爻/小六壬/奇门起占。' },
  astrology: { good: '性格天赋、人生轨迹、行星宫位相位——天穹为书', bad: '一时一事的即时吉凶', suggest: '若问即时之事，宜用六爻/小六壬/奇门起占。' },
};

export const artNameOf = (id: string): string => {
  const map: Record<string, string> = {
    bazi: '四柱八字', ziwei: '紫微斗数', qimen: '奇门遁甲', meihua: '梅花易数',
    liuyao: '六爻', liuren: '大六壬', xiaoliuren: '小六壬', astrology: '星盘', tarot: '塔罗',
  };
  return map[id] || id;
}

export function analyzeQuestionFit(artId: string, question: string): QuestionFit {
  const { domain, label } = detectDomain(question);
  const matrix = FIT_MATRIX[artId] || {};
  const suitable = matrix[domain] ?? 'partial';
  const strength = ART_STRENGTH[artId] || ART_STRENGTH.qimen;
  const artName = artNameOf(artId);
  const betterArts = Object.keys(FIT_MATRIX).filter(a => a !== artId && FIT_MATRIX[a][domain] === true);
  let reason: string;
  let suggestion: string;
  if (suitable === true) {
    reason = '此问属「' + label + '」，恰契' + strength.good + '。';
    suggestion = '';
  } else if (suitable === 'partial') {
    reason = '此问属「' + label + '」，与' + artName + '之道部分相契（' + strength.good + '）。以下解读以参详为度。';
    suggestion = (betterArts.length ? '若求更应之占，可试' + betterArts.map(artNameOf).join('、') + '。' : '') + strength.suggest;
  } else {
    reason = '此问属「' + label + '」，与' + artName + '之道不甚相契（' + artName + '所长在' + strength.good + '；' + strength.bad + '非其所长）。以下解读仅供建议参详，不作定论。';
    suggestion = (betterArts.length ? '建议更换问题方向：' + betterArts.map(artNameOf).join('、') + '更宜此类之问。' : '') + strength.suggest;
  }
  return { domain, domainLabel: label, suitable, reason, suggestion, betterArts };
}