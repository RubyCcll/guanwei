// 页脚：品牌 + 免责声明（古风提示层）
export default function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="wrap foot-inner">
        <div className="foot-brand">
          <span className="seal">观微</span>
          <span>观微 · 玄学问道</span>
        </div>
        <div className="foot-meta">
          <p>凡占问所得，仅供修身养性、怡情遣兴之用，不作决策依据。</p>
          <p>术数乃先贤观天察地之遗智，敬而用之，勿迷勿执。</p>
        </div>
      </div>
    </footer>
  );
}