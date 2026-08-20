// 首页：Hero + 今日黄历/星运（占位，2.5 步接入数据）+ 九术册页 + 观微三法
import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ARTS } from '@/data/arts';
import { dailyAlmanac, dailySky, dailyFortune } from '@core/engine/daily';
import { currentUser } from '@/utils/userStore';
import { astrologyCalc } from '@core/engine/astrology';
import { ZODIAC } from '@core/data/zodiac';
import { useState } from 'react';
import SealButton from '@/components/SealButton';
import HomeSideAnchor from '@/components/HomeSideAnchor';

export default function HomePage() {
  const location = useLocation();
  const [now] = useState(() => new Date());
  const almanac = dailyAlmanac(now);
  const sky = dailySky(now);
  // 登录用户 → 按出生档案（日期/时辰/地点）算个人太阳星座 → 个性化运势
  const user = currentUser();
  const fortune = useUserFortune(now, user);

  // 从导航「九术/法度」菜单进入时，滚动到对应锚点
  useEffect(() => {
    const target = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (target) {
      requestAnimationFrame(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      });
      // 消费一次即清除，避免返回时重复滚动
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="hero" style={{ position: 'relative' }}>
        <div className="mist" aria-hidden="true" />
        <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
          <p className="hero-kicker fade-up">纸墨玄境 · 玄学九术</p>
          <h1 className="hero-title fade-up delay-1">
            观<span className="accent">微</span>知著
          </h1>
          <p className="hero-line fade-up delay-2">
            以 <em>四柱</em> 参命途，以 <em>斗数</em> 观星躔，<br />
            以 <em>遁甲</em> 演天机，以 <em>卦象</em> 问本心。
          </p>
          <p className="hero-desc fade-up delay-2">
            集八字、紫微、奇门、梅花、六爻、大六壬、小六壬、星盘、塔罗九术于一堂。<br />
            静气凝神，焚香默坐，方得片刻清明。
          </p>
          <div className="hero-actions fade-up delay-3">
            <SealButton to="/" onClick={() => document.getElementById('home-arts')?.scrollIntoView({ behavior: 'smooth' })}>
              入九术之门
            </SealButton>
            <SealButton to="/art/bazi" ghost>先问八字</SealButton>
          </div>
          <ScrollHint />
          <div className="hero-vert" aria-hidden="true">
            <span>静以观微</span>
            <span>虚以纳象</span>
            <span>诚以问占</span>
          </div>
        </div>
      </section>

      {/* ============ 今日黄历 / 今日星运 ============ */}
      <section className="wrap" id="today" style={{ scrollMarginTop: '88px', paddingBottom: 'var(--sp-6)' }}>
        <div className="today-grid">
          <div className="result-card">
            <h3>今日黄历</h3>
            <div className="result-text">
              <p><strong>{almanac.lunarText}</strong> · {almanac.ganzhi}日 · 生肖{almanac.shengxiao}</p>
              <p>{almanac.jieQi ? `今日节气：<strong>${almanac.jieQi}</strong> · ` : ''}月相 <strong>{almanac.yueXiang}</strong> · 冲{almanac.chong} 煞{almanac.sha}</p>
              <p style={{ marginTop: '.4rem' }}>宜：{almanac.yi.length ? almanac.yi.map(y => <span key={y} className="pill cool">{y}</span>) : '—'}</p>
              <p>忌：{almanac.ji.length ? almanac.ji.map(j => <span key={j} className="pill hot">{j}</span>) : '—'}</p>
            </div>
          </div>
          <div className="result-card">
            <h3>今日星运</h3>
            <div className="result-text">
              <p>太阳落 <strong>{sky.sunSign}</strong> · 月亮落 <strong>{sky.moonSign}</strong> · 月相 {sky.yueXiang}</p>
              <p className="tiny muted" style={{ marginTop: '.3rem', lineHeight: 2 }}>{sky.planets.slice(0, 7).map(pl => `${pl.name}·${pl.sign}`).join('　')}</p>
              <p style={{ marginTop: '.4rem', color: 'var(--ink)' }}><strong>{fortune.sign}运势：</strong>{fortune.text}</p>
              <p className="tiny muted">{fortune.personalized ? '依馆中生辰档案而示。' : '入馆录生辰档案，星运可依君而示。'}</p>
            </div>
          </div>
        </div>
      </section>

      <HomeSideAnchor />
      {/* ============ 九术册页 ============ */}
      <div id="home-arts" style={{ scrollMarginTop: '88px', paddingTop: 'var(--sp-2)' }}>
        <div className="wrap">
          <div className="section-head fade-up">
            <div className="section-eyebrow">九术总览 · Nine Arts</div>
            <h2 className="section-title">九术册页</h2>
            <p className="section-note">法无高下，术有专攻。择其所应，诚心则灵。</p>
          </div>
          <div className="arts-grid">
            {ARTS.map((a, i) => (
              <Link key={a.id} className="art-card" to={`/art/${a.id}`} role="button" tabIndex={0}>
                <div className="art-num">{a.num} · {a.tag}</div>
                <div className="art-symbol" aria-hidden="true">{a.glyph}</div>
                <div className="art-name">{a.name}</div>
                <div className="art-poem">{a.poem}</div>
                <div className="art-enter">入 观 · {String(i + 1).padStart(2, '0')}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ============ 观微三法 ============ */}
      <div className="about" id="home-fa" style={{ scrollMarginTop: '76px', marginTop: 'var(--sp-7)', padding: 'var(--sp-7) 0' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="section-eyebrow">占问之道 · Ethos</div>
            <h2 className="section-title">观微三法</h2>
          </div>
          <div className="about-grid">
            <div className="about-item">
              <h3>静</h3>
              <p>占问先定心。宋人焚香默坐，去浮躁而见真。凡问卜，宜独处一室，屏息凝神，一念一事，方得应验。</p>
            </div>
            <div className="about-item">
              <h3>诚</h3>
              <p>《易》曰：「匪我求童蒙，童蒙求我。」心诚则气聚，气聚则象显。同问不三占，三占必有疑，疑则不验。</p>
            </div>
            <div className="about-item">
              <h3>悟</h3>
              <p>术者，渡舟也，非彼岸也。卦象所指，是镜非命。观照自身，反求诸己，方是问道正途。</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
// 登录用户：按出生日期算太阳星座（真太阳时校正时辰由档案时辰决定）
function useUserFortune(now: Date, user: ReturnType<typeof currentUser>) {
  if (!user) return dailyFortune(now);
  try {
    const [y, m, d] = user.profile.birthDate.split('-').map(Number);
    const [bh, bm] = (user.profile.birthTime || '12:00').split(':').map(Number);
    const r = astrologyCalc(y, m, d, bh || 0, bm || 0, user.profile.location?.lng, user.profile.location?.lat);
    const sign = ZODIAC[Math.floor(r.sun / 30)][0] + '座';
    return dailyFortune(now, sign);
  } catch {
    return dailyFortune(now);
  }
}
// 首屏滚动引导：仅在首屏（Hero 可见）时显示，下滑渐隐，回顶重现
function ScrollHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onScroll = () => {
      const hero = document.querySelector('.hero');
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      // 首屏判定：hero 底部仍在下半屏内
      setVisible(rect.bottom > window.innerHeight * 0.55);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className={'scroll-hint inline-hint' + (visible ? '' : ' hidden')} aria-hidden="true">
      <span>下滑 · 观九术</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
    </div>
  );
}