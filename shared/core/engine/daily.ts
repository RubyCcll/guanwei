// 每日星相 / 每日运势 / 每日星座（almanac + 行星近似 + 运势模板）
import { Solar } from 'lunar-typescript';
import { almanacOf } from './calendar';
import { astrologyCalc } from './astrology';
import { ZODIAC } from '../data/zodiac';
import { mod } from '../data/ganzhi';

export interface DailyAlmanac {
  lunarText: string;
  ganzhi: string;           // 干支日
  shengxiao: string;
  jieQi: string | null;
  yueXiang: string;         // 月相
  yi: string[];
  ji: string[];
  chong: string;
  sha: string;
  xingZuo: string;          // 当日太阳星座
}

export function dailyAlmanac(d = new Date()): DailyAlmanac {
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const a = almanacOf(y, m, day);
  const lunar = a.lunarText;
  // 月相：lunar-typescript getYueXiang
  const yueXiang = Solar.fromYmdHms(y, m, day, 12, 0, 0).getLunar().getYueXiang() || '';
  return {
    lunarText: lunar,
    ganzhi: a.ganzhiDay,
    shengxiao: a.shengxiao,
    jieQi: a.jieQi,
    yueXiang,
    yi: a.yi.slice(0, 6),
    ji: a.ji.slice(0, 6),
    chong: a.chong,
    sha: a.sha,
    xingZuo: a.xingZuo,
  };
}

export interface DailySky {
  sunSign: string;
  moonSign: string;
  planets: { name: string; sign: string; deg: number }[];
  yueXiang: string;
}

// 当日天象（行星近似位置）
export function dailySky(d = new Date()): DailySky {
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const r = astrologyCalc(y, m, day, 12, 0);
  const planets = r.planets.map(([name]) => {
    const p = r.planets.find(x => x[0] === name)!;
    const s = Math.floor(mod(p[2], 360) / 30);
    return { name, sign: ZODIAC[s][0], deg: Math.floor(mod(p[2], 30)) };
  });
  const sunSign = ZODIAC[Math.floor(r.sun / 30)][0];
  const moonSign = ZODIAC[Math.floor(r.moon / 30)][0];
  return { sunSign, moonSign, planets, yueXiang: dailyAlmanac(d).yueXiang };
}

// 十二星座当日运势模板（现代解读层语言）
const FORTUNE_TEMPLATES: Record<string, string[]> = {
  白羊座: [
    '今日行动力充沛，适合推进搁置的计划。沟通时稍放缓语速，能避免不必要的摩擦。',
    '精力旺盛但易急躁，重要决定放在午后做更稳妥。运动或户外活动有助于释放压力。',
  ],
  金牛座: [
    '今日宜守成，财务上有小而稳的收获。亲近自然或整理居所，能让内心更加安定。',
    '务实的一天，把待办一件件做完会很有成就感。注意饮食规律，别让忙碌挤掉三餐。',
  ],
  双子座: [
    '今日思维活跃，适合学习、写作与交流。信息量较大，留意分辨哪些值得当真。',
    '灵感如泉涌，不妨把想法记录下来。与旧友联系可能带来新的合作机会。',
  ],
  巨蟹座: [
    '今日情绪感知敏锐，适合处理家庭与情感事务。表达需求比默默猜测更能靠近彼此。',
    '内心柔软的一天，给自己留一点独处的时间。回忆过往时，记得只带走温暖的部分。',
  ],
  狮子座: [
    '今日气场强大，适合展示才华与担当。在人群中你的声音会被听见，注意倾听他人的回应。',
    '创造力旺盛，适合创作与表达。适度放下主角光环，合作反而更顺利。',
  ],
  处女座: [
    '今日条理清晰，适合处理细节与规划。对完美的追求是礼物，但别让它变成苛责自己的鞭子。',
    '效率很高的一天，适合整理与优化。留意健康信号，久坐后记得起身活动。',
  ],
  天秤座: [
    '今日人际和谐，适合合作与协商。犹豫时先明确自己真正想要什么，平衡才有支点。',
    '审美在线，适合布置环境或改善形象。一段需要平衡的关系值得你花时间经营。',
  ],
  天蝎座: [
    '今日洞察力深邃，适合深入思考与解决问题。信任直觉，也记得给证据留位置。',
    '内在力量强的一天，适合处理棘手事务。转化正在进行，允许旧模式慢慢离开。',
  ],
  射手座: [
    '今日向往远方，适合学习、旅行或拓展视野。乐观是你的天赋，行动是它的翅膀。',
    '好奇心旺盛，新的可能性正在浮现。先迈出一步，路线会在途中清晰。',
  ],
  摩羯座: [
    '今日宜务实推进，长期目标值得投入时间。稳扎稳打的节奏，会在未来显现复利。',
    '责任感强的一天，注意别把工作扛成一个人的事。适度示弱，团队会更稳固。',
  ],
  水瓶座: [
    '今日思维独特，适合创新与独立工作。你的想法也许超前，耐心解释会让同路人更多。',
    '社交能量足，群体活动带来启发。保持开放，也保留自己的节奏。',
  ],
  双鱼座: [
    '今日共情力强，适合艺术、冥想与助人。记得给自己也留一份温柔，别把感受都让渡出去。',
    '直觉敏锐的一天，梦境与灵感值得记录。边界感是保护，不是冷漠。',
  ],
};

export interface DailyFortune {
  sign: string;
  text: string;
  personalized: boolean;
}

/**
 * 每日运势
 * @param d 日期
 * @param userSign 用户太阳星座（登录后按出生信息计算；未登录为当日太阳星座）
 */
export function dailyFortune(d = new Date(), userSign?: string): DailyFortune {
  const sky = dailySky(d);
  const sign = userSign || sky.sunSign + '座';
  const pool = FORTUNE_TEMPLATES[sign] || FORTUNE_TEMPLATES['白羊座']!;
  // 按日期取模板（同日稳定）
  const daySeed = d.getDate() + d.getMonth() * 31;
  const text = pool[daySeed % pool.length] + ' 黄历示：' + (dailyAlmanac(d).yi.slice(0, 2).join('、')) + '为宜。';
  return { sign, text, personalized: !!userSign };
}