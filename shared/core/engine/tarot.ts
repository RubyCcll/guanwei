// 塔罗：78 张牌池构建与抽牌（rng 可注入）
import type { TarotCardData } from '../types';

export const MAJOR: [string, string, string, string, string][] = [
  ['愚者', 'The Fool', '0', '新的开始，赤诚无惧', '轻率冒进，需防不测'],
  ['魔术师', 'The Magician', 'Ⅰ', '万事俱备，主动创造', '空有巧言，志大才疏'],
  ['女祭司', 'The High Priestess', 'Ⅱ', '静观内省，直觉为引', '心绪不宁，忽略心声'],
  ['皇后', 'The Empress', 'Ⅲ', '丰饶滋养，温情守成', '过度依赖，失去自我'],
  ['皇帝', 'The Emperor', 'Ⅳ', '秩序权威，稳如磐石', '刚愎自用，压迫过甚'],
  ['教皇', 'The Hierophant', 'Ⅴ', '师道传承，循规蹈矩', '固步自封，迷信权威'],
  ['恋人', 'The Lovers', 'Ⅵ', '因缘和合，抉择真心', '摇摆不定，两难纠缠'],
  ['战车', 'The Chariot', 'Ⅶ', '意志坚定，克敌制胜', '方向迷失，欲速不达'],
  ['力量', 'Strength', 'Ⅷ', '以柔克刚，心怀慈悲', '外强中干，情绪失控'],
  ['隐士', 'The Hermit', 'Ⅸ', '独行求索，内观得光', '孤僻避世，灯下黑处'],
  ['命运之轮', 'Wheel of Fortune', 'Ⅹ', '时来运转，顺势而为', '逆势而行，运去如山'],
  ['正义', 'Justice', 'Ⅺ', '明辨是非，因果自承', '偏颇失衡，判而不公'],
  ['倒吊人', 'The Hanged Man', 'Ⅻ', '换位而思，以退为进', '徒劳挣扎，自缚其身'],
  ['死神', 'Death', 'XIII', '旧我蜕去，置之死地', '抗拒变化，僵而不化'],
  ['节制', 'Temperance', 'XIV', '中和之道，细水长流', '过犹不及，失却分寸'],
  ['恶魔', 'The Devil', 'XV', '欲望枷锁，直面其缚', '沉沦诱惑，作茧自缚'],
  ['高塔', 'The Tower', 'XVI', '骤变破立，否极泰来', '自毁根基，殃及池鱼'],
  ['星星', 'The Star', 'XVII', '希望如泉，静待天明', '希望渺茫，心灰意冷'],
  ['月亮', 'The Moon', 'XVIII', '迷雾幻影，信直觉行', '自欺欺人，暗潮汹涌'],
  ['太阳', 'The Sun', 'XIX', '光明坦途，赤子之心', '骄阳过盛，乐极生悲'],
  ['审判', 'Judgement', 'XX', '觉醒回响，往事如鉴', '逃避清算，旧账难翻'],
  ['世界', 'The World', 'XXI', '圆满成就，归于一统', '功亏一篑，未竟全功'],
];

export const SUIT: Record<string, { e: string; mean: string }> = {
  权杖: { e: '火', mean: '行动 · 意志 · 热情' },
  圣杯: { e: '水', mean: '情感 · 关系 · 直觉' },
  宝剑: { e: '风', mean: '思虑 · 冲突 · 决断' },
  钱币: { e: '土', mean: '物质 · 事业 · 收获' },
};

export const SUIT_NUM: Record<number, string> = {
  1: '开端之机', 2: '权衡之局', 3: '萌芽之聚', 4: '安定之基', 5: '中道之争',
  6: '馈赠之得', 7: '坚守之成', 8: '推进之势', 9: '独处之思', 10: '圆满之极',
};

export const COURT: Record<string, string> = {
  侍从: '初学 · 讯息 · 探问', 骑士: '奔赴 · 行动 · 挑战', 王后: '滋养 · 内在 · 承接', 国王: '统御 · 外显 · 成就',
};

export function buildDeck(): Omit<TarotCardData, 'reversed'>[] {
  const deck: Omit<TarotCardData, 'reversed'>[] = [];
  MAJOR.forEach(c => deck.push({ name: c[0], en: c[1], num: c[2], up: c[3], rev: c[4], major: true }));
  Object.keys(SUIT).forEach(s => {
    const base: Record<string, string> = { 权杖: '谋事主动，进取之机', 圣杯: '情感流动，心之所向', 宝剑: '思虑交锋，慎言决断', 钱币: '落地生根，务实之得' };
    for (let n = 1; n <= 10; n++) {
      deck.push({ name: s + n, en: s + ' ' + n, up: base[s] + ' · ' + SUIT_NUM[n], rev: base[s] + ' · 此数未成', major: false, suit: s, num: String(n) });
    }
    Object.keys(COURT).forEach(k => {
      deck.push({ name: s + k, en: s + ' ' + k, up: SUIT[s].mean + ' · ' + COURT[k], rev: SUIT[s].mean + ' · 此位未稳', major: false, suit: s, num: k });
    });
  });
  return deck;
}

export function tarotDraw(n: number, rng: () => number = Math.random): TarotCardData[] {
  const deck = buildDeck();
  const picked: TarotCardData[] = [];
  while (picked.length < n) {
    const idx = Math.floor(rng() * deck.length);
    const card = deck.splice(idx, 1)[0];
    picked.push({ ...card, reversed: rng() < 0.5 });
  }
  return picked;
}