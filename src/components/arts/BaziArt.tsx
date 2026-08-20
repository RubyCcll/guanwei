// 四柱八字：输入面板（含出生地点→真太阳时）+ 结果渲染（四柱/五行/十神）
import { useState } from 'react';
import { baziCalc } from '@core/engine/bazi';
import { SHISHEN_MAP, WUXING } from '@core/data/ganzhi';
import type { BaziResult, GeoLocation } from '@core/types';
import type { UserProfile } from '@/utils/userStore';
import LocationPicker from '@/components/LocationPicker';
import { currentUser } from '@/utils/userStore';
import SongSelect from '@/components/SongSelect';
import DateInput from '@/components/DateInput';
import ProfilePicker from '@/components/ProfilePicker';
import { timeToHourIndex } from '@/data/shichen';
import TimeShichenInput from '@/components/TimeShichenInput';
import { ResultCard } from '@/components/ResultCard';


interface PanelProps { onDivine: (inputs: unknown, profile?: UserProfile, question?: string) => void; }

export function BaziPanel({ onDivine }: PanelProps) {
  const user = currentUser();
  const p = user?.profile;
  const [date, setDate] = useState(p?.birthDate || '1990-06-15');
  const [birthTime, setBirthTime] = useState(p?.birthTime || '12:00');
  const [gender, setGender] = useState<'男' | '女'>(p?.gender || '男');
  const [loc, setLoc] = useState<GeoLocation | null>(p?.location || null);
  const [question, setQuestion] = useState('');

  const filled = p && date === p.birthDate && birthTime === p.birthTime && gender === p.gender && JSON.stringify(loc) === JSON.stringify(p.location);
  const go = () => {
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) return;
    const hourIdx = timeToHourIndex(birthTime);
    onDivine(
      { y, m, d, hourIndex: hourIdx, time: birthTime, gender, location: loc ?? undefined },
      { birthDate: date, birthTime, birthHourIndex: hourIdx, gender, location: loc },
      question.trim()
    );
  };

  return (
    <>
      <ProfilePicker onPick={p => { setDate(p.birthDate); setBirthTime(p.birthTime || '12:00'); setGender(p.gender); setLoc(p.location); }} />
      {user && filled && <p className="hint" style={{ color: 'var(--celadon-deep)', marginTop: 'var(--sp-2)' }}>已依主档案预填（可改，改后以所书为准）</p>}
      <div className="field"><label htmlFor="bz-date">出生日期（公历 / 农历）</label>
        <DateInput id="bz-date" value={date} onChange={setDate} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="bz-time">出生时刻</label>
          <TimeShichenInput id="bz-time" value={birthTime} onChange={setBirthTime} />
        </div>
        <div className="field"><label htmlFor="bz-gender">性别</label>
          <SongSelect id="bz-gender" value={gender} options={[{ value: '男', label: '男' }, { value: '女', label: '女' }]} onChange={v => setGender(v as '男' | '女')} />
        </div>
      </div>
      <div className="field">
        <label>出生地点（真太阳时校正）</label>
        <LocationPicker value={loc} onChange={setLoc} previewHourIndex={timeToHourIndex(birthTime)} />
      </div>
      <div className="field"><label htmlFor="q-input">所问之事（可选）</label>
        <input className="input-line" id="q-input" placeholder="可书所问，AI 报告将由此而发…" maxLength={60} value={question} onChange={e => setQuestion(e.target.value)} />
      </div>
      <button className="btn-divine" onClick={go}>排 盘<span className="small">布四柱 · 观五行 · 推十神</span></button>
      <p className="hint" style={{ marginTop: '.8rem' }}>节气取精确万年历；时柱以出生地经度校正真太阳时。</p>
    </>
  );
}

const WX_NAMES: Record<string, string> = { 木: '木', 火: '火', 土: '土', 金: '金', 水: '水' };
// 干支 → 五行名（用于四柱盘着色与显示）
const wxOf = (gz: string) => WX_NAMES[WUXING[gz[0]]] + WX_NAMES[WUXING[gz[1]]];
const WX_COLOR: Record<string, string> = { 木: '#5E7A4E', 火: '#A5402D', 土: '#7A6A4A', 金: '#8C7A4E', 水: '#3E5F7A' };
const HOURS_CN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export function BaziResult({ data }: { data: BaziResult }) {
  const r = data;
  const pillars = [
    { name: '年柱', gz: r.yearGZ, wx: wxOf(r.yearGZ), ss: r.shishen[0].name, scope: '祖上 · 幼年', isDay: false },
    { name: '月柱', gz: r.monthGZ, wx: wxOf(r.monthGZ), ss: r.shishen[1].name, scope: '父母 · 青年', isDay: false },
    { name: '日柱', gz: r.dayGZ, wx: wxOf(r.dayGZ), ss: '日主', scope: '自身 · 中年', isDay: true },
    { name: '时柱', gz: r.hourGZ, wx: wxOf(r.hourGZ), ss: r.shishen[3].name, scope: '子女 · 暮年', isDay: false },
  ];
  const wxOrder = ['木', '火', '土', '金', '水'];
  const dayWx = r.dayGanWx;
  const sheng = wxOrder[(wxOrder.indexOf(dayWx) + 4) % 5];
  const ke = wxOrder[(wxOrder.indexOf(dayWx) + 2) % 5];
  return (
    <>
      <div className="result-card stagger">
        <h3>四柱命盘 · {r.dayGan}{dayWx}日主</h3>
        <div className="bazi-pan" style={{ marginTop: 'var(--sp-3)' }}>
          {pillars.map(p => (
            <div key={p.name} className={"bz-pillar" + (p.isDay ? ' day-pillar' : '')}>
              <span className="p-zhu">{p.scope}</span>
              <span className="p-name">{p.name} · {p.ss}</span>
              <span className="p-gan" style={{ color: WX_COLOR[WUXING[p.gz[0]]] }}>{p.gz[0]}</span>
              <span className="p-zhi" style={{ color: WX_COLOR[WUXING[p.gz[1]]] }}>{p.gz[1]}</span>
              <span className="p-wx">{p.wx}</span>
              <span className="p-nayin">{r.nayin}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 'var(--sp-3)' }}><strong>日主</strong>为 {r.dayGan}{dayWx}（{r.dayGan}属{dayWx}），以日干为体、月令为纲，四柱推演至此定局。</p>
        {r.trueSolar && <p className="tag-cool">真太阳时校正：{HOURS_CN[r.correctedHourIndex]}时（依出生地经度 {r.trueSolar.localMeanHours.toFixed(2)}h → {r.trueSolar.trueSolarHours.toFixed(2)}h）</p>}
      </div>
      <ResultCard title="五行流转"
        cells={wxOrder.map(k => ({ k: WX_NAMES[k], v: '●'.repeat(Math.max(r.wxCount[k], 0)) + (r.wxCount[k] === 0 ? '空' : '') + ' ×' + r.wxCount[k] }))}>
        <p><strong>日主：{r.dayGan}{dayWx}</strong> 生扶（{dayWx}、{sheng}）共 {r.support} 数，克泄耗共 {r.drain} 数 → <span className={r.support >= r.drain ? 'tag-cool' : 'tag-hot'}><strong>{r.strength}</strong></span>。</p>
        <p>{r.strength === '身强' ? '身强者宜泄宜克，喜财官食伤，宜向外施展；' : r.strength === '身弱' ? '身弱者宜生宜扶，喜印比，宜积蓄内养；' : '中和之命，五行流转顺势，动静皆宜。'}年命纳音 <strong>{r.nayin}</strong>。</p>
      </ResultCard>
      <ResultCard title="占断要旨">
        <p><strong>命主</strong>为{dayWx}日主之人，{r.strength === '身强' ? '根基厚实，宜泄宜克，向外施展方能舒展' : r.strength === '身弱' ? '气机内敛，宜生宜扶，蓄力而后发' : '中和之命，顺势而为，动静皆宜'}。</p>
        <p>四柱之中，{r.wxCount[dayWx] >= 2 ? dayWx + '气颇旺' : dayWx + '气不显'}，宜以 <strong>{sheng}</strong> 为引、以 <strong>{ke}</strong> 为戒。年命纳音 <strong>{r.nayin}</strong>，如琴有调，暗合一生之音律。</p>
        <p>月令为纲：{r.monthGZ[1]}月令临<b>{r.monthGZ}</b>，{pillars[1].wx}——{seasonNote(r.monthGZ[1])}。</p>
        <p>十神之象：{r.shishen.slice(0, 4).map((s, i) => ['年干', '月干', '日干', '时干'][i] + s.gan + '为' + s.name).join('，')}。{shishenFocus(r)}</p>
        <p className="tiny muted">此要旨为现代语言之概览，细察仍以全局生克为凭。</p>
      </ResultCard>
      <ResultCard title="十神六亲">
        <p>{r.shishen.filter(s => s.name !== '比肩' || true).slice(0, 4).map((s, i) => <span key={i}><strong>{['年干', '月干', '日干', '时干'][i]}</strong>为{s.name}（{SHISHEN_MAP[s.name]}日主之{s.name}）　</span>)}</p>
        <p>十神之义：比劫主自我与同侪，食伤主才情与输出，财星主所得与经营，官杀主约束与担当，印星主滋养与学识。</p>
      </ResultCard>
    </>
  );
}
// 月令提纲注（现代语言）
function seasonNote(branch: string): string {
  const map: Record<string, string> = {
    子: '冬月水旺，寒凝之季，喜火调候', 丑: '腊月土冻，宜火暖局',
    寅: '孟春木旺，生机初发', 卯: '仲春木盛，花木繁茂',
    辰: '季春土旺，湿土培木', 巳: '孟夏火旺，炎气初升',
    午: '仲夏火盛，烈日当空', 未: '季夏土燥，火土相生',
    申: '孟秋金旺，肃杀之气', 酉: '仲秋金锐，白露为霜',
    戌: '季秋土旺，金火入库', 亥: '孟冬水旺，寒流暗涌',
  };
  return map[branch] || '四时流转，各得其所';
}

// 十神格局点睛
function shishenFocus(r: any): string {
  const names = r.shishen.map((s: any) => s.name);
  if (names.includes('正官') || names.includes('七杀')) return '官杀透干，主担当与约束，成事在于守正。';
  if (names.includes('正财') || names.includes('偏财')) return '财星显露，主经营与所得，宜务实聚财。';
  if (names.includes('正印') || names.includes('偏印')) return '印星为用，主学识与荫庇，宜向学深造。';
  if (names.includes('食神') || names.includes('伤官')) return '食伤泄秀，主才情与输出，宜展露所长。';
  return '比劫同气，主自立与同侪，宜广结善缘。';
}