// 星盘数据（移植参考项目 data.js）

export const ZODIAC: [string, string, string][] = [
  ['白羊', 'Aries', '♈'], ['金牛', 'Taurus', '♉'], ['双子', 'Gemini', '♊'], ['巨蟹', 'Cancer', '♋'],
  ['狮子', 'Leo', '♌'], ['处女', 'Virgo', '♍'], ['天秤', 'Libra', '♎'], ['天蝎', 'Scorpio', '♏'],
  ['射手', 'Sagittarius', '♐'], ['摩羯', 'Capricorn', '♑'], ['水瓶', 'Aquarius', '♒'], ['双鱼', 'Pisces', '♓'],
];

export const PLANETS: [string, string, string][] = [
  ['太阳', '☉', 'sun'], ['月亮', '☽', 'moon'], ['水星', '☿', 'merc'], ['金星', '♀', 'ven'],
  ['火星', '♂', 'mars'], ['木星', '♃', 'jup'], ['土星', '♄', 'sat'],
];

export const ZODIAC_MEAN: Record<string, string> = {
  白羊: '开创 · 冲劲 · 自我', 金牛: '安定 · 感官 · 坚持', 双子: '思辨 · 灵动 · 交流', 巨蟹: '情感 · 归属 · 守护',
  狮子: '表达 · 尊严 · 创造', 处女: '精进 · 服务 · 审慎', 天秤: '平衡 · 关系 · 审美', 天蝎: '深潜 · 转化 · 掌控',
  射手: '远志 · 探索 · 信念', 摩羯: '务实 · 担当 · 成就', 水瓶: '革新 · 独立 · 洞见', 双鱼: '共情 · 想象 · 融通',
};

export const HOUSES = ['命宫', '财帛', '兄弟', '田宅', '子女', '仆役', '夫妻', '疾厄', '迁移', '官禄', '福德', '相貌'];