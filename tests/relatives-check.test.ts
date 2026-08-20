// 六亲表述校验测试：虚构盘（1988-06-15 北京女 申时） vs 报告文本矛盾检测
// 盘面事实：命宫戌（太阳）、父母宫亥（无主星，对宫巳=廉贞贪狼）、夫妻宫申（天同天梁）、子女宫未（天相）
// 四化：贪狼化禄/太阴化权/右弼化科/天机化忌
import { describe, it, expect } from 'vitest';
import { ziweiCalc } from '../shared/core/engine/ziwei';
import { verifyRelatives } from '../server/src/services/relativesCheck.js';
import type { AIReportNormalized } from '../server/src/routes/ai.js';

const zw = ziweiCalc({ ganzhi: '戊辰', month: 5, day: 1, hour: 8, time: '16:30', location: { lng: 116.4, lat: 39.9 }, gender: '女', birthYear: 1988, solarDate: [1988, 6, 15] });

// 虚构盘（与 ziweiCalc 同源数据）
const recZw = {
  ming: 8, shen: 10, zwPos: 11,
  palaces: { 0: 8, 1: 7, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 0, 9: 11, 10: 10, 11: 9 },
  zwStars: { 紫微: 11, 天机: 10, 太阳: 8, 武曲: 7, 天同: 6, 廉贞: 3, 天府: 1, 太阴: 2, 贪狼: 3, 巨门: 4, 天相: 5, 天梁: 6, 七杀: 7, 破军: 11 },
  fuStars: { 左辅: 6, 右弼: 4, 文昌: 0, 文曲: 10, 天魁: 11, 天钺: 5, 禄存: 3, 擎羊: 4, 陀罗: 2, 火星: 8, 铃星: 4, 地空: 1, 地劫: 5, 天马: 0, 红鸾: 9, 天喜: 3, 咸池: 7, 天姚: 4, 天刑: 11, 孤辰: 3, 寡宿: 11, 天哭: 8, 天虚: 2 },
  sihua: { lu: '贪狼', quan: '太阴', ke: '右弼', ji: '天机' },
  sihuaPos: { lu: 3, quan: 2, ji: 10 },
};

function makeReport(family: any): AIReportNormalized {
  return {
    kind: 'mingpan', title: '测试', overview: '总述', rawReading: { summary: '盘面', keyPoints: [] },
    advice: '', conclusion: '', disclaimer: '免责', family, quality: 'ok',
  };
}

describe('verifyRelatives', () => {
  it('正确表述（父母宫亥无主星）→ 无矛盾', () => {
    const r = makeReport({ background: '父母宫在亥宫，无主星，辅红鸾，家庭氛围平和。', parents: '父母务实。', imprint: '家庭印记。' });
    expect(verifyRelatives('ziwei', zw, r)).toEqual([]);
  });

  it('错误表述（父母宫写成错误地支）→ 检出矛盾', () => {
    const r = makeReport({ background: '父母宫在未宫，主星武曲七杀，父母刚强。', parents: '父母宫在卯，紫微坐守。', imprint: '印记。' });
    const errs = verifyRelatives('ziwei', zw, r);
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.join('|')).toContain('未');
    expect(errs.join('|')).toContain('卯');
  });

  it('夫妻宫天同天梁（有主星）合法表述不误报', () => {
    const r = makeReport({ background: '夫妻宫申宫，主星天同天梁，感情温和。', parents: '父母宫亥无主星。', imprint: '印记。' });
    expect(verifyRelatives('ziwei', zw, r)).toEqual([]);
  });

  it('全篇 JSON 中检测（family 之外的其他区块表述也覆盖）', () => {
    const r = makeReport({ background: '家境尚可。', parents: '父母务实。', imprint: '印记。' });
    (r as any).character = { summary: '父母宫在卯主星太阳，性格随和。', traits: [] };
    const errs = verifyRelatives('ziwei', zw, r);
    expect(errs.length).toBeGreaterThan(0);
  });

  it('四化写错检出（天机化禄 → 应为天机化忌）', () => {
    const r = makeReport({ background: '天机化禄在官禄宫。', parents: '父母务实。', imprint: '印记。' });
    const errs = verifyRelatives('ziwei', zw, r);
    expect(errs.join('|')).toContain('天机化禄写错');
    const ok = makeReport({ background: '贪狼化禄在子女宫，太阴化权在疾厄宫。', parents: '父母务实。', imprint: '印记。' });
    expect(verifyRelatives('ziwei', zw, ok)).toEqual([]);
  });

  it('半角逗号跨句不误报', () => {
    const r = makeReport({ background: '子女宫天相,父母宫亥无主星。', parents: '父母务实。', imprint: '印记。' });
    expect(verifyRelatives('ziwei', zw, r)).toEqual([]);
  });

  it('借星校验：父母宫亥无主星，对宫巳=廉贞贪狼', () => {
    const ok = makeReport({ background: '父母宫亥无主星，借对宫廉贞贪狼来看，父母个性鲜明。', parents: '父母务实。', imprint: '印记。' });
    expect(verifyRelatives('ziwei', recZw, ok)).toEqual([]);
    const bad = makeReport({ background: '父母宫亥无主星，借对宫天同太阴来看，父母温和。', parents: '父母务实。', imprint: '印记。' });
    const errs = verifyRelatives('ziwei', recZw, bad);
    expect(errs.join('|')).toContain('借星写错');
  });

  it('虚构盘四化（贪狼化禄等）不误报', () => {
    const r = makeReport({ background: '贪狼化禄在子女宫，太阴化权在疾厄宫，右弼化科在财帛宫，天机化忌在官禄宫。', parents: '父母务实。', imprint: '印记。' });
    expect(verifyRelatives('ziwei', recZw, r)).toEqual([]);
  });
});
