// 紫微斗数：输入面板（干支年/农历月日时 + 地点经度校正）+ 紫微盘渲染
import { useState } from 'react';
import { ziweiCalc } from '@core/engine/ziwei';
import { ZW_STARS, ZW_STAR_MEAN, PALACE_NAMES } from '@core/data/ziwei';
import { interpretZiwei } from '@core/engine/ziweiInterpret';
import { ganZhiIndex, GAN, ZHI, NAYIN } from '@core/data/ganzhi';
import { timeToHourIndex, hourIndexLabel } from '@/data/shichen';
import TimeShichenInput from '@/components/TimeShichenInput';
import type { ZiweiResult, GeoLocation } from '@core/types';
import type { UserProfile } from '@/utils/userStore';
import { Solar } from 'lunar-typescript';
import DateInput from '@/components/DateInput';
import ProfilePicker from '@/components/ProfilePicker';
import { currentUser } from '@/utils/userStore';
import LocationPicker from '@/components/LocationPicker';
import SongSelect from '@/components/SongSelect';
import { ResultCard } from '@/components/ResultCard';

const DIZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const mod = (a: number, n: number) => ((a % n) + n) % n;

// 干支年选项（1950-2010）
function ganzhiOptions() {
  const out: { gz: string; year: number }[] = [];
  for (let y = 1950; y <= 2010; y++) {
    const i = ((y - 4) % 60 + 60) % 60;
    out.push({ gz: GAN[i % 10] + ZHI[i % 12], year: y });
  }
  return out;
}

interface PanelProps { onDivine: (inputs: unknown, profile?: UserProfile, question?: string) => void; }

export function ZiweiPanel({ onDivine }: PanelProps) {
  const p = currentUser()?.profile;
  const [date, setDate] = useState(p?.birthDate || '1990-06-15');
  const [birthTime, setBirthTime] = useState(p?.birthTime || '00:00');
  const [gender, setGender] = useState<'男' | '女'>(p?.gender || '男');
  const [loc, setLoc] = useState<GeoLocation | null>(p?.location || null);

  const go = () => {
    const [yy, mm, dd] = date.split('-').map(Number);
    // 公历 → 农历（万年历），紫微依农历排盘
    let lm = 1, ld = 1, gz = '甲子', birthYear = yy;
    try {
      const lunar = Solar.fromYmd(yy, mm, dd).getLunar();
      lm = Math.abs(lunar.getMonth());
      ld = lunar.getDay();
      gz = lunar.getYearInGanZhi();
      birthYear = lunar.getYear();
    } catch { /* 非法日期回退默认 */ }
    const hourIdx = timeToHourIndex(birthTime);
    const profile: UserProfile = { birthDate: date, birthTime, birthHourIndex: hourIdx, gender, location: loc };
    onDivine(
      { ganzhi: gz, month: lm, day: ld, hour: hourIdx, time: birthTime, location: loc ?? undefined, gender, birthYear: yy },
      profile
    );
  };

  return (
    <>
      <ProfilePicker onPick={p => { setDate(p.birthDate); setBirthTime(p.birthTime || '00:00'); setGender(p.gender); setLoc(p.location); }} />
      <div className="field"><label htmlFor="zw-date">出生日期（公历 / 农历，紫微依农历排盘）</label>
        <DateInput id="zw-date" value={date} onChange={setDate} />
      </div>

      <div className="field"><label htmlFor="zw-gender">性别（定大限顺逆）</label>
        <SongSelect id="zw-gender" value={gender} options={[{ value: '男', label: '男' }, { value: '女', label: '女' }]} onChange={v => setGender(v as '男' | '女')} />
      </div>
      <div className="field"><label htmlFor="zw-time">出生时刻</label>
        <TimeShichenInput id="zw-time" value={birthTime} onChange={setBirthTime} />
      </div>
      <div className="field">
        <label>出生地点（时辰经度校正）</label>
        <LocationPicker value={loc} onChange={setLoc} previewHourIndex={timeToHourIndex(birthTime)} />
      </div>
      <button className="btn-divine" onClick={go}>布 盘<span className="small">安命宫 · 定紫微 · 布主星</span></button>
      <p className="hint" style={{ marginTop: '.8rem' }}>演示级简盘：十四主星入十二宫，辅曜从略。</p>
    </>
  );
}

// 4×4 网格布局（十二地支顺时针环布 + 中央中宫）
const GRID_POS: [string, number, number][] = [
  ['寅', 0, 3], ['卯', 0, 2], ['辰', 0, 1], ['巳', 0, 0],
  ['午', 1, 0], ['未', 2, 0], ['申', 3, 0], ['酉', 3, 1],
  ['戌', 3, 2], ['亥', 3, 3], ['子', 2, 3], ['丑', 1, 3],
];

export function ZiweiResult({ data }: { data: ZiweiResult }) {
  const r = data;
  const cellStars: Record<number, string[]> = {};
  Object.keys(r.zwStars).forEach(s => {
    const pos = r.zwStars[s];
    if (!cellStars[pos]) cellStars[pos] = [];
    cellStars[pos].push(s);
  });
  const cells = GRID_POS.map(([zhi, c, rw]) => {
    const pos = DIZHI.indexOf(zhi);
    const stars = cellStars[pos] || [];
    const palIdx = Object.keys(r.palaces).find(k => r.palaces[Number(k)] === pos);
    const palName = palIdx !== undefined ? PALACE_NAMES[Number(palIdx)] : '';
    const isMing = r.ming === pos;
    return { zhi, c, rw, stars, palName, isMing, pos };
  });
  return (
    <>
      <ResultCard title={"命盘 · " + r.juName + ' · ' + r.nayin}>
        <p>命宫安于 <strong>{DIZHI[r.ming]}</strong>{r.ming === r.zwPos ? '（紫微同宫）' : ''}，紫微星落 <strong>{DIZHI[r.zwPos]}</strong> 宫。时辰经度校正：{hourIndexLabel(r.correctedHour)}。</p>
      </ResultCard>
      <div className="result-card stagger">
        <h3>星曜布列</h3>
        <div className="ziwei-grid" style={{ marginTop: '1rem' }}>
          <div className="zw-cell center" style={{ gridColumn: '2/4', gridRow: '2/4' }}>
            <div className="zw-name">观微</div><div className="tiny muted">紫微简盘</div><div className="tiny muted">{r.juName}</div>
          </div>
          {cells.sort((a, b) => a.rw === b.rw ? a.c - b.c : a.rw - b.rw).map(c => (
            <div className={"zw-cell" + (c.isMing ? ' ming-cell' : '')} key={c.zhi} style={{ gridColumn: c.c + 1, gridRow: c.rw + 1 }}>
              <div className="zw-name"><span>{c.zhi} · {c.palName || '—'}</span>{c.isMing ? <span className="zw-extra" style={{ color: 'var(--cinnabar)' }}>命</span> : null}</div>
              <div className="zw-stars">{c.stars.map(s => {
                const hot = ['紫微', '七杀', '破军', '贪狼', '廉贞'].includes(s);
                const cool = ['天机', '天同', '天相', '天梁', '天府'].includes(s);
                return <span key={s} className={"star-name " + (hot ? 'star-hot' : cool ? 'star-cool' : '')}>{s}</span>;
              })}{c.stars.length === 0 && <span className="muted">—</span>}</div>
            </div>
          ))}
        </div>
      </div>
      <ResultCard title="命宫参详">
        <p>命宫安于 <strong>{DIZHI[r.ming]}</strong>，为一生行运之枢。
        {(() => {
          const stars = Object.keys(r.zwStars).filter(s => r.zwStars[s] === r.ming);
          if (stars.length === 0) return '此宫主星未临，气机较静，宜守成内养。';
          return `命宫主星为 ${stars.join('、')}，${stars.map(s => ZW_STAR_MEAN[s].slice(0, 14)).join('；')}。`;
        })()}</p>
        <p className="tiny muted">简盘仅列十四主星，辅曜从略；此参详为现代语言之概览。</p>
      </ResultCard>
      <ResultCard title="命盘基础">
        <p>五行局 <strong>{r.juName}</strong>（{r.nayin}），起运 <strong>{r.startAge} 岁</strong>，大限{' '}
          <strong>{r.forward ? '顺行' : '逆行'}</strong>（{r.nominalAge} 虚岁，行至第 {((r.curDayunIdx ?? 0) + 1)} 大限）。</p>
        <p>命宫在<strong>{DIZHI[r.ming]}</strong>，身主随命；紫微星落<strong>{DIZHI[r.zwPos]}</strong>宫。</p>
        <p className="tiny muted">简盘以十四主星为限，辅曜从略；大限起运岁数按五行局数计。</p>
      </ResultCard>
      {r.dayun && r.dayun.length > 0 && (
        <div className="result-card stagger">
          <h3>大限行运</h3>
          <div className="result-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
            {r.dayun.map((d, i) => {
              const palIdx = Object.keys(r.palaces).find(k => r.palaces[Number(k)] === d.palaceIdx);
              const palName = palIdx !== undefined ? PALACE_NAMES[Number(palIdx)] : '';
              const stars = Object.keys(r.zwStars).filter(s => r.zwStars[s] === d.palaceIdx);
              const isCur = i === r.curDayunIdx;
              return (
                <div className="result-cell" key={i} style={isCur ? { borderColor: 'var(--cinnabar)', boxShadow: '0 0 0 1px rgba(165,64,45,.2)' } : undefined}>
                  <div className="k">{d.start}–{d.end} 岁{isCur ? ' · 今' : ''}</div>
                  <div className="v" style={isCur ? { color: 'var(--cinnabar)' } : undefined}>{palName}</div>
                  <div className="tiny muted">{stars.join('、') || '主星未临'}</div>
                  <div className="tiny muted">{dayunTone(stars)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <ResultCard title="流年之示">
        <p>{r.nominalAge} 虚岁，流年命宫落 <strong>{r.liunianPalaceName}</strong>（{DIZHI[r.liunianIdx ?? 0]}），流年主星：<strong>{r.liunianStars?.join('、') || '主星未临'}</strong>。</p>
        <div className="mt-2">
          {[1, 2, 3].map(offset => {
            const pos = mod(r.ming + (r.nominalAge ?? 34) - 1 + offset, 12);
            const stars = Object.keys(r.zwStars).filter(s => r.zwStars[s] === pos);
            const pname = PALACE_NAMES[Number(Object.keys(r.palaces).find(k => r.palaces[Number(k)] === pos)) || 0];
            return <p key={offset} className="tiny" style={{ lineHeight: 2 }}>来年{offset === 1 ? '' : offset + '年'} · {pname}宫（{DIZHI[pos]}）· 主星{stars.join('、') || '未临'} —— {futureTone(stars)}</p>;
          })}
        </div>
        <p className="tiny muted">流年为当年太岁行运之要，主星吉凶与宫位庙陷须合参；简盘仅供参考。</p>
      </ResultCard>
      {interpretZiwei(r).map((ins, i) => {
        if (ins.title === '十二宫要览') {
          // 结构化排版：每宫一卡（宫名/地支/主星/主题）
          const palaces = Object.keys(r.palaces).map(k => ({
            name: PALACE_NAMES[Number(k)],
            pos: r.palaces[Number(k)],
            stars: Object.keys(r.zwStars).filter(s => r.zwStars[s] === r.palaces[Number(k)]),
          }));
          return (
            <div className="result-card" key={i}>
              <h3>十二宫概览</h3>
              <div className="zw-palace-grid">
                {palaces.map(p => (
                  <div key={p.name} className={'zw-palace-cell' + (p.pos === r.ming ? ' is-ming' : '') + (p.stars.length ? '' : ' empty')}>
                    <div className="zp-head"><span className="zp-name">{p.name}</span><span className="zp-zhi">{DIZHI[p.pos]}</span>{p.pos === r.ming && <span className="zp-ming">命</span>}</div>
                    <div className="zp-stars">{p.stars.length ? p.stars.join(' ') : '主星未临'}</div>
                    <div className="zp-theme">{palaceThemeOf(p.name)}</div>
                  </div>
                ))}
              </div>
              <div className="result-text mt-3">
                {ins.content.split('\n\n').map((para, j) => <p key={j}>{para}</p>)}
              </div>
            </div>
          );
        }
        return (<ResultCard key={i} title={ins.title}><p>{ins.content}</p></ResultCard>);
      })}
    </>
  );
}
// 宫位主题（渲染层用）
function palaceThemeOf(name: string): string {
  const map: Record<string, string> = {
    命宫: '根基底色', 兄弟: '手足同侪', 夫妻: '姻缘伴侣', 子女: '子息晚辈',
    财帛: '求财理财', 疾厄: '体魄健康', 迁移: '外出环境', 仆役: '部属朋友',
    官禄: '事业名位', 田宅: '家宅置业', 福德: '福分心境', 父母: '荫庇长辈',
  };
  return map[name] || '';
}
// 大限/流年吉凶语（按主星吉凶性，现代语言）
const GOOD = ['紫微', '天同', '天府', '天相', '天梁', '太阴', '太阳', '武曲'];
const BAD = ['七杀', '破军', '贪狼', '廉贞', '巨门'];
function dayunTone(stars: string[]): string {
  if (!stars.length) return '平淡之运';
  if (stars.every(s => GOOD.includes(s))) return '顺遂之运';
  if (stars.some(s => BAD.includes(s)) && !stars.some(s => GOOD.includes(s))) return '多动之运';
  return '起伏之运';
}
function futureTone(stars: string[]): string {
  if (!stars.length) return '宜守成';
  if (stars.every(s => GOOD.includes(s))) return '机缘可观，可谋进取';
  if (stars.some(s => BAD.includes(s))) return '变动较多，宜稳中求进';
  return '平稳过渡';
}