// 测试辅助：本地计算排盘结果（模拟后端起占，供 fetch mock 使用）
import { baziCalc } from '../../shared/core/engine/bazi';
import { ziweiCalc } from '../../shared/core/engine/ziwei';
import { astrologyCalc } from '../../shared/core/engine/astrology';
import { qimenCalc } from '../../shared/core/engine/qimen';
import { meihuaCalc } from '../../shared/core/engine/meihua';
import { liuyaoCalc } from '../../shared/core/engine/liuyao';
import { liurenCalc } from '../../shared/core/engine/liuren';
import { xiaoliurenCalc } from '../../shared/core/engine/xiaoliuren';
import { tarotDraw } from '../../shared/core/engine/tarot';
import { allTarotSpreads } from '../../shared/core/data/tarotSpreads';

export function localDivineResult(artId: string, inputs: any): unknown {
  switch (artId) {
    case 'bazi': return baziCalc(inputs);
    case 'ziwei': return ziweiCalc(inputs);
    case 'astrology': return astrologyCalc(inputs.y, inputs.m, inputs.d, inputs.hour || 0, inputs.min || 0, inputs.lng, inputs.lat);
    case 'qimen': return qimenCalc({ datetime: inputs.datetime || new Date() });
    case 'meihua': return meihuaCalc({ ...inputs, now: inputs.now ? new Date(inputs.now) : undefined });
    case 'liuyao': return liuyaoCalc();
    case 'liuren': return liurenCalc(inputs.datetime || new Date());
    case 'xiaoliuren': return xiaoliurenCalc(inputs.mode || 'time', inputs.m, inputs.d, inputs.h, inputs.n1, inputs.n2, inputs.n3);
    case 'tarot': { const s = allTarotSpreads().find(x => x.id === inputs.spread) || allTarotSpreads()[0]; return { spread: s, cards: tarotDraw(Math.max(1, inputs.n || 3)) }; }
    default: return {};
  }
}

// 组装 fetch mock：拦截 /api/divine（POST 起占）与 /api/divine?...（历史）
export function installDivineFetchMock(origFetch: typeof fetch): typeof fetch {
  return ((url: any, opts: any) => {
    const u = String(url);
    if (u.includes('/api/divine') && opts?.method !== 'DELETE') {
      if (opts?.method === 'POST') {
        const body = JSON.parse(opts.body);
        const resultRaw = localDivineResult(body.artId, body.inputs || {});
        return Promise.resolve(new Response(JSON.stringify({ ok: true, divineId: 'd_test_' + body.artId, resultRaw }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      // GET 历史
      return Promise.resolve(new Response(JSON.stringify({ list: [], total: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    if (u.includes('/api/health')) {
      return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    }
    return origFetch(url, opts);
  }) as typeof fetch;
}