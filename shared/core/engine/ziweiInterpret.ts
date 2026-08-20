// 紫微命盘详解：按盘主星曜落宫生成个性化解读（现代语言）
import { ZW_STARS, ZW_STAR_MEAN, PALACE_NAMES } from '../data/ziwei';
import type { ZiweiResult } from '../types';

const DIZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

export interface ZiweiInsight {
  title: string;
  content: string;
}

function mod(a: number, n: number) {
  return ((a % n) + n) % n;
}

// 吉性主星（得地多顺）
const GOOD_STARS = ['紫微', '天同', '天府', '天相', '天梁', '太阴', '太阳', '武曲'];

function starBrief(s: string): string {
  return s + '为' + ZW_STARS[s] + '，' + ZW_STAR_MEAN[s].split('，')[0];
}

function palaceTheme(name: string): string {
  const themes: Record<string, string> = {
    命宫: '一生的根基与底色', 兄弟: '手足缘分与同侪之助', 夫妻: '姻缘之象与伴侣之缘',
    子女: '子息缘分与晚辈之应', 财帛: '求财之途与理财之能', 疾厄: '体魄之况与健康之需',
    迁移: '外出之运与环境之变', 仆役: '部属朋友之助', 官禄: '事业之途与名位之求',
    田宅: '家宅之基与置业之机', 福德: '福分之厚与心境之安', 父母: '父母荫庇与长辈之缘',
  };
  return themes[name] || '';
}

function palaceNameOf(r: ZiweiResult, pos: number): string {
  const idx = Object.keys(r.palaces).find(k => r.palaces[Number(k)] === pos);
  return idx !== undefined ? PALACE_NAMES[Number(idx)] : '';
}

function starsOf(r: ZiweiResult, pos: number): string[] {
  return Object.keys(r.zwStars).filter(s => r.zwStars[s] === pos);
}


export function interpretZiwei(r: ZiweiResult): ZiweiInsight[] {
  const out: ZiweiInsight[] = [];

  // 1. 命宫详解
  const mingStars = starsOf(r, r.ming);
  if (mingStars.length > 0) {
    const t1 = '命宫 · ' + DIZHI[r.ming];
    const c1 = '命宫安于' + DIZHI[r.ming] + '位，主星为' + mingStars.join('、') + '。'
      + mingStars.map(starBrief).join('；') + '。此组合以' + mingStars[0] + '为纲，一生行运以此为底色。'
    out.push({ title: t1, content: c1 });
  } else {
    const t1 = '命宫 · ' + DIZHI[r.ming];
    const c1 = '命宫安于' + DIZHI[r.ming] + '位，主星未临，为「命宫无主星」之局。此时当借对宫（' + DIZHI[mod(r.ming + 6, 12)] + '）主星为用，或以紫微落宫为纲领观之。命主性情内敛，行事多受环境牵动，宜借外力补足。'
    out.push({ title: t1, content: c1 });
  }

  // 2. 紫微落宫
  const zwPalace = palaceNameOf(r, r.zwPos);
  let c2 = '帝星紫微落于' + (zwPalace ? zwPalace : '未明之宫') + '。';
  if (zwPalace === '命宫') c2 += '紫微坐命，格局自高，一生贵气与担当并存，唯须防孤高自许。';
  else if (zwPalace === '财帛') c2 += '紫微入财帛，掌财有方，格局开阔，宜谋大局之财。';
  else if (zwPalace === '官禄') c2 += '紫微入官禄，事业有威，宜居领导之位，名位可期。';
  else if (zwPalace === '田宅') c2 += '紫微入田宅，家业殷实，置业有成，祖荫可承。';
  else c2 += '紫微入' + (zwPalace || '未明之宫') + '，帝星所临之处即一生重心所在，此宫之事易得显达与助力。';
  out.push({ title: '紫微落宫 · ' + (zwPalace || '') + '（' + DIZHI[r.zwPos] + '）', content: c2 });

  // 3. 十二宫要览
  const overview: { name: string; stars: string[]; pos: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const pos = r.palaces[i];
    const stars = starsOf(r, pos);
    if (stars.length === 0) continue;
    const pname = PALACE_NAMES[i];
    const brief = stars.map(starBrief).join('；');
    const line = pname + '宫（' + DIZHI[pos] + '）见' + stars.join('、') + '——' + brief + '。此宫主' + palaceTheme(pname) + '。'
      + stars[0] + '入' + pname + '，' + (GOOD_STARS.includes(stars[0]) ? '为得地之象，多主顺遂。' : '须留意分寸，化其棱角则吉。');
    overview.push({ name: pname, stars, pos });
  }
  out.push({
    title: '十二宫要览',
    content: overview.map(o => o.name + '宫（' + DIZHI[o.pos] + '）见' + o.stars.join('、') + '——' + o.stars.map(starBrief).join('；') + '。此宫主' + palaceTheme(o.name) + '。' + o.stars[0] + '入' + o.name + '，' + (GOOD_STARS.includes(o.stars[0]) ? '为得地之象，多主顺遂。' : '须留意分寸，化其棱角则吉。')).join('\n\n'),
  });

  // 4. 当前大限
  if (r.dayun && r.curDayunIdx !== undefined) {
    const d = r.dayun[r.curDayunIdx];
    const pname = palaceNameOf(r, d.palaceIdx);
    const stars = starsOf(r, d.palaceIdx);
    let c4 = '命主现处第' + (r.curDayunIdx + 1) + '大限，行至' + (pname || '') + '宫（' + DIZHI[d.palaceIdx] + '）。';
    if (stars.length) {
      const s0 = stars[0];
      c4 += '此宫主星' + stars.join('、') + '，' + s0 + '入' + (pname || '') + '，'
        + (ZW_STAR_MEAN[s0].includes('财') ? '此十年财机为要，宜务实经营。'
          : ZW_STAR_MEAN[s0].includes('贵') || ZW_STAR_MEAN[s0].includes('官') ? '此十年名位为重，宜向上进取。'
          : '此十年' + (pname || '') + '之事务为重心，静心经营自有所成。');
    } else {
      c4 += '此宫主星未临，十年之事多借他宫之力，宜稳中求进。';
    }
    out.push({ title: '当前大限 · ' + d.start + '–' + d.end + '岁', content: c4 });
  }

  // 5. 流年
  if (r.liunianIdx !== undefined) {
    const stars = starsOf(r, r.liunianIdx);
    let c5 = '今年虚岁' + (r.nominalAge ?? '') + '，流年命宫行至' + (r.liunianPalaceName || '') + '宫（' + DIZHI[r.liunianIdx] + '）。';
    if (stars.length) {
      const s0 = stars[0];
      c5 += '流年主星' + stars.join('、') + '照临，' + s0 + '入此宫，'
        + (ZW_STAR_MEAN[s0].includes('财') ? '今年财机可期，唯须防急进。'
          : ZW_STAR_MEAN[s0].includes('贵') ? '今年名望有进，宜谦和持守。'
          : ZW_STAR_MEAN[s0].includes('福') ? '今年福泽安稳，家和事顺。'
          : '今年此宫所主之事多有动静，顺势而为即可。');
    } else {
      c5 += '流年宫主星未临，今年整体平稳，可按大限之势行事。';
    }
    out.push({ title: '流年之示', content: c5 });
  }

  // 6. 总述
  const keyStar = mingStars[0] || '紫微';
  const c6 = '盘主以' + keyStar + '为命宫主星（' + (mingStars.length ? ZW_STARS[keyStar] : '借对宫之力') + '），紫微落' + (zwPalace || '') + '宫、五行属' + r.juName + '。'
    + '纵观全局，' + (mingStars.length ? keyStar + '主' + (ZW_STAR_MEAN[keyStar].includes('贵') ? '格局与担当' : '其性之显') + '，一生之成在于' + (zwPalace || '未明之宫') + '之经营。' : '命宫虚而借力，一生之成在于择善而从。')
    + '大限顺逆已定，行运起伏观其宫位主星之得地与否。此盘为简盘所推，辅曜从略，供修身养性、怡情遣兴之用。';
  out.push({ title: '命盘总述', content: c6 });

  return out;
}