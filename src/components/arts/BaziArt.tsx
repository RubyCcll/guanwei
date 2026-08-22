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
import { isChinaDSTDate } from '@/utils/dst';
import { apiHourInfer, type HourInferResult } from '@/services/api';
import { baziTone } from '@/utils/panTone';
import LifeEventsInput, { type LifeEvent } from '@/components/LifeEventsInput';


interface PanelProps { onDivine: (inputs: unknown, profile?: UserProfile, question?: string, profileId?: string) => void; }

export function BaziPanel({ onDivine }: PanelProps) {
  const user = currentUser();
  const p = user?.profile;
  const [date, setDate] = useState(p?.birthDate || '1990-06-15');
  const [birthTime, setBirthTime] = useState(p?.birthTime || '12:00');
  const [hourUnknown, setHourUnknown] = useState(p?.birthTimeUnknown || false);
  const [gender, setGender] = useState<'男' | '女'>(p?.gender || '男');
  const [loc, setLoc] = useState<GeoLocation | null>(p?.location || null);
  const [question, setQuestion] = useState('');
  const [profileSrc, setProfileSrc] = useState<{ id: string; name: string } | null>(null);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>(p?.lifeEvents || []);
  // 时辰推演（时辰未知时）
  const [inferOpen, setInferOpen] = useState(false);
  const [eventsText, setEventsText] = useState('');
  const [inferring, setInferring] = useState(false);
  const [inferResult, setInferResult] = useState<HourInferResult | null>(null);
  const [inferErr, setInferErr] = useState('');
  const dst = isChinaDSTDate(date);

  const filled = p && date === p.birthDate && birthTime === p.birthTime && gender === p.gender && JSON.stringify(loc) === JSON.stringify(p.location) && !hourUnknown;
  const [formMsg, setFormMsg] = useState('');
  const go = () => {
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) { setFormMsg('⚠ 请先填写有效的出生日期'); return; }
    if (new Date(y, m - 1, d).getMonth() !== m - 1) { setFormMsg('⚠ 出生日期不合法，请检查'); return; }
    setFormMsg('');
    const hourIdx = hourUnknown ? -1 : timeToHourIndex(birthTime);
    onDivine(
      hourUnknown
        ? { y, m, d, hourIndex: -1, gender, location: loc ?? undefined }
        : { y, m, d, hourIndex: hourIdx, time: birthTime, gender, location: loc ?? undefined },
      { birthDate: date, birthTime: hourUnknown ? '' : birthTime, birthHourIndex: hourIdx, birthTimeUnknown: hourUnknown || undefined, gender, location: loc, lifeEvents: lifeEvents.length ? lifeEvents : undefined },
      question.trim(),
      profileSrc?.id || 'main'
    );
  };

  const runInfer = async () => {
    const [y, m, d] = date.split('-').map(Number);
    const events = eventsText.split('\n').map(l => l.trim()).filter(Boolean)
      .map(l => {
        const m2 = /^(\d{4})\s*(.*)$/.exec(l);
        return m2 ? { year: Number(m2[1]), text: (m2[2] || '关键事件').slice(0, 40) } : null;
      }).filter(Boolean) as { year: number; text: string }[];
    if (!events.length) { setInferErr('请按「年份 事件」格式填写，每行一条'); return; }
    setInferring(true); setInferErr(''); setInferResult(null);
    try {
      const r = await apiHourInfer({ y, m, d, gender, location: loc, events });
      setInferResult(r);
    } catch (e: any) {
      setInferErr(e?.message || '推演未应机');
    } finally { setInferring(false); }
  };

  const applyHour = (hi: number) => {
    setHourUnknown(false);
    const mid = String(hi * 2 + 1).padStart(2, '0') + ':00'; // 时辰中点（如申时 16:00）
    setBirthTime(mid);
    setInferOpen(false);
    setInferResult(null);
  };

  return (
    <>
      <ProfilePicker onPick={(p, src) => { setDate(p.birthDate); setBirthTime(p.birthTime || '12:00'); setHourUnknown(!!p.birthTimeUnknown); setGender(p.gender); setLoc(p.location); if (src) setProfileSrc(src); }} />
      {user && filled && <p className="hint" style={{ color: 'var(--celadon-deep)', marginTop: 'var(--sp-2)' }}>已依主档案预填（可改，改后以所书为准）</p>}
      <div className="field"><label htmlFor="bz-date">出生日期（公历 / 农历）</label>
        <DateInput id="bz-date" value={date} onChange={setDate} /></div>
      {dst && <p className="tag-hot" style={{ marginTop: '.3rem' }}>⚠ 该日期处于中国夏令时期间（1986-1991 年 4-9 月，钟表拨快 1 小时）——请按出生时钟表时间填写，排盘会自动回拨校正。</p>}
      <div className="field-row">
        <div className="field"><label htmlFor="bz-time">出生时刻</label>
          {hourUnknown
            ? <p className="hint" style={{ padding: '.45rem 0' }}>时辰未录——排盘不排时柱，AI 解读仅依年月日三柱，不涉时柱/子女宫/晚年。</p>
            : <TimeShichenInput id="bz-time" value={birthTime} onChange={setBirthTime} />}
        </div>
        <div className="field"><label htmlFor="bz-gender">性别</label>
          <SongSelect id="bz-gender" value={gender} options={[{ value: '男', label: '男' }, { value: '女', label: '女' }]} onChange={v => setGender(v as '男' | '女')} />
        </div>
      </div>
      <div className="field"><label>时辰未知</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.45rem 0', cursor: 'pointer', fontSize: '.9rem' }}>
          <input type="checkbox" checked={hourUnknown} onChange={e => setHourUnknown(e.target.checked)} />
          未录（不排时柱）
        </label>
      </div>
      {hourUnknown && (
        <div className="hour-infer" style={{ marginTop: '.4rem' }}>
          <button type="button" className="btn-seal btn-ghost" style={{ fontSize: '.82rem', padding: '.4rem 1rem' }} onClick={() => setInferOpen(v => !v)}>
            {inferOpen ? '收 起' : '🔍 依人生经历推演时辰'}
          </button>
          {inferOpen && (
            <div style={{ marginTop: '.6rem' }}>
              <p className="tiny muted" style={{ marginBottom: '.3rem' }}>每行一条：「年份 关键事件」（3-8 条为宜，越关键越好）</p>
              <textarea className="input-line" rows={5} value={eventsText} onChange={e => setEventsText(e.target.value)}
                placeholder={'2004 家庭变故\n2014 恋爱\n2016 换城市工作\n2020 换工作\n2022 结婚\n2024 健康问题'} />
              <div className="btn-row" style={{ marginTop: '.4rem' }}>
                <button className="btn-seal" disabled={inferring} onClick={runInfer}>{inferring ? '推演中…' : '开 始 推 演'}</button>
              </div>
              {inferErr && <p className="tag-hot" style={{ marginTop: '.4rem' }}>{inferErr}</p>}
              {inferResult && (
                <div className="infer-result" style={{ marginTop: '.6rem' }}>
                  <p className="tiny muted">{inferResult.chart.yearGZ} 年 / {inferResult.chart.monthGZ} 月 / {inferResult.chart.dayGZ} 日——各时辰候选得分（含时柱与流年应象）：</p>
                  {inferResult.candidates.slice(0, 6).map((c, i) => (
                    <div key={c.hourIndex} onClick={() => applyHour(c.hourIndex)} style={{
                      cursor: 'pointer', border: '1px solid ' + (i === 0 ? 'var(--celadon-deep)' : 'var(--line-soft)'),
                      borderRadius: 'var(--r-sm)', padding: '.45rem .6rem', marginTop: '.35rem', background: i === 0 ? 'rgba(94,122,78,.08)' : 'rgba(251,249,243,.5)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{c.shichen}时 · {c.hourGZ} {i === 0 ? <span className="tag-cool">最吻合</span> : null}</strong>
                        <span className="tiny muted">得分 {c.score}</span>
                      </div>
                      {c.hits.slice(0, 2).map((h, j) => <div key={j} className="tiny muted" style={{ marginTop: '.15rem' }}>{h.year}：{h.reason}</div>)}
                    </div>
                  ))}
                  <p className="tiny muted" style={{ marginTop: '.4rem' }}>点击候选时辰即回填并取消「未知」；推演仅区分时柱细节，大运序列不受时辰影响。</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {formMsg && <p className="tag-hot" style={{ marginTop: '.3rem' }}>{formMsg}</p>}
      <div className="field">
        <label>出生地点（真太阳时校正）</label>
        <LocationPicker value={loc} onChange={setLoc} previewHourIndex={hourUnknown ? -1 : timeToHourIndex(birthTime)} />
        {!loc && <p className="hint" style={{ marginTop: '.3rem' }}>未选地点：将按北京时间直接排盘（不做真太阳时校正，时辰边界可能偏差约 15-80 分钟）</p>}
      </div>
      <div className="field"><label htmlFor="q-input">所问之事（可选）</label>
        <input className="input-line" id="q-input" placeholder="可书所问，AI 报告将由此而发…" maxLength={60} value={question} onChange={e => setQuestion(e.target.value)} />
      </div>
      <LifeEventsInput value={lifeEvents} onChange={setLifeEvents} />
      <button className="btn-divine" onClick={go}>排 盘<span className="small">布四柱 · 观五行 · 推十神</span></button>
      <p className="hint" style={{ marginTop: '.8rem' }}>节气取精确万年历；时柱以出生地经度校正真太阳时；时辰未录时仅排年月日三柱。</p>
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
  const tone = baziTone(r);
  const hourKnown = r.hourGZ !== '未知';
  const pillars = [
    { name: '年柱', gz: r.yearGZ, wx: wxOf(r.yearGZ), ss: r.shishen[0].name, scope: '祖上 · 幼年', isDay: false },
    { name: '月柱', gz: r.monthGZ, wx: wxOf(r.monthGZ), ss: r.shishen[1].name, scope: '父母 · 青年', isDay: false },
    { name: '日柱', gz: r.dayGZ, wx: wxOf(r.dayGZ), ss: '日主', scope: '自身 · 中年', isDay: true },
    hourKnown
      ? { name: '时柱', gz: r.hourGZ, wx: wxOf(r.hourGZ), ss: r.shishen[3].name, scope: '子女 · 暮年', isDay: false }
      : { name: '时柱', gz: '未知', wx: '未录', ss: '未知', scope: '子女 · 暮年', isDay: false },
  ];
  const wxOrder = ['木', '火', '土', '金', '水'];
  const dayWx = r.dayGanWx;
  const sheng = wxOrder[(wxOrder.indexOf(dayWx) + 4) % 5];
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
        <p style={{ marginTop: 'var(--sp-3)' }}><strong>{tone.headline}</strong></p>
        {r.trueSolar && <p className="tag-cool">真太阳时校正：{HOURS_CN[r.correctedHourIndex]}时（依出生地经度 {r.trueSolar.localMeanHours.toFixed(2)}h → {r.trueSolar.trueSolarHours.toFixed(2)}h）</p>}
      </div>
      <ResultCard title="五行流转"
        cells={wxOrder.map(k => ({ k: WX_NAMES[k], v: '●'.repeat(Math.max(r.wxCount[k], 0)) + (r.wxCount[k] === 0 ? '空' : '') + ' ×' + r.wxCount[k] }))}>
        <p><strong>日主：{r.dayGan}{dayWx}</strong> 生扶（{dayWx}、{sheng}）共 {r.support} 数，克泄耗共 {r.drain} 数 → <span className={r.support >= r.drain ? 'tag-cool' : 'tag-hot'}><strong>{r.strength}</strong></span>。</p>
        <p>{tone.wuxingNote}</p>
      </ResultCard>
      <ResultCard title="占断要旨">
        <p>{tone.overview}</p>
        {tone.character.map((c, i) => <p key={i} style={{ marginTop: '.45rem' }}>◇ {c}</p>)}
        <p style={{ marginTop: '.45rem' }}>{tone.dayunNote}</p>
        <p className="tiny muted" style={{ marginTop: '.5rem' }}>{tone.nayinNote}</p>
        <p className="tiny muted" style={{ marginTop: '.4rem' }}>此要旨由盘面数据生成，为现代语言之概览，细察仍以全局生克为凭。</p>
      </ResultCard>
      <ResultCard title="十神六亲">
        <p>{r.shishen.filter(s => s.name !== '比肩' || true).slice(0, 4).map((s, i) => <span key={i}><strong>{['年干', '月干', '日干', '时干'][i]}</strong>为{s.name}（{SHISHEN_MAP[s.name]}日主之{s.name}）　</span>)}</p>
        <p>十神之义：比劫主自我与同侪，食伤主才情与输出，财星主所得与经营，官杀主约束与担当，印星主滋养与学识。</p>
      </ResultCard>
      <ResultCard title="地支藏干 · 人元十神">
        <p className="tiny muted" style={{ marginBottom: 'var(--sp-2)' }}>地支非孤物，各藏人元（本气/中气/余气），十神之根尽在此中——用神是否有根、财官是否有力，皆观藏干。</p>
        <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap', marginTop: 'var(--sp-2)' }}>
          {r.canggan.map((cg, i) => (
            <div key={i} style={{ border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '.6rem .8rem', background: 'rgba(251,249,243,.5)' }}>
              <div className="tiny muted" style={{ letterSpacing: '.2em' }}>{['年支', '月支', '日支', '时支'][i]} · {cg.zhi}</div>
              <div style={{ marginTop: '.3rem', fontSize: '.95rem' }}>
                {cg.gans.map((g, j) => (
                  <span key={j} style={{ display: 'block', color: WX_COLOR[g.wx] }}>{g.gan} <span style={{ color: 'var(--ink-soft)' }}>{g.shishen}（{g.qi}）</span></span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ResultCard>
      <ResultCard title="用神 · 喜忌">
        <p><strong>日主{r.strength}</strong>（旺衰分 {r.strengthDetail.score.toFixed(1)}：{r.strengthDetail.reasons.join('；')}）</p>
        <p style={{ marginTop: '.6rem' }}>主用神：<strong style={{ color: WX_COLOR[r.yongshen.wx] }}>{r.yongshen.wx}（{r.yongshen.shishen}）</strong>　调候：{r.yongshen.tiaohou}</p>
        <p style={{ marginTop: '.6rem' }}>喜　神：<span className="tag-cool">{r.yongshen.xi.join('、')}</span>　忌　神：<span className="tag-hot">{r.yongshen.ji.join('、')}</span></p>
        <p className="tiny muted" style={{ marginTop: '.6rem' }}>{r.yongshen.reason}</p>
        <p className="tiny muted" style={{ marginTop: '.4rem' }}>用神为全局取运之枢：行运逢喜则顺，逢忌则慎——此为 AI 解读「就盘论命」的核心依据。</p>
      </ResultCard>
      <ResultCard title="大运 · 流年">
        <p><strong>{r.qiYun.detail}</strong>，大运{ r.dayun[0]?.forward ? '顺行' : '逆行' }（阳男阴女顺、阴男阳女逆）。</p>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: 'var(--sp-2)' }}>
          {r.dayun.slice(0, 8).map((d, i) => (
            <div key={i} style={{ border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '.5rem .7rem', minWidth: '5.6rem', background: 'rgba(251,249,243,.5)' }}>
              <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{d.gz}</div>
              <div className="tiny" style={{ color: WX_COLOR[WUXING[d.gz[0]]] }}>{d.ganShishen}</div>
              <div className="tiny muted">{d.startAge} 岁 · {d.startYear}-{d.endYear}</div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: '.8rem' }}>流年：<strong>{r.liunian.year} 年 {r.liunian.gz}</strong>（{r.liunian.ganShishen} · 支藏{r.liunian.zhiShishen}）——大运为十年之纲，流年为一年之目，合参断吉凶。</p>
      </ResultCard>
      <ResultCard title="神煞 · 胎元命身">
        <p>神煞：{r.shensha.length > 0
          ? r.shensha.map((s, i) => <span key={i}><strong className={s.type === '吉' ? 'tag-cool' : s.type === '凶' ? 'tag-hot' : ''}>{s.name}</strong>（{s.zhi}）　</span>)
          : '四柱无显著神煞，以五行生克为主论之。'}</p>
        <p style={{ marginTop: '.6rem' }}>胎元 <strong>{r.taiyuan}</strong>（受气之始）　命宫 <strong>{r.minggong}</strong>（立命之基）　身宫 <strong>{r.shengong}</strong>（行事之依）</p>
        <p className="tiny muted" style={{ marginTop: '.4rem' }}>神煞取日干与年支/日支三合：贵人禄神主助力，羊刃主刚猛，驿马主奔波，桃花主情缘。</p>
      </ResultCard>
    </>
  );
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