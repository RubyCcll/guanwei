// 问题语义分析器
// 在解读阶段对用户问题进行多维度分析
// 类型定义收敛自 shared/core/types.ts（单一副本），此处仅保留分析与函数逻辑

import type {
  Scene, Emotion, Tense, Subject, Depth,
  QuestionType, ResponseNeed, KeyEntity, QuestionAnalysis, SemanticAnalysis,
} from '../types.js';

export type {
  Scene, Emotion, Tense, Subject, Depth,
  QuestionType, ResponseNeed, KeyEntity, QuestionAnalysis, SemanticAnalysis,
};

// 场景关键词库
const SCENE_KEYWORDS: Record<Scene, { label: string; words: string[]; weight: number }> = {
  love: {
    label: '爱情',
    words: ['爱情', '恋爱', '感情', '喜欢', '暗恋', '表白', '分手', '复合', '出轨', '暧昧', '前任', '相亲', '对象', '男朋友', '女朋友', '老公', '老婆', '夫妻', '婚姻', '嫁', '娶', '婚外', '小三', '第三者', '暧昧对象', '心动', '追', '拒', '恋爱脑', '桃花', '真爱', '情场', '求爱', '在一起', '分手后', '前男友', '前女友', '约会', '表白', '相亲'],
    weight: 1.0,
  },
  career: {
    label: '事业',
    words: ['工作', '事业', '职场', '上司', '老板', '同事', '下属', '跳槽', '辞职', '面试', 'offer', '晋升', '加薪', '裁员', '辞退', '被开', '入职', '新公司', '创业', '合伙', '项目', '客户', '业绩', 'KPI', '加班', '转行', '副业', '工位', '办公', '部门', '团队', '领导', '面试官', 'hr', '招聘'],
    weight: 1.0,
  },
  wealth: {
    label: '财运',
    words: ['钱', '财运', '财富', '收入', '工资', '薪水', '存款', '投资', '股票', '基金', '理财', '亏', '赚', '赔', '副业', '兼职', '失业', '还债', '债务', '贷款', '房贷', '房租', '车贷', '信用卡', '花呗', '借呗', '奖金', '遗产', '意外之财', '彩票', '赌博', '破产'],
    weight: 1.0,
  },
  study: {
    label: '学业',
    words: ['考试', '高考', '中考', '考研', '留学', '托福', '雅思', '论文', '毕业', '成绩', '挂科', '录取', '面试', '专业', '学校', '老师', '同学', '学习', '读书', '上课', '复习', '学位', '学历', '考证', '面试', '答辩'],
    weight: 1.0,
  },
  health: {
    label: '健康',
    words: ['身体', '健康', '生病', '病', '不舒服', '失眠', '焦虑', '抑郁', '压力', '疲惫', '累', '瘦', '胖', '减肥', '健身', '运动', '心理', '情绪', '治疗', '医生', '医院', '药', '检查', '体检', '睡眠', '亚健康'],
    weight: 1.0,
  },
  family: {
    label: '家庭',
    words: ['家', '父母', '爸爸', '妈妈', '孩子', '儿子', '女儿', '老公', '老婆', '家人', '婆媳', '妯娌', '亲戚', '长辈', '子女', '育儿', '教育', '买房', '搬家', '家庭关系', '原生家庭', '离家', '父母催'],
    weight: 1.0,
  },
  friendship: {
    label: '友谊',
    words: ['朋友', '闺蜜', '兄弟', '哥们', '姐妹', '友情', '友谊', '社交', '圈子', '社团', '聚会', '相处', '吃醋', '背叛', '疏远', '误会', '和好', '冷暴力'],
    weight: 0.9,
  },
  spiritual: {
    label: '灵性',
    words: ['灵性', '灵魂', '前世', '轮回', '业力', '开悟', '觉醒', '冥想', '禅', '道', '佛', '缘分', '命运', '使命', '天赋', '使命召唤', '内在成长', '自我实现', '人生意义', '宇宙', '高我'],
    weight: 1.0,
  },
  travel: {
    label: '旅行',
    words: ['旅行', '出差', '搬家', '留学', '移民', '签证', '远行', '出发', '目的地', '出发', '旅途', '机票', '酒店', '城市', '国家', '留居', '回去', '回乡'],
    weight: 0.9,
  },
  general: {
    label: '综合',
    words: ['未来', '现在', '以后', '运势', '整体', '人生', '生活', '最近', '接下来', '应该', '怎么办', '怎么做', '该不该', '要不要', '是否'],
    weight: 0.5,
  },
};

// 情绪关键词
const EMOTION_KEYWORDS: Record<Emotion, { label: string; words: string[] }> = {
  anxious: { label: '焦虑', words: ['焦虑', '担心', '紧张', '害怕', '恐惧', '不安', '心慌', '纠结', '犹豫', '忐忑', '怕', '忧', '愁', '急', '压力大', '紧绷'] },
  hopeful: { label: '期待', words: ['希望', '期待', '想要', '盼望', '渴望', '憧憬', '会', '能', '想要', '愿望', '梦想'] },
  confused: { label: '迷茫', words: ['迷茫', '困惑', '不知道', '不清楚', '糊涂', '不知所措', '没有方向', '迷失', '找不到', '不懂', '怎么办', '该怎么做'] },
  lost: { label: '失落', words: ['失落', '失望', '绝望', '心累', '崩溃', '不想', '放弃', '没意思', '糟糕', '糟糕透顶', '完蛋', '无望'] },
  grateful: { label: '感恩', words: ['感谢', '感恩', '谢谢', '幸运', '幸福', '开心', '美好', '顺利', '谢谢', '感谢'] },
  calm: { label: '平静', words: ['平静', '淡定', '从容', '还好', '正常', '平常', '一般', '差不多', '稳定'] },
  angry: { label: '愤怒', words: ['生气', '愤怒', '气死', '讨厌', '烦', '凭什么', '不公平', '恼火', '恨', '可恨'] },
  sad: { label: '悲伤', words: ['难过', '伤心', '哭', '痛苦', '心碎', '伤感', '悲哀', '痛', '泪水', '受伤'] },
  curious: { label: '好奇', words: ['为什么', '怎么回事', '会怎样', '想了解', '好奇', '有意思'] },
};

// 时态关键词
const TENSE_KEYWORDS: Record<Tense, { label: string; words: string[] }> = {
  past: { label: '过去', words: ['之前', '以前', '过去', '当时', '曾经', '已经', '发生过了', '之前发生', '早前', '上个月', '去年', '为什么', '当时为什么', '过去怎么'] },
  present: { label: '现在', words: ['现在', '目前', '当前', '眼下', '此刻', '这阵子', '最近', '正在', '眼下', '当下', '如今'] },
  future: { label: '未来', words: ['以后', '未来', '将来', '接下来', '之后', '会', '将', '明年', '下个月', '以后会', '未来会', '未来会怎样'] },
  hypothetical: { label: '假设', words: ['如果', '假设', '要是', '假若', '万一', '假设我', '假如', '若'] },
  ongoing: { label: '持续', words: ['一直', '持续', '总是', '长期', '经常', '反复', '一直这样', '持续中', '正在进行'] },
};

// 对象关键词
const SUBJECT_KEYWORDS: Record<Subject, { label: string; words: string[] }> = {
  self: { label: '自己', words: ['我', '我自己', '我应该', '我能', '我要', '我是否', '我该不该', '我要不要', '我的', '本人'] },
  other: { label: '对方', words: ['他', '她', '对方', '那个人', '他/她', 'ta', 'TA', '他/她是否', '他/她会不会', '他/她的', '我对象的', '我男朋友', '我女朋友', '我老公', '我老婆', '我爸妈', '我朋友', '我同事'] },
  mutual: { label: '双方', words: ['我们', '我们俩', '两个人', '彼此', '双方', '我们的', '我们能', '我们是否', '我们之间'] },
  'third-party': { label: '第三方', words: ['第三方', '外人', '他们', '别人', '其他人', '公司', '单位', '环境', '外部', '他人', '外人'] },
};

// ===== 问题类型关键词库 =====
const QUESTION_TYPE_KEYWORDS: Record<QuestionType, { label: string; words: string[]; weight: number }> = {
  decision: {
    label: '决策类',
    words: ['该不该', '要不要', '是否要', '是否应该', '该不该继续', '要不要继续', '该不该分手', '要不要分手', '该不该辞职', '要不要辞职', '该不该复合', '要不要复合', '该不该离开', '该不该坚持', '要不要放弃', '该不该接受', '要不要接受', '该不该去', '要不要去', '该不该换', '要不要换', '纠结', '犹豫', '抉择', '二选一', '应该吗', '可以吗', '行不行', '合适吗', '值得吗'],
    weight: 1.2,
  },
  prediction: {
    label: '预测类',
    words: ['会怎样', '会怎么样', '运势', '能不能', '会不会', '未来', '结果', '结局', '发展', '走向', '趋势', '前景', '会成功吗', '能成吗', '能成功', '会好吗', '会变好', '会回来', '能复合', '会复合', '能结婚', '会结婚', '能怀孕', '会怀孕', '会顺利', '能顺利', '怎么样', '好吗', '好不好', '走势', '前景如何', '走向如何'],
    weight: 1.0,
  },
  reason: {
    label: '原因类',
    words: ['为什么', '怎么回事', '为何', '怎么会', '凭什么', '为啥', '为何会', '为什么会', '原因', '为何突然', '为什么突然', '为什么总是', '为何总是', '怎么变成', '为什么会这样', '为何这样', '为何不', '为什么不'],
    weight: 1.2,
  },
  advice: {
    label: '建议类',
    words: ['怎么办', '怎么做', '该如何', '该怎样', '怎么处理', '怎么解决', '怎么应对', '该怎么', '要怎么', '该如何做', '怎么走', '怎么选', '怎么挽回', '怎么改善', '怎么调整', '如何', '怎么办才好', '该怎么做', '怎么才能', '怎么样才能', '如何才能', '怎样才好'],
    weight: 1.0,
  },
  mindreading: {
    label: '读心类',
    words: ['爱不爱', '喜不喜欢', '怎么想', '心里有', '心里没', '心里有没有', '他是不是', '她是不是', '他到底', '她到底', '对方怎么想', '对方到底', '对方是不是', '对方真的', '他真的', '她真的', '他在想', '她在想', '他对我', '她对我', '他喜欢', '她喜欢', '在乎我', '在乎不在乎', '心里想', '真心吗', '真心的吗', '有没有我', '他怎么看', '她怎么看', '他到底爱不爱', '她到底爱不爱'],
    weight: 1.3,
  },
  timing: {
    label: '时间类',
    words: ['什么时候', '多久', '何时', '几点', '哪天', '什么时候能', '什么时候会', '多久能', '多久会', '什么时候可以', '要多久', '等多久', '几岁', '哪一年', '哪年', '什么时候才'],
    weight: 1.1,
  },
  general: {
    label: '通用类',
    words: [],
    weight: 0.3,
  },
};

// 不同问题类型自带的情绪倾向（在没有明显情绪词时作为兜底）
const TYPE_EMOTION_BIAS: Record<QuestionType, Emotion> = {
  decision: 'anxious',
  prediction: 'curious',
  reason: 'confused',
  advice: 'confused',
  mindreading: 'anxious',
  timing: 'anxious',
  general: 'curious',
};

// ===== 关键实体词库 =====
const PERSON_ENTITY_WORDS = ['前任', '前男友', '前女友', '男朋友', '女朋友', '老公', '老婆', '对象', '老板', '上司', '领导', '同事', '下属', '父母', '妈妈', '爸爸', '母亲', '父亲', '孩子', '儿子', '女儿', '朋友', '闺蜜', '兄弟', '室友', '相亲对象', '暗恋对象', '第三者', '对方', '客户', '面试官', '导师', '老师', '同学', '他', '她', 'ta', '那个人'];
const EVENT_ENTITY_WORDS = ['分手', '复合', '表白', '告白', '结婚', '离婚', '复婚', '求婚', '辞职', '跳槽', '离职', '入职', '面试', '考试', '高考', '考研', '出国', '留学', '搬家', '创业', '晋升', '加薪', '出轨', '暧昧', '相亲', '毕业', '挂科', '录取', '还债', '投资', '买房', '冷战', '吵架'];
const TIME_ENTITY_WORDS = ['最近', '这阵子', '眼下', '当下', '现在', '目前', '接下来', '未来', '以后', '将来', '明年', '今年', '去年', '上个月', '下个月', '之前', '当时', '此刻', '今天', '明天', '昨天', '后天', '年底', '年初', '过去', '不久', '迟早', '早晚'];

// ===== 问题核心意图（按问题类型） =====
const QUESTION_CORE: Record<QuestionType, string> = {
  decision: '你在权衡一个选择，想确认哪条路更值得走',
  prediction: '你想提前看见未来的走向，好让自己心里有底',
  reason: '你想弄明白事情为何会发展成现在这样',
  advice: '你在寻找一个能让自己安心的行动方向',
  mindreading: '你想读懂对方心里真实的想法',
  timing: '你想知道那个关键的时刻何时才会到来',
  general: '你想为当下的处境找到一份指引',
};

// ===== 一句话概括模板（场景 × 问题类型） =====
const QUESTION_SUMMARY_TEMPLATES: Record<string, string> = {
  'love-mindreading': '你想确认对方对你的真实感受',
  'love-prediction': '你想了解这段感情未来的走向',
  'love-decision': '你在犹豫是否要在这段感情上做出选择',
  'love-reason': '你想弄清这段感情出现状况的原因',
  'love-advice': '你想知道该如何面对这段感情',
  'love-timing': '你想知道这段感情的关键转折何时到来',
  'career-decision': '你在面临一个重要的职业抉择',
  'career-prediction': '你想了解事业未来的发展趋势',
  'career-reason': '你想弄清职场现状背后的原因',
  'career-advice': '你想获得职业发展的方向建议',
  'career-mindreading': '你想了解领导或同事对你的真实看法',
  'career-timing': '你想知道事业转机何时出现',
  'wealth-prediction': '你想了解近期的财运走势',
  'wealth-decision': '你在考虑一个财务上的选择',
  'wealth-advice': '你想获得改善财务状况的建议',
  'wealth-reason': '你想弄清财运起伏背后的原因',
  'study-prediction': '你想了解学业考试的结果走向',
  'study-decision': '你在纠结学业方向的选择',
  'study-advice': '你想获得学习备考的建议',
  'study-reason': '你想弄清学业受阻的原因',
  'health-prediction': '你想了解健康状况的走向',
  'health-advice': '你想获得改善健康的建议',
  'health-reason': '你想弄清身体出状况的原因',
  'family-decision': '你在面临一个家庭关系的抉择',
  'family-reason': '你想弄清家庭矛盾的根源',
  'family-advice': '你想获得处理家庭关系的建议',
  'family-prediction': '你想了解家庭关系未来的走向',
  'friendship-advice': '你想获得处理友情关系的建议',
  'friendship-reason': '你想弄清朋友之间出现问题的原因',
  'friendship-prediction': '你想了解这段友谊未来的走向',
  'spiritual-advice': '你想获得灵性成长的指引',
  'spiritual-prediction': '你想了解灵性旅程的走向',
  'travel-decision': '你在考虑一次出行或变动',
  'travel-prediction': '你想了解这次出行的走向',
  'general-prediction': '你想了解近期整体的运势走向',
  'general-decision': '你在面临一个人生方向的选择',
  'general-advice': '你想获得一些生活的指引',
  'general-reason': '你想弄清现状背后的原因',
  'general-mindreading': '你想确认对方对你的真实感受',
  'general-timing': '你想知道转机何时才会出现',
};

const QUESTION_SUMMARY_FALLBACK: Record<QuestionType, string> = {
  decision: '你在面临一个需要做出选择的情况',
  prediction: '你想了解未来的发展趋势',
  reason: '你想弄清事情背后的原因',
  advice: '你在寻求一个行动的方向',
  mindreading: '你想读懂对方的真实想法',
  timing: '你想知道时机何时到来',
  general: '你想为当下的处境寻找一个答案',
};

// ===== 深度分析模板 =====
const REAL_QUESTION: Record<QuestionType, string> = {
  decision: '你真正想问的，是这个选择是否符合你内心深处的期待，哪条路才能让你走得更踏实',
  prediction: '你真正想问的，是未来能否给你一个值得期待、也让你安心的答案',
  reason: '你真正想问的，是这件事背后是否还藏着你没看见的真相',
  advice: '你真正想问的，是下一步该往哪个方向走，才能走出当下的困局',
  mindreading: '你真正想问的，是对方心里到底有没有你、你是否真的被在乎',
  timing: '你真正想问的，是还要等多久，那个转机才会真正到来',
  general: '你真正想问的，是当下的生活究竟该往何处去',
};

const EMOTIONAL_NEED_BASE: Record<Emotion, string> = {
  anxious: '你心里有些不安，需要一个能让你踏实下来的答案',
  hopeful: '你心怀期待，想确认这份期待是否会被未来温柔接住',
  confused: '你有些理不清头绪，需要有人帮你拨开眼前的迷雾',
  lost: '你感到有些无力，需要一份不带评判的陪伴与方向',
  grateful: '你心怀感念，想确认眼前的美好能否一直延续',
  calm: '你心态相对平稳，只是想多一份确认与参考',
  angry: '你心里有一股不平，需要被理解，也需要看清真相',
  sad: '你心里有放不下的难过，需要被温柔接住，也需要一个释怀的理由',
  curious: '你带着好奇与期待，想提前窥见未来的可能画面',
};

const TYPE_NEED_CLAUSE: Record<QuestionType, string> = {
  decision: '，想看清哪条路才是自己真正想走的',
  prediction: '，想把未来的画面看得更清楚一些',
  reason: '，需要一个能让自己释怀的解释',
  advice: '，想得到一个能落地的方向',
  mindreading: '，渴望确认自己是否真的被在乎',
  timing: '，想知道这份等待有没有尽头',
  general: '，想在当下找到一个着力点',
};

const RESPONSE_NEED_LABEL: Record<ResponseNeed, string> = {
  comfort: '安慰',
  direction: '方向',
  confirmation: '确认',
  warning: '警示',
};

// 识别问题类型
function detectQuestionType(text: string): QuestionType {
  const scores: Record<string, number> = {};
  Object.entries(QUESTION_TYPE_KEYWORDS).forEach(([key, info]) => {
    let score = 0;
    info.words.forEach((word) => {
      score += (text.split(word).length - 1) * info.weight;
    });
    scores[key] = score;
  });
  let type: QuestionType = 'general';
  let max = 0;
  Object.entries(scores).forEach(([key, score]) => {
    if (score > max) {
      max = score;
      type = key as QuestionType;
    }
  });
  return type;
}

// 情绪识别：关键词打分 + 问题类型倾向 + 语境增强
function detectEmotion(text: string, questionType: QuestionType): { emotion: Emotion; score: number } {
  const keywordScores: Record<string, number> = {};
  Object.entries(EMOTION_KEYWORDS).forEach(([key, info]) => {
    let s = 0;
    info.words.forEach((word) => {
      s += text.split(word).length - 1;
    });
    keywordScores[key] = s;
  });

  // 原始关键词最高分，保留给强度/置信度计算
  let rawScore = 0;
  Object.values(keywordScores).forEach((s) => {
    if (s > rawScore) rawScore = s;
  });

  const scores: Record<string, number> = { ...keywordScores };

  // 1) 问题类型自带的情绪倾向
  const bias = TYPE_EMOTION_BIAS[questionType];
  scores[bias] = (scores[bias] || 0) + 0.6;

  // 2) 预测类 + 期待语境 → 期待
  if (questionType === 'prediction' && /运势|好不好|顺利|成功|会好|能成|桃花/.test(text)) {
    scores.hopeful = (scores.hopeful || 0) + 0.8;
  }
  // 3) 预测类 + 负向语境 → 焦虑
  if (questionType === 'prediction' && /会不会失败|会不会出|会不会分|会不会离|会不会丢|会不会没|能撑|撑得住/.test(text)) {
    scores.anxious = (scores.anxious || 0) + 0.8;
  }
  // 4) 原因类 + 负面事件 → 悲伤 + 困惑
  if (questionType === 'reason' && /分手|离婚|出轨|辞职|破产|挂科|失败|离开|失去|去世|生病|冷战|吵架|疏远|背叛/.test(text)) {
    scores.sad = (scores.sad || 0) + 1.2;
    scores.confused = (scores.confused || 0) + 0.5;
  }
  // 5) 读心类 + 强调词 → 焦虑
  if (questionType === 'mindreading' && /到底|究竟|真的|是不是|到底爱不爱|到底喜不喜欢/.test(text)) {
    scores.anxious = (scores.anxious || 0) + 0.8;
  }
  // 6) 决策类 + 纠结词 → 焦虑 / 迷茫
  if (questionType === 'decision' && /纠结|犹豫|不知道怎么选|舍不得|放不下/.test(text)) {
    scores.anxious = (scores.anxious || 0) + 0.5;
    scores.confused = (scores.confused || 0) + 0.5;
  }

  let emotion: Emotion = 'curious';
  let best = -1;
  Object.entries(scores).forEach(([key, s]) => {
    if (s > best) {
      best = s;
      emotion = key as Emotion;
    }
  });
  return { emotion, score: rawScore };
}

// 提取关键实体
function extractKeyEntities(text: string): KeyEntity[] {
  const entities: KeyEntity[] = [];
  const seen = new Set<string>();
  const push = (type: KeyEntity['type'], words: string[]) => {
    for (const w of words) {
      if (text.includes(w) && !seen.has(w)) {
        seen.add(w);
        entities.push({ type, value: w });
      }
    }
  };
  push('person', PERSON_ENTITY_WORDS);
  push('event', EVENT_ENTITY_WORDS);
  push('time', TIME_ENTITY_WORDS);
  return entities.slice(0, 8);
}

// 生成一句话概括
function generateQuestionSummary(scene: Scene, questionType: QuestionType): string {
  return QUESTION_SUMMARY_TEMPLATES[`${scene}-${questionType}`] || QUESTION_SUMMARY_FALLBACK[questionType];
}

// 判断用户需要的回应方式
function getResponseNeed(questionType: QuestionType, emotion: Emotion, text: string): ResponseNeed {
  // 涉及明显风险 → 警示
  const hasRisk = /出轨|破产|危险|借钱|投资|赌博|裸辞|网贷|骗局|被骗|第三者|婚外|套现|透支|高利贷/.test(text);
  if (hasRisk && (questionType === 'decision' || questionType === 'advice' || questionType === 'prediction')) {
    return 'warning';
  }
  // 情绪低落 → 先安慰
  if (emotion === 'sad' || emotion === 'lost') return 'comfort';
  // 愤怒 → 需要被看见、被确认
  if (emotion === 'angry') return 'confirmation';
  // 按问题类型给出
  switch (questionType) {
    case 'decision':
    case 'advice':
    case 'timing':
      return 'direction';
    case 'prediction':
    case 'reason':
    case 'mindreading':
      return 'confirmation';
    default:
      return emotion === 'anxious' ? 'comfort' : 'direction';
  }
}

// 构建深度分析
function buildQuestionAnalysis(questionType: QuestionType, emotion: Emotion, text: string): QuestionAnalysis {
  const responseNeed = getResponseNeed(questionType, emotion, text);
  return {
    realQuestion: REAL_QUESTION[questionType],
    emotionalNeed: EMOTIONAL_NEED_BASE[emotion] + TYPE_NEED_CLAUSE[questionType],
    responseNeed,
    responseNeedLabel: RESPONSE_NEED_LABEL[responseNeed],
  };
}

export function analyzeQuestion(question: string, category?: string): SemanticAnalysis {
  const text = question.toLowerCase().trim();

  // 1. 场景识别
  const sceneScores: Record<string, number> = {};
  Object.entries(SCENE_KEYWORDS).forEach(([key, info]) => {
    let score = 0;
    info.words.forEach((word) => {
      const matches = text.split(word).length - 1;
      score += matches * info.weight;
    });
    sceneScores[key] = score;
  });

  // 用户分类优先
  let scene: Scene = 'general';
  let maxScore = 0;
  if (category && category !== 'general') {
    scene = category as Scene;
  } else {
    Object.entries(sceneScores).forEach(([key, score]) => {
      if (score > maxScore) {
        maxScore = score;
        scene = key as Scene;
      }
    });
    if (maxScore < 0.5) scene = 'general';
  }

  // 2. 问题类型识别（用于增强情绪与深度分析）
  const questionType = detectQuestionType(text);

  // 3. 情绪识别（关键词 + 问题类型 + 语境）
  const { emotion, score: emotionScore } = detectEmotion(text, questionType);

  // 4. 时态识别
  let tense: Tense = 'present';
  let tenseScore = 0;
  Object.entries(TENSE_KEYWORDS).forEach(([key, info]) => {
    let score = 0;
    info.words.forEach((word) => {
      const matches = text.split(word).length - 1;
      score += matches * 2; // 时态权重更高
    });
    if (score > tenseScore) {
      tenseScore = score;
      tense = key as Tense;
    }
  });

  // 5. 对象识别
  let subject: Subject = 'self';
  let subjectScore = 0;
  Object.entries(SUBJECT_KEYWORDS).forEach(([key, info]) => {
    let score = 0;
    info.words.forEach((word) => {
      const matches = text.split(word).length - 1;
      score += matches;
    });
    if (score > subjectScore) {
      subjectScore = score;
      subject = key as Subject;
    }
  });

  // 6. 深度判断（基于问题长度、问号数、关键词）
  const questionMarks = (text.match(/[？?]/g) || []).length;
  const length = text.length;
  let depth: Depth = 'mid';
  if (length < 15 && questionMarks <= 1) depth = 'surface';
  else if (length > 30 || questionMarks > 1) depth = 'deep';

  // 7. 关键词提取（按权重）
  const keywords: string[] = [];
  Object.entries(SCENE_KEYWORDS).forEach(([key, info]) => {
    if (key === scene) {
      info.words.forEach((word) => {
        if (text.includes(word) && !keywords.includes(word)) {
          keywords.push(word);
        }
      });
    }
  });

  // 8. 关键实体提取
  const keyEntities = extractKeyEntities(text);

  // 9. 问题核心意图 + 一句话概括
  const questionCore = QUESTION_CORE[questionType];
  const questionSummary = generateQuestionSummary(scene, questionType);

  // 10. 深度分析（潜台词）
  const questionAnalysis = buildQuestionAnalysis(questionType, emotion, text);

  // 11. 强度
  const intensity = Math.min(1, (emotionScore * 0.3 + questionMarks * 0.2 + length / 50 * 0.2 + maxScore * 0.3));

  // 12. 置信度
  const confidence = Math.min(1, (maxScore * 0.4 + (emotionScore + tenseScore + subjectScore) * 0.2 + 0.3));

  return {
    scene,
    sceneLabel: SCENE_KEYWORDS[scene].label,
    emotion,
    emotionLabel: EMOTION_KEYWORDS[emotion].label,
    tense,
    tenseLabel: TENSE_KEYWORDS[tense].label,
    subject,
    subjectLabel: SUBJECT_KEYWORDS[subject].label,
    depth,
    depthLabel: depth === 'surface' ? '浅层' : depth === 'mid' ? '中层' : '深层',
    keywords: keywords.slice(0, 5),
    intensity,
    confidence,
    questionType,
    questionTypeLabel: QUESTION_TYPE_KEYWORDS[questionType].label,
    questionCore,
    questionSummary,
    keyEntities,
    questionAnalysis,
  };
}
