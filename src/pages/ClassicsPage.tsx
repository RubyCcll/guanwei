// 古籍典藏：列表（按术筛选/搜索）+ 详情（提要/背景/篇章/原文选段·古籍话术层）
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CLASSICS, classicById, type ClassicBook } from '@core/data/classics';
import { ARTS } from '@/data/arts';
import SongSelect from '@/components/SongSelect';

export default function ClassicsPage() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const [artFilter, setArtFilter] = useState('all');

  // 详情态
  if (id) {
    const book = classicById(id);
    if (!book) {
      return (
        <div className="wrap page-compact" style={{ paddingTop: 'var(--sp-4)', textAlign: 'center' }}>
          <div className="result-placeholder"><div className="glyph">佚</div><p>典籍未寻得 · 请返典藏再择</p></div>
          <div className="mt-4"><Link className="btn-seal btn-ghost" to="/classics">返 典 藏</Link></div>
        </div>
      );
    }
    return <ClassicDetail book={book} />;
  }

  const filtered = useMemo(() => CLASSICS.filter(c => {
    if (artFilter !== 'all' && !c.arts.includes(artFilter)) return false;
    if (search && !c.title.includes(search) && !c.author.includes(search) && !c.summary.includes(search)) return false;
    return true;
  }), [artFilter, search]);

  return (
    <div className="wrap" style={{ paddingTop: 'var(--sp-7)', paddingBottom: 'var(--sp-6)' }}>
      <div className="section-eyebrow">典藏 · Classics</div>
      <h2 className="section-title" style={{ marginTop: '.8rem' }}>古籍典藏</h2>
      <p className="section-note">溯术数之源流，录先贤之遗文。共 {CLASSICS.length} 部典籍，每部附原文选段、注译与出处。</p>

      <div className="glass-filter" style={{ marginTop: 'var(--sp-3)' }}>
        <div className="field-row" style={{ marginTop: 0, gridTemplateColumns: '1fr 1fr' }}>
          <div className="field">
            <input className="input-line" placeholder="搜书名 · 作者 · 提要" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="field">
            <SongSelect value={artFilter} options={[{ value: 'all', label: '全部术数' }, ...ARTS.map(a => ({ value: a.id, label: a.name }))]} onChange={setArtFilter} />
          </div>
        </div>
      </div>

      <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 'var(--sp-3)' }}>
        {filtered.map(b => <ClassicCard key={b.id} book={b} />)}
      </div>
      {filtered.length === 0 && (
        <div className="result-placeholder mt-4"><div className="glyph">无</div><p>无典籍契合 · 请易词再寻</p></div>
      )}
    </div>
  );
}

function ClassicCard({ book }: { book: ClassicBook }) {
  return (
    <Link to={'/classics/' + book.id} className="result-card" style={{ textDecoration: 'none', display: 'block', marginBottom: 0 }}>
      <h3>{book.title}</h3>
      <div className="tiny muted" style={{ marginBottom: '.4rem' }}>{book.author} · {book.era}</div>
      <p className="result-text" style={{ marginTop: 0 }}>{book.summary}</p>
      <div className="mt-2">
        {book.arts.map(a => <span key={a} className="pill cool">{ARTS.find(x => x.id === a)?.name || a}</span>)}
      </div>
    </Link>
  );
}

function ClassicDetail({ book }: { book: ClassicBook }) {
  return (
    <div className="wrap" style={{ paddingTop: 'var(--sp-7)', paddingBottom: 'var(--sp-6)', maxWidth: 880 }}>
      <Link className="back-link" to="/classics">‹ 返典藏</Link>
      <div className="module-kicker">典藏 · {book.era}</div>
      <div className="module-title-row">
        <h2 className="module-title"><span className="cn">{book.title.replace(/[《》]/g, '')}</span>{book.author}</h2>
      </div>
      <div className="mt-2" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {book.arts.map(a => <Link key={a} className="pill cool" to={'/art/' + a}>观 {ARTS.find(x => x.id === a)?.name}</Link>)}
      </div>

      <div className="result-card mt-4">
        <h3>提要</h3>
        <p className="result-text">{book.summary}</p>
        <h3 style={{ marginTop: 'var(--sp-3)' }}>成书背景</h3>
        <p className="result-text">{book.background}</p>
      </div>

      <div className="result-card">
        <h3>篇章</h3>
        {book.chapters.map((c, i) => (
          <p className="result-text" key={i}><strong>{c.title}</strong> —— {c.summary}</p>
        ))}
      </div>

      <div className="result-card">
        <h3>原文选段</h3>
        {book.excerpts.map((e, i) => (
          <div key={i} style={{ marginBottom: 'var(--sp-3)' }}>
            <p className="tag-cool" style={{ letterSpacing: '.1em' }}><strong>{e.title}</strong></p>
            <blockquote style={{
              marginTop: '.5rem', padding: 'var(--sp-2) var(--sp-3)',
              background: 'var(--paper-deep)', borderLeft: '3px solid var(--celadon)',
              fontFamily: 'var(--font-song)', lineHeight: 2.2, color: 'var(--ink)',
            }}>
              {e.original}
            </blockquote>
            {e.translation && <p className="result-text mt-1"><strong>注译：</strong>{e.translation}</p>}
            {e.annotation && <p className="result-text"><strong>参详：</strong>{e.annotation}</p>}
            <p className="tiny muted mt-1">出处：{e.source}</p>
          </div>
        ))}
      </div>
      <p className="tiny muted">版本说明：{book.sourceNote}</p>
    </div>
  );
}