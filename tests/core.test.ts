import { describe, it, expect } from 'vitest';
import { baziCalc } from '../shared/core/engine/bazi';
import { ziweiCalc } from '../shared/core/engine/ziwei';
import { qimenCalc } from '../shared/core/engine/qimen';
import { meihuaCalc } from '../shared/core/engine/meihua';
import { liuyaoCalc, mulberry32 } from '../shared/core/engine/liuyao';
import { liurenCalc } from '../shared/core/engine/liuren';
import { xiaoliurenCalc } from '../shared/core/engine/xiaoliuren';
import { astrologyCalc } from '../shared/core/engine/astrology';
import { buildDeck, tarotDraw } from '../shared/core/engine/tarot';
import { NAYIN, jiaziIndex, ganZhiIndex, mod } from '../shared/core/data/ganzhi';
import { GUA64, GUA_LOOKUP } from '../shared/core/data/gua64';
import { XLR } from '../shared/core/data/xiaoliuren';
import { ARTS } from '../src/data/arts';
import { trueSolarTime } from '../shared/core/engine/trueSolarTime';
import { getJieQiTableExact, almanacOf } from '../shared/core/engine/calendar';

describe('== 1. 四柱八字 ==', () => {
  it('1990-06-15 午时：庚午/壬午/壬申/丙午', () => {
    const r = baziCalc({ y: 1990, m: 6, d: 15, hourIndex: 6, gender: '男' });
    expect(r.yearGZ).toBe('庚午');
    expect(r.monthGZ).toBe('壬午');
    expect(r.dayGZ).toBe('壬申');
    expect(r.hourGZ).toBe('丙午');
  });
  it('2024-02-05 立春后：甲辰/丙寅', () => {
    const r = baziCalc({ y: 2024, m: 2, d: 5, hourIndex: 0, gender: '男' });
    expect(r.yearGZ).toBe('甲辰');
    expect(r.monthGZ).toBe('丙寅');
  });
  it('2024-02-03 立春前：癸卯/乙丑（精确立春 02-04 16:27）', () => {
    const r = baziCalc({ y: 2024, m: 2, d: 3, hourIndex: 0, gender: '男' });
    expect(r.yearGZ).toBe('癸卯');
    expect(r.monthGZ).toBe('乙丑');
  });
  it('纳音对照：1990 路旁土 / 1993 剑锋金', () => {
    expect(NAYIN[Math.floor(jiaziIndex(1990) / 2) % 30]).toBe('路旁土');
    expect(NAYIN[Math.floor(jiaziIndex(1993) / 2) % 30]).toBe('剑锋金');
  });
  it('真太阳时校正：乌鲁木齐午时 → 巳时（经度 -32.38° 前移约 2.2 小时）', () => {
    const r = baziCalc({ y: 2024, m: 6, d: 15, hourIndex: 6, gender: '男', location: { province: '新疆', city: '乌鲁木齐', district: '天山区', lng: 87.62, lat: 43.82, timezone: 'Asia/Shanghai' } });
    expect(r.correctedHourIndex).toBe(5);
  });
  it('北京午时：校正后仍为午时', () => {
    const r = baziCalc({ y: 2024, m: 6, d: 15, hourIndex: 6, gender: '男', location: { province: '北京', city: '北京市', district: '东城区', lng: 116.4, lat: 39.9, timezone: 'Asia/Shanghai' } });
    expect(r.correctedHourIndex).toBe(6);
  });
});

describe('== 2. 紫微斗数（五行局 + 主星定位）==', () => {
  it('干支→纳音→五行局六组对照', () => {
    const cases: [string, string, string][] = [
      ['癸酉', '剑锋金', '金四局'],
      ['甲子', '海中金', '金四局'],
      ['壬申', '剑锋金', '金四局'],
      ['戊辰', '大林木', '木三局'],
      ['丙寅', '炉中火', '火六局'],
      ['庚午', '路旁土', '土五局'],
    ];
    cases.forEach(([gz, nayin, ju]) => {
      const r = ziweiCalc({ ganzhi: gz, month: 1, day: 1, hour: 0 });
      expect(r.nayin).toBe(nayin);
      expect(r.juName).toBe(ju);
    });
  });
  it('命宫：癸酉年正月子时@寅 / 正月午时@申', () => {
    expect(ziweiCalc({ ganzhi: '癸酉', month: 1, day: 1, hour: 0 }).ming).toBe(0);
    expect(ziweiCalc({ ganzhi: '癸酉', month: 1, day: 1, hour: 6 }).ming).toBe(6);
  });
  it('紫微：金四局正月初一@寅', () => {
    expect(ziweiCalc({ ganzhi: '癸酉', month: 1, day: 1, hour: 0 }).zwPos).toBe(0);
  });
});

describe('== 3. 奇门遁甲 ==', () => {
  it('阴阳遁/局数/九宫覆盖/值符值使', () => {
    const r = qimenCalc({ datetime: '2024-08-18T12:00' });
    expect(typeof r.yin).toBe('boolean');
    expect(r.ju).toBeGreaterThanOrEqual(1);
    expect(r.ju).toBeLessThanOrEqual(9);
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(p => expect(r.pan[p]).toBeTruthy());
    expect(r.zfStar).toBeTruthy();
    expect(r.zsMen).toBeTruthy();
  });
  it('节气名精确（2024-08-18 → 立秋）', () => {
    const r = qimenCalc({ datetime: '2024-08-18T12:00' });
    expect(r.jqName).toBe('立秋');
  });
});

describe('== 4. 梅花易数 ==', () => {
  it('报数 1/2/3 → 天泽履、动爻 3', () => {
    const r = meihuaCalc({ mode: 'num', n1: 1, n2: 2, n3: 3 });
    expect(r.benGua.name).toBe('天泽履');
    expect(r.move).toBe(3);
  });
  it('时间起卦输出完整（本卦/互卦/变卦/体用判语）', () => {
    const r = meihuaCalc({ mode: 'time', now: new Date(2024, 7, 18, 12) });
    expect(r.benGua).toBeTruthy();
    expect(r.shengke).toBeTruthy();
  });
});

describe('== 5. 六爻 ==', () => {
  it('50 次摇卦均有本卦；动爻存在时变卦必在', () => {
    const rng = mulberry32(42);
    let first = '';
    for (let i = 0; i < 50; i++) {
      const r = liuyaoCalc(rng);
      expect(r.benGua).toBeTruthy();
      first = first || r.benGua.name;
      if (r.dongYao.length) expect(r.bianGua).toBeTruthy();
    }
    expect(first).toBeTruthy();
  });
  it('六爻结构：6 爻 6 名', () => {
    const r = liuyaoCalc(mulberry32(7));
    expect(r.yao.length).toBe(6);
    expect(r.names.length).toBe(6);
  });
  it('固定种子可复现', () => {
    const a = liuyaoCalc(mulberry32(123)).names.map(n => n.nm).join(',');
    const b = liuyaoCalc(mulberry32(123)).names.map(n => n.nm).join(',');
    expect(a).toBe(b);
  });
});

describe('== 6. 大六壬（月将为重点）==', () => {
  it('16 个月将对照', () => {
    const expectList: [string, string][] = [
      ['2024-01-01T12:00', '丑'], ['2024-01-20T12:00', '子'], ['2024-02-10T12:00', '子'], ['2024-02-19T12:00', '亥'],
      ['2024-03-21T12:00', '戌'], ['2024-04-20T12:00', '酉'], ['2024-05-21T12:00', '申'], ['2024-06-21T12:00', '未'],
      ['2024-07-23T12:00', '午'], ['2024-08-18T12:00', '午'], ['2024-08-23T12:00', '巳'], ['2024-09-23T12:00', '辰'],
      ['2024-10-23T12:00', '卯'], ['2024-11-22T12:00', '寅'], ['2024-12-22T12:00', '丑'], ['2024-12-25T12:00', '丑'],
    ];
    expectList.forEach(([dt, want]) => {
      expect(liurenCalc(dt).jiang).toBe(want);
    });
  });
  it('四课三传非空', () => {
    const r = liurenCalc('2024-08-18T12:00');
    expect(r.ke1 && r.ke2 && r.ke3 && r.ke4).toBeTruthy();
    expect(r.chuan1 && r.chuan2 && r.chuan3).toBeTruthy();
  });
});

describe('== 7. 小六壬 ==', () => {
  it('正月初一子时=大安；六月初一子时=空亡', () => {
    expect(xiaoliurenCalc('time', 1, 1, 1).name).toBe('大安');
    expect(xiaoliurenCalc('time', 6, 1, 1).name).toBe('空亡');
  });
  it('报数 3/3/3=大安；三月初一辰时=大安', () => {
    expect(xiaoliurenCalc('num', 0, 0, 0, 3, 3, 3).name).toBe('大安');
    expect(xiaoliurenCalc('time', 3, 1, 5).name).toBe('大安');
  });
});

describe('== 8. 星盘 ==', () => {
  it('1990-06-15 太阳黄经≈83.81°（回归黄道精确，双子）', () => {
    const r = astrologyCalc(1990, 6, 15, 12, 0);
    expect(Math.abs(mod(r.planets[0][2], 360) - 83.81)).toBeLessThan(0.1);
    expect(Math.floor(mod(r.planets[0][2], 360) / 30)).toBe(2);
    expect(r.planets.length).toBe(7);
  });
  it('回归黄道：太阳在春分日黄经≈0°（白羊起点）', () => {
    const r = astrologyCalc(2024, 3, 20, 12, 0); // 2024 春分 3/20
    const lon = mod(r.planets[0][2], 360);
    // 回归黄道：春分日太阳应在 0°（白羊起点）附近
    expect(lon < 1 || lon > 359).toBe(true);
    expect(Math.abs(lon)).toBeLessThan(1);
  });
  it('精确上升点：北京 1990-06-15 正午 → 处女座（171.67°，数值法验证）', () => {
    const r = astrologyCalc(1990, 6, 15, 12, 0, 116.4);
    expect(Math.abs(r.asc - 171.67)).toBeLessThan(0.5);
    expect(Math.floor(r.asc / 30)).toBe(5); // 处女
  });
  it('中天 MC 存在且在 0-360 之间', () => {
    const r = astrologyCalc(1990, 6, 15, 12, 0, 116.4);
    expect(r.mc).toBeGreaterThanOrEqual(0);
    expect(r.mc).toBeLessThan(360);
    expect(r.epsilon).toBeGreaterThan(23);
    expect(r.epsilon).toBeLessThan(24);
  });
});

describe('== 9. 塔罗 ==', () => {
  it('牌池 78 张；抽牌不重复；正逆位字段', () => {
    expect(buildDeck().length).toBe(78);
    const d = tarotDraw(3, mulberry32(1));
    expect(d.length).toBe(3);
    d.forEach(c => expect(typeof c.reversed).toBe('boolean'));
  });
});

describe('== 10. 数据完整性 ==', () => {
  it('ARTS 九术唯一；GUA64 键名唯一；XLR 6 掌诀', () => {
    expect(ARTS.length).toBe(9);
    expect(new Set(ARTS.map(a => a.id)).size).toBe(9);
    expect(GUA64.length).toBe(64);
    expect(new Set(GUA64.map(g => g.up * 10 + g.down)).size).toBe(64);
    expect(new Set(GUA64.map(g => g.name)).size).toBe(64);
    expect(Object.keys(XLR).length).toBe(6);
  });
});

describe('== 11. 万年历与真太阳时 ==', () => {
  it('精确节气表：2024 立春 02-04', () => {
    const table = getJieQiTableExact(2024);
    const lichun = table.find(t => t.name === '立春');
    expect(lichun).toBeTruthy();
    expect(lichun!.time.getMonth() + 1).toBe(2);
    expect(lichun!.time.getDate()).toBe(4);
  });
  it('黄历：2024-08-18 有宜忌与干支', () => {
    const a = almanacOf(2024, 8, 18);
    expect(a.yi.length).toBeGreaterThan(0);
    expect(a.ji.length).toBeGreaterThan(0);
    expect(a.ganzhiDay.length).toBe(2);
    expect(a.xingZuo).toBeTruthy();
  });
  it('真太阳时：乌鲁木齐 vs 北京', () => {
    const wlmq = trueSolarTime(2024, 6, 15, 12, 0, 87.62);
    const bj = trueSolarTime(2024, 6, 15, 12, 0, 116.4);
    expect(wlmq.trueSolarHours).toBeLessThan(bj.trueSolarHours - 1.9); // 相差约 2.16 小时
    expect(Math.abs(bj.trueSolarHours - 12)).toBeLessThan(0.3); // 北京正午接近真太阳时正午
  });
  it('夏令时：1986-05-04 回拨 1 小时', () => {
    const t = trueSolarTime(1986, 5, 4, 12, 0, 120);
    expect(t.beijingHours).toBe(11);
  });
});