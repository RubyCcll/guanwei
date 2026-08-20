// 缘起页（古风提示层文案）
import SealButton from '@/components/SealButton';

import BambooArt from '@/components/BambooArt';

export default function AboutPage() {
  return (
    <div className="page-decor" style={{ paddingTop: 'var(--sp-7)', paddingBottom: 'var(--sp-6)' }}>
      <BambooArt />
      <div className="wrap">
      <div className="section-eyebrow">缘起 · Origin</div>
      <h2 className="section-title" style={{ marginTop: '.8rem', fontSize: 'var(--fs-2xl)' }}>观微缘起</h2>
      <div className="result-text mt-4" style={{ maxWidth: '70ch' }}>
        <p>以纸墨为衣、以留白为韵。玄学问道，贵在内敛沉静——「致虚极，守静笃」，此与观照自身的功夫，本出一源。</p>
        <p>本馆以纸墨之雅为衣，纳九派术数为里——<strong>四柱八字</strong>论命之经纬，<strong>紫微斗数</strong>布星之宫垣，<strong>奇门遁甲</strong>演时之局盘，<strong>梅花易数</strong>观物之象数，<strong>六爻</strong>承蓍龟之遗法，<strong>大六壬</strong>推天地人三传，<strong>小六壬</strong>藏掐指之玄机，<strong>星盘</strong>应西洋之天穹，<strong>塔罗</strong>照潜识之幽微。</p>
        <p>术数有中西，观照本无二。愿君于这一方纸墨之间，静得片刻，观微知著。</p>
      </div>
      <div className="separator">· · ·</div>
      <div className="center">
        <SealButton to="/" onClick={() => {}} ghost>启程问占</SealButton>
      </div>
      </div>
    </div>
  );
}