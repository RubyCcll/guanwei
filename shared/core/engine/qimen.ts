// 奇门遁甲：九宫起局（节气定阴阳遁 · 拆补法定三元 · 时干支定旬首）
// 定局法（2026-09 对齐权威）：拆补法——以精确交节时刻为界，距交节每 5 天一换元
// （0-4 天上元 / 5-9 中元 / 10-14 下元，严格按时刻，不涉符头/置闰）
import { GAN, ZHI, mod } from '../data/ganzhi';
import { QM_SEASONS, QM_STARS, QM_MEN } from '../data/qimen';
import { daysSince, currentJieqiNameExact, getJieQiTableExact, beijingMs } from './calendar';
import type { QimenInput, QimenResult } from '../types';


export function qimenCalc(input: QimenInput): QimenResult {
  const d = input.datetime instanceof Date ? input.datetime : new Date(input.datetime);
  const h = d.getHours();
  // 原始日（节气/拆补基准，**不可**随夜子时前移，否则距交节天数多算一天、三元错位）
  const jy = d.getFullYear(), jm = d.getMonth() + 1, jd = d.getDate();
  // 夜子时（23:00-23:59）归次日：仅「日柱」进一日，否则时柱五鼠遁用错日干、整盘（值符/值使/五层）全错
  // 2026-09 修 P0：与 qimen-dunjia 对拍，h=23 时 336/336 天日柱不一致
  const dEff = h === 23 ? new Date(d.getTime() + 86400000) : d;
  const y = dEff.getFullYear(), m = dEff.getMonth() + 1, day = dEff.getDate();
  /* 日干支 */
  const dIdx = mod(daysSince(y, m, day) + 55, 60);
  const dayGZ = GAN[dIdx % 10] + ZHI[dIdx % 12];
  /* 时干支 */
  const hourIndex = Math.floor(((h + 1) % 24) / 2);
  const dgIdx = GAN.indexOf(dayGZ[0] as any);
  const hgIdx = mod((dgIdx % 5) * 2 + hourIndex, 10);
  const hourGZ = GAN[hgIdx] + ZHI[hourIndex];
  /* 当前节气（时刻级：交节当天按钟表时刻切换）→ 阴阳遁 */
  const _t = beijingMs(jy, jm, jd, h);                       // 原始时刻（节气基准）
  const jqName = currentJieqiNameExact(jy, jm, jd, h);
  const season = QM_SEASONS.find(s => s.name === jqName);
  if (!season) throw new Error('节气未找到: ' + jqName);
  const yin = season.yin;
  /* 拆补定元：距交节时刻的天数 /5 分段（0-4 上元 5-9 中元 10-14 下元） */
  let jqTime = -Infinity;
  for (const yy of [jy - 1, jy, jy + 1]) {
    for (const jq of getJieQiTableExact(yy)) {
      if (jq.name === jqName) {
        const tt = jq.time.getTime();
        if (tt <= _t && tt > jqTime) jqTime = tt;
      }
    }
  }
  if (jqTime === -Infinity) throw new Error('交节时刻未找到: ' + jqName);
  const daysDiff = (_t - jqTime) / 86400000;
  const xun = daysDiff < 5 ? 0 : daysDiff < 10 ? 1 : 2;
  const ju = season.ju[xun];
  /* 旬首六仪（按时干支真实旬首：时干支序号 → 所在旬 → 六仪） */
  const gzIdx = mod((GAN.indexOf(hourGZ[0] as any) - ZHI.indexOf(hourGZ[1] as any)) * 6 + ZHI.indexOf(hourGZ[1] as any), 60);
  const xunStart = Math.floor(gzIdx / 10) * 10;               // 旬首干支序号（甲子=0 甲戌=10 …）
  const xunShouZhi = ZHI[xunStart % 12];
  const xunshouMap: Record<string, string> = { 子: '戊', 戌: '己', 申: '庚', 午: '辛', 辰: '壬', 寅: '癸' };
  const xunShou = xunshouMap[xunShouZhi];                     // 旬首六仪（甲子戊 甲戌己 …）
  const xunshouName = '甲' + xunShouZhi;
  /* 地盘布奇仪：阳遁顺布（1→8→3→4→9→2→7→6→中5），阴遁逆布 */
  const qiyiOrder = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
  const yiAt: Record<number, string> = {};
  const pan: QimenResult['pan'] = {};
  for (let i = 0; i < 9; i++) {
    const palace = yin ? mod(ju - 1 - i, 9) + 1 : mod(ju - 1 + i, 9) + 1;
    yiAt[palace] = qiyiOrder[i];
    pan[palace] = { yi: qiyiOrder[i], men: '', star: '' };
  }
  /* 值符宫/星、值使门：旬首六仪（符首）所在宫之原九星八门 */
  const zfPalaceDi = Number(Object.keys(yiAt).find(p => yiAt[Number(p)] === xunShou) || 1); // 地盘符首宫
  const zfStar = QM_STARS[zfPalaceDi - 1];
  const zsMen = zfPalaceDi === 5 ? '死' : QM_MEN[zfPalaceDi - 1]; // 符首入中：值使寄坤（死门）
  // 时干（甲遁：时干为甲则用旬首六仪代表值符/值使所随）
  const tianGan = hourGZ[0] === '甲' ? xunShou : hourGZ[0];
  const flyStep = mod(gzIdx - xunStart, 10); // 旬内第几时（0 起）

  /* ── 转盘五层（对齐 qimen-dunjia：《遁甲演義/統宗》口径）──
     九宫方位序 idx（巽0 离1 坤2 震3 中4 兑5 艮6 坎7 乾8）对应宫号：
     巽4 离9 坤2 震3 中5 兑7 艮8 坎1 乾6 */
  const IDX_TO_PALACE = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  const PALACE_TO_IDX: Record<number, number> = { 4: 0, 9: 1, 2: 2, 3: 3, 5: 4, 7: 5, 8: 6, 1: 7, 6: 8 };
  const idxYi = IDX_TO_PALACE.map(p => yiAt[p]);           // 地盘奇仪（idx 序）
  const norm = (i: number) => (i === 4 ? 2 : i);            // 中宫寄坤
  const seqFrom = (fly: number[], start: number) => {
    const k = fly.indexOf(start);
    return [...fly.slice(k), ...fly.slice(0, k)];
  };
  // 外八宫环（idx）：顺=巽→离→坤→兑→乾→坎→艮→震；逆反之
  const RING_CW = [0, 1, 2, 5, 8, 7, 6, 3];
  const RING_CCW = [0, 3, 6, 7, 8, 5, 2, 1];
  // 值使飞布轨迹（含中，idx）：阳=宫号 1→9 顺，阴=逆
  const FLY_DOOR_YANG = [7, 2, 3, 0, 4, 8, 5, 6, 1];
  const FLY_DOOR_YIN = [7, 1, 6, 5, 8, 4, 0, 3, 2];
  const DOOR_SEQ = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];
  const STAR_IDX = ['天辅', '天英', '天芮', '天冲', '天禽', '天柱', '天任', '天蓬', '天心']; // idx 序原星
  // 刚性旋转：外八宫沿环使 fromIdx 移 toIdx；中宫原位
  const rotate = (src: string[], fromIdx: number, toIdx: number): string[] => {
    const f = norm(fromIdx), t = norm(toIdx);
    const getSeq = seqFrom(RING_CW, f);
    const putSeq = seqFrom(RING_CW, t);
    const out = new Array(9).fill('') as string[];
    for (let i = 0; i < 8; i++) out[putSeq[i]] = src[getSeq[i]];
    out[4] = src[4];
    return out;
  };

  /* 天盘奇仪：地盘旋转，符首 → 时干宫 */
  const tianYiIdx = rotate(idxYi, idxYi.indexOf(xunShou), idxYi.indexOf(tianGan));
  /* 天盘九星：原星盘旋转，值符星 → 时干宫（天禽恒居中） */
  const starIdx = rotate(STAR_IDX, PALACE_TO_IDX[zfPalaceDi], idxYi.indexOf(tianGan));
  /* 值使落宫：自符首宫沿轨迹飞 flyStep 步（阳顺阴逆）；值使门落宫（中→寄坤） */
  const zsTargetRaw = seqFrom(yin ? FLY_DOOR_YIN : FLY_DOOR_YANG, idxYi.indexOf(xunShou))[flyStep % 9];
  const zsPalace = IDX_TO_PALACE[norm(zsTargetRaw)];
  /* 八门转布：值使门落 zsTarget 起，其余门沿外环顺布（门序 休生伤杜景死惊开 刚性转） */
  const menIdx = new Array(9).fill('') as string[];
  {
    const k = DOOR_SEQ.indexOf(zsMen);
    const doorOrder = [...DOOR_SEQ.slice(k), ...DOOR_SEQ.slice(0, k)];
    const putSeq = seqFrom(RING_CW, norm(zsTargetRaw));
    for (let i = 0; i < 8; i++) menIdx[putSeq[i]] = doorOrder[i];
  }
  /* 八神：值符神落时干宫；阳遁（勾陈/朱雀序）顺布、阴遁（白虎/玄武序）逆布 */
  const SHEN_YANG = ['值符', '腾蛇', '太阴', '六合', '勾陈', '朱雀', '九地', '九天'];
  const SHEN_YIN = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
  const gods = yin ? SHEN_YIN : SHEN_YANG;
  const shenIdx = new Array(9).fill('') as string[];
  {
    const putSeq = seqFrom(yin ? RING_CCW : RING_CW, norm(idxYi.indexOf(tianGan)));
    for (let i = 0; i < 8; i++) shenIdx[putSeq[i]] = gods[i];
  }
  /* 值符落宫（转后）：值符星所在宫（中宫寄坤显示，用 IDX_TO_PALACE[norm]） */
  const zfStarFinalPalace = IDX_TO_PALACE[norm(starIdx.indexOf(zfStar))];
  /* 回填 pan：地盘 yi + 转盘星/门；天盘干与八神 */
  const tianYi: Record<number, string> = {};
  const shen: Record<number, string> = {};
  for (let idx = 0; idx < 9; idx++) {
    const p = IDX_TO_PALACE[idx];
    pan[p].star = starIdx[idx] || '';
    pan[p].men = menIdx[idx] || '';
    tianYi[p] = tianYiIdx[idx];
    shen[p] = shenIdx[idx];
  }
  pan[5].star = '天禽';
  pan[5].men = '';
  shen[5] = '';

  return { yin, ju, jqName, dayGZ, hourGZ, xunShou, xunshouName, zfStar, zsMen, zfPalace: zfStarFinalPalace, pan, zsPalace, tianYi, shen };
}