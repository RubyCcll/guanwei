import { astrologyCalc } from '../../shared/core/engine/astrology.ts';
const r = astrologyCalc(1990, 6, 15, 12, 0, 116.4, 39.9);
console.log('上升:', r.ascSign, r.asc.toFixed(2), '| 太阳:', r.sunSign, '| 月亮:', r.moonSign);
console.log('宫位制:', r.houseSystem);
console.log('行星详情:');
for (const p of r.planetDetails) {
  console.log(' ', p.cn, p.sign, p.degree.toFixed(1) + '°', '落' + p.house + '宫', p.retrograde ? '(逆)' : '', p.dignity.status ? '[' + p.dignity.status + ']' : '');
}
console.log('十二宫(1-6):', r.houses.slice(0, 6).map(h => h.num + '宫' + h.sign + '(主' + h.ruler + ')').join(' '));
