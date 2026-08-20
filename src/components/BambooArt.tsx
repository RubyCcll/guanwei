// 水墨竹影装饰（缘起等页面右侧）：手绘风 SVG 竹 + 石 + 山
export default function BambooArt({ className = '' }: { className?: string }) {
  return (
    <div className={'bamboo-art ' + className} aria-hidden="true">
      <svg viewBox="0 0 320 520" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 远山淡影 */}
        <path d="M0,470 C60,430 120,445 180,425 C240,405 285,420 320,400 L320,520 L0,520 Z" fill="#96A88F" opacity=".12" />
        <path d="M0,495 C80,465 160,480 240,462 C280,453 300,462 320,455 L320,520 L0,520 Z" fill="#7C9792" opacity=".10" />
        {/* 竹节 */}
        {[0, 1, 2, 3, 4].map(i => {
          const x = 88 + i * 34;
          const top = 40 + i * 14;
          const bottom = 500 - i * 30;
          return (
            <g key={i} stroke="#5F7660" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity=".75">
              <path d={"M" + x + "," + top + " C" + (x - 6) + "," + ((top + bottom) / 2) + " " + (x + 8) + "," + ((top + bottom) / 2 + 20) + " " + x + "," + bottom} />
              {/* 节环 */}
              <path d={"M" + (x - 5) + ",150 C" + x + ",146 " + x + ",146 " + (x + 5) + ",150"} strokeWidth="2" opacity=".5" />
              <path d={"M" + (x - 4) + ",268 C" + x + ",265 " + x + ",265 " + (x + 4) + ",268"} strokeWidth="2" opacity=".5" />
              <path d={"M" + (x - 3) + ",386 C" + x + ",383 " + x + ",383 " + (x + 3) + ",386"} strokeWidth="2" opacity=".5" />
            </g>
          );
        })}
        {/* 竹叶 */}
        {[
          [60, 190, 40, 210, 55, 240], [120, 140, 95, 150, 108, 175], [180, 230, 160, 240, 172, 262],
          [240, 120, 218, 130, 230, 152], [70, 320, 52, 330, 66, 350], [150, 300, 128, 308, 140, 328],
          [230, 260, 210, 270, 222, 290], [100, 80, 80, 92, 94, 112], [200, 170, 178, 180, 190, 200],
          [250, 340, 232, 348, 244, 366], [60, 420, 44, 430, 58, 448], [170, 400, 152, 410, 164, 428],
        ].map((pts, i) => (
          <path key={i} d={"M" + pts[0] + "," + pts[1] + " Q" + pts[2] + "," + pts[3] + " " + pts[4] + "," + pts[5] + " Q" + pts[2] + "," + pts[3] + " " + pts[0] + "," + pts[1]} fill="#5F7660" opacity=".6" />
        ))}
        {/* 石 */}
        <path d="M40,505 C60,470 95,465 115,490 C100,505 70,510 40,505 Z" fill="#8C9A8A" opacity=".18" />
        {/* 小印 */}
        <rect x="248" y="470" width="34" height="34" rx="2" stroke="#A5402D" strokeWidth="1.5" opacity=".55" />
        <text x="265" y="492" textAnchor="middle" fontSize="16" fill="#A5402D" opacity=".55" style={{ fontFamily: 'Kaiti SC, KaiTi, serif' }}>观微</text>
      </svg>
    </div>
  );
}