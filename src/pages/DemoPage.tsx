// 演示模式（Demo Mode）：无需后端 / 无需 API Key 的完整体验页
// 排盘用 shared/core 本地引擎计算，AI 报告加载内置示例（静态 JSON），GitHub Pages 上可直接体验
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { baziCalc } from '@core/engine/bazi';
import { BaziResult } from '@/components/arts/BaziArt';
import ReportView from '@/components/ReportView';
import { downloadReport, type AIReport } from '@/services/api';
import sample from '@/data/sample-report.json';
import Disclaimer from '@/components/Disclaimer';

// 虚构演示档案（中性，无真实个人信息）
const DEMO_BIRTH = { y: 1988, m: 6, d: 15, hourIndex: 6, time: '12:00', gender: '女' as const, location: { lng: 116.4, lat: 39.9, province: '北京市', city: '北京市', district: '东城区' } };

export default function DemoPage() {
  const [phase, setPhase] = useState<'idle' | 'casting' | 'done'>('idle');
  const [report, setReport] = useState<AIReport | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const chart = baziCalc(DEMO_BIRTH);

  const start = () => {
    setPhase('casting');
    setReport(null);
    // 模拟排盘+生成报告的等待，营造完整流程感
    setTimeout(() => {
      setReport((sample as any).report as AIReport);
      setPhase('done');
    }, 1600);
  };

  return (
    <div className="wrap" style={{ paddingTop: 'var(--sp-6)' }}>
      <section className="module-hero compact">
        <div className="wrap">
          <div className="mh-row">
            <Link className="back-link" to="/">‹ 返册页</Link>
            <h2 className="module-title"><span className="cn">体验演示</span><span className="mh-sub">无需后端 · 无需 API Key</span></h2>
            <p className="mh-kicker">内置示例排盘与 AI 报告，一键完整体验「排盘 → 解读 → 报告」全流程</p>
          </div>
        </div>
      </section>

      <div className="wrap" style={{ marginTop: 'var(--sp-4)' }}>
        {phase === 'idle' && (
          <div className="result-card" style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
            <p style={{ fontSize: '1.05rem', marginBottom: 'var(--sp-2)' }}>此页不调用任何后端服务——排盘由本地引擎计算，AI 报告为内置示例。</p>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-4)' }}>演示档案（虚构）：1988-06-15 · 北京 · 女</p>
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
              <BaziResult data={chart} />
              {report && (
                <div className="result-card mt-3">
                  <h3>AI 深度解读 <span className="tag-cool" style={{ marginLeft: '.4rem', fontSize: '.72rem' }}>示例报告</span></h3>
                  <ReportView report={report} artName="四柱八字" onExport={() => downloadReport(report, '四柱八字', '事业与感情运势如何')} />
                </div>
              )}
              <div className="btn-row mt-3 no-print">
                <button className="btn-seal btn-ghost" style={{ fontSize: '.9rem', padding: '.5rem 1.4rem' }} onClick={start}>重 新 演 示</button>
                <button className="btn-seal btn-ghost" style={{ fontSize: '.9rem', padding: '.5rem 1.4rem' }} onClick={() => setShowRaw(v => !v)}>{showRaw ? '隐 藏' : '查 看'}示例数据源</button>
                <Link className="btn-seal btn-ghost" style={{ fontSize: '.9rem', padding: '.5rem 1.4rem', textDecoration: 'none' }} to="/auth">用 真 实 档 案 体 验 →</Link>
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
