// 中西合参（塔罗 + 东术交叉印证）：五术一律调用 shared/core 的**单一引擎**。
//
// 2026-09-26 重写：原实现是各术的「演示级」近似，含多处基础性错误——
//   · 小六壬：拿**公历**月+日+钟点直接取模（既非「大安起月·月上起日·日上起时」，也没转农历/时辰序），
//     且自带了第二份六宫表（留连方位、小吉五行、空亡主数均与引擎表不同 → 两处数据互相矛盾）
//   · 六爻：用时间戳做伪随机，卦名表只覆盖 16 组，其余落到 `卦象<key>`；无纳甲/六亲/世应
//   · 梅花：把「时钟时/分」当卦序取卦（`(hour+1)%8` 还会取到下标 8 → undefined），无动爻/互变/体用
//   · 六壬：把十二天将当地盘（地盘本为十二地支），未用月将/贵人/四课三传
//   · 奇门：按钟点取八门九星，未走定局/值符值使
// 现全部改为调用 shared/core 引擎（前后端同一算法副本），并去掉重复数据表。
import { Solar } from 'lunar-typescript';
import { meihuaCalc } from '@core/engine/meihua';
import { liuyaoCalc } from '@core/engine/liuyao';
import { liurenCalc } from '@core/engine/liuren';
import { qimenCalc } from '@core/engine/qimen';
import { xiaoliurenCalc } from '@core/engine/xiaoliuren';
import { ZHI } from '@core/data/ganzhi';
import type { ComboResult } from '@/types';

/** 当下 → 农历月/日 + 0-based 时辰序（0=子 … 11=亥），与九术输入口径一致 */
function lunarParts(now: Date) {
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate(), h = now.getHours();
  const lunar = Solar.fromYmdHms(y, m, d, h, now.getMinutes(), 0).getLunar();
  const raw = lunar.getMonth();
  return {
    y, m, d, h,
    lunarMonth: Math.abs(raw) + (raw < 0 && lunar.getDay() > 15 ? 1 : 0),   // 闰月按「作本月」惯例
    lunarDay: lunar.getDay(),
    hourIndex: Math.floor(((h + 1) % 24) / 2),
    lunarText: (raw < 0 ? '闰' : '') + Math.abs(raw) + '月' + lunar.getDay() + '日' + ZHI[Math.floor(((h + 1) % 24) / 2)] + '时',
  };
}

export function generateXiaoLiuRen(now: Date = new Date()): ComboResult {
  const t = lunarParts(now);
  const r = xiaoliurenCalc('time', t.lunarMonth, t.lunarDay, t.hourIndex);
  const { tian, di, ren } = r.gong;
  return {
    method: 'xiaoliuren',
    methodName: '小六壬',
    result: r.name,
    detail: `以当下农历${t.lunarText}掐指：天宫（月落·起因）${tian.name} → 地宫（日落·经过）${di.name} → `
      + `人宫（时落·结果）${ren.name}。占断取人宫${ren.name}：${r.detail.ji}，五行属${r.detail.wx}，方位${r.detail.dir}，主数${r.detail.num}。${r.detail.text}`,
    relationToTarot: ren.name === '大安' || ren.name === '速喜' || ren.name === '小吉'
      ? `人宫${ren.name}为吉占，与塔罗中顺位牌的能量相合，宜顺势推进。`
      : `人宫${ren.name}主滞碍，与塔罗中逆位牌的警示呼应，宜缓图、先安己而后谋事。`,
  };
}

export function generateLiuYao(now: Date = new Date()): ComboResult {
  const t = lunarParts(now);
  const r = liuyaoCalc(Math.random, { y: t.y, m: t.m, d: t.d });
  const najia = r.najia;
  const dong = r.dongYao.map(i => ['初', '二', '三', '四', '五', '上'][i - 1] + '爻').join('、');
  const lines = najia
    ? najia.lines.map((l, i) => ['初', '二', '三', '四', '五', '上'][i] + l.gz + l.liuqin + (l.isShi ? '·世' : l.isYing ? '·应' : '')).join('，')
    : '';
  return {
    method: 'liuyao',
    methodName: '六爻',
    result: dong ? `${r.benGua.name} 之 ${r.bianGua.name}` : r.benGua.name,
    detail: `三枚铜钱摇卦得${r.benGua.name}${dong ? `，动爻${dong} → 变卦${r.bianGua.name}` : '（静卦无动爻）'}。`
      + (najia ? `卦属${najia.gong}，世爻在${['初', '二', '三', '四', '五', '上'][najia.shiPos - 1]}位（${najia.shiLiQin}），应爻在${['初', '二', '三', '四', '五', '上'][najia.yingPos - 1]}位，`
        + `起卦日${najia.dayGZ}、月建${najia.monthZhi}，旬空${najia.xunKong.join('')}、月破${najia.yuePo.join('') || '无'}。${lines}。` : ''),
    relationToTarot: dong
      ? '卦有动爻，事在变化之中——与塔罗牌阵中的转变牌位相呼应，宜就其变而图之。'
      : '此为静卦，事势未动——与塔罗中稳定牌位相应，宜守成待时。',
  };
}

export function generateMeiHua(now: Date = new Date()): ComboResult {
  const t = lunarParts(now);
  const r = meihuaCalc({ mode: 'time', now });
  return {
    method: 'meihua',
    methodName: '梅花易数',
    result: r.bianGua ? `${r.benGua.name} 之 ${r.bianGua.name}` : r.benGua.name,
    detail: `以农历${t.lunarText}起卦（年支数+月+日定上卦，加时辰定下卦与动爻）：本卦${r.benGua.name}、互卦${r.huGua?.name || '—'}、`
      + `变卦${r.bianGua?.name || '—'}，动第${r.move}爻。体卦${r.tiWx}、用卦${r.yongWx}（${r.shengke}）。${r.wangShuaiNote || ''}`,
    relationToTarot: r.shengke.includes('吉')
      ? `梅花体用为「${r.shengke}」，事有助力——与塔罗中正位牌相合，宜顺势推进。`
      : r.shengke.includes('凶')
        ? `梅花体用为「${r.shengke}」，事有阻力——与塔罗中逆位牌呼应，宜缓图慎行。`
        : `体用比和，成败在人为——与塔罗牌阵的中性牌位相应，事在己心。`,
  };
}

export function generateDaLiuRen(now: Date = new Date()): ComboResult {
  const r = liurenCalc(now);
  return {
    method: 'daliuren',
    methodName: '大六壬',
    result: `${r.jiang}将加${r.hourGZ[1]}时 · ${r.keti}`,
    detail: `月将${r.jiang}（${r.jqName}后）、贵人${r.guiRen}；日起${r.dayGZ}、时起${r.hourGZ}。`
      + `四课：${r.ke1}／${r.ke2}／${r.ke3}／${r.ke4}；三传（初·中·末）：${r.chuan1} → ${r.chuan2} → ${r.chuan3}（${r.chuanMethod}）。`,
    relationToTarot: '三传应事之初、中、末：初传对过去牌位，中传对当下牌位，末传对未来趋势——与塔罗时间线互为表里。',
  };
}

export function generateQiMen(now: Date = new Date()): ComboResult {
  const r = qimenCalc({ datetime: now });
  const yi = r.tianYi?.[r.zfPalace] || r.pan[r.zfPalace]?.yi || '';
  return {
    method: 'qimen',
    methodName: '奇门遁甲',
    result: `${r.yin ? '阴' : '阳'}遁${r.ju}局 · ${r.zfStar}临${r.zsMen}`,
    detail: `${r.jqName}后起局，${r.yin ? '阴' : '阳'}遁${r.ju}局；日${r.dayGZ}、时${r.hourGZ}，旬首${r.xunshouName}。`
      + `值符${r.zfStar}落${r.zfPalace}宫${yi ? '（天盘' + yi + '）' : ''}，值使${r.zsMen}门落${r.zsPalace}宫。`
      + `八门九星布宫：${Object.entries(r.pan).filter(([k]) => k !== '5').map(([k, v]) => `${k}宫${v.men}门·${v.star}`).join('，')}。`,
    relationToTarot: '奇门提供方位与时机，塔罗揭示心境与人事——前者为行动指南，后者为内在图景，合参可定进退之机。',
  };
}

/** 按术别取合参结果（now 可注入，便于测试与回放） */
export function generateComboResult(method: string, now: Date = new Date()): ComboResult {
  switch (method) {
    case 'xiaoliuren': return generateXiaoLiuRen(now);
    case 'liuyao': return generateLiuYao(now);
    case 'meihua': return generateMeiHua(now);
    case 'daliuren': return generateDaLiuRen(now);
    case 'qimen': return generateQiMen(now);
    default: return generateXiaoLiuRen(now);
  }
}
