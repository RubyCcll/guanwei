// 墨尘粒子：玄学字符漂浮（借鉴「青囊」motes 动效，宋式淡墨风格）
// 固定种子生成位置，组件内稳定；负延迟错峰 + 各异时长实现自然漂移
import { useMemo } from 'react';

const GLYPHS = [
  '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸',
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
  '观', '微', '知', '著', '星', '卦', '易', '遁', '命', '课', '掌', '镜', '穹', '历', '参', '悟',
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MoteSpec {
  glyph: string;
  left: string;
  top: string;
  delay: string;
  duration: string;
  drift: string;
  size: string;
}

export default function Motes({ count = 22, seed = 20260818 }: { count?: number; seed?: number }) {
  const specs = useMemo<MoteSpec[]>(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: count }, () => ({
      glyph: GLYPHS[Math.floor(rnd() * GLYPHS.length)],
      left: (rnd() * 96).toFixed(1) + '%',
      top: (rnd() * 88).toFixed(1) + '%',
      delay: (-rnd() * 14).toFixed(2) + 's',
      duration: (7 + rnd() * 6).toFixed(2) + 's',
      drift: (-(rnd() * 26 - 13)).toFixed(0) + 'px',
      size: (0.6 + rnd() * 0.9).toFixed(2) + 'rem',
    }));
  }, [count, seed]);

  return (
    <div className="motes" aria-hidden="true">
      {specs.map((s, i) => (
        <span
          key={i}
          className="mote"
          style={{
            left: s.left,
            top: s.top,
            animationDelay: s.delay,
            animationDuration: s.duration,
            ['--mote-drift' as string]: s.drift,
            fontSize: s.size,
          }}
        >
          {s.glyph}
        </span>
      ))}
    </div>
  );
}