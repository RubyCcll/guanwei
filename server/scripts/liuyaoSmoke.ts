import { liuyaoCalc, mulberry32 } from '../../shared/core/engine/liuyao.ts';
const r = liuyaoCalc(mulberry32(42), { y: 2024, m: 1, d: 15 });
console.log('本卦:', r.benGua.name, '→ 变卦:', r.bianGua.name, '| 动爻:', r.dongYao);
if (r.najia) {
  console.log('卦宫:', r.najia.gong, '| 日:', r.najia.dayGZ, '| 月支:', r.najia.monthZhi, '| 世:', r.najia.shiPos, '应:', r.najia.yingPos, '世爻六亲:', r.najia.shiLiQin);
  console.log('月破:', r.najia.yuePo, '| 旬空:', r.najia.xunKong);
  r.najia.lines.forEach((l, i) => {
    console.log(' ', i + 1 + '爻', l.gz, l.liuqin, l.shen, l.isShi ? '[世]' : '', l.isYing ? '[应]' : '', l.kong ? '[旬空]' : '');
  });
}
