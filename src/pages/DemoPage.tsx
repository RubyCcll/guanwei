// 演示模式（Demo Mode）：无需后端 / 无需 API Key 的完整体验页
// 九术排盘用 shared/core 本地引擎在浏览器计算，AI 报告加载内置示例（静态 JSON）——GitHub Pages 上可直接体验
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { baziCalc } from '@core/engine/bazi';
import { ziweiCalc } from '@core/engine/ziwei';
import { astrologyCalc } from '@core/engine/astrology';
import { qimenCalc } from '@core/engine/qimen';
import { meihuaCalc } from '@core/engine/meihua';
import { liuyaoCalc } from '@core/engine/liuyao';
import { liurenCalc } from '@core/engine/liuren';
import { xiaoliurenCalc } from '@core/engine/xiaoliuren';
import { tarotDraw } from '@core/engine/tarot';
import { allTarotSpreads } from '@core/data/tarotSpreads';
import { Solar } from 'lunar-typescript';
import { BaziResult } from '@/components/arts/BaziArt';
import { ZiweiResult } from '@/components/arts/ZiweiArt';
import { AstrologyResult } from '@/components/arts/AstrologyArt';
import { QimenResultView } from '@/components/arts/QimenArt';
import { MeihuaResult } from '@/components/arts/MeihuaArt';
import { LiuyaoResult } from '@/components/arts/LiuyaoArt';
import { LiurenResult } from '@/components/arts/LiurenArt';
import { XiaoliurenResult } from '@/components/arts/XiaoliurenArt';
import { TarotResult } from '@/components/arts/TarotArt';
import ReportView from '@/components/ReportView';
import { downloadReport, type AIReport } from '@/services/api';
import sample from '@/data/sample-report.json';
import Disclaimer from '@/components/Disclaimer';

// 虚构演示档案（中性，无真实个人信息）
const DEMO_BIRTH = { y: 1988, m: 6, d: 15, hourIndex: 6, time: '12:00', gender: '女' as const, location: { lng: 116.4, lat: 39.9, province: '北京市', city: '北京市', district: '东城区' } };

// 九术本地排盘（与后端 divine.ts 同一引擎、同一输入口径）
const ARTS: { id: string; name: string; glyph: string; calc: () => unknown }[] = [
  { id: 'bazi', name: '四柱八字', glyph: '命', calc: () => baziCalc(DEMO_BIRTH) },
  { id: 'ziwei', name: '紫微斗数', glyph: '星', calc: () => {
      const lunar = Solar.fromYmd(DEMO_BIRTH.y, DEMO_BIRTH.m, DEMO_BIRTH.d).getLunar();
      return ziweiCalc({ ganzhi: lunar.getYearInGanZhi(), month: Math.abs(lunar.getMonth()), day: lunar.getDay(), hour: DEMO_BIRTH.hourIndex, time: DEMO_BIRTH.time, location: DEMO_BIRTH.location, gender: DEMO_BIRTH.gender, birthYear: DEMO_BIRTH.y, solarDate: [DEMO_BIRTH.y, DEMO_BIRTH.m, DEMO_BIRTH.d] });
  } },
  { id: 'astrology', name: '古典星盘', glyph: '穹', calc: () => astrologyCalc(DEMO_BIRTH.y, DEMO_BIRTH.m, DEMO_BIRTH.d, 12, 0, DEMO_BIRTH.location.lng, DEMO_BIRTH.location.lat) },
  { id: 'qimen', name: '奇门遁甲', glyph: '遁', calc: () => qimenCalc({ datetime: new Date() }) },
  { id: 'meihua', name: '梅花易数', glyph: '梅', calc: () => meihuaCalc({ mode: 'time', n1: 3, n2: 5, n3: 7, now: new Date() }) },
  { id: 'liuyao', name: '六爻', glyph: '爻', calc: () => liuyaoCalc(undefined, { y: new Date().getFullYear(), m: new Date().getMonth() + 1, d: new Date().getDate() }) },
  { id: 'liuren', name: '大六壬', glyph: '课', calc: () => liurenCalc(new Date()) },
  { id: 'xiaoliuren', name: '小六壬', glyph: '掌', calc: () => xiaoliurenCalc('time', new Date().getMonth() + 1, new Date().getDate(), new Date().getHours() % 12, 3, 5, 7) },
  { id: 'tarot', name: '塔罗', glyph: '镜', calc: () => {
      const spread = allTarotSpreads().find((x: any) => x.id === 'three') || allTarotSpreads()[0];
      return { spread, cards: tarotDraw(3) };
  } },
];
const RESULT_VIEWS: Record<string, (data: unknown) => React.ReactElement> = {
  bazi: d => <BaziResult data={d as any} />,
  ziwei: d => <ZiweiResult data={d as any} />,
  astrology: d => <AstrologyResult data={d as any} />,
  qimen: d => <QimenResultView data={d as any} />,
  meihua: d => <MeihuaResult data={d as any} />,
  liuyao: d => <LiuyaoResult data={d as any} />,
  liuren: d => <LiurenResult data={d as any} />,
  xiaoliuren: d => <XiaoliurenResult data={d as any} />,
  tarot: d => <TarotResult data={d as any} />,
};

export default function DemoPage() {
  const [phase, setPhase] = useState<'idle' | 'casting' | 'done'>('idle');
  const [report, setReport] = useState<AIReport | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [artId, setArtId] = useState('bazi');
  const [localResult, setLocalResult] = useState<unknown>(null);
  const art = ARTS.find(a => a.id === artId)!;
  const chart = baziCalc(DEMO_BIRTH);

  const reset = () => {
    setPhase('idle');
    setReport(null);
    setLocalResult(null);
    setShowRaw(false);
  };

  const start = () => {
    setPhase('casting');
    setReport(null);
    setLocalResult(null);
    // 本地引擎排盘（纯浏览器计算，无需后端）
    setTimeout(() => {
      try {
        setLocalResult(art.calc());
      } catch (e) {
        console.error('本地排盘失败', e);
      }
      if (artId === 'bazi') {
        // 八字附带示例 AI 报告（演示解读效果）
        setReport((sample as any).report as AIReport);
      }
      setPhase('done');
    }, 900);
  };

  return (
    <div className="wrap" style={{ paddingTop: 'var(--sp-6)' }}>
      <section className="module-hero compact">
        <div className="wrap">
          <div className="mh-row">
            <Link className="back-link" to="/">‹ 返册页</Link>
            <h2 className="module-title"><span className="cn">体验演示</span><span className="mh-sub">无需注册 · 无需配置 · 点开即玩</span></h2>
            <p className="mh-kicker">九种术数直接体验，八字附完整 AI 解读示例</p>
          </div>
        </div>
      </section>

      <div className="wrap" style={{ marginTop: 'var(--sp-4)' }}>
        {phase === 'idle' && (
          <div className="result-card" style={{ padding: 'var(--sp-5)' }}>
            <p style={{ fontSize: '1.05rem', marginBottom: 'var(--sp-2)' }}>选一种术数，点一下就能看到排盘结果；八字还会附带一份完整的 AI 解读示例。</p>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-2)' }}>示例档案：1988年6月15日 · 北京 · 女；其余术数按当前时刻起例</p>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-3)' }}>三步即玩：① 选术数 → ② 点「开始体验」→ ③ 看结果</p>
            <div className="art-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: 'var(--sp-4)' }}>
              {ARTS.map(a => (
                <button key={a.id} onClick={() => setArtId(a.id)}
                  className={"btn-seal btn-ghost" + (a.id === artId ? ' art-active' : '')}
                  style={{ fontSize: '.85rem', padding: '.45rem 1rem', borderColor: a.id === artId ? 'var(--celadon-deep)' : undefined, color: a.id === artId ? 'var(--celadon-deep)' : undefined }}>
                  {a.glyph} {a.name}
                </button>
              ))}
            </div>
            <button className="btn-seal" style={{ fontSize: '1rem', padding: '.7rem 2.2rem' }} onClick={start}>开 始 体 验</button>
          </div>
        )}

        {phase === 'casting' && (
          <div className="result-card" style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
            <div className="casting-ring"><div className="casting-glyph" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-zm)', fontSize: '1.6rem', color: 'var(--celadon-deep)' }}>演</div></div>
            <p>排盘推演中 · 报告将成</p>
          </div>
        )}

        {phase === 'done' && (
          <>
            <div className="altar-result stagger">
              {localResult && RESULT_VIEWS[artId]?.(localResult)}
              {report && (
                <div className="result-card mt-3">
                  <h3>AI 深度解读 <span className="tag-cool" style={{ marginLeft: '.4rem', fontSize: '.72rem' }}>示例报告</span></h3>
                  <ReportView report={report} artName="四柱八字" onExport={() => downloadReport(report, '四柱八字', '事业与感情运势如何')} />
                </div>
              )}
              <div className="btn-row mt-3 no-print">
                <button className="btn-seal btn-ghost" style={{ fontSize: '.9rem', padding: '.5rem 1.4rem' }} onClick={reset}>重 新 演 示</button>
                <button className="btn-seal btn-ghost" style={{ fontSize: '.9rem', padding: '.5rem 1.4rem' }} onClick={() => setShowRaw(v => !v)}>{showRaw ? '隐 藏' : '查 看'}数据（开发者）</button>
                <Link className="btn-seal btn-ghost" style={{ fontSize: '.9rem', padding: '.5rem 1.4rem', textDecoration: 'none' }} to="/auth">体验完整功能（存档 / AI 实时解读）→</Link>
              </div>
              {showRaw && report && (
                <pre style={{ fontSize: '.68rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'rgba(251,249,243,.6)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>{JSON.stringify(report, null, 1).slice(0, 4000)}</pre>
              )}
            </div>
            <Disclaimer />
          </>
        )}
      </div>
    </div>
  );
}
