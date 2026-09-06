// 九术排盘统一调度：artId + inputs → resultRaw
// 唯一算法副本（divine 路由 / packages/guanwei-api / MCP / 未来托管共用，禁止各层另写 switch）
import { baziCalc } from './bazi.js';
import { ziweiCalc } from './ziwei.js';
import { astrologyCalc } from './astrology.js';
import { qimenCalc } from './qimen.js';
import { meihuaCalc } from './meihua.js';
import { liuyaoCalc } from './liuyao.js';
import { liurenCalc } from './liuren.js';
import { xiaoliurenCalc } from './xiaoliuren.js';
import { tarotDraw } from './tarot.js';
import { allTarotSpreads } from '../data/tarotSpreads.js';

export const CHART_ARTS = ['bazi', 'ziwei', 'astrology', 'qimen', 'meihua', 'liuyao', 'liuren', 'xiaoliuren', 'tarot'] as const;
export type ChartArtId = typeof CHART_ARTS[number];

/**
 * 九术排盘（纯函数）：artId + inputs → resultRaw
 * 抛错：未知术名 / 输入不合法 → Error（调用方转 400）
 */
export function chartCalc(artId: string, inputs: any): unknown {
  switch (artId) {
    case 'bazi': {
      const i = inputs || {};
      if (i.y == null || i.m == null || i.d == null) throw new Error('BaziInput 需 y/m/d');
      return baziCalc({ y: i.y, m: i.m, d: i.d, hourIndex: i.hourIndex, time: i.time, gender: i.gender, location: i.location });
    }
    case 'ziwei': {
      const i = inputs || {};
      return ziweiCalc({ ganzhi: i.ganzhi, month: i.month, day: i.day, hour: i.hour, time: i.time, location: i.location, gender: i.gender, birthYear: i.birthYear });
    }
    case 'astrology': {
      const i = inputs || {};
      return astrologyCalc(i.y, i.m, i.d, i.hour || 0, i.min || 0, i.lng, i.lat);
    }
    case 'qimen': {
      return qimenCalc({ datetime: inputs?.datetime ? new Date(inputs.datetime) : new Date() });
    }
    case 'meihua': {
      const i = inputs || {};
      return meihuaCalc({ mode: i.mode || 'time', n1: i.n1, n2: i.n2, n3: i.n3, now: i.now ? new Date(i.now) : undefined });
    }
    case 'liuyao': {
      const now = new Date();
      return liuyaoCalc(undefined, { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
    }
    case 'liuren': {
      return liurenCalc(inputs?.datetime ? new Date(inputs.datetime) : new Date());
    }
    case 'xiaoliuren': {
      const i = inputs || {};
      return xiaoliurenCalc(i.mode || 'time', i.m, i.d, i.h, i.n1, i.n2, i.n3);
    }
    case 'tarot': {
      const i = inputs || {};
      const cards = tarotDraw(Math.max(1, i.n || 3));
      const spread = allTarotSpreads().find((s: any) => s.id === i.spread) || allTarotSpreads()[0];
      return { spread: spread || { id: 'three', name: '圣三角', description: '', positions: [] }, cards };
    }
    default:
      throw new Error('术无此名: ' + artId);
  }
}

/** 每术输入参数说明（/v1/arts 能力清单用） */
export const CHART_INPUT_SCHEMA: Record<string, Record<string, string>> = {
  bazi: { y: '公历年', m: '公历月', d: '公历日', hourIndex: '时辰 0-11（0=子）', gender: '男/女', location: '{lng,lat,province,city,district}' },
  ziwei: { ganzhi: '年干支', month: '农历月', day: '农历日', hour: '时辰 0-11', gender: '男/女', location: '{lng,lat}' },
  astrology: { y: '公历年', m: '月', d: '日', hour: '时 0-23', min: '分', lng: '经度', lat: '纬度' },
  qimen: { datetime: '起局时刻 ISO 字符串' },
  meihua: { mode: 'time|number', n1: '报数1', n2: '报数2', n3: '报数3' },
  liuyao: {},
  liuren: { datetime: '起课时刻 ISO 字符串' },
  xiaoliuren: { mode: 'time', m: '农历月', d: '农历日', h: '时辰 0-11' },
  tarot: { n: '抽牌数（默认3）', spread: '牌阵 id' },
};
