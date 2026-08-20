import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Sparkles, History, Menu, X, Library } from 'lucide-react';

const navItems = [
  { path: '/', label: '首页', icon: Sparkles },
  { path: '/tarot', label: '塔罗占卜', icon: Sparkles },
  { path: '/spread-library', label: '牌阵库', icon: Library },
  { path: '/history', label: '历史记录', icon: History },
];

export default function Navigation() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-void/80 backdrop-blur-md border-b border-ancient/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <Sparkles className="w-6 h-6 text-ancient group-hover:animate-pulse-glow" />
            <span className="font-display text-xl text-ancient tracking-wider">玄冥占星</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative text-sm tracking-wide transition-colors duration-300 ${
                    isActive ? 'text-ancient' : 'text-stardust/70 hover:text-ancient'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-px bg-ancient animate-pulse-glow" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-stardust/70 hover:text-ancient"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden bg-void/95 backdrop-blur-md border-t border-ancient/20">
          <div className="px-4 py-4 space-y-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block py-2 text-sm tracking-wide ${
                    isActive ? 'text-ancient' : 'text-stardust/70'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
