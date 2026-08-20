// divineStore 冒烟测试（tsx 直跑）
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, '..', 'data', 'test-guanwei.db');
process.env.GUANWEI_DB_FILE = TMP;
try { fs.unlinkSync(TMP); } catch {}

// 动态 import（divineStore 需支持 env 覆盖路径——这里直接 import 后测真实路径，测完清理）
const store = await import('../src/services/divineStore.js');
let pass = 0, fail = 0;
const t = (name: string, fn: () => boolean | void) => {
  try { const r = fn(); if (r === false) throw new Error('assert false'); pass++; console.log('✓', name); }
  catch (e: any) { fail++; console.log('✗', name, '→', e.message); }
};

t('创建起占记录并回读', () => {
  const rec = store.createDivination({ username: '程程', artId: 'liuyao', kind: 'zhanwen', question: '最近工作顺利吗？', profile: { birthDate: '1995-06-15' }, params: {}, resultRaw: { yao: [0, 1, 0, 1, 1, 0] } });
  if (!/^d_/.test(rec.id)) throw new Error('id 格式错误: ' + rec.id);
  const got = store.getDivination(rec.id);
  if (!got || got.username !== '程程') throw new Error('回读失败');
  if (JSON.stringify(got.resultRaw.yao) !== '[0,1,0,1,1,0]') throw new Error('resultRaw 不一致');
});

t('attachReport 回写（ok 入库）', () => {
  const rec = store.createDivination({ username: '程程', artId: 'bazi', kind: 'mingpan', params: {}, resultRaw: { yearGZ: '乙亥' } });
  const report = { kind: 'mingpan', title: '测试报告', overview: '总述', rawReading: { summary: '原始', keyPoints: [] }, advice: '建议', conclusion: '结语', disclaimer: '免责' };
  const ok = store.attachReport(rec.id, report, 'ok');
  if (!ok) throw new Error('attach 失败');
  const got = store.getDivination(rec.id);
  if (got!.report?.title !== '测试报告' || got!.status !== 'ai_done') throw new Error('报告未入库');
});

t('markAiFailed 不入报告但留档', () => {
  const rec = store.createDivination({ username: '程程', artId: 'tarot', kind: 'zhanwen', params: {}, resultRaw: {} });
  store.markAiFailed(rec.id, 'tarot', 'zhanwen', '质量评分未达标', '{"bad json');
  const got = store.getDivination(rec.id);
  if (got!.report !== null || got!.status !== 'ai_poor' || got!.reportQuality !== 'poor') throw new Error('fail 状态错误');
});

t('listDivinations 分页倒序 + hasReport', () => {
  const r1 = store.createDivination({ username: '程程', artId: 'qimen', kind: 'zhanwen', question: 'A', params: {}, resultRaw: {} });
  const r2 = store.createDivination({ username: '程程', artId: 'liuren', kind: 'zhanwen', question: 'B', params: {}, resultRaw: {} });
  store.attachReport(r1.id, { title: 'x' }, 'ok');
  const page = store.listDivinations('程程', 1, 10);
  if (page.list[0].divineId !== r2.id) throw new Error('非倒序');
  const it = page.list.find((x: any) => x.divineId === r1.id);
  if (!it || it.hasReport !== true) throw new Error('hasReport 错误');
});

t('deleteDivination 校验归属', () => {
  const rec = store.createDivination({ username: '程程', artId: 'meihua', kind: 'zhanwen', params: {}, resultRaw: {} });
  if (store.deleteDivination(rec.id, '别人') !== false) throw new Error('他人可删');
  if (store.deleteDivination(rec.id, '程程') !== true) throw new Error('本人删除失败');
  if (store.getDivination(rec.id) !== null) throw new Error('删除后仍存在');
});

// 清理测试库
try { fs.unlinkSync(TMP); } catch {}
console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail > 0 ? 1 : 0);