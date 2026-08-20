import SpreadLibrary from './SpreadLibrary';

export default function SpreadLibraryPage() {
  return (
    <div className="relative min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl md:text-4xl text-ancient tracking-wider mb-3">
            牌阵库
          </h1>
          <p className="text-stardust/50 text-sm">选择适合你问题的牌阵，或创建专属的</p>
        </div>
        <SpreadLibrary />
      </div>
    </div>
  );
}
