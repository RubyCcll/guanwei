// AI 解读报告结构化展示：按 Schema 匹配填充（命盘类/占问类）
import type { AIReport } from '@/services/api';
import { ResultCard } from '@/components/ResultCard';

interface Props {
  report: AIReport;
  artName: string;
  onExport: () => void;
}

export default function ReportView({ report, artName, onExport }: Props) {
  const r = report;
  return (
    <div className="report-view">
      {/* 标题与总述 */}
      <div className="result-card">
        <h3>{r.title || '观微解读报告'}</h3>
        <p className="tiny muted" style={{ marginBottom: '.5rem' }}>术别：{artName}</p>
        {r.overview && <p className="result-text" style={{ fontSize: '1rem', color: 'var(--ink)' }}>{r.overview}</p>}
      </div>

      {/* 适问之辨 */}
      {r.suitability && (r.suitability.note || r.suitability.suggestion) && (
        <div className={"result-card fit-card " + (r.suitability.suitable === true ? 'fit-ok' : r.suitability.suitable === 'partial' ? 'fit-partial' : 'fit-bad')}>
          <h3>适问之辨</h3>
          {r.suitability.note && <p className="result-text">{r.suitability.note}</p>}
          {r.suitability.suggestion && <p className="result-text"><strong>✦ 建议：</strong>{r.suitability.suggestion}</p>}
        </div>
      )}

      {/* 原始解读 */}
      {(r.rawReading?.summary || r.rawReading?.keyPoints?.length) && (
        <div className="result-card">
          <h3>原始解读 · 先明盘面</h3>
          {r.rawReading.summary && <p className="result-text">{r.rawReading.summary}</p>}
          {r.rawReading.keyPoints.length > 0 && (
            <ul className="report-list mt-2">
              {r.rawReading.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* 命盘类：性格/人生阶段/事业/爱情/财富 */}
      {r.kind === 'mingpan' && (
        <>
          {r.character && (r.character.summary || r.character.traits.length > 0) && (
            <div className="result-card">
              <h3>命主性格</h3>
              {r.character.summary && <p className="result-text">{r.character.summary}</p>}
              {r.character.traits.length > 0 && (
                <div className="trait-grid mt-3">
                  {r.character.traits.map((t, i) => (
                    <div className="trait-cell" key={i}>
                      <div className="trait-name">{t.name}</div>
                      <div className="trait-desc">{t.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {r.lifeStages && r.lifeStages.length > 0 && (
            <div className="result-card">
              <h3>人生阶段</h3>
              <div className="timeline mt-3">
                {r.lifeStages.map((s, i) => (
                  <div className="tl-item" key={i}>
                    <div className="tl-marker"><span className="tl-dot" /></div>
                    <div className="tl-body">
                      <div className="tl-head"><strong>{s.stage}</strong><span className="tl-age">{s.age}</span></div>
                      <p className="tl-summary">{s.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(r.family?.background || r.family?.parents || r.family?.imprint) && (
            <div className="result-card">
              <h3>原生家庭</h3>
              {r.family.background && (
                <div className="fam-block"><p className="tiny muted" style={{ margin: '.3rem 0 .4rem' }}>家境与氛围</p><p className="result-text">{r.family.background}</p></div>
              )}
              {r.family.parents && (
                <div className="fam-block"><p className="tiny muted" style={{ margin: '.3rem 0 .4rem' }}>父母关系</p><p className="result-text">{r.family.parents}</p></div>
              )}
              {r.family.imprint && (
                <div className="fam-block"><p className="tiny muted" style={{ margin: '.3rem 0 .4rem' }}>家庭印记</p><p className="result-text">{r.family.imprint}</p></div>
              )}
            </div>
          )}

          {(r.mind?.action || r.mind?.pattern || r.mind?.growth) && (
            <div className="result-card">
              <h3>心智与行动模式</h3>
              {r.mind.action && (
                <div className="mind-block"><p className="tiny muted" style={{ margin: '.3rem 0 .4rem' }}>行动力与坚持</p><p className="result-text">{r.mind.action}</p></div>
              )}
              {r.mind.pattern && (
                <div className="mind-block"><p className="tiny muted" style={{ margin: '.3rem 0 .4rem' }}>行为循环</p><p className="result-text">{r.mind.pattern}</p></div>
              )}
              {r.mind.growth && (
                <div className="mind-block"><p className="tiny muted" style={{ margin: '.3rem 0 .4rem' }}>成长方向</p><p className="result-text">{r.mind.growth}</p></div>
              )}
            </div>
          )}

          {(r.career?.summary || r.love?.summary || r.wealth?.summary || r.health?.summary) && (
            <div className="result-card">
              <h3>学业事业 · 爱情 · 财富 · 健康</h3>
              <div className="domain-grid mt-3">
                {r.career?.summary && (
                  <div className="domain-cell">
                    <div className="domain-name">学业 · 事业</div>
                    <p>{r.career.summary}</p>
                    {r.career.direction && <p className="tiny muted">宜向：{r.career.direction}</p>}
                    {r.career.advice && <p className="tiny">建议：{r.career.advice}</p>}
                  </div>
                )}
                {r.love?.summary && (
                  <div className="domain-cell">
                    <div className="domain-name">爱情</div>
                    <p>{r.love.summary}</p>
                    {r.love.advice && <p className="tiny">建议：{r.love.advice}</p>}
                  </div>
                )}
                {r.wealth?.summary && (
                  <div className="domain-cell">
                    <div className="domain-name">财富</div>
                    <p>{r.wealth.summary}</p>
                    {r.wealth.advice && <p className="tiny">建议：{r.wealth.advice}</p>}
                  </div>
                )}
                {r.health?.summary && (
                  <div className="domain-cell">
                    <div className="domain-name">健康</div>
                    <p>{r.health.summary}</p>
                    {r.health.advice && <p className="tiny">建议：{r.health.advice}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* 占问类：现状/趋势/时机 */}
      {r.kind === 'zhanwen' && (
        <div className="result-card">
          <h3>局势 · 趋势 · 时机</h3>
          <div className="domain-grid mt-3">
            {r.situation && <div className="domain-cell"><div className="domain-name">当下局势</div><p>{r.situation}</p></div>}
            {r.trend && <div className="domain-cell"><div className="domain-name">发展趋势</div><p>{r.trend}</p></div>}
            {r.timing && <div className="domain-cell"><div className="domain-name">时机宜忌</div><p>{r.timing}</p></div>}
          </div>
        </div>
      )}

      {/* 建议 */}
      {r.advice && (
        <div className="result-card">
          <h3>参详建议</h3>
          <ul className="report-list mt-1">
            {r.advice.split(/[;；]/).filter(Boolean).map((a, i) => <li key={i}>{a.trim()}</li>)}
          </ul>
        </div>
      )}

      {/* 结语 */}
      {r.conclusion && (
        <div className="result-card">
          <h3>结语</h3>
          <p className="result-text">{r.conclusion}</p>
        </div>
      )}

      {/* AI 自定义扩展章节兜底（family/mind 之外的任意字段 / 旧版 chapters 结构）：任何内容都不丢失 */}
      {((r as any).extraSections?.length > 0 || (r as any).chapters?.length > 0) && (
        <div className="result-card">
          <h3>更多参详</h3>
          {(r as any).chapters?.map((c: any, i: number) => (
            <div key={'ch' + i} style={{ marginBottom: 'var(--sp-2)' }}>
              <p className="tag-cool" style={{ marginBottom: '.3rem' }}><strong>{c.skill || '参详'}</strong></p>
              <p className="result-text" style={{ whiteSpace: 'pre-wrap' }}>{c.content}</p>
            </div>
          ))}
          {(r as any).extraSections?.map((s: any, i: number) => (
            <div key={'ex' + i} style={{ marginBottom: 'var(--sp-2)' }}>
              <p className="tag-cool" style={{ marginBottom: '.3rem' }}><strong>{s.skill || '参详'}</strong></p>
              <p className="result-text" style={{ whiteSpace: 'pre-wrap' }}>{s.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* 免责 + 导出 */}
      <p className="tiny muted" style={{ marginTop: 'var(--sp-2)' }}>{r.disclaimer}</p>
      <div className="btn-row mt-3">
        <button className="btn-seal btn-ghost" style={{ fontSize: '.82rem', padding: '.4rem 1.1rem' }} onClick={onExport}>
          导 出 报 告
        </button>
        <button className="btn-seal btn-ghost" style={{ fontSize: '.82rem', padding: '.4rem 1.1rem' }} onClick={() => window.print()}>
          存 为 PDF
        </button>
      </div>
    </div>
  );
}