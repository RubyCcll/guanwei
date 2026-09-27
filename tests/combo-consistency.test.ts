// 中西合参引擎一致性：comboEngine 必须与 shared/core 单一引擎同源
//
// 背景（2026-09-26）：src/utils/comboEngine.ts 原是五术的第二套「演示级」实现——
// 小六壬用公历月+日+钟点取模、梅花拿时分当卦序、六壬把天将当地盘、奇门按时辰取门星、
// 六爻用时间戳伪随机且无纳甲。现全部改为调用 shared/core 引擎，本文件锁死这一约定：
// 任何人再往 UI 层塞第二套算法，此测试即失败。
import { describe, it, expect } from 'vitest';
import { Solar } from 'lunar-typescript';
import {
  generateXiaoLiuRen, generateLiuYao, generateMeiHua, generateDaLiuRen, generateQiMen, generateComboResult,
} from '../src/utils/comboEngine';
import { xiaoliurenCalc } from '../shared/core/engine/xiaoliuren';
import { liurenCalc } from '../shared/core/engine/liuren';
import { qimenCalc } from '../shared/core/engine/qimen';
import { meihuaCalc } from '../shared/core/engine/meihua';
import { XLR } from '../shared/core/data/xiaoliuren';

/** 固定时刻（农历八月十六申时附近），使断言可复现 */
const NOW = new Date(2026, 8, 26, 15, 30, 0);

describe('合参引擎与 shared/core 同源', () => {
  it('小六壬：结果取自引擎（农历月日 + 0-based 时辰序），且不再自带重复六宫表', () => {
    const lunar = Solar.fromYmdHms(NOW.getFullYear(), NOW.getMonth() + 1, NOW.getDate(), NOW.getHours(), 30, 0).getLunar();
    const hourIndex = Math.floor(((NOW.getHours() + 1) % 24) / 2);
    const r = xiaoliurenCalc('time', Math.abs(lunar.getMonth()), lunar.getDay(), hourIndex);
    const combo = generateXiaoLiuRen(NOW);
    expect(combo.result).toBe(r.name);
    expect(combo.detail).toContain(r.gong.tian.name);
    expect(combo.detail).toContain(r.gong.di.name);
    expect(combo.detail).toContain(r.detail.text);
    expect(combo.detail).toContain(XLR[r.name].dir);          // 方位来自唯一数据表
  });

  it('大六壬：结果含月将与课体，且与引擎同一次起课一致', () => {
    const r = liurenCalc(NOW);
    const combo = generateDaLiuRen(NOW);
    expect(combo.result).toBe(`${r.jiang}将加${r.hourGZ[1]}时 · ${r.keti}`);
    expect(combo.detail).toContain(r.ke1);
    expect(combo.detail).toContain(r.chuan3);
  });

  it('奇门：结果含阴阳遁局数与值符值使，取自引擎', () => {
    const r = qimenCalc({ datetime: NOW });
    const combo = generateQiMen(NOW);
    expect(combo.result).toBe(`${r.yin ? '阴' : '阳'}遁${r.ju}局 · ${r.zfStar}临${r.zsMen}`);
    expect(combo.detail).toContain(r.jqName);
    expect(combo.detail).toContain(r.dayGZ);
  });

  it('梅花：结果为「本卦 之 变卦」，体用判定取自引擎', () => {
    const r = meihuaCalc({ mode: 'time', now: NOW });
    const combo = generateMeiHua(NOW);
    expect(combo.result).toBe(`${r.benGua.name} 之 ${r.bianGua!.name}`);
    expect(combo.detail).toContain(r.shengke);
    expect(combo.detail).toContain(r.huGua!.name);
  });

  it('六爻：卦名来自真实摇卦（引擎），六亲世应俱全', () => {
    const combo = generateLiuYao(NOW);
    // 64 卦名之一（不再是 `卦象<key>` 兜底）
    expect(combo.result).toMatch(/^[\u4e00-\u9fa5]{2,4}( 之 [\u4e00-\u9fa5]{2,4})?$/);
    expect(combo.result).not.toContain('卦象');
    expect(combo.detail).toMatch(/卦属|静卦/);
    expect(combo.detail).toMatch(/世爻在[初二三d四五上]位/);
  });

  it('五术分派：generateComboResult 覆盖全部术别且结果非空', () => {
    for (const m of ['xiaoliuren', 'liuyao', 'meihua', 'daliuren', 'qimen']) {
      const r = generateComboResult(m, NOW);
      expect(r.method, m).toBe(m);
      expect(r.result.length, m).toBeGreaterThan(0);
      expect(r.detail.length, m).toBeGreaterThan(10);
      expect(r.relationToTarot.length, m).toBeGreaterThan(5);
    }
  });
});
