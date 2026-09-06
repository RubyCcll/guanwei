// 盘面摘要生成：九术排盘结果 → 结构化中文事实（AI 注入用）
// 目的：① 比全量 JSON 更利于模型逐字引用 ② 减少输入 token ③ 事实边界清晰（摘要是「可引用域」）
import type { BaziResult, ZiweiResult, AstrologyResult, QimenResult, MeihuaResult, LiuyaoResult, LiurenResult, XiaoliurenResult } from '../../../shared/core/types';

const DIZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

export function chartBrief(artId: string, resultRaw: unknown): string {
  try {
    switch (artId) {
      case 'bazi': return baziBrief(resultRaw as BaziResult);
      case 'ziwei': return ziweiBrief(resultRaw as ZiweiResult);
      case 'astrology': return astroBrief(resultRaw as AstrologyResult);
      case 'qimen': return qimenBrief(resultRaw as QimenResult);
      case 'meihua': return meihuaBrief(resultRaw as MeihuaResult);
      case 'liuyao': return liuyaoBrief(resultRaw as LiuyaoResult);
      case 'liuren': return liurenBrief(resultRaw as LiurenResult);
      case 'xiaoliuren': return xiaoliurenBrief(resultRaw as XiaoliurenResult);
      case 'tarot': return tarotBrief(resultRaw as any);
      default: return JSON.stringify(resultRaw, null, 1);
    }
  } catch {
    return JSON.stringify(resultRaw, null, 1);
  }
}

function baziBrief(r: BaziResult): string {
  const L: string[] = ['【四柱】' + r.yearGZ + ' 年 / ' + r.monthGZ + ' 月 / ' + r.dayGZ + ' 日（日主' + r.dayGan + r.dayGanWx + '）/ ' + r.hourGZ + ' 时。年命纳音' + r.nayin + '。'];
  L.push('【天干十神】' + r.shishen.map((s, i) => ['年干', '月干', '日干', '时干'][i] + s.gan + s.name).join('、') + '。');
  L.push('【地支藏干】' + r.canggan.map(c => c.zhi + '藏' + c.gans.map(g => g.gan + g.shishen + '(' + g.qi + ')').join('、')).join('；') + '。');
  L.push('【五行分布】' + ['木', '火', '土', '金', '水'].map(k => k + (r.wxWeighted[k] || 0)).join(' ') + '（含藏干加权）。');
  L.push('【旺衰】日主' + r.strength + '（旺衰分 ' + r.strengthDetail.score + '：' + r.strengthDetail.reasons.join('；') + '）。');
  L.push('【用神喜忌】主用神' + r.yongshen.wx + '（' + r.yongshen.shishen + '）；喜' + r.yongshen.xi.join('、') + '；忌' + r.yongshen.ji.join('、') + '；调候：' + r.yongshen.tiaohou + '。');
  if (r.dayun?.length) L.push('【大运】' + r.qiYun.detail + '；' + r.dayun.map(d => d.gz + '（' + d.startAge + '岁，' + d.startYear + '-' + d.endYear + '，' + d.ganShishen + '）').join('、') + '。');
  L.push('【流年】' + r.liunian.year + '年 ' + r.liunian.gz + '（' + r.liunian.ganShishen + '，支藏' + r.liunian.zhiShishen + '）。');
  if (r.shensha?.length) L.push('【神煞】' + r.shensha.map(s => s.name + s.zhi + '(' + s.type + ')').join('、') + '。');
  L.push('【格局】' + r.geju.name + '——' + r.geju.basis + '。');
  L.push('【胎元命身】胎元' + r.taiyuan + '，命宫' + r.minggong + '，身宫' + r.shengong + '。');
  return L.join('\n');
}

function ziweiBrief(r: ZiweiResult): string {
  const L: string[] = ['【命盘】' + r.juName + '（年命纳音' + r.nayin + '），命宫' + DIZHI[r.ming] + '（' + r.mingGZ + '），身宫' + DIZHI[r.shen] + '，紫微落' + DIZHI[r.zwPos] + '宫，大限' + (r.forward ? '顺行' : '逆行') + '。'];
  L.push('【生年四化】' + r.sihua.lu + '化禄、' + r.sihua.quan + '化权、' + r.sihua.ke + '化科、' + r.sihua.ji + '化忌。');
  L.push('【十四主星落宫】' + Object.entries(r.zwStars).map(([s, p]) => s + DIZHI[p] + (r.brightness[s] || '')).join('、') + '。');
  if (Object.keys(r.fuStars).length) L.push('【辅星】' + Object.entries(r.fuStars).map(([s, p]) => s + DIZHI[p]).join('、') + '。');
  // ─── 十二宫完整清单（命宫起逆时针）：宫名+地支+主星+辅星+四化 ───
  // 消除 AI 自行推算宫位的需求（推算即出错源），解读须逐字引用此清单
  const PALACE_NAMES = ['命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫', '迁移宫', '交友宫', '官禄宫', '田宅宫', '福德宫', '父母宫'];
  const SIHUA_KEY: Record<string, string> = { lu: '化禄', quan: '化权', ke: '化科', ji: '化忌' };
  const palaceLines: string[] = [];
  for (let i = 0; i < 12; i++) {
    const zhiIdx = r.palaces?.[i] ?? mod2(r.ming - i, 12);
    const stars = Object.entries(r.zwStars).filter(([, p]) => p === zhiIdx).map(([s]) => s);
    const fus = Object.entries(r.fuStars || {}).filter(([, p]) => p === zhiIdx).map(([s]) => s);
    const sh = Object.entries(r.sihuaPos || {}).filter(([, p]) => p === zhiIdx).map(([k]) => SIHUA_KEY[k]).join('、');
    const parts: string[] = [];
    parts.push(DIZHI[zhiIdx]);
    parts.push(stars.length ? stars.join('、') : '无主星');
    if (fus.length) parts.push('辅' + fus.join('、'));
    if (sh) parts.push(sh);
    palaceLines.push(PALACE_NAMES[i] + parts.join('｜'));
  }
  L.push('【十二宫事实（解读六亲/宫位必须逐字引用，不得推算或编造）】' + palaceLines.join('；') + '。');
  // 昼夜与有效亮度（修正反馈：太阳喜昼、太阴喜夜——AI 论日月亮度须用有效值）
  if (r.dayNight) L.push('【昼夜】' + (r.dayNight === 'day' ? '昼生（太阳得时、太阴减力）' : '夜生（太阴得时、太阳减力）') + '——论太阳/太阴亮度以【有效亮度】为准。');
  if (r.effBrightness) L.push('【有效亮度（昼夜调整后）】' + Object.entries(r.effBrightness).map(([s, b]) => s + b).join('、') + '。');
  // 空宫借对宫（修正反馈：空宫须借对宫看，勿论作真空）
  if (r.borrowedStars) {
    const PALACE2 = ['命', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
    const bl = Object.entries(r.borrowedStars).filter(([, v]) => v.length > 0)
      .map(([k, v]) => PALACE2[+k] + '宫空借对宫' + [...new Set(v)].join('、')).join('；');
    if (bl) L.push('【空宫借星（空宫须借对宫主星论之，非真空）】' + bl + '。');
  }
  if (r.geju?.length) L.push('【格局】' + r.geju.map(g => g.name + '(' + g.ji + ')').join('、') + '。');
  if (r.dayun?.length) L.push('【大限】当前第' + ((r.curDayunIdx ?? 0) + 1) + '大限（' + r.dayun[r.curDayunIdx ?? 0].start + '-' + r.dayun[r.curDayunIdx ?? 0].end + '岁，行至' + DIZHI[r.dayun[r.curDayunIdx ?? 0].palaceIdx] + '宫）。');
  L.push('【流年】' + (r.nominalAge ?? '') + '虚岁流年命宫落' + (r.liunianPalaceName || '') + '（' + DIZHI[r.liunianIdx ?? 0] + '），主星' + (r.liunianStars?.join('、') || '未临') + '。');
  return L.join('\n');
}

function astroBrief(r: AstrologyResult): string {
  const L: string[] = ['【命盘之纲】上升' + r.ascSign + (mod2(r.asc, 30)).toFixed(1) + '°，太阳' + r.sunSign + '，月亮' + r.moonSign + '，中天' + (r.mc !== undefined ? SIGNS[Math.floor(mod2(r.mc, 360) / 30)] : '') + '。宫位制：' + r.houseSystem + '。'];
  L.push('【行星入宫】' + (r.planetDetails || []).map(p => p.cn + p.sign + p.degree.toFixed(0) + '°落' + p.house + '宫' + (p.retrograde ? '（逆）' : '') + (p.dignity.status ? '[' + p.dignity.status + ']' : '')).join('、') + '。');
  if (r.houses?.length) L.push('【十二宫】' + r.houses.map(h => h.num + '宫' + h.sign + '（主' + h.ruler + '）').join('、') + '。');
  if (r.aspects?.length) L.push('【相位】' + r.aspects.map(a => a[0] + a[2] + a[1]).join('、') + '。');
  return L.join('\n');
}

function qimenBrief(r: QimenResult): string {
  const L: string[] = ['【局式】' + (r.yin ? '阴遁' : '阳遁') + r.ju + '局（' + r.jqName + '），日' + r.dayGZ + ' 时' + r.hourGZ + '，旬首' + (r.xunshouName || r.xunShou) + '。'];
  L.push('【值符值使】值符' + r.zfStar + '落' + r.zfPalace + '宫，值使' + r.zsMen + '门落' + r.zsPalace + '宫。');
  const keyP = [r.zfPalace, r.zsPalace, 1, 9].filter((v, i, a) => a.indexOf(v) === i);
  L.push('【关键宫位】' + keyP.map(p => p + '宫：奇仪' + (r.pan[p]?.yi || '') + '、门' + (r.pan[p]?.men || '') + '、星' + (r.pan[p]?.star || '') + (r.shen?.[p] ? '、八神' + r.shen[p] : '') + (r.tianYi?.[p] ? '、暗干' + r.tianYi[p] : '')).join('；') + '。');
  return L.join('\n');
}

function meihuaBrief(r: MeihuaResult): string {
  const L: string[] = ['【起卦】' + r.benGua.name + '（本卦，' + r.benGua.xiang + '），动爻第' + r.move + '爻。'];
  if (r.huGua) L.push('【互卦】' + r.huGua.name + '（事之中）。');
  L.push('【变卦】' + r.bianGua.name + '（事之归）。');
  L.push('【体用】体卦' + r.tiWx + '、用卦' + r.yongWx + '，' + r.shengke + '。');
  if (r.monthWx) L.push('【旺衰时令】起卦月令属' + r.monthWx + '，体卦' + r.tiWx + r.tiWangShuai + '、用卦' + r.yongWx + r.yongWangShuai + '。' + (r.wangShuaiNote || ''));
  return L.join('\n');
}

function liuyaoBrief(r: LiuyaoResult): string {
  const L: string[] = ['【卦象】' + r.benGua.name + '（' + r.benGua.xiang + '）' + (r.dongYao.length ? '，' + r.dongYao.length + '爻发动（' + r.dongYao.map(i => ['初', '二', '三', '四', '五', '上'][i - 1] + '爻').join('、') + '）变' + r.bianGua.name : '，六爻安静') + '。'];
  if (r.najia) {
    L.push('【纳甲装卦】' + r.najia.gong + '宫，' + r.najia.dayGZ + '日（' + r.najia.monthZhi + '月建），世爻在第' + r.najia.shiPos + '爻（' + r.najia.shiLiQin + '），应爻第' + r.najia.yingPos + '爻。');
    L.push('【六亲六神】' + r.najia.lines.map((l, i) => ['初', '二', '三', '四', '五', '上'][i] + '爻' + l.gz + l.liuqin + '（' + l.shen + '）' + (l.isShi ? '世' : '') + (l.isYing ? '应' : '') + (l.kong ? '旬空' : '')).join('、') + '。');
    L.push('【月破】' + r.najia.yuePo.join('、') + '；【旬空】' + r.najia.xunKong.join('、') + '。');
  }
  return L.join('\n');
}

function liurenBrief(r: LiurenResult): string {
  const L: string[] = ['【课式】' + r.dayGZ + '日 ' + r.hourGZ + '时，' + r.jiang + '将加时（' + r.jqName + '），' + (r.isDay ? '昼占' : '夜占') + '贵人' + r.guiRen + '。'];
  L.push('【四课】干上' + r.ke1 + '、干阴' + r.ke2 + '、支上' + r.ke3 + '、支阴' + r.ke4 + '。');
  L.push('【三传】初传' + r.chuan1 + '（乘' + (r.chuanJiang?.[0]?.jiang || '') + '）、中传' + r.chuan2 + '（乘' + (r.chuanJiang?.[1]?.jiang || '') + '）、末传' + r.chuan3 + '（乘' + (r.chuanJiang?.[2]?.jiang || '') + '）。');
  if (r.tianJiang) {
    const ZHI2 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    L.push('【十二天将布宫】' + Object.entries(r.tianJiang).map(([k, v]) => v + ZHI2[+k]).join('、') + '。');
  L.push('【课体】' + (r.keti || '常课') + '——' + (r.ketiNote || '') );
  }
  return L.join('\n');
}

function xiaoliurenBrief(r: XiaoliurenResult): string {
  return '【掌诀】' + r.name + '（' + r.detail.ji + '，五行属' + r.detail.wx + '，主数' + r.detail.num + '，方位' + r.detail.dir + '）。' + r.detail.text;
}

function tarotBrief(r: any): string {
  const cards = Array.isArray(r.cards) ? r.cards : Array.isArray(r) ? r : [];
  const L: string[] = ['【牌阵】共' + cards.length + '张。'];
  cards.forEach((c: any, i: number) => {
    L.push('第' + (i + 1) + '张：' + (c.name || '') + (c.reversed ? '（逆位）' : '（正位）') + (c.position ? '，位' + c.position : '') + (c.up ? '，正位义：' + c.up : '') + (c.rev ? '；逆位义：' + c.rev : ''));
  });
  return L.join('\n');
}

const SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
function mod2(a: number, n: number) { return ((a % n) + n) % n; }