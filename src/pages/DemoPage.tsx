// 演示模式（Demo Mode）：无需后端 / 无需 API Key 的完整体验页
// 九术排盘用 shared/core 本地引擎在浏览器计算，AI 报告加载内置示例（静态 JSON）——GitHub Pages 上可直接体验
import { useEffect, useRef, useState } from 'react';
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
const ARTS: { id: string; name: string; glyph: string }[] = [
  { id: 'bazi', name: '四柱八字', glyph: '命' },
  { id: 'ziwei', name: '紫微斗数', glyph: '星' },
  { id: 'astrology', name: '古典星盘', glyph: '穹' },
  { id: 'qimen', name: '奇门遁甲', glyph: '遁' },
  { id: 'meihua', name: '梅花易数', glyph: '梅' },
  { id: 'liuyao', name: '六爻', glyph: '爻' },
  { id: 'liuren', name: '大六壬', glyph: '课' },
  { id: 'xiaoliuren', name: '小六壬', glyph: '掌' },
  { id: 'tarot', name: '塔罗', glyph: '镜' },
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
  // ─── 演示输入（#2）：日期/时刻/报数，替换固定示例档案 ───
  const [y, setY] = useState(DEMO_BIRTH.y);
  const [m, setM] = useState(DEMO_BIRTH.m);
  const [d, setD] = useState(DEMO_BIRTH.d);
  const [hour, setHour] = useState(12);
  const [n1, setN1] = useState(3);
  const [n2, setN2] = useState(5);
  const [n3, setN3] = useState(7);

  const birth = { ...DEMO_BIRTH, y, m, d, hourIndex: Math.floor((hour % 24) / 2), time: (hour < 10 ? '0' + hour : '' + hour) + ':00' };

  // 按术别用当前输入起例（命盘类用输入日期；占问类用报数/当前时刻）
  const buildCalc = (id: string): (() => unknown) => {
    switch (id) {
      case 'bazi': return () => baziCalc(birth);
      case 'ziwei': return () => {
        const lunar = Solar.fromYmd(birth.y, birth.m, birth.d).getLunar();
        return ziweiCalc({ ganzhi: lunar.getYearInGanZhi(), month: Math.abs(lunar.getMonth()), day: lunar.getDay(), hour: birth.hourIndex, time: birth.time, location: birth.location, gender: birth.gender, birthYear: birth.y, solarDate: [birth.y, birth.m, birth.d] });
      };
      case 'astrology': return () => astrologyCalc(birth.y, birth.m, birth.d, hour, 0, birth.location.lng, birth.location.lat);
      case 'qimen': return () => qimenCalc({ datetime: new Date(y, m - 1, d, hour, 0) });
      case 'meihua': return () => meihuaCalc({ mode: 'number', n1, n2, n3, now: new Date() } as any);
      case 'liuyao': return () => liuyaoCalc(undefined, { y, m, d });
      case 'liuren': return () => liurenCalc(new Date(y, m - 1, d, hour, 0));
      case 'xiaoliuren': return () => xiaoliurenCalc('time', m, d, Math.floor((hour % 24) / 2), n1, n2, n3);
      case 'tarot': return () => {
        const spread = allTarotSpreads().find((x: any) => x.id === 'three') || allTarotSpreads()[0];
        return { spread, cards: tarotDraw(3) };
      };
      default: return () => null;
    }
  };

  // 切换术数时清空上一术的排盘结果（否则旧数据传给新术 Result 组件会崩溃）
  const prevArtRef = useRef(artId);
  useEffect(() => {
    if (prevArtRef.current !== artId) {
      prevArtRef.current = artId;
      setPhase('idle');
      setReport(null);
      setLocalResult(null);
      setShowRaw(false);
    }
  }, [artId]);

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
        setLocalResult(buildCalc(artId)());
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
            <p style={{ fontSize: '1.05rem', marginBottom: 'var(--sp-2)' }}>选一种术数，填好（或直接用默认）日期时刻，点一下就能看到排盘结果；八字还会附带一份完整的 AI 解读示例。</p>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-2)' }}>命盘类（八字/紫微/星盘）用下面日期时刻排盘；占问类（奇门/六壬/小六壬）用该时刻起例；梅花可用报数起卦</p>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-3)' }}>三步即玩：① 选术数 → ② 填日期（可选）→ ③ 点「开始体验」看结果</p>
            <div className="art-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: 'var(--sp-4)' }}>
              {ARTS.map(a => (
                <button key={a.id} onClick={() => setArtId(a.id)}
                  className={"btn-seal btn-ghost" + (a.id === artId ? ' art-active' : '')}
                  style={{ fontSize: '.85rem', padding: '.45rem 1rem', borderColor: a.id === artId ? 'var(--celadon-deep)' : undefined, color: a.id === artId ? 'var(--celadon-deep)' : undefined }}>
                  {a.glyph} {a.name}
                </button>
              ))}
            </div>
            {/* 演示输入表单：日期/时刻/报数 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: 'var(--sp-4)', padding: 'var(--sp-3)', border: '1px dashed var(--line-soft)', borderRadius: 'var(--r-sm)' }}>
              <label className="tiny muted">日期
                <input className="input-line" type="number" style={{ width: 70, marginLeft: '.4rem' }} value={y} min={1900} max={2100} onChange={e => setY(Number(e.target.value) || 1988)} />
                <span className="tiny muted" style={{ margin: '0 .2rem' }}>/</span>
                <input className="input-line" type="number" style={{ width: 46 }} value={m} min={1} max={12} onChange={e => setM(Number(e.target.value) || 6)} />
                <span className="tiny muted" style={{ margin: '0 .2rem' }}>/</span>
                <input className="input-line" type="number" style={{ width: 46 }} value={d} min={1} max={31} onChange={e => setD(Number(e.target.value) || 15)} />
              </label>
              <label className="tiny muted">时刻
                <input className="input-line" type="number" style={{ width: 56, marginLeft: '.4rem' }} value={hour} min={0} max={23} onChange={e => setHour(Math.max(0, Math.min(23, Number(e.target.value) || 12)))} />
                <span className="tiny muted" style={{ marginLeft: '.3rem' }}>时（24 小时制）</span>
              </label>
              {artId === 'meihua' && (
                <label className="tiny muted">报数
                  <input className="input-line" type="number" style={{ width: 46, marginLeft: '.4rem' }} value={n1} min={1} max={9} onChange={e => setN1(Number(e.target.value) || 3)} />
                  <input className="input-line" type="number" style={{ width: 46, marginLeft: '.3rem' }} value={n2} min={1} max={9} onChange={e => setN2(Number(e.target.value) || 5)} />
                  <input className="input-line" type="number" style={{ width: 46, marginLeft: '.3rem' }} value={n3} min={1} max={9} onChange={e => setN3(Number(e.target.value) || 7)} />
                </label>
              )}
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
              {localResult ? RESULT_VIEWS[artId]?.(localResult) : null}
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
