import { Link } from 'react-router-dom';
import { Sparkles, Star, CircleDot, Calendar, Moon, Sun } from 'lucide-react';
import { getCurrentZodiac, getMoonPhase, getDailyFortune } from '@/utils/astrologyCalc';
import { useEffect, useState } from 'react';

const features = [
  {
    title: '塔罗占卜',
    description: '78张神秘牌面，揭示命运的多维真相',
    icon: Sparkles,
    path: '/tarot',
    color: 'from-ancient/20 to-mystic/20',
    symbol: '✦',
  },
  {
    title: '紫微斗数',
    description: '东方星命之学，解析人生格局',
    icon: Star,
    path: '/ziwei',
    color: 'from-mystic/20 to-crimson/20',
    symbol: '☆',
  },
  {
    title: '四柱八字',
    description: '天干地支之奥秘，洞察命运起伏',
    icon: Calendar,
    path: '/bazi',
    color: 'from-crimson/20 to-ancient/20',
    symbol: '☯',
  },
  {
    title: '星盘占星',
    description: '西方占星之术，解读行星语言',
    icon: CircleDot,
    path: '/astrology',
    color: 'from-ancient/20 to-crimson/20',
    symbol: '◎',
  },
];

export default function Home() {
  const [fortune, setFortune] = useState('');
  const [zodiac, setZodiac] = useState('');
  const [moonPhase, setMoonPhase] = useState('');

  useEffect(() => {
    setFortune(getDailyFortune());
    setZodiac(getCurrentZodiac());
    setMoonPhase(getMoonPhase());
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ancient/30 bg-ancient/5 mb-6">
              <Moon className="w-4 h-4 text-ancient" />
              <span className="text-xs text-ancient/80 tracking-widest">探索宇宙的智慧</span>
              <Sun className="w-4 h-4 text-ancient" />
            </div>
          </div>

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-ancient mb-6 tracking-wider">
            <span className="shimmer-text">玄冥占星</span>
          </h1>

          <p className="text-stardust/60 text-lg md:text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
            东西方玄学体系的交汇之地
          </p>
          <p className="text-stardust/40 text-sm md:text-base max-w-xl mx-auto mb-12">
            塔罗 · 紫微 · 四柱 · 星盘 · 组合占卜
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/tarot"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-ancient/50 text-ancient hover:bg-ancient/10 hover:border-ancient transition-all duration-500 rounded-sm tracking-wider text-sm"
            >
              <Sparkles className="w-4 h-4" />
              开始占卜
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-stardust/20 text-stardust/70 hover:border-stardust/50 hover:text-stardust transition-all duration-500 rounded-sm tracking-wider text-sm"
            >
              查看记录
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-px h-12 bg-gradient-to-b from-ancient/50 to-transparent" />
        </div>
      </section>

      {/* Daily Fortune */}
      <section className="relative py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-ancient/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-mystic/5 rounded-full blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <Sun className="w-5 h-5 text-ancient" />
                <h2 className="font-display text-xl text-ancient tracking-wider">今日星象</h2>
              </div>

              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <span className="px-3 py-1 rounded-full border border-ancient/20 text-ancient/70">
                  太阳星座：{zodiac}
                </span>
                <span className="px-3 py-1 rounded-full border border-mystic/20 text-mystic/70">
                  月相：{moonPhase}
                </span>
              </div>

              <p className="text-stardust/70 leading-relaxed text-sm md:text-base">
                {fortune}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl text-ancient tracking-wider mb-3">占卜之道</h2>
            <p className="text-stardust/50 text-sm">选择适合你的探索方式</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Link
                key={feature.path}
                to={feature.path}
                className="group relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative glass-panel p-6 h-full hover:border-ancient/50 transition-all duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <feature.icon className="w-6 h-6 text-ancient/70 group-hover:text-ancient transition-colors" />
                    <span className="text-ancient/30 text-lg group-hover:text-ancient/60 transition-colors">
                      {feature.symbol}
                    </span>
                  </div>
                  <h3 className="font-display text-lg text-stardust group-hover:text-ancient transition-colors mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-stardust/50 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 border-t border-ancient/10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-ancient/40" />
            <span className="font-display text-sm text-ancient/40 tracking-wider">玄冥占星</span>
          </div>
          <p className="text-stardust/30 text-xs">
            塔罗不是预言，而是镜子 · 命运掌握在你手中
          </p>
        </div>
      </footer>
    </div>
  );
}
