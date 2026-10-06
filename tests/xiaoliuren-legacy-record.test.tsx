// 小六壬历史记录兼容回归（2026-10-06 报错修复）
//
// 现象：打开 2026-09-26 之前入库的小六壬记录（resultRaw 无 gong / detail.color / detail.shen）
//       时结果面板抛 `Cannot read properties of undefined (reading 'tian')`，AI 解读随之报错。
// 修法：三宫推导抽到引擎 `xiaoliurenGong(a,b,c)` 导出，客户端与服务端在缺字段时复算；
//       类型上 gong 标为可选，缺 color/shen 留白。
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react';
import { XiaoliurenResult } from '../src/components/arts/XiaoliurenArt';
import { xiaoliurenCalc, xiaoliurenGong } from '../shared/core/engine/xiaoliuren';
import { XLR_ORDER, XLR } from '../shared/core/data/xiaoliuren';
import { chartBrief } from '../server/src/services/chartBrief';

/** 2026-09-26 之前入库的真实结构（逐字取自本地库 d_1787972917854_72r9x） */
const LEGACY = {
  a: 8, b: 1, c: 10, idx: 4, name: '小吉',
  detail: { ji: '吉', wx: '水', num: '一、五、七', dir: '东北', poem: '人来喜时，属水六合，谋事主一、五、七。', text: '小吉最吉昌，路上好商良，阳人来报喜，失物在坤方。行人立便至，交关真是强，凡事皆和合，病者叩穹苍。' },
} as any;
/** 另一条更旧的记录（d_1787224297969_thlkk） */
const LEGACY2 = {
  a: 1, b: 1, c: 1, idx: 0, name: '大安',
  detail: { ji: '吉', wx: '木', num: '一、五、七', dir: '东方', poem: '身不动时，属木青龙，谋事主一、五、七。', text: '大安事事昌，求谋在东方，失物不远去，宅舍保安康。行人身未动，病者主无妨，将军回田野，仔细好推详。' },
} as any;

describe('小六壬：历史记录（无 gong 字段）不再报错', () => {
  it('结果面板可渲染，且三宫由 a/b/c 复算得出', () => {
    const { p1, p2, p3 } = xiaoliurenGong(LEGACY.a, LEGACY.b, LEGACY.c);
    render(<XiaoliurenResult data={LEGACY} />);
    // 三宫名称与复算一致（起因/经过/结果）——文本被 <strong> 分段，故按整体文本断言
    const text = document.body.textContent || '';
    expect(text).toContain(`天宫（月落·起因）${XLR_ORDER[p1]}`);
    expect(text).toContain(`地宫（日落·经过）${XLR_ORDER[p2]}`);
    expect(text).toContain(`人宫（时落·结果）${XLR_ORDER[p3]}`);
    // 缺 color/shen 时以「—」占位，不出现 undefined
    expect(document.body.textContent).not.toContain('undefined');
  });

  it('新记录（含 gong/color/shen）渲染结果与旧记录同源一致', () => {
    // time 模式的 h 为 0-based 时辰序（0=子），时数 = h+1 → 取 h = c-1 对齐
    const fresh = xiaoliurenCalc('time', LEGACY.a, LEGACY.b, LEGACY.c - 1);   // a=8,b=1,c=10 → h=9（酉）
    expect(fresh.c).toBe(LEGACY.c);
    expect(fresh.name).toBe(LEGACY.name);
    render(<XiaoliurenResult data={fresh} />);
    expect(document.body.textContent || '').toContain(`人宫（时落·结果）${fresh.gong!.ren.name}`);
    expect(document.body.textContent).not.toContain('undefined');
  });

  it('AI 盘面事实：旧记录复算三宫后注入，且不出现 undefined', () => {
    const brief = chartBrief('xiaoliuren', LEGACY);
    const { p1, p2, p3 } = xiaoliurenGong(LEGACY.a, LEGACY.b, LEGACY.c);
    expect(brief).toContain('【天地人三宫】');
    expect(brief).toContain(`天宫（月落·起因）${XLR_ORDER[p1]}`);
    expect(brief).toContain(`地宫（日落·经过）${XLR_ORDER[p2]}`);
    expect(brief).toContain(`人宫（时落·结果）${XLR_ORDER[p3]}`);
    expect(brief).toContain(LEGACY.detail.text);
    expect(brief).not.toContain('undefined');
  });

  it('新记录盘面事实含颜色/六神', () => {
    const fresh = xiaoliurenCalc('time', 8, 16, 6);
    const brief = chartBrief('xiaoliuren', fresh);
    expect(brief).toContain(XLR[fresh.name].color);
    expect(brief).toContain('临' + XLR[fresh.name].shen);
    expect(brief).not.toContain('undefined');
  });

  it('三宫推导与引擎内部实现同源（同一函数，无第二套算法）', () => {
    for (let a = 1; a <= 12; a += 3) {
      for (let b = 1; b <= 30; b += 7) {
        for (let c = 1; c <= 12; c += 5) {
          const fromHelper = xiaoliurenGong(a, b, c).gong;
          const fromEngine = xiaoliurenCalc('num', 1, 1, 0, a, b, c).gong!;
          expect(fromEngine).toEqual(fromHelper);
        }
      }
    }
  });

  it('两条真实旧记录：复算三宫的人宫 === 存档掌诀名（自洽）', () => {
    for (const rec of [LEGACY, LEGACY2]) {
      const { p3 } = xiaoliurenGong(rec.a, rec.b, rec.c);
      expect(XLR_ORDER[p3], `a=${rec.a} b=${rec.b} c=${rec.c}`).toBe(rec.name);
      render(<XiaoliurenResult data={rec} />);
      expect(document.body.textContent || '').toContain(`人宫（时落·结果）${rec.name}`);
      expect(document.body.textContent).not.toContain('undefined');
    }
  });

  it('真实旧记录样本（若本地库存在）可解析且缺 gong', () => {
    // 本地库为运行时数据（不入库）：存在则抽样核对，不存在则跳过实质断言
    const dbFile = path.join(process.cwd(), 'server/data/guanwei.db');
    if (!fs.existsSync(dbFile)) return;
    let DatabaseSync: any;
    try { DatabaseSync = require('node:sqlite').DatabaseSync; } catch { return; }
    const db = new DatabaseSync(dbFile, { readOnly: true });
    try {
      const rows = db.prepare("SELECT result_raw_json FROM divinations WHERE art_id='xiaoliuren' ORDER BY created_at ASC LIMIT 5").all();
      for (const row of rows) {
        const raw = JSON.parse(row.result_raw_json);
        const gong = raw.gong ?? xiaoliurenGong(raw.a, raw.b, raw.c).gong;
        expect(XLR_ORDER).toContain(gong.ren.name);
        expect(chartBrief('xiaoliuren', raw)).toContain(gong.ren.name);
      }
    } finally { db.close(); }
  });
});
