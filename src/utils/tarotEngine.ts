import type { TarotCard, DrawnCard, Spread, QuestionCategory } from '@/types';
import { tarotCards } from '@/data/tarotCards';
import { analyzeQuestion, type SemanticAnalysis, type Scene, type Emotion } from '@/utils/semanticAnalyzer';
import { LIFE_CONTEXTS } from '@/data/lifeContext';

type LifeAreaKey = 'love' | 'career' | 'wealth' | 'health' | 'growth';

function mapSceneToLifeArea(scene: Scene): LifeAreaKey {
  const mapping: Record<Scene, LifeAreaKey> = {
    love: 'love',
    career: 'career',
    wealth: 'wealth',
    health: 'health',
    study: 'growth',
    family: 'growth',
    friendship: 'growth',
    spiritual: 'growth',
    travel: 'growth',
    general: 'growth',
  };
  return mapping[scene];
}

function getLifeAreaMeaning(card: TarotCard, scene: Scene): string {
  const area = mapSceneToLifeArea(scene);
  return card.deepMeaning.lifeAreas[area];
}

export function shuffleDeck(): TarotCard[] {
  const deck = [...tarotCards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function drawCards(spread: Spread): DrawnCard[] {
  const deck = shuffleDeck();
  const drawn: DrawnCard[] = [];
  
  for (let i = 0; i < spread.positions.length; i++) {
    const isReversed = Math.random() < 0.3;
    drawn.push({
      cardId: deck[i].id,
      isReversed,
      positionId: spread.positions[i].id,
    });
  }
  
  return drawn;
}

export interface InterpretationResult {
  fullText: string;
  semantic: SemanticAnalysis;
  sections: InterpretationSection[];
}

export interface InterpretationSection {
  type: 'opening' | 'overview' | 'card' | 'esoteric' | 'life-action' | 'warning' | 'summary';
  title: string;
  content: string;
  duration?: number;
}

export function generateInterpretation(
  cards: DrawnCard[],
  spread: Spread,
  question: string,
  category: QuestionCategory
): InterpretationResult {
  const semantic = analyzeQuestion(question, category);
  const lifeContext = LIFE_CONTEXTS[semantic.scene];
  
  const sections: InterpretationSection[] = [];
  
  sections.push(generateOpening(question, semantic, spread));
  
  sections.push(generateOverviewSection(cards, spread, question, semantic));
  
  cards.forEach((drawn, index) => {
    const card = tarotCards.find(c => c.id === drawn.cardId);
    if (!card) return;
    const position = spread.positions.find(p => p.id === drawn.positionId);
    if (!position) return;
    
    sections.push(generateCardSection(card, drawn, position, index + 1, semantic, lifeContext, cards.length));
  });
  
  sections.push(generateEsotericSection(cards, semantic));
  
  sections.push(generateLifeActionSection(semantic, lifeContext, cards));
  
  sections.push(generateWarningSection(semantic, lifeContext, cards));
  
  sections.push(generateSummarySection(cards, spread, semantic));
  
  const fullText = sections.map(s => s.content).join('\n\n');
  
  return {
    fullText,
    semantic,
    sections,
  };
}

function generateOpening(question: string, semantic: SemanticAnalysis, spread: Spread): InterpretationSection {
  // 先用一两句轻轻"接住"用户的情绪，但不长篇大论
  const emotionAttune: Record<Emotion, string> = {
    anxious: '我心里能感觉到你这份隐隐的不安——既然来了，就先把这口气松一松。',
    hopeful: '你眼里带着一份期待来问这件事，这份劲儿本身就很珍贵。',
    confused: '脑子有点乱、理不清头绪，是吧？没关系，咱们一起慢慢看。',
    lost: '你最近可能有点提不起劲，心里像缺了一块。先别急，慢慢来。',
    grateful: '你带着一份平和与感恩来问，这样的状态其实挺难得的。',
    calm: '你的状态挺稳的，这样来问，反而能看得更清楚。',
    angry: '你心里憋着一股气，我能感觉到。这股气不是坏事，它在替你说话。',
    sad: '你心里有点沉、有点酸。没关系，这里你不用那么坚强。',
    curious: '你带着一份好奇来探索，这本身就是最好的开始。',
  };
  const attune = emotionAttune[semantic.emotion];

  // 直接复述问题，让用户感到"被听见"——把原话轻轻说回去，再点出他真正想问的
  const cleanQuestion = question.trim().replace(/[？?]+$/g, '');
  const restatement = `你问的是「${cleanQuestion}」。${semantic.questionSummary}，对吧？`;

  // 点透问题核心，体现"我理解你的关切"
  const concernLine = `${semantic.questionAnalysis.realQuestion}。这件事压在你心里，应该不是一天两天了，对吧？`;

  const spreadLine = `今天我用${spread.name}为你展开，一共${spread.positions.length}张牌。${spread.description ? spread.description : '它会从几个不同的角度，帮你看清这件事。'}`;

  const revealLines = [
    '来，深吸一口气，我们把牌翻开。',
    '好，咱们这就把牌一张张翻开。',
    '准备好了吗？牌要开始了。',
    '心里默念一下你的问题，我们开始翻牌。',
  ];

  const content = `${attune}

${restatement}

${concernLine}

${spreadLine}

${revealLines[Math.floor(Math.random() * revealLines.length)]}`;

  return {
    type: 'opening',
    title: '开场引言',
    content,
    duration: 20,
  };
}

function generateOverviewSection(
  cards: DrawnCard[],
  spread: Spread,
  question: string,
  semantic: SemanticAnalysis
): InterpretationSection {
  const cardData = cards.map((drawn) => {
    const card = tarotCards.find(c => c.id === drawn.cardId);
    const position = spread.positions.find(p => p.id === drawn.positionId);
    return card && position ? { card, drawn, position } : null;
  }).filter(Boolean) as { card: TarotCard; drawn: DrawnCard; position: { name: string; description: string } }[];

  const lines: string[] = [];

  const openingPhrases = [
    '牌都翻开了。咱们先不急着钻细节，退后一步，整体感受一下这几张牌在说什么。',
    '好，牌面都摊开了。一张张讲之前，我先给你一个整体的印象。',
    '所有牌都翻开了。先看个大图，再慢慢看细节——这样你会看得更明白。',
    '牌阵完整了。先从整体上感受一下这次的能量，再往细了说。',
  ];
  lines.push(openingPhrases[Math.floor(Math.random() * openingPhrases.length)]);

  // 问题呼应：真正分析问题，而不是泛泛而谈
  lines.push(`${semantic.questionAnalysis.emotionalNeed}。`);
  lines.push(`换句话说，你问的这件事，核心其实就是——${semantic.questionCore}。你这次最想从牌里得到的，是一份${semantic.questionAnalysis.responseNeedLabel}。那咱们就带着这份需求，来看牌面怎么回应你。`);

  // 把用户问题里提到的人/事轻轻点出来，让解读更有针对性
  const focusEntities = semantic.keyEntities
    .filter((e) => e.type === 'person' || e.type === 'event')
    .map((e) => e.value);
  if (focusEntities.length > 0) {
    lines.push(`你问题里提到的${focusEntities.map((v) => `「${v}」`).join('、')}，正是这件事的关键——接下来的牌面，也会绕着它们来回应你。`);
  }

  // 牌面能量格局：把元素/大小牌/正逆位的数据，翻译成"和你这件事有关的话"
  const elements: Record<string, number> = { 火: 0, 水: 0, 风: 0, 土: 0, 以太: 0 };
  let majorCount = 0;
  let minorCount = 0;
  let reversedCount = 0;

  cardData.forEach(({ card, drawn }) => {
    if (card.astrology.element && elements[card.astrology.element] !== undefined) {
      elements[card.astrology.element]++;
    }
    if (card.arcana === 'major') {
      majorCount++;
    } else {
      minorCount++;
    }
    if (drawn.isReversed) {
      reversedCount++;
    }
  });

  const total = cardData.length;
  const dominantElement = Object.entries(elements).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  // 元素含义直接和你"该怎么应对这件事"挂钩
  const elementTie: Record<string, string> = {
    火: '意味着这件事现在缺的不是想法，是行动——你得主动往前推一步',
    水: '意味着答案不在外面，在你心里——你得先把自己的真实感受理清楚',
    风: '意味着此刻最该用的是你的脑子——想清楚、说清楚、把决定做明白',
    土: '意味着这件事急不来，得一步一步把根扎稳，踏实了才会开花',
    以太: '意味着这件事背后有更大的安排在运作，你正被某种力量托着',
  };
  const secondElementTie: Record<string, string> = {
    火: '再加了一点往前冲的劲',
    水: '再加了一点感受和温度',
    风: '再加了一点清醒和变通',
    土: '再加了一点稳和落地',
    以太: '再加了一点更高的视角',
  };

  if (dominantElement.length > 0) {
    const [mainElem, mainCount] = dominantElement[0];
    const elemPercent = Math.round((mainCount / total) * 100);
    let elemLine = `这几张牌里，${mainElem}元素的声音最响（${mainCount}/${total}张，约${elemPercent}%），${elementTie[mainElem]}。`;
    if (dominantElement.length >= 2) {
      const [secondElem, secondCount] = dominantElement[1];
      if (secondCount > 0) {
        elemLine += `再掺着一点${secondElem}元素，${secondElementTie[secondElem]}。`;
      }
    }
    lines.push(elemLine);
  }

  if (majorCount > 0) {
    if (majorCount > total / 2) {
      lines.push(`大阿卡纳出现了${majorCount}张，占了多数。这说明你问的这件事，不是日常的小磕碰，而是你人生里一个挺关键的节点——它会留下比较深的印记，值得你认真对待。`);
    } else if (majorCount === 1) {
      lines.push(`大阿卡纳${majorCount}张、小阿卡纳${minorCount}张。有一条主线在带着你走，小阿卡纳则在告诉你，这条主线是怎么在日常里一点点展开的。大方向已经有了，细节看你怎么走。`);
    } else {
      lines.push(`大阿卡纳${majorCount}张、小阿卡纳${minorCount}张。既有大方向的提示，也有落到日子里的具体功课——往远处看，也得顾着脚下。`);
    }
  } else {
    lines.push(`这几张都是小阿卡纳。你问的这件事，更多是当下生活里的具体功课，不是什么命运大转折。把眼前的人和事顾好，答案自己就浮出来了。`);
  }

  const reversedRatio = reversedCount / total;
  if (reversedRatio === 0) {
    lines.push(`所有牌都是正位，能量顺顺当当地往外走。对你这件事来说，这是个可以往前推的好时机——别犹豫太多，顺势走就行。`);
  } else if (reversedRatio <= 0.3) {
    lines.push(`有${reversedCount}张逆位（约${Math.round(reversedRatio * 100)}%）。整体还是往前的，只是里面夹着一点小卡顿。就像开车遇到黄灯——不用急刹，稍微收一收，看看方向对不对、有没有忽略掉的心里话。`);
  } else if (reversedRatio <= 0.6) {
    lines.push(`有${reversedCount}张逆位（约${Math.round(reversedRatio * 100)}%），正逆各一半。这件事现在既需要你往外做点什么，也需要你往内理一理——不是闷头冲，也不是干等着，而是一边做一边调。`);
  } else {
    lines.push(`有${reversedCount}张逆位（约${Math.round(reversedRatio * 100)}%），占了多数。说明这件事现在卡你的，更多在心里，不在外面。一些过去没处理完的东西正在冒出来——这不是坏事，看见它，光才进得来。给自己一点耐心，别急着往外求。`);
  }

  // 牌与牌之间的关系：结合问题来讲
  if (cardData.length >= 2) {
    const logicTypes = [
      { name: '因果关系', desc: '前面的牌是因，后面的牌是果——这件事有它清楚的来龙去脉' },
      { name: '递进关系', desc: '能量在层层推进——从你现在的处境，一步步往未来走' },
      { name: '一种张力', desc: '牌面之间有拉扯、有矛盾——但正是这股拉扯，推着你往前长' },
      { name: '互补关系', desc: '牌和牌之间互相补全——有的说阳面，有的说阴面，合起来才是完整的你' },
    ];
    const logicType = logicTypes[cardData[0].card.id % logicTypes.length];
    lines.push(`把这几张牌连起来看，它们之间是${logicType.name}——${logicType.desc}。所以别把它们拆开单独看，合在一起，才是回答你那件事的完整图景。`);
  }

  // 故事线
  const storyFlow = generateOverviewStoryFlow(cardData, semantic);
  if (storyFlow) lines.push(storyFlow);

  // 整体视角：直接回到用户的问题来回答
  const coreMessage = getCoreMessage(semantic, cards);
  lines.push(`回到你问的这件事——如果只用一句话概括牌面想告诉你的，那就是：${coreMessage}`);

  let overallJudgment = '';
  const hasActionElement = elements['火'] > 0;
  const hasWaitElement = elements['水'] > elements['火'];

  if (reversedRatio > 0.5) {
    overallJudgment = `所以对你这件事来说，现在的关键不是"赶紧去做点什么"，而是"先把自己理顺"。那些让你纠结的人和事，其实都是镜子——照出你心里还没收拾好的那部分。等你内在的秩序重建了，外面的处境自然就跟着变了。`;
  } else if (hasActionElement && !hasWaitElement) {
    overallJudgment = `所以对你这件事来说，信号很明确——是时候动了。别等"完全准备好"，也别等"完美的时机"。你已经有了足够的底子，缺的就是迈出第一步的那一下。去做、去试，答案会在做的过程里慢慢浮出来。`;
  } else if (hasWaitElement && !hasActionElement) {
    overallJudgment = `所以对你这件事来说，当下不是急着冲的时候。你需要的是等一等、沉一沉、和自己待一会儿。有些东西还在酝酿，有些情绪还得被看见。等你心里清晰了，该动的时候，你自然就知道了。`;
  } else {
    overallJudgment = `所以对你这件事来说，要找的是个平衡点——一边往外做，一边往内看；一边把事推下去，一边顾着自己的情绪。不是非此即彼，而是一边走一边调。这才是你眼下最该练的功课。`;
  }
  lines.push(overallJudgment);

  const leadInPhrases = [
    '好，整体的感觉就是这样。下面咱们一张张牌来细看——',
    '这就是整幅牌给你的大图景。接下来，咱们慢慢品每一张牌——',
    '先有个整体，再钻进细节。下面我为你一张张讲——',
    '整体的能量你感受到了。现在咱们往细里走，看看每张牌具体在说什么——',
  ];
  lines.push(leadInPhrases[Math.floor(Math.random() * leadInPhrases.length)]);

  return {
    type: 'overview',
    title: '综合指引',
    content: lines.join('\n\n'),
    duration: 40,
  };
}

function generateOverviewStoryFlow(
  cardData: { card: TarotCard; drawn: DrawnCard; position: { name: string; description: string } }[],
  semantic: SemanticAnalysis
): string {
  if (cardData.length === 0) return '';

  if (cardData.length === 1) {
    const { card, drawn, position } = cardData[0];
    const orientation = drawn.isReversed ? '逆位' : '正位';
    return `这次的核心牌是${card.name}（${orientation}），落在「${position.name}」的位置。它在讲的是——${card.deepMeaning.coreTheme}。放在你问的这件事里，这张牌就是给你的主要回应：你那些困惑和期待，都能绕着它这个主题展开。它像把钥匙，能开你眼下这把锁。`;
  }

  if (cardData.length === 2) {
    const [first, second] = cardData;
    const firstOrient = first.drawn.isReversed ? '逆位' : '正位';
    const secondOrient = second.drawn.isReversed ? '逆位' : '正位';
    return `这两张牌是在一问一答——一张说的是「${first.position.name}」，另一张说的是「${second.position.name}」。

${first.card.name}（${firstOrient}）落在「${first.position.name}」，它在说：${first.card.deepMeaning.coreTheme}。${second.card.name}（${secondOrient}）落在「${second.position.name}」，它在说：${second.card.deepMeaning.coreTheme}。

有意思的是，能量从「${first.card.keywords[0]}」流到了「${second.card.keywords[0]}」——这两张牌就像一枚硬币的两面，或者一段路的起点和终点。分开看都只说了一半，合起来，才是回答你那件事的完整答案。`;
  }

  if (cardData.length === 3) {
    const [a, b, c] = cardData;
    return `这三张牌正好是一段完整的故事——有开头、有转折、有方向。

第一张是${a.card.name}（${a.drawn.isReversed ? '逆位' : '正位'}），在「${a.position.name}」的位置：${a.card.deepMeaning.coreTheme}。这是把你带到当下的能量，是故事的起点。第二张是${b.card.name}（${b.drawn.isReversed ? '逆位' : '正位'}），在「${b.position.name}」的位置：${b.card.deepMeaning.coreTheme}。这是你此刻正在经历的核心，也是连着过去和未来的那座桥。第三张是${c.card.name}（${c.drawn.isReversed ? '逆位' : '正位'}），在「${c.position.name}」的位置：${c.card.deepMeaning.coreTheme}。这是你可以前往的方向，也是牌面给你的指引。

从「${a.card.keywords[0]}」经过「${b.card.keywords[0]}」走向「${c.card.keywords[0]}」——这就是你在这件事上正在走的路。它不是一条直线，但每一步都算数。`;
  }

  const themesList = cardData.map(({ card }) => card.keywords[0]);
  const cardList = cardData.map(({ card, position }) => `${card.name}（「${position.name}」）`).join(' → ');

  return `这${cardData.length}张牌合在一起，给你这件事拼出了一个完整的图景：${cardList}。

每张牌都照亮了你这个问题的一个侧面——有的在说你的内心，有的在说外部环境，有的在说过去的根，有的在说未来的方向。别把它们拆开孤立地看，把它们想象成一个星座，每颗星都有自己的位置，合起来才成得了图案。

从「${themesList[0]}」到「${themesList[themesList.length - 1]}」，是能量流动的大方向；中间每一张牌，都是这段路上的一站。`;
}

function generateCardSection(
  card: TarotCard,
  drawn: DrawnCard,
  position: { name: string; description: string },
  index: number,
  semantic: SemanticAnalysis,
  lifeContext: typeof LIFE_CONTEXTS.love,
  totalCards: number
): InterpretationSection {
  const orientation = drawn.isReversed ? '逆位' : '正位';
  const isReversed = drawn.isReversed;

  // 自然、不硬编码"第几张"的过渡语
  const cnNum = (n: number) =>
    ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'][n - 1] || String(n);
  let connector: string;
  if (totalCards === 1) {
    connector = '这张牌是';
  } else if (index === 1) {
    connector = `先看第一张——`;
  } else if (index === totalCards) {
    connector = `最后是第${cnNum(index)}张——`;
  } else {
    connector = `接着是第${cnNum(index)}张——`;
  }

  const lifeAreaMeaning = getLifeAreaMeaning(card, semantic.scene);
  const symbolCount = Math.min(3, card.imageSymbols.length);
  const selectedSymbols = card.imageSymbols.slice(0, symbolCount);
  const keyWordList = card.keywords.slice(0, 4).join('、');

  let content = '';

  if (!isReversed) {
    content = `${connector}「${position.name}」位置上的${card.name}，正位。这个位置说的是：${position.description}。

牌面上是这样的——${card.story}

${selectedSymbols.join('、')}这些意象，其实都在讲同一件事：${card.deepMeaning.coreTheme}。放在你问的这件事里，这张牌出现在「${position.name}」的位置，意味着这股能量眼下正以一种挺清晰、直接的方式，在你这件事上起着作用。

具体到你问的${semantic.sceneLabel}：${lifeAreaMeaning}

再往里看一层，这张牌也照见了你心里的一个角落——${card.deepMeaning.psychological}你可以稍微停一下，感受感受：在你眼下的生活里，这个部分是被你看见了呢，还是一直在后台悄悄跑着？

牌面给你的建议是：${card.deepMeaning.advice}另外有句话得提醒你一句：${card.deepMeaning.warning}

这张牌的关键词，你可以记一下：${keyWordList}。`;
  } else {
    content = `${connector}「${position.name}」位置上的${card.name}，逆位。这个位置说的是：${position.description}。

因为是逆位，这张牌的能量就不是往外使的，而是往内收的——它在提醒你，有些东西得先看见、先消化。牌面上是这样的——${card.story}

${selectedSymbols[0] || '画面里的核心意象'}在这个位置倒过来，意义就转向了内在。

放到你问的这件事里——${card.deepMeaning.coreTheme}，这股能量眼下是以阴影面、或者卡住的方式出现的。它落在「${position.name}」的位置，是在提示你：这一块儿有些东西，得往内里探一探。${card.deepMeaning.shadow}

具体到你的${semantic.sceneLabel}：${lifeAreaMeaning}（逆位的话，得从"内省"和"调整"这个角度去理解。）

它照见的心里角落是——${card.deepMeaning.psychological}也许这部分被你压着了，或者用了一种不太舒服的方式在表达。这不是坏事，逆位更像牌面轻轻拍你一下："嘿，这儿有块你还没看见的地方，来看看吧。"

给你的调整方向是：${card.deepMeaning.advice}逆位的时候，这更像一份"往内走的行动指南"。另外得特别留意：${card.deepMeaning.warning}

这张牌的关键词：${keyWordList}。`;
  }

  return {
    type: 'card',
    title: `${position.name} · ${card.name}（${orientation}）`,
    content,
    duration: 30,
  };
}

function generateEsotericSection(cards: DrawnCard[], semantic: SemanticAnalysis): InterpretationSection {
  const elements: Record<string, number> = { 火: 0, 水: 0, 风: 0, 土: 0, 以太: 0 };
  const planets = new Set<string>();
  const sephiroth = new Set<string>();
  const alchemies = new Set<string>();
  
  cards.forEach((drawn) => {
    const card = tarotCards.find(c => c.id === drawn.cardId);
    if (!card) return;
    if (card.astrology.element && elements[card.astrology.element] !== undefined) {
      elements[card.astrology.element]++;
    }
    if (card.astrology.planet) planets.add(card.astrology.planet);
    if (card.kabbalah.sephirah) sephiroth.add(card.kabbalah.sephirah);
    if (card.alchemy.stage) alchemies.add(card.alchemy.stage);
  });
  
  const dominantElement = Object.entries(elements).sort((a, b) => b[1] - a[1])[0][0];
  const elementDesc: Record<string, string> = {
    火: '激情、行动力、创造力',
    水: '情感、直觉、内心世界',
    风: '思维、沟通、决策能力',
    土: '稳定、物质、脚踏实地',
    以太: '灵性、超越、更高的连接',
  };
  
  const lines: string[] = [];
  
  const openingPhrases = [
    '再往深里走一点，咱们换个角度——从神秘学来看看这次占卜的能量。',
    '好，接下来换个更深的视角，看看这些牌背后的能量脉络。',
    '现在我想从神秘学的层面，给你讲讲这次抽牌的能量。',
    '把视角再拉高一些，看看这些牌之间藏着的神秘学关联。',
  ];

  lines.push(openingPhrases[Math.floor(Math.random() * openingPhrases.length)]);

  lines.push(`首先，这次占卜以${dominantElement}元素为主导——也就是${elementDesc[dominantElement]}这股能量，正在你这件事上起作用。`);
  
  if (planets.size > 0) {
    lines.push(`同时，${Array.from(planets).join('、')}这些行星的能量也在起作用。`);
  }
  
  if (sephiroth.size > 0) {
    lines.push(`在卡巴拉生命之树上，${Array.from(sephiroth).join('、')}这些质点被激活了。`);
  }
  
  if (alchemies.size > 0) {
    lines.push(`从炼金术的角度看，${Array.from(alchemies).join('、')}阶段正在运作。`);
  }
  
  const numerologySum = cards.reduce((sum, drawn) => {
    const card = tarotCards.find(c => c.id === drawn.cardId);
    return sum + (card?.numerology.number || 0);
  }, 0);
  const finalNumber = numerologySum % 22;
  
  lines.push(`最后，本次抽牌的灵数总和是${numerologySum}，归约为${finalNumber}。这是这次占卜的灵魂代码。`);
  
  return {
    type: 'esoteric',
    title: '神秘学视角',
    content: lines.join('\n\n'),
    duration: 15,
  };
}

function generateLifeActionSection(
  semantic: SemanticAnalysis,
  lifeContext: typeof LIFE_CONTEXTS.love,
  cards: DrawnCard[]
): InterpretationSection {
  const lines: string[] = [];
  
  const cardData = cards.map((drawn) => {
    const card = tarotCards.find(c => c.id === drawn.cardId);
    return card ? { card, drawn } : null;
  }).filter(Boolean) as { card: TarotCard; drawn: DrawnCard }[];
  
  const openingPhrases = [
    '好，牌面的讯息都讲完了。接下来最实在的，就是落到日子里——我给你一些能马上用的行动指引。',
    '说了这么多，最重要的还是接下来怎么做。我给你几条具体的行动建议。',
    '塔罗不是用来看的，是用来做的。下面把这些洞见，变成你能立刻动手的几步。',
    '好了，道理讲到这儿。下面这些，都是你可以从今天就开始做的事。',
  ];

  lines.push(openingPhrases[Math.floor(Math.random() * openingPhrases.length)]);

  lines.push(`先给你一个时间线上的感觉：短期（1周内）${lifeContext.timeline.short}；中期（1-3个月）${lifeContext.timeline.mid}；长期（半年到1年）${lifeContext.timeline.long}。`);

  lines.push(`针对你当下${semantic.emotionLabel}的状态，我特别想跟你说一句：
${lifeContext.emotionAdvice[semantic.emotion]}`);

  const actionIntro = [
    '结合所有牌面的能量，我给你整理了这几条行动建议。不用全做，挑一条最有感觉的开始就好：',
    '下面这几条，都是从牌面里提炼出来的行动方案。挑一个你最有共鸣的，从今天开始做：',
    '把牌面的智慧变成行动，我给你这几条建议，选你最想做的那一条就好：',
    '好，重点来了。下面这几条行动建议，都是从牌面讯息里提炼出来的，选一条，马上去做：',
  ];
  
  lines.push(actionIntro[Math.floor(Math.random() * actionIntro.length)]);
  
  const actions: string[] = [];
  
  cardData.forEach(({ card, drawn }, i) => {
    const orientation = drawn.isReversed ? '（逆位·调整方向）' : '（正位·顺势而为）';
    const actionPrefix = drawn.isReversed 
      ? `关于${card.name}的能量，你可以先从内在调整开始——`
      : `关于${card.name}的能量，你可以这样落地——`;
    
    const specificAction = lifeContext.actions[i % lifeContext.actions.length];
    
    actions.push(`**${i + 1}. ${card.name}${orientation}**
${actionPrefix}${card.deepMeaning.advice}
▸ 具体可以试试：${specificAction}`);
  });
  
  if (actions.length > 5) {
    actions.length = 5;
  }
  
  lines.push(actions.join('\n\n'));
  
  const closingLines = [
    '记住，行动是连接梦想与现实的桥梁。哪怕只做一件小事，能量就开始流动了。',
    '不要等到"准备好"才开始。开始了，你就已经准备好了。',
    '塔罗给你的是地图，但路要你自己走。迈出第一步，剩下的宇宙会帮你。',
    '最好的时机就是现在。选一条建议，今天就去做。',
  ];
  
  lines.push(closingLines[Math.floor(Math.random() * closingLines.length)]);
  
  return {
    type: 'life-action',
    title: '生活行动指南',
    content: lines.join('\n\n'),
    duration: 25,
  };
}

function generateWarningSection(
  semantic: SemanticAnalysis,
  lifeContext: typeof LIFE_CONTEXTS.love,
  cards: DrawnCard[]
): InterpretationSection {
  const reversedCount = cards.filter(c => c.isReversed).length;
  const lines: string[] = [];
  
  const cardData = cards.map((drawn) => {
    const card = tarotCards.find(c => c.id === drawn.cardId);
    return card ? { card, drawn } : null;
  }).filter(Boolean) as { card: TarotCard; drawn: DrawnCard }[];
  
  const openingPhrases = [
    '在结束之前，我想跟你聊聊几个需要留意的地方。别紧张，这些不是吓你的警告，是善意的提醒。',
    '好，咱们看看牌面上的几个"黄灯"——那些需要你多留一份心的地方。',
    '作为解读的补充，我想提醒你几个容易踩的坑和阴影面。',
    '每张牌都有光面和影面。下面这几个地方，是这次占卜里你得多留心的。',
  ];

  lines.push(openingPhrases[Math.floor(Math.random() * openingPhrases.length)]);

  if (reversedCount > 0) {
    lines.push(`这次占卜里有${reversedCount}张逆位牌。逆位不是坏事，它更像牌面在轻轻跟你说："嘿，这里有个盲点，来看看吧。"这些位置，往往对应着需要你往内探一探的课题。`);
  } else {
    lines.push(`虽然这次牌都是正位，能量走得顺，但塔罗还是想提醒你一句——再好的运势里，也有要留心的地方。月圆则缺，水满则溢。`);
  }

  const warnings: string[] = [];

  cardData.forEach(({ card, drawn }) => {
    if (drawn.isReversed) {
      warnings.push(`${card.name}逆位，要留心它的阴影面：${card.deepMeaning.shadow}怎么避开呢——${card.deepMeaning.warning}`);
    } else {
      warnings.push(`${card.name}正位，留意"过犹不及"：${card.deepMeaning.warning}`);
    }
  });

  lines.push(warnings.join('\n\n'));

  lines.push(`再给你几条${semantic.sceneLabel}方面通用的提醒：`);

  const sceneWarnings = shuffleArray(lifeContext.warnings).slice(0, 3);
  sceneWarnings.forEach((w) => {
    lines.push(`· ${w}`);
  });
  
  const closingLines = [
    '记住，看见就是疗愈的开始。当你知道陷阱在哪里，你就已经绕开了一半。',
    '这些提醒不是让你焦虑，而是让你更清醒地前行。清醒的行动，才是最有力量的。',
    '塔罗不是来吓你的，它是来保护你的。知道哪里有坑，你才能走得更稳。',
    '有光的地方就有影子。接纳阴影，你才能拥有完整的力量。',
  ];
  
  lines.push(closingLines[Math.floor(Math.random() * closingLines.length)]);
  
  return {
    type: 'warning',
    title: '需要留意的地方',
    content: lines.join('\n\n'),
    duration: 20,
  };
}

function generateSummarySection(
  cards: DrawnCard[],
  spread: Spread,
  semantic: SemanticAnalysis
): InterpretationSection {
  const reversedCount = cards.filter(c => c.isReversed).length;
  const reversedRatio = reversedCount / cards.length;
  
  const cardData = cards.map((drawn) => {
    const card = tarotCards.find(c => c.id === drawn.cardId);
    return card ? { card, drawn } : null;
  }).filter(Boolean) as { card: TarotCard; drawn: DrawnCard }[];
  
  const majorCount = cardData.filter(({ card }) => card.arcana === 'major').length;
  
  const lines: string[] = [];
  
  const openingPhrases = [
    '好，牌面的解读就到这儿。最后咱们把所有讯息串起来，看看整体能量是怎么走的。',
    '好了，一张张牌都讲过了。现在退后一步，看看整幅画面在说什么。',
    '到这里，每张牌的讯息你都收到了。咱们把它们拼在一起，看看完整的图景。',
    '一张一张的牌讲完了，下面来看看整体的能量流动和核心启示。',
  ];

  lines.push(openingPhrases[Math.floor(Math.random() * openingPhrases.length)]);

  lines.push(`回到你最开始问的那件事——今天用${spread.name}为你解读了${cards.length}张牌，整体是这样的：`);

  if (majorCount > 0) {
    const majorDesc = majorCount > cards.length / 2
      ? `大阿卡纳出现了${majorCount}张，这是个命运级别的信号。这段时间发生的事，会对你有比较深的影响，值得你认真对待。`
      : `其中大阿卡纳${majorCount}张、小阿卡纳${cards.length - majorCount}张——既有大方向的指引，也有日子里的具体功课。`;
    lines.push(majorDesc);
  }

  let energyDesc = '';
  if (reversedRatio === 0) {
    energyDesc = '所有牌都是正位，能量走得很顺。对你这件事来说，这是个可以往前推的好时机，顺势走就行。';
  } else if (reversedRatio <= 0.3) {
    energyDesc = `有${reversedCount}张逆位牌。整体还是积极的，只是夹着一点小阻碍。就像遇到黄灯——不用急刹，稍微收一收，看看方向对不对。`;
  } else if (reversedRatio <= 0.6) {
    energyDesc = `有${reversedCount}张逆位牌，能量偏向内省和调整。与其急着往外冲，不如先往内理一理。有些课题得先面对自己，外面的困境才会松开。`;
  } else {
    energyDesc = `有${reversedCount}张逆位牌，占了多数。说明你正处在一个挺重要的整合期，一些过去的事和压着的情绪正在冒出来。这不是坏事——看见阴影，光才进得来。给自己一点耐心。`;
  }

  lines.push(energyDesc);

  const storyFlow = generateStoryFlow(cardData, semantic);
  if (storyFlow) lines.push(storyFlow);

  lines.push(`如果只留一句话给你，那就是：${getCoreMessage(semantic, cards)}`);

  const encouragementLines = [
    `关于你问的这件事，我想说：你比你以为的更有力量。这些牌不是来定义你的，是来提醒你——你本来就有的那份智慧和勇气，够你走过去。`,
    '请记住：塔罗不是预言，是一面镜子。它照出你此刻的状态，也照出你可以成为的样子。最后怎么选，永远在你手上。',
    '无论牌面怎样，我都想告诉你——你已经做得很好了。愿意来探索自己，这本身就是勇气。',
    '最后想对你说：这些牌都是礼物，包装可能不一样，但拆开看，都是为了让你成为更好的自己。',
  ];
  
  lines.push(encouragementLines[Math.floor(Math.random() * encouragementLines.length)]);
  
  const closingPhrases = [
    '好了，这次的解读就到这里。如果你觉得有帮助，欢迎随时再来。愿你心想事成，一切顺利。',
    '解读就到这里。把今天收到的讯息放在心里，然后去过你的生活。答案会在行动中慢慢浮现。祝福你。',
    '我们的解读就告一段落了。记住，塔罗只是工具，真正的力量在你心里。去创造你想要的人生吧。',
    '好啦，今天就聊到这里。希望这次解读能给你带来一点光。无论如何，你都不是一个人。下次见。',
  ];
  
  lines.push(closingPhrases[Math.floor(Math.random() * closingPhrases.length)]);
  
  return {
    type: 'summary',
    title: '总结',
    content: lines.join('\n\n'),
    duration: 25,
  };
}

function generateStoryFlow(cardData: { card: TarotCard; drawn: DrawnCard }[], semantic: SemanticAnalysis): string {
  if (cardData.length === 0) return '';

  if (cardData.length === 1) {
    const { card, drawn } = cardData[0];
    const orientation = drawn.isReversed ? '逆位' : '正位';
    return `这次的核心牌是${card.name}（${orientation}），讲的是——${card.deepMeaning.coreTheme}。放在你问的${semantic.sceneLabel}这件事里，它就是给你的主要回应。`;
  }

  if (cardData.length === 2) {
    const [first, second] = cardData;
    return `第一张${first.card.name}（${first.drawn.isReversed ? '逆位' : '正位'}）是起点或现状——${first.card.deepMeaning.coreTheme}。第二张${second.card.name}（${second.drawn.isReversed ? '逆位' : '正位'}）指向方向或结果——${second.card.deepMeaning.coreTheme}。

从第一张到第二张，能量在流动：从「${first.card.keywords[0]}」走向「${second.card.keywords[0]}」，这就是你这件事当下的路径。`;
  }

  if (cardData.length === 3) {
    const [past, present, future] = cardData;
    return `这三张牌是一段完整的故事：第一张${past.card.name}（${past.drawn.isReversed ? '逆位' : '正位'}）是过去或根源——${past.card.deepMeaning.coreTheme}，是把你带到当下的能量。第二张${present.card.name}（${present.drawn.isReversed ? '逆位' : '正位'}）是现在——${present.card.deepMeaning.coreTheme}，是你此刻正在经历的。第三张${future.card.name}（${future.drawn.isReversed ? '逆位' : '正位'}）是未来或指引——${future.card.deepMeaning.coreTheme}，是你可以前往的方向。

从「${past.card.keywords[0]}」经过「${present.card.keywords[0]}」走向「${future.card.keywords[0]}」——这就是你在这件事上正在走的路。`;
  }

  const coreThemes = cardData.slice(0, 4).map(({ card }) => `${card.name}（${card.keywords[0]}）`);
  const flow = `这${cardData.length}张牌合起来，讲的是你${semantic.sceneLabel}这件事：${coreThemes.join(' → ')}。每张牌都是一个章节，连起来就是你眼下的成长地图——分开看各说一面，合起来才是完整的答案。`;

  return flow;
}

function getCoreMessage(semantic: SemanticAnalysis, cards: DrawnCard[]): string {
  const messages: Record<Scene, string[]> = {
    love: [
      '爱需要表达，也需要空间。这段关系现在需要的是"做"而不是"想"。',
      '对的人不是没出现，是你的心还没准备好去迎接。',
      '别在错的人身上找对的感觉，你值得更好的。',
      '感情里没有完美的答案，只有适合你的选择。',
      '先学会爱自己，才能更好地爱别人。',
      '真正的爱不是改变对方，而是接纳彼此。',
      '感情需要经营，就像花园需要浇水一样。',
    ],
    career: [
      '能力是你的，别让任何人低估你的价值。',
      '不是"我不够好"，而是"这里不适合我"。',
      '把"我应该"换成"我想要"，你会看到新方向。',
      '职场上的选择，最终是价值观的选择。',
      '你现在的努力，都是在为未来铺路。',
      '有时候，换个环境比改变自己更重要。',
      '你的价值不取决于别人的评价。',
    ],
    wealth: [
      '钱流向让价值流动的地方，先提升你的价值。',
      '你现在需要的不是赚更多，而是看更清楚。',
      '财务自由从财务意识开始，从小事做起。',
      '投资自己永远是回报率最高的投资。',
      '财富是能量的流动，保持开放和给予。',
      '省钱不如赚钱，赚钱不如值钱。',
      '财务问题的根源往往不是钱，而是心态。',
    ],
    study: [
      '没有白费的努力，但要走对方向。',
      '别用战术的勤奋掩盖战略的懒惰。',
      '过程扎实了，结果自然不会差。',
      '学习是一场马拉松，不是冲刺。',
      '保持好奇心，知识会自然来找你。',
      '学习的本质是解决问题，不是积累知识。',
      '好的学习方法比努力更重要。',
    ],
    health: [
      '身体比你更早知道答案，倾听它的声音。',
      '治愈是一个过程，不是一个结果。',
      '先照顾好自己，才能照顾好世界。',
      '健康是1，其他都是0。',
      '身心是一体的，照顾好心理才能照顾好身体。',
      '休息不是浪费时间，而是充电。',
      '健康的生活方式比任何补品都有效。',
    ],
    family: [
      '血缘不是爱的自动挡，需要用心去维护。',
      '家不是讲理的地方，是讲爱的地方。',
      '你已经是家人最好的礼物了。',
      '家庭关系需要经营，就像花园需要浇水。',
      '有时候，陪伴就是最好的表达。',
      '家人之间也需要边界和尊重。',
      '理解比改变更重要。',
    ],
    friendship: [
      '朋友不在多，在于真实和真诚。',
      '真朋友不需要多，一两个就足够。',
      '好的关系是彼此都能放心做自己。',
      '友情也需要边界，互相尊重才能长久。',
      '朋友是自己选的家人，好好珍惜。',
      '真正的朋友是在你低谷时依然在的人。',
      '友情需要双向奔赴。',
    ],
    spiritual: [
      '你不是迷路了，而是在路上。',
      '内在的力量比你以为的要大得多。',
      '答案在你心里，宇宙只是在回应。',
      '灵性成长是一条没有终点的旅程。',
      '保持开放，但保持清醒。',
      '觉醒不是瞬间的事，而是持续的过程。',
      '你本来就是完整的，不需要向外寻找。',
    ],
    travel: [
      '风景在脚下，意义在路上。',
      '走出去不是为了逃离，而是为了更好地回来。',
      '远方的召唤，是灵魂在提醒你成长。',
      '旅行的意义，在于遇见更好的自己。',
      '每一次远行，都是一次内心的探索。',
      '最美的风景永远在路上。',
      '旅行让你重新认识自己。',
    ],
    general: [
      '相信你的直觉，它比逻辑更接近真相。',
      '你现在需要的不是答案，而是方向。',
      '生活不是问题，而是一场练习。',
      '一切都会好起来的，相信时间的力量。',
      '你已经走了很远，给自己一些鼓励。',
      '人生没有白走的路，每一步都算数。',
      '当下就是最好的时刻。',
    ],
  };
  
  const sceneMessages = messages[semantic.scene];
  return sceneMessages[cards.length % sceneMessages.length];
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}