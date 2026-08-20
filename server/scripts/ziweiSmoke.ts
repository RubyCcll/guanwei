import { ziweiCalc } from '../../shared/core/engine/ziwei.ts';
import { Solar } from 'lunar-typescript';
// 公历 1990-06-15 12:00 → 农历
const solar = Solar.fromYmd(1990, 6, 15);
const lunar = solar.getLunar();
const gz = lunar.getYearInGanZhi();
const lm = Math.abs(lunar.getMonth()), ld = lunar.getDay();
console.log('农历:', lunar.toString(), '| 年干支:', gz, '| 月:', lm, '日:', ld);
const r = ziweiCalc({ ganzhi: gz, month: lm, day: ld, hour: 6, gender: '男', birthYear: 1990 });
console.log('命宫:', ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'][r.ming], '| 身宫:', ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'][r.shen], '| 五行局:', r.juName);
console.log('主星:', Object.entries(r.zwStars).map(([s, p]) => s + '@' + ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'][p]).join(' '));
console.log('亮度(命宫侧):', Object.entries(r.brightness).filter(([s]) => ['紫微','太阳','太阴','贪狼','破军','七杀'].includes(s)).map(([s, b]) => s + b).join(' '));
console.log('辅星:', Object.entries(r.fuStars).map(([s, p]) => s + '@' + ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'][p]).join(' '));
console.log('四化:', JSON.stringify(r.sihua), '| 四化落宫:', JSON.stringify(r.sihuaPos));
console.log('格局:', r.geju.map(g => g.name + '(' + g.ji + ')[' + g.why + ']').join('; ') || '无');
