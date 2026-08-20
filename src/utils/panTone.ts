// 盘面话术生成器：按排盘数据（五行/旺衰/十神/用神/大运/纳音/季节）组合出每盘不同的解读话术
// 确定性输出：同一盘面每次生成一致（不引入随机），不同盘面因数据不同而话术不同
import type { BaziResult, ZiweiResult } from '@core/types';

// ─── 五行意象 ───
const WX_IMAGE: Record<string, { img: string; nature: string; realm: string }> = {
  木: { img: '参天之木', nature: '向上伸展、生生不息', realm: '东方 · 青绿 · 肝胆' },
  火: { img: '燎原之火', nature: '热烈明亮、光明磊落', realm: '南方 · 赤红 · 心肠' },
  土: { img: '厚重之土', nature: '包容承载、踏实守信', realm: '中央 · 黄褐 · 脾胃' },
  金: { img: '百炼之金', nature: '坚刚果断、肃杀分明', realm: '西方 · 素白 · 肺腑' },
  水: { img: '奔流之水', nature: '灵动善变、智谋深远', realm: '北方 · 玄黑 · 肾水' },
};
const WX_ORDER = ['木', '火', '土', '金', '水'];

// ─── 月支 × 季节 ───
const MONTH_SEASON: Record<string, { season: string; note: string }> = {
  寅: { season: '孟春', note: '木气初生，万物发陈' },
  卯: { season: '仲春', note: '木气正盛，花木繁茂' },
  辰: { season: '季春', note: '土气渐旺，湿土培木' },
  巳: { season: '孟夏', note: '火气初升，炎气渐盛' },
  午: { season: '仲夏', note: '火气当令，烈日当空' },
  未: { season: '季夏', note: '土气主事，火土相生' },
  申: { season: '孟秋', note: '金气初肃，万物收敛' },
  酉: { season: '仲秋', note: '金气正锐，白露为霜' },
  戌: { season: '季秋', note: '土气回旺，金火入库' },
  亥: { season: '孟冬', note: '水气初生，寒流暗涌' },
  子: { season: '仲冬', note: '水气当令，寒凝之季' },
  丑: { season: '季冬', note: '土气主事，腊月土冻' },
};

const STRENGTH_NOTE: Record<string, string> = {
  身强: '根基厚实、气机充盈',
  身弱: '气机偏弱、喜生扶帮身',
  中和: '五行流转、不偏不倚',
};
const STRENGTH_ADVICE: Record<string, string> = {
  身强: '宜泄宜克，向外施展方能舒展',
  身弱: '宜生宜扶，蓄力而后发',
  中和: '顺势而为，动静皆宜',
};

// ─── 十神 → 性格倾向（含藏干加权）───
const TENDENCY_POOL: { keys: string[]; trait: string; descs: string[] }[] = [
  {
    keys: ['伤官', '食神'],
    trait: '才情外放',
    descs: [
      '食伤泄秀之人，点子多、手脚快，靠本事吃饭，最受不了按部就班的死规矩——适合做需要创造力的行当，把才华落到作品上。',
      '食伤旺的人表达欲强，学东西快，但也容易不耐烦、眼高手低，须防话比事多，把聪明用在刀刃上。',
    ],
  },
  {
    keys: ['正印', '偏印'],
    trait: '内秀深思',
    descs: [
      '印星贴身之人，心思细、记性好，喜欢想明白了再动，重学识涵养，适合深耕专业或与文化、文书相关之事。',
      '印旺的人安全感来自内在储备，遇事习惯先查资料、问老规矩，节奏偏稳，但也要防想太多而行动迟缓。',
    ],
  },
  {
    keys: ['正官', '七杀'],
    trait: '自律担当',
    descs: [
      '官杀在命之人，自我要求高、守规矩、有担当，遇事敢扛，适合有章法有目标的赛道，把约束变成铠甲。',
      '官杀旺的人骨子里要强，见不得自己掉队，压力越大越能顶——但弦绷太紧易生内耗，须学会放自己一马。',
    ],
  },
  {
    keys: ['正财', '偏财'],
    trait: '务实经营',
    descs: [
      '财星入命之人，对现实账目门儿清，务实不空谈，擅长把资源盘活，做生意、管项目都有天然的手感。',
      '财旺的人重实际、讲回报，得失心也重些，钱要赚得稳，更要赚得安心，勿为一时之利透支长远。',
    ],
  },
  {
    keys: ['比肩', '劫财'],
    trait: '自立要强',
    descs: [
      '比劫同气之人，凡事靠自己，不轻易开口求人，性子直、讲义气，适合独当一面的角色，但也易因硬扛而辛苦。',
      '比肩旺的人主见强、不服输，和人共事容易起摩擦，若能学会借力与分工，路会宽很多。',
    ],
  },
];

// ─── 五行旺缺补益（修身养性取向）───
const WX_BENEFIT: Record<string, string> = {
  木: '东方、青绿色系、晨间运动与肝胆养护',
  火: '南方、赤红色系、日间活动与心气舒展',
  土: '居所稳固、黄褐色系、脾胃调理与规律作息',
  金: '西方、素白色系、呼吸吐纳与肺腑清净',
  水: '北方、玄黑色系、静坐冥思与肾水滋养',
};

function nayinWx(nayin: string): string | null {
  const m = /[金木水火土]$/.exec(nayin || '');
  return m ? m[0] : null;
}

// 具体十神名 → 类名（与引擎喜忌列表对齐：印/比劫/食伤/财/官杀）
function tenClass(name: string): string {
  if (['正印', '偏印'].includes(name)) return '印';
  if (['比肩', '劫财'].includes(name)) return '比劫';
  if (['食神', '伤官'].includes(name)) return '食伤';
  if (['正财', '偏财'].includes(name)) return '财';
  if (['正官', '七杀'].includes(name)) return '官杀';
  return name;
}

// ─── 八字话术 ───
export function baziTone(r: BaziResult): { headline: string; overview: string; character: string[]; wuxingNote: string; dayunNote: string; nayinNote: string } {
  const dayWx = r.dayGanWx;
  const img = WX_IMAGE[dayWx];
  const month = MONTH_SEASON[r.monthGZ[1]] || { season: '', note: '' };

  // 1. 命局气质标题句：日主意象 × 季节处境 × 旺衰定调
  const headline = `日主${r.dayGan}${dayWx}，如${img.img}——${img.nature}；生于${month.season}（${r.monthGZ[1]}月），${month.note}，${r.strength === '身强' ? '得势而旺' : r.strength === '身弱' ? '气机有待生扶' : '气机中和'}。`;

  // 2. 总述：旺衰 + 用神 + 调候
  const overview = `${STRENGTH_NOTE[r.strength]}，${STRENGTH_ADVICE[r.strength]}。以${r.yongshen.wx}（${r.yongshen.shishen}）为用神，喜${r.yongshen.xi.join('、')}，忌${r.yongshen.ji.join('、')}；${r.yongshen.tiaohou}。`;

  // 3. 性格倾向：统计天干+藏干十神权重，取前 2-3
  const w: Record<string, number> = {};
  r.shishen.forEach(s => { w[s.name] = (w[s.name] || 0) + 1; });
  r.canggan.forEach(cg => cg.gans.forEach(g => { w[g.shishen] = (w[g.shishen] || 0) + (g.qi === '本气' ? 2 : 1); }));
  const picked = TENDENCY_POOL
    .map(pool => ({ pool, weight: pool.keys.reduce((s, k) => s + (w[k] || 0), 0) }))
    .filter(x => x.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);
  // 句式轮换：按日主五行索引挑 desc 变体，避免同类型盘面话术完全一致
  const wxIdx = WX_ORDER.indexOf(dayWx);
  const character = picked.map((x, i) => `${x.pool.trait}——${x.pool.descs[(wxIdx + i) % x.pool.descs.length]}`);

  // 4. 五行旺缺
  const ranked = [...WX_ORDER].sort((a, b) => (r.wxWeighted[b] || 0) - (r.wxWeighted[a] || 0));
  const most = ranked[0], least = ranked[ranked.length - 1];
  const mostV = r.wxWeighted[most] || 0, leastV = r.wxWeighted[least] || 0;
  let wuxingNote = '';
  if (mostV - leastV >= 3) {
    const ke = WX_ORDER[(WX_ORDER.indexOf(most) + 2) % 5]; // 我克者（制衡）
    const xie = WX_ORDER[(WX_ORDER.indexOf(most) + 1) % 5]; // 我生者（泄秀）
    wuxingNote = `盘中${most}气独旺（${mostV}），旺则须疏——宜以${ke}制衡、或以${xie}泄秀，方得流通；${least}气偏弱（${leastV}），可于${WX_BENEFIT[least]}中缓缓补益，修身养性、仅供参考。`;
  } else if (mostV - leastV >= 1) {
    wuxingNote = `盘中${most}气稍盛、${least}气稍弱，五行大体流通，宜顺其势：近${WX_BENEFIT[least]}，远${WX_BENEFIT[most]}之过亢，动静有度。`;
  } else {
    wuxingNote = '五行分布均衡，气机流通顺畅，无大偏颇——顺势而为即是上策。';
  }

  // 5. 行运指引：当前大运 × 喜忌（十神类名对齐）
  const now = new Date().getFullYear();
  const cur = r.dayun.find(d => now >= d.startYear && now <= d.endYear);
  let dayunNote = '';
  if (cur) {
    const cls = tenClass(cur.ganShishen);
    const isXi = r.yongshen.xi.includes(cls);
    const isJi = r.yongshen.ji.includes(cls);
    if (isJi) {
      dayunNote = `今行${cur.gz}${cur.ganShishen}运（${cur.startYear}-${cur.endYear}），为忌神之运——宜守成、忌冒进，防破耗与无谓竞争，把精力留给真正重要之事。`;
    } else if (isXi) {
      dayunNote = `今行${cur.gz}${cur.ganShishen}运（${cur.startYear}-${cur.endYear}），喜神当令——正是进取之时，可放心把计划往前推，善用贵人与资源。`;
    } else {
      dayunNote = `今行${cur.gz}${cur.ganShishen}运（${cur.startYear}-${cur.endYear}），吉凶相参——稳中求进，进可攻退可守，最忌临事犹豫、两头落空。`;
    }
  }

  // 6. 纳音意象
  const nw = nayinWx(r.nayin);
  const nayinNote = nw && WX_IMAGE[nw]
    ? `年命纳音${r.nayin}，其性属${nw}，如${WX_IMAGE[nw].img}——${WX_IMAGE[nw].nature}，暗合一生之底色。`
    : `年命纳音${r.nayin}，如琴有调，暗合一生之音律。`;

  return { headline, overview, character, wuxingNote, dayunNote, nayinNote };
}

// ─── 紫微命宫点睛 ───
export function ziweiTone(r: ZiweiResult): { mingNote: string; liunianNote: string } {
  const DIZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  // 命宫主星：zwStars 中落命宫位的星（值=ming 的星）
  const mingStars = Object.entries(r.zwStars).filter(([, p]) => p === r.ming).map(([s]) => s);
  const mingNote = mingStars.length
    ? `命宫安于${DIZHI[r.ming]}，主星${mingStars.join('、')}坐守——${mingStars.map(s => starBrief(s)).join('；')}为一生行运之枢。`
    : `命宫安于${DIZHI[r.ming]}（主星未临，借对宫之星论之）——为一生行运之枢。`;
  const liunianNote = `${r.nominalAge ?? ''}虚岁流年命宫落${r.liunianPalaceName || DIZHI[r.liunianIdx ?? 0]}，流年主星${r.liunianStars?.join('、') || '未临'}——流年之机，观此宫动静。`;
  return { mingNote, liunianNote };
}

const STAR_BRIEF: Record<string, string> = {
  紫微: '帝星入命，气度格局不凡，好揽事、有担当',
  天机: '机变聪明，心思活络，善谋不善断',
  太阳: '光明磊落，热心助人，贵在坦荡',
  武曲: '刚毅务实，财星得用，宜事不宜闲',
  天同: '福星随和，与世无争，贵人缘佳',
  廉贞: '次桃花主事，才情与锋芒并具',
  天府: '库星坐命，稳重守成，善于经营',
  太阴: '月华照命，细腻内敛，重情重家',
  贪狼: '欲望与才艺之星，圆融善交际',
  巨门: '口舌与思辨之星，能言善断亦招是非',
  天相: '辅弼之星，识大体、善协调',
  天梁: '荫星照命，逢凶化吉，长辈缘深',
  七杀: '将星入命，杀伐果断，先苦后成',
  破军: '破旧立新之星，变动中见机遇',
};
function starBrief(s: string): string {
  return STAR_BRIEF[s] || `${s}主事`;
}
