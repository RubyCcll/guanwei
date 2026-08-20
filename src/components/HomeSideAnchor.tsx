// 首页左侧锚点目录（竖向固定）：观微之始 / 今日黄历 / 今日星运 / 九术册页 / 观微三法
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ANCHORS = [
  { id: 'top', label: '观微之始' },
  { id: 'today', label: '今日黄历' },
  { id: 'home-arts', label: '九术册页' },
  { id: 'home-fa', label: '观微三法' },
];

export default function HomeSideAnchor() {
  const [active, setActive] = useState('top');
  const location = useLocation();

  // 跨页跳转带锚点时滚动
  useEffect(() => {
    const target = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (target) {
      requestAnimationFrame(() => {
        if (target === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
        else document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [location.state]);

  // 滚动跟随
  useEffect(() => {
    const onScroll = () => {
      const pos = window.scrollY + 140;
      let cur = 'top';
      for (const a of ANCHORS) {
        const el = document.getElementById(a.id);
        if (el && el.offsetTop <= pos) cur = a.id;
      }
      setActive(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id: string) => {
    if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="side-anchor" aria-label="首页目录">
      {ANCHORS.map(a => (
        <button
          key={a.id}
          className={active === a.id ? 'active' : ''}
          onClick={() => go(a.id)}
        >
          <span className="dot" />
          {a.label}
        </button>
      ))}
    </nav>
  );
}