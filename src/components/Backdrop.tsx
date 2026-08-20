// 全局底景：宣纸纹理 + 水墨远山（浮动）+ 墨尘粒子 + 光晕
import Motes from './Motes';

export default function Backdrop() {
  return (
    <>
      <div id="paper-grain" aria-hidden="true" />
      <Motes />
      <span className="hero-glow hero-glow--left" aria-hidden="true" />
      <span className="hero-glow hero-glow--right" aria-hidden="true" />
      <svg id="mountains" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="mg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#96A88F" stopOpacity="0" />
            <stop offset="1" stopColor="#96A88F" stopOpacity=".30" />
          </linearGradient>
          <linearGradient id="mg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7C9792" stopOpacity="0" />
            <stop offset="1" stopColor="#7C9792" stopOpacity=".22" />
          </linearGradient>
        </defs>
        <path d="M0,220 C160,140 300,120 420,168 C540,216 640,140 760,120 C880,100 960,150 1080,170 C1200,190 1320,150 1440,190 L1440,320 L0,320 Z" fill="url(#mg1)" />
        <path d="M0,260 C140,200 260,210 400,236 C560,264 680,210 820,200 C980,190 1100,240 1240,228 C1320,222 1380,240 1440,250 L1440,320 L0,320 Z" fill="url(#mg2)" />
      </svg>
    </>
  );
}