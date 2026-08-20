// 结果卡（各术结果渲染的基础容器，现代解读层正文）
import type { ReactNode } from 'react';

interface Cell { k: string; v: ReactNode; big?: boolean; hot?: boolean; cool?: boolean; }

interface ResultCardProps {
  title: string;
  cells?: Cell[];
  children?: ReactNode;
  className?: string;
}

export function ResultCard({ title, cells, children, className = '' }: ResultCardProps) {
  return (
    <div className={`result-card ${className}`}>
      <h3>{title}</h3>
      {cells && cells.length > 0 && (
        <div className="result-grid">
          {cells.map((c, i) => (
            <div className="result-cell" key={i}>
              <div className="k">{c.k}</div>
              <div className={`v ${c.big ? 'big' : ''} ${c.hot ? 'hot' : ''} ${c.cool ? 'cool' : ''}`}>{c.v}</div>
            </div>
          ))}
        </div>
      )}
      {children && <div className="result-text">{children}</div>}
    </div>
  );
}

// 结果占位（古风提示层）
export function ResultPlaceholder({ glyph = '卦', text = '静候卦象 · 观微知著' }: { glyph?: string; text?: string }) {
  return (
    <div className="result-placeholder">
      <div className="glyph" aria-hidden="true">{glyph}</div>
      <p>{text}</p>
    </div>
  );
}