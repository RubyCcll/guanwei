// 占问记录：列表（按术筛选/搜索/删除）+ 详情（复用九术结果渲染回看）
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRecords, deleteRecord, getRecord } from '@/utils/recordStore';
import { artPairOf } from '@/arts/registry';
import { artById } from '@/data/arts';
import SongSelect from '@/components/SongSelect';

function formatTime(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [tick, setTick] = useState(0);
  const [artFilter, setArtFilter] = useState('all');
  const [search, setSearch] = useState('');

  // 详情态：回看某次占问（复用对应术的结果渲染）
  if (id) {
    const rec = getRecord(id);
    if (!rec) {
      return (
        <div className="wrap page-compact" style={{ paddingTop: 'var(--sp-4)', textAlign: 'center' }}>
          <div className="result-placeholder"><div className="glyph">佚</div><p>此占无痕 · 请返记录再择</p></div>
          <div className="mt-4"><Link className="btn-seal btn-ghost" to="/history">返 记 录</Link></div>
        </div>
      );
    }
    const art = artById(rec.artId);
    const pair = artPairOf(rec.artId);
    return (
      <div className="wrap" style={{ paddingTop: 'var(--sp-7)', paddingBottom: 'var(--sp-6)' }}>
        <Link className="back-link" to="/history">‹ 返记录</Link>
        <div className="module-kicker">留痕 · {art?.name || rec.artId}</div>
        <div className="module-title-row">
          <h2 className="module-title"><span className="cn">{art?.name || '占问'}</span>{formatTime(rec.createdAt)}</h2>
        </div>
        {(rec.profile || rec.question) && (
          <div className="result-card" style={{ marginTop: '1rem' }}>
            {rec.question && <p className="result-text"><strong>所问：</strong>{rec.question}</p>}
            {rec.profile && (
              <p className="result-text tiny" style={{ marginTop: '.4rem' }}>
                <strong>档案：</strong>{(rec.profile as any).gender || ''}{(rec.profile as any).birthDate ? ' · ' + (rec.profile as any).birthDate : ''}{(rec.profile as any).birthTime ? ' ' + (rec.profile as any).birthTime : ''}
                {(() => { const l = (rec.profile as any).location; return l ? ' · ' + ((l as any).province || '') + ((l as any).city || '') + ((l as any).district || '') + '（' + (l as any).lng?.toFixed?.(2) + ',' + (l as any).lat?.toFixed?.(2) + '）' : ''; })()}
              </p>
            )}
          </div>
        )}
        <div className="mt-4">
          {pair?.Result ? <pair.Result data={rec.result} /> : <p className="result-text">此术结果暂无法回看。</p>}
        </div>
        <button className="btn-seal btn-ghost" style={{ marginTop: 'var(--sp-3)', fontSize: '.85rem', padding: '.4rem 1.2rem' }}
          onClick={() => { if (confirm('确定删除此占问记录？')) { deleteRecord(rec.id); window.location.hash = '#/history'; } }}>
          删 此 记 录
        </button>
      </div>
    );
  }

  const records = useMemo(() => getRecords(), [tick, artFilter, search]);
  const [profileFilter, setProfileFilter] = useState('all');
  const filtered = records.filter(r => {
    if (profileFilter !== 'all' && (r.profileId || 'main') !== profileFilter) return false;
    if (artFilter !== 'all' && r.artId !== artFilter) return false;
    if (search) {
      const art = artById(r.artId);
      if (!(art?.name || '').includes(search) && !r.id.includes(search)) return false;
    }
    return true;
  });

  return (
    <div className="wrap" style={{ paddingTop: 'var(--sp-7)', paddingBottom: 'var(--sp-6)' }}>
      <div className="section-eyebrow">留痕 · Records</div>
      <h2 className="section-title" style={{ marginTop: '.8rem' }}>占问记录</h2>
      <p className="section-note">每问留痕，观照来时路。共 {records.length} 次占问（本地上限 200 条）。</p>

      <div className="field-row" style={{ marginTop: 'var(--sp-3)', gridTemplateColumns: '1fr 1fr' }}>
        <div className="field"><input className="input-line" placeholder="搜术名…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="field"><SongSelect value={artFilter} options={[{ value: 'all', label: '全部九术' }, ...['bazi', 'ziwei', 'qimen', 'meihua', 'liuyao', 'liuren', 'xiaoliuren', 'astrology', 'tarot'].map(a => ({ value: a, label: artById(a)?.name || a }))]} onChange={setArtFilter} /></div>
      </div>

      {filtered.length === 0 ? (
        <div className="result-placeholder" style={{ marginTop: 'var(--sp-5)' }}>
          <div className="glyph">痕</div>
          <p>{records.length ? '无契合之占 · 请易词再寻' : '尚无占问记录 · 诚心一问，方始留痕'}</p>
        </div>
      ) : (
        <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 'var(--sp-3)' }}>
          {filtered.map(r => {
            const art = artById(r.artId);
            const resultText = summarize(r.result);
            return (
              <div className="result-card" key={r.id} style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1rem' }}>{art?.name || r.artId}</h3>
                <div className="tiny muted">{formatTime(r.createdAt)}</div>
                <p className="result-text" style={{ flex: 1 }}>{resultText}</p>
                <div style={{ display: 'flex', gap: '.6rem', marginTop: 'var(--sp-1)' }}>
                  <Link className="pill cool" to={'/history/' + r.id}>回 看</Link>
                  <button className="pill hot" onClick={() => { deleteRecord(r.id); setTick(t => t + 1); }}>删 除</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 从结果中提取一行摘要（按术别取关键字段）
function summarize(result: unknown): string {
  const r = result as Record<string, any>;
  if (!r) return '（结果不可读）';
  if (r.yearGZ) return `${r.yearGZ}年 ${r.monthGZ}月 ${r.dayGZ}日 ${r.hourGZ}时 · ${r.strength || ''}`;
  if (r.benGua) return `本卦${r.benGua.name} · ${r.bianGua ? '变' + r.bianGua.name : ''} · ${r.shengke || ''}`;
  if (r.ju) return `${r.jqName} · ${r.yin ? '阴' : '阳'}遁${r.ju}局 · ${r.dayGZ}日`;
  if (r.name && r.detail) return `${r.name} · ${r.detail.ji || ''} · ${r.detail.wx || ''}`;
  if (r.jiang) return `${r.jiang}将加时 · 四课${r.ke1}/${r.ke2}/${r.ke3}/${r.ke4}`;
  if (r.ming !== undefined) return `命宫@${r.ming} · ${r.juName || ''} · 紫微@${r.zwPos}`;
  if (Array.isArray(r) && r[0] && r[0].name) return `${r.length} 张牌：${r.map((c: any) => c.name).join('、')}`;
  if (r.planets) return `太阳落${signOf(r.sun)} · 月亮落${signOf(r.moon)}`;
  if (r.yin !== undefined) return `${r.jqName || ''} · ${r.yin ? '阴' : '阳'}遁${r.ju}局`;
  return JSON.stringify(r).slice(0, 40);
}

function signOf(lon: number): string {
  const signs = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
  return signs[Math.floor(((lon % 360) + 360) % 360 / 30)];
}