// 印章式按钮（古风提示层文案约定：按钮字为文言短句）
import { Link } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  ghost?: boolean;
  className?: string;
}

export default function SealButton({ children, to, onClick, ghost, className = '' }: Props) {
  const cls = `btn-seal ${ghost ? 'btn-ghost' : ''} ${className}`;
  if (to) {
    return <Link to={to} className={cls} onClick={onClick}><span className="sb-label">{children}</span></Link>;
  }
  return <button className={cls} onClick={onClick}><span className="sb-label">{children}</span></button>;
}