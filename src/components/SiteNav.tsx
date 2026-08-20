// 顶部导航：首页 / 九术（分类下拉） / 法度 / 古籍 / 学馆 / 缘起 / 档案区（最右）
// 历史入口移入登录后档案菜单
import { Link, useLocation } from 'react-router-dom';
import { currentUser, logout } from '@/utils/userStore';
import { useState } from 'react';
import { ARTS } from '@/data/arts';

// 九术分类（参考「青囊」术数推演下拉的分组方式）
const ART_GROUPS: { name: string; arts: string[] }[] = [
  { name: '命理', arts: ['bazi', 'ziwei'] },
  { name: '三式', arts: ['qimen', 'liuren'] },
  { name: '象数 · 筮法', arts: ['meihua', 'liuyao', 'xiaoliuren'] },
  { name: '西学镜鉴', arts: ['astrology', 'tarot'] },
];

export default function SiteNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const isArt = pathname.startsWith('/art/');

  const isActive = (key: string): boolean => {
    switch (key) {
      case 'home': return pathname === '/' && !isArt;
      case 'arts': return isArt;
      case 'fa': return false;
      case 'classics': return pathname.startsWith('/classics');
      case 'academy': return pathname.startsWith('/academy');
      case 'about': return pathname.startsWith('/about');
      default: return false;
    }
  };

  return (
    <header className="site-head">
      <div className="wrap head-inner">
        <Link className="brand" to="/">
          <span className="seal" aria-hidden="true">观微</span>
          <span className="name">观微</span>
          <span className="sub">以术问道 · 观微知著</span>
        </Link>
        <nav className="nav-links" aria-label="主导航">
          <Link to="/" className={pathname === '/' && !isArt ? 'active' : ''}>首页</Link>
          <ArtsDropdown active={isArt} />
          <Link to="/classics" className={isActive('classics') ? 'active' : ''}>古籍</Link>
          <Link to="/academy" className={isActive('academy') ? 'active' : ''}>学馆</Link>
          <Link to="/about" className={isActive('about') ? 'active' : ''}>缘起</Link>
        </nav>
        <UserArea />
      </div>
    </header>
  );
}

// 九术分类下拉（hover 展开）
function ArtsDropdown({ active }: { active: boolean }) {
  return (
    <div className="has-sub">
      <Link to="/" className={active ? 'active' : ''} onClick={e => { e.preventDefault(); document.getElementById('home-arts')?.scrollIntoView({ behavior: 'smooth' }); }}>九术 <svg className="chev-mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></Link>
      <div className="sub-menu arts-sub" style={{ minWidth: '13rem' }}>
        {ART_GROUPS.map(g => (
          <div key={g.name} className="sub-group">
            <div className="sub-group-name">{g.name}</div>
            {g.arts.map(a => {
              const art = ARTS.find(x => x.id === a)!;
              return <Link key={a} to={'/art/' + a}><span className="sub-glyph">{art.glyph}</span>{art.name}<span className="sub-poem">{art.poem.split('，')[0]}</span></Link>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// 档案区（最右）：未登录 → 入馆；登录后 → 名号下拉（档案/占问记录/离馆）
function UserArea() {
  const user = currentUser();
  const [, force] = useState(0);
  if (!user) {
    return <Link to="/auth" className="btn-seal btn-ghost" style={{ fontSize: '.78rem', padding: '.3rem 1rem', letterSpacing: '.2em' }}><span className="sb-label">入 馆</span></Link>;
  }
  // 用户名限 4 字，超出省略
  const shortName = user.username.length > 4 ? user.username.slice(0, 4) + '…' : user.username;
  return (
    <div className="has-sub user-menu">
      <button className="user-chip" onClick={() => {}}>
        <span className="user-seal">{user.username.slice(0, 1)}</span>
        <span className="user-name">{shortName}</span>
        <span className="user-caret"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
      </button>
      <div className="sub-menu" style={{ right: 0, left: 'auto', transform: 'none' }}>
        <Link to="/auth">吾之档案</Link>
        <Link to="/history">占问记录</Link>
        <Link
          to="/"
          onClick={() => { logout(); force(x => x + 1); }}
          style={{ color: 'var(--cinnabar)' }}
        >
          离 馆
        </Link>
      </div>
    </div>
  );
}