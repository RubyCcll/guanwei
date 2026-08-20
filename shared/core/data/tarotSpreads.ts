// 塔罗牌阵（预设常用 + 自定义支持）

export interface TarotSpreadPos {
  id: number;
  name: string;
  description: string;
}

export interface TarotSpread {
  id: string;
  name: string;
  description: string;
  positions: TarotSpreadPos[];
  isCustom?: boolean;
}

export const TAROT_SPREADS: TarotSpread[] = [
  { id: 'one', name: '单张 · 今日之示', description: '抽取单张，取当下之象', positions: [{ id: 0, name: '今日之示', description: '当下之象' }] },
  { id: 'three', name: '三张 · 过去当下未来', description: '经典时间线', positions: [
    { id: 0, name: '过去之象', description: '事情的根源与铺垫' },
    { id: 1, name: '当下之境', description: '此刻的核心状况' },
    { id: 2, name: '未来之趋', description: '自然趋势与方向' },
  ] },
  { id: 'two-options', name: '二选一', description: '两个选择对比', positions: [
    { id: 0, name: '选项甲', description: '第一个选择的能量' },
    { id: 1, name: '选项乙', description: '第二个选择的能量' },
  ] },
  { id: 'mind-body', name: '身 · 心 · 灵', description: '三个层面观照内在', positions: [
    { id: 0, name: '身体', description: '身体层面之需' },
    { id: 1, name: '心智', description: '思维与情绪之课' },
    { id: 2, name: '灵性', description: '灵魂与高我之引' },
  ] },
  { id: 'problem', name: '问题 · 障碍 · 建议 · 结果', description: '四张看清一件事', positions: [
    { id: 0, name: '问题本质', description: '这件事的核心' },
    { id: 1, name: '主要障碍', description: '阻碍的能量' },
    { id: 2, name: '建议行动', description: '可为之径' },
    { id: 3, name: '可能结果', description: '顺势之归' },
  ] },
  { id: 'celtic', name: '凯尔特十字（十张）', description: '深入全局之阵', positions: [
    { id: 0, name: '现况', description: '当下的中心' },
    { id: 1, name: '助力', description: '当下之助力' },
    { id: 2, name: '根基', description: '潜藏之基' },
    { id: 3, name: '已逝', description: '渐远的过去' },
    { id: 4, name: '将至', description: '渐近的未来' },
    { id: 5, name: '所惧', description: '心中的顾虑' },
    { id: 6, name: '己身', description: '自身之态度' },
    { id: 7, name: '环境', description: '外在之环境' },
    { id: 8, name: '期望', description: '亲友之期望' },
    { id: 9, name: '终局', description: '大势之归' },
  ] },
];

// 自定义牌阵存储（localStorage）
const KEY = 'guanwei_custom_tarot_spreads';

export function getCustomTarotSpreads(): TarotSpread[] {
  try {
    const data = localStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveCustomTarotSpread(spread: TarotSpread): void {
  const list = getCustomTarotSpreads();
  const idx = list.findIndex(s => s.id === spread.id);
  if (idx >= 0) list[idx] = spread; else list.push(spread);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function deleteCustomTarotSpread(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getCustomTarotSpreads().filter(s => s.id !== id)));
}

export function allTarotSpreads(): TarotSpread[] {
  return [...TAROT_SPREADS, ...getCustomTarotSpreads()];
}