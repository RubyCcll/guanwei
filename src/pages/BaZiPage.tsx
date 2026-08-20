import { Link } from 'react-router-dom';
import { Calendar, Construction, ArrowLeft } from 'lucide-react';

export default function BaZiPage() {
  return (
    <div className="relative min-h-screen pt-20 pb-16 px-4 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center">
        <div className="glass-panel p-12">
          <Calendar className="w-16 h-16 text-ancient/40 mx-auto mb-6" />
          <h1 className="font-display text-3xl text-ancient tracking-wider mb-4">
            四柱八字
          </h1>
          <p className="text-stardust/60 mb-2">天干地支之奥秘，洞察命运起伏</p>
          <div className="flex items-center justify-center gap-2 text-mystic/60 mb-8">
            <Construction className="w-4 h-4" />
            <span className="text-sm">功能开发中</span>
          </div>
          <p className="text-stardust/40 text-sm mb-8 leading-relaxed">
            四柱八字以出生年、月、日、时的天干地支组成命盘，通过五行生克制化、十神关系来分析性格、运势和人生轨迹。
            此功能将集成自动排盘、大运流年和神煞分析。
          </p>
          <Link
            to="/tarot"
            className="inline-flex items-center gap-2 px-6 py-2 border border-ancient/50 text-ancient hover:bg-ancient/10 transition-all rounded-sm text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            先体验塔罗占卜
          </Link>
        </div>
      </div>
    </div>
  );
}
