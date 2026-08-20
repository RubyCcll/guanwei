// 星盘：出生日期/时刻/地点（经纬度→LST 上升点）→ 行星落座/相位/十二宫
import { useState } from 'react';
import { astrologyCalc } from '@core/engine/astrology';
import { ZODIAC, ZODIAC_MEAN, HOUSES } from '@core/data/zodiac';
import { mod } from '@core/data/ganzhi';
import type { GeoLocation } from '@core/types';
import type { UserProfile } from '@/utils/userStore';
import LocationPicker from '@/components/LocationPicker';
import { currentUser } from '@/utils/userStore';
import { ResultCard } from '@/components/ResultCard';
import SongSelect from '@/components/SongSelect';
import DateInput from '@/components/DateInput';
import ProfilePicker from '@/components/ProfilePicker';

interface PanelProps { onDivine: (inputs: unknown, profile?: UserProfile, question?: string, profileId?: string) => void; }

export function AstrologyPanel({ onDivine }: PanelProps) {
  const user = currentUser();
  const p = user?.profile;
  const [date, setDate] = useState(p?.birthDate || '1990-06-15');
  const [time, setTime] = useState(() => { const h = (p?.birthHourIndex ?? 4) * 2; return String(h).padStart(2, '0') + ':30'; });
  const [loc, setLoc] = useState<GeoLocation | null>(p?.location || null);
  const [gender, setGender] = useState<'男' | '女'>(p?.gender || '男');
  const [profileSrc, setProfileSrc] = useState<{ id: string; name: string } | null>(null);

  const filled = p && date === p.birthDate && gender === p.gender;
  const go = () => {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    if (!y || !m || !d) return;
    const birthHourIndex = Math.floor(((hh || 0) + 1) % 24 / 2);
    const profile: UserProfile = { birthDate: date, birthTime: time, birthHourIndex, gender, location: loc };
    onDivine({ y, m, d, hour: hh || 0, min: mm || 0, lng: loc?.lng, lat: loc?.lat }, profile, undefined, profileSrc?.id || 'main');
  };

  return (
    <>
      <ProfilePicker onPick={(p, src) => { setDate(p.birthDate); setTime(p.birthTime || '08:30'); setGender(p.gender); setLoc(p.location); if (src) setProfileSrc(src); }} />
      {user && filled && <p className="hint" style={{ color: 'var(--celadon-deep)', marginTop: 'var(--sp-2)' }}>已依主档案预填（可改，改后以所书为准）</p>}
      <div className="field"><label htmlFor="as-date">出生日期（公历 / 农历）</label>
        <DateInput id="as-date" value={date} onChange={setDate} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="as-hour">出生时刻</label>
          <input className="input-line" type="time" id="as-hour" value={time} onChange={e => setTime(e.target.value)} /></div>
        <div className="field"><label htmlFor="as-gender">性别</label>
          <SongSelect id="as-gender" value={gender} options={[{ value: '男', label: '男' }, { value: '女', label: '女' }]} onChange={v => setGender(v as '男' | '女')} />
        </div>
      </div>
      <div className="field">
        <label>出生地点（上升点需经纬度）</label>
        <LocationPicker value={loc} onChange={setLoc} />
      </div>
      <button className="btn-divine" onClick={go}>布 星 图<span className="small">推行星黄经 · 布十二宫</span></button>
      <p className="hint" style={{ marginTop: '.8rem' }}>行星位置采用简略天文近似（平均运动），上升点按本地恒星时 LST 推算，宫位取整宫制，仅供怡情。</p>
    </>
  );
}

export function AstrologyResult({ data }: { data: ReturnType<typeof astrologyCalc> }) {
  const r = data;
  const ascSign = Math.floor(mod(r.asc, 360) / 30);
  const sunSign = Math.floor(r.sun / 30);
  const moonSign = Math.floor(r.moon / 30);
  const signRows = r.planets.map(([name, sym, lon]) => {
    const s = Math.floor(mod(lon, 360) / 30);
    const deg = mod(lon, 30);
    return { name, sym, s, deg };
  });
  const detailRows = (r.planetDetails || []).map(p => (
    <div className="result-cell" key={p.cn}>
      <div className="k">{p.cn} {p.sym} {p.retrograde ? '· 逆行' : ''}</div>
      <div className="v">{p.sign} {p.degree.toFixed(1)}°</div>
      <div className="tiny">落{p.house}宫{p.dignity.status ? ' · ' + p.dignity.status : ''}</div>
      {p.dignity.note && <div className="tiny muted">{p.dignity.note}</div>}
    </div>
  ));
  const houseRows = (r.houses || []).map(h => (
    <div className="result-cell" key={h.num}>
      <div className="k">{h.num}宫</div>
      <div className="v">{h.sign}</div>
      <div className="tiny">宫主 {h.ruler}</div>
    </div>
  ));
  const aspectHtml = r.aspects.length
    ? r.aspects.map((a, i) => <p key={i}><strong>{a[0]}</strong> 与 <strong>{a[1]}</strong> 成 <span className="tag-cool">{a[2]}</span> —— {a[3]}</p>)
    : <p>诸星无显著相位，气机平和。</p>;
  return (
    <>
      <ResultCard title="命盘之纲">
        <p>上升 <strong>{ZODIAC[ascSign][0]}</strong> {mod(r.asc, 30).toFixed(1)}°（本地恒星时 {r.lstHours.toFixed(2)}h），中天 <strong>{ZODIAC[Math.floor((r.mc ?? 0) / 30)][0]}</strong>，太阳落 <strong>{ZODIAC[sunSign][0]}</strong>，月亮落 <strong>{ZODIAC[moonSign][0]}</strong>。</p>
        <p className="tiny muted">回归黄道（Tropical）· VSOP87 精确星历 · 黄赤交角 {r.epsilon?.toFixed(2)}° · 宫位整宫制</p>
        <p>太阳主自我之核，月亮主情感之底，上升主处世之貌。三者为命盘之纲。</p>
      </ResultCard>
      <ResultCard title="行星经纬"
        cells={signRows.map(p => ({
          k: `${p.name} ${p.sym}`,
          v: `${ZODIAC[p.s][2]} ${ZODIAC[p.s][0]}座 ${p.deg.toFixed(1)}°`,
        }))}>
        {signRows.map(p => <p key={p.name} className="tiny muted">{ZODIAC_MEAN[ZODIAC[p.s][0]]}</p>)}
      </ResultCard>
      <ResultCard title="行星入宫 · 庙旺 · 逆行">
        <div className="result-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
          {detailRows}
        </div>
        <p className="tiny muted" style={{ marginTop: '.6rem' }}>庙=本垣力量最显，旺=擢升助力显著，陷/弱=力量受抑；逆行行星主内省与回炉，其宫位事务易有反复。</p>
      </ResultCard>
      <ResultCard title="相位经纬">{aspectHtml}</ResultCard>
      <ResultCard title="行星落宫参详">
        {r.planets.map((p) => {
          const s = Math.floor(mod(p[2], 360) / 30);
          const house = mod(s - ascSign + 12, 12); // 整宫制：上升起算
          return <p key={p[0]}><strong>{p[0]}</strong>落{house + 1}宫（{HOUSES[house]}）· {ZODIAC[s][0]}座 —— {houseMeaning(p[0], house)}</p>;
        })}
        <p className="tiny muted">整宫制推演，行星入宫主人生领域之侧重；仅供怡情。</p>
      </ResultCard>
      <ResultCard title="十二宫位（整宫制）">
        <p>{HOUSES.map((hname, i) => <span key={hname}><strong>{hname}</strong>·{ZODIAC[mod(ascSign + i, 12)][0]}　</span>)}</p>
        <div className="result-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', marginTop: '.7rem' }}>
          {houseRows}
        </div>
        <p className="mt-1">命宫即上升所落之座，为一生行运之门户；宫主星为该宫头星座之古典守护星（不含三王星）。Placidus 宫位制在迭代计划中。</p>
      </ResultCard>
    </>
  );
}
// 行星入宫解读（现代语言）
function houseMeaning(planet: string, house: number): string {
  const base: string[] = [
    '自我形象与人生方向之所在', '财帛运用与价值感之来源', '思维沟通与手足同侪之域',
    '家宅根基与内在安全之锚', '才艺表现与恋爱子女之场', '日常工作与身体康健之务',
    '姻缘伴侣与合伙共事之缘', '深渊转化与共享资源之秘', '远行求学与信念追寻之路',
    '事业名位与社会形象之台', '交友结社与理想愿景之圈', '潜意识与灵性安顿之隅',
  ];
  const p: Record<string, string> = {
    太阳: '光芒所注，此生着力之处', 月亮: '情感所依，心境冷暖之枢',
    水星: '思虑所驰，学习表达之道', 金星: '喜恶所向，审美人际之趣',
    火星: '行动所向，冲劲释放之径', 木星: '幸运所至，成长拓展之门',
    土星: '功课所在，磨砺成就之石',
  };
  return (p[planet] || '此星行运') + '，落于' + base[house] + '。';
}