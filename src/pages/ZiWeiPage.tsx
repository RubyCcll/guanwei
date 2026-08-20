import { Link } from 'react-router-dom';
import { Star, Construction, ArrowLeft } from 'lucide-react';

export default function ZiWeiPage() {
  return (
    <div className="relative min-h-screen pt-20 pb-16 px-4 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center">
        <div className="glass-panel p-12">
          <Star className="w-16 h-16 text-ancient/40 mx-auto mb-6" />
          <h1 className="font-display text-3xl text-ancient tracking-wider mb-4">
            紫微斗数
          </h1>
          <p className="text-stardust/60 mb-2">东方星命之学，解析人生格局</p>
          <div className="flex items-center justify-center gap-2 text-mystic/60 mb-8">
            <Construction className="w-4 h-4" />
            <span className="text-sm">功能开发中</span>
          </div>
          <p className="text-stardust/40 text-sm mb-8 leading-relaxed">
            紫微斗数是根据出生年月日时排出命盘，通过十二宫位和星曜组合来推断人生命运的东方占星术。
            此功能将集成完整的排盘系统、大运流年分析和格局判断。
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
