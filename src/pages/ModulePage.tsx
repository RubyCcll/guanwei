// 九术模块工作台：输入面板 + 起占状态机 + 结果渲染 + AI 入口 + 免责声明
import { useParams, Link } from 'react-router-dom';
import { artById } from '@/data/arts';
import Disclaimer from '@/components/Disclaimer';
import { ResultPlaceholder } from '@/components/ResultCard';
import { useDivine } from '@/hooks/useDivine';
import { useAIInterpret } from '@/hooks/useAIInterpret';
import { artPairOf } from '@/arts/registry';
import { saveRecord } from '@/utils/recordStore';
import { apiDivine, type AIReport } from '@/services/api';
import ReportView from '@/components/ReportView';
import { currentUser, addSampleProfile } from '@/utils/userStore';
import { analyzeQuestionFit } from '@core/engine/questionFit';
import type { UserProfile } from '@/utils/userStore';
import { useEffect, useRef, useState } from 'react';


const PANEL_META: Record<string, { panelTitle: string; btn: string; btnSmall: string }> = {
  bazi:       { panelTitle: '布盘', btn: '排 盘', btnSmall: '布四柱 · 观五行 · 推十神' },
  ziwei:      { panelTitle: '布盘', btn: '布 盘', btnSmall: '安命宫 · 定紫微 · 布主星' },
  qimen:      { panelTitle: '起局', btn: '起 局', btnSmall: '定时 · 定局 · 布三奇六仪' },
  meihua:     { panelTitle: '起卦', btn: '起 卦', btnSmall: '定本卦 · 推互变 · 辨体用' },
  liuyao:     { panelTitle: '摇卦', btn: '掷 钱 成 卦', btnSmall: '六掷成卦 · 观变断象' },
  liuren:     { panelTitle: '起课', btn: '起 课', btnSmall: '立天地盘 · 布四课 · 取三传' },
  xiaoliuren: { panelTitle: '占时', btn: '掐 指 一 算', btnSmall: '大安起月 · 月上起日 · 日上起时' },
  astrology:  { panelTitle: '布盘', btn: '布 星 图', btnSmall: '推行星黄经 · 布十二宫' },
  tarot:      { panelTitle: '问镜', btn: '洗 牌 抽 牌', btnSmall: '静心默问 · 凭心取牌' },
};

// AI 错误码 → 用户可行动的引导文案（与后端 mapLlmError 呼应；null = 无专门引导）
function aiErrorHint(code: string): string | null {
  switch (code) {
    case 'AI_HTTP_401': return '💡 多半是 API Key 无效或过期：检查服务端 .env 中 Key 是否正确（可运行 guanwei doctor 自检）。';
    case 'AI_HTTP_403': return '💡 API Key 无权限访问该模型：请检查服务商账号权限，或换用其他服务商 Key。';
    case 'AI_HTTP_404': return '💡 模型名有误：请检查服务端 .env 中 LLM_*_MODEL 配置与所选服务商是否匹配。';
    case 'AI_HTTP_429': return '💡 请求过频或额度不足：稍等片刻再试；若常触发，可检查服务商账户余额。';
    case 'AI_HTTP_500':
    case 'AI_HTTP_502':
    case 'AI_HTTP_503':
    case 'AI_HTTP_504': return '💡 AI 服务商暂时不可用：过一会儿再试即可，无需改动配置。';
    case 'STREAM_TIMEOUT': return '💡 生成超时：网络波动或服务繁忙，请重试。';
    case 'NETWORK': return '💡 网络连接异常：请检查本机网络，或确认服务仍在运行（guanwei status）。';
    default: return null;
  }
}

export default function ModulePage() {
  const { artId } = useParams<{ artId: string }>();
  const art = artId ? artById(artId) : undefined;
  const { status, result, divineId, errorMsg: divineError, divine, reset } = useDivine();
  const ai = useAIInterpret();

  // 面板上报的出生档案（供存为档案）
  const profileRef = useRef<UserProfile | null>(null);
  const questionRef = useRef('');
  const inputsRef = useRef<unknown>(null);
  const profileIdRef = useRef('main');
  const [fit, setFit] = useState<{ suitable: boolean | 'partial'; reason: string; suggestion: string } | null>(null);
  const divineWithProfile = async (inputs: unknown, profile?: UserProfile, question?: string, profileId?: string) => {
    // 新起占：重置 AI 解读状态，避免内容区残留上一档案的报告（含在途流式结果作废）
    ai.reset();
    if (profile) profileRef.current = profile;
    inputsRef.current = inputs;
    profileIdRef.current = profileId || 'main';
    if (question !== undefined) questionRef.current = question;
    // 问题适配性分析（无问题时不提示）
    const q = question !== undefined ? question : ((document.getElementById('q-input') as HTMLInputElement)?.value || '');
    setFit(q.trim() ? analyzeQuestionFit(art?.id || '', q.trim()) : null);
    // 游客不允许：未登录直接提示
    const user = currentUser();
    if (!user) {
      alert('请先入馆（登录）再起占');
      return;
    }
    divine(async () => {
      const r = await apiDivine(user.username, art?.id || '', inputs, profile || user.profile, q.trim() || undefined, profileId || 'main');
      return { resultRaw: r.resultRaw, divineId: r.divineId };
    });
  };
  const isProfileArt = ['bazi', 'ziwei', 'astrology'].includes(art?.id || '');
  const exportReport = (rep: AIReport) => {
    const artName = art?.name || '观微';
    const lines = [
      '# ' + (rep.title || '观微解读报告'),
      '',
      '> 术别：' + artName + '　·　' + new Date().toLocaleString('zh-CN'),
      '',
      '## 总述',
      '',
      rep.overview,
      '',
      '## 原始解读',
      '',
      rep.rawReading?.summary || '',
      ...(rep.rawReading?.keyPoints || []).map(k => '- ' + k),
      '',
      ...(rep.character ? ['## 命主性格', '', rep.character.summary || '', ...(rep.character.traits || []).map(t => '- **' + t.name + '**：' + t.desc), ''] : []),
      ...(rep.lifeStages ? ['## 人生阶段', '', ...rep.lifeStages.map(s => '**' + s.stage + '（' + s.age + '）**：' + s.summary), ''] : []),
      ...(rep.career?.summary ? ['## 学业 · 事业', '', rep.career.summary, '宜向：' + (rep.career.direction || ''), '建议：' + (rep.career.advice || ''), ''] : []),
      ...(rep.love?.summary ? ['## 爱情', '', rep.love.summary, '建议：' + (rep.love.advice || ''), ''] : []),
      ...(rep.wealth?.summary ? ['## 财富', '', rep.wealth.summary, '建议：' + (rep.wealth.advice || ''), ''] : []),
      ...(rep.health?.summary ? ['## 健康', '', rep.health.summary, '建议：' + (rep.health.advice || ''), ''] : []),
      ...(rep.situation ? ['## 当下局势', '', rep.situation, ''] : []),
      ...(rep.trend ? ['## 发展趋势', '', rep.trend, ''] : []),
      ...(rep.timing ? ['## 时机宜忌', '', rep.timing, ''] : []),
      ...(rep.advice ? ['## 参详建议', '', ...rep.advice.split(/[;；]/).filter(Boolean).map(a => (a.trim() ? '- ' + a.trim() : '')), ''] : []),
      ...(rep.conclusion ? ['## 结语', '', rep.conclusion, ''] : []),
      '---',
      rep.disclaimer || '',
    ].filter(Boolean);
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (rep.title || '观微报告') + '.md';
    a.click();
    URL.revokeObjectURL(url);
  };
  const [saveName, setSaveName] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const doSaveProfile = () => {
    if (!profileRef.current) return;
    const u = addSampleProfile(saveName, profileRef.current);
    setSaveMsg(u ? '已存为示例档案「' + (saveName.trim() || '未名档案') + '」' : '请先入馆，方可存档');
    setSaveName('');
  };

  // 后端起占记录的 divineId（AI 解读用）
  const divineIdRef = useRef<string | null>(null);
  divineIdRef.current = divineId;

  // ─── 术数切换（/art/qimen → /art/ziwei）必须全量重置 ───
  // 若不重置：上一术的 status='done' + result 会传给新术的 Result 组件，
  // 新术访问旧数据结构中不存在的字段 → TypeError → ErrorBoundary 兜底显示「此页一时未应机」
  const prevArtRef = useRef(artId);
  useEffect(() => {
    if (prevArtRef.current !== artId) {
      prevArtRef.current = artId;
      ai.reset();          // 清 AI 解读 + 在途流式请求作废（reqId 失效）
      reset();             // 清排盘 status/result/divineId
      setFit(null);
      profileRef.current = null;
      questionRef.current = '';
      inputsRef.current = null;
      profileIdRef.current = 'main';
      savedRef.current = null;
    }
  }, [artId, ai, reset]);

  // 起占成功 → 自动存档（StrictMode 防重复：以 result 引用去重）
  const savedRef = useRef<unknown>(null);
  useEffect(() => {
    if (status === 'done' && result && art && savedRef.current !== result) {
      savedRef.current = result;
      const loc = profileRef.current?.location;
      const prof = profileRef.current;
      saveRecord({
        artId: art.id,
        createdAt: Date.now(),
        result,
        location: loc ? { lng: loc.lng, lat: loc.lat, province: loc.province, city: loc.city, district: loc.district } : undefined,
        profileId: profileIdRef.current,
        profile: prof ? { birthDate: prof.birthDate, birthTime: prof.birthTime, gender: prof.gender, location: prof.location } : null,
        inputs: inputsRef.current,
        question: questionRef.current || undefined,
      });
    }
  }, [status, result, art]);

  if (!art) {
    return (
      <div className="wrap" style={{ paddingTop: 'var(--sp-7)', textAlign: 'center' }}>
        <div className="result-placeholder">
          <div className="glyph">无</div>
          <p>术无此名 · 请返册页再择</p>
        </div>
        <div className="mt-4"><Link className="btn-seal btn-ghost" to="/">返 册 页</Link></div>
      </div>
    );
  }

  const pair = artPairOf(art.id);
  const meta = PANEL_META[art.id];
  const PairPanel = pair?.Panel;
  const PairResult = pair?.Result;

  return (
    <>
      <section className="module-hero compact">
        <div className="wrap">
          <div className="mh-row">
            <Link className="back-link" to="/" onClick={() => setTimeout(() => document.getElementById('home-arts')?.scrollIntoView(), 60)}>
              ‹ 返册页
            </Link>
            <h2 className="module-title"><span className="cn">{art.name}</span><span className="mh-sub">{art.poem}</span></h2>
            <p className="mh-kicker">{art.kicker}</p>
          </div>
          <details className="mh-intro">
            <summary>术之源流 · 点击展卷</summary>
            <p>{art.intro}</p>
            <p className="source">{art.source}</p>
          </details>
        </div>
      </section>

      <div className="wrap">
        <div className="altar">
          <aside className="altar-panel" aria-label={`${art.name}输入`}>
            <h3 className="panel-title">{meta?.panelTitle ?? '问占'}</h3>
            {PairPanel ? <PairPanel onDivine={divineWithProfile} /> : (
              <div className="result-placeholder" style={{ minHeight: 260, marginTop: 'var(--sp-3)' }}>
                <div className="glyph" style={{ fontSize: '2rem' }}>{art.glyph}</div>
                <p>此术之具，静候铺陈</p>
              </div>
            )}
          </aside>
          <div className="altar-result stagger">
            {fit && fit.suitable !== true && (
              <div className="fit-note" role="note">
                <strong>{fit.suitable === 'partial' ? '适问之辨 · 部分相契' : '适问之辨 · 不甚相契'}</strong>
                <p>{fit.reason}</p>
                {fit.suggestion && <p className="fit-suggest">✦ {fit.suggestion}</p>}
              </div>
            )}
            {status === 'idle' && <ResultPlaceholder glyph={art.glyph} text={pair?.placeholder ?? '静候卦象 · 观微知著'} />}
            {status === 'casting' && (
              <div className="result-placeholder">
                <div className="casting-ring"><div className="casting-glyph" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-zm)', fontSize: '1.6rem', color: 'var(--celadon-deep)' }}>{art.glyph}</div></div>
                <p>凝神静气 · 卦象将成</p>
              </div>
            )}
            {status === 'done' && result ? (PairResult ? <PairResult data={result} /> : null) : null}
            {status === 'error' && (
              <ResultPlaceholder glyph="滞" text={divineError || '推演未应机 · 请稍后再试'} />
            )}
            {status === 'done' && result ? (
              <div className="result-card mt-3">
                <h3>AI 深度解读</h3>
                {ai.status === 'idle' && (
                  <div className="result-text">
                    <p>排盘既成，可召 AI 以现代语言为君详解；引经据典处，另依古籍话术标注出处。</p>
                    <button
                      className="btn-seal"
                      style={{ marginTop: 'var(--sp-2)', fontSize: '.9rem', padding: '.5rem 1.4rem' }}
                      onClick={() => {
                      console.log('[观微 AI] 点击召请，artId=', art.id, 'question=', questionRef.current, 'API_BASE=', (window as any).__API_BASE__ || '/api');
                      ai.interpret({ artId: art.id, divineId: divineIdRef.current || undefined, question: questionRef.current || undefined, profile: profileRef.current || undefined, reportMode: true, fit: fit || undefined });
                    }}
                    >
                      召 AI 成报告
                    </button>
                  </div>
                )}
                {ai.status === 'streaming' && (
                  <div className="ai-streaming">
                    <div className="ai-stream-head">
                      <span className="ai-spinner" aria-hidden="true" />
                      <span className="tag-cool">AI 依术呈卷中……（Skills 编排 · 分章成文）</span>
                    </div>
                    <p className="tiny muted" style={{ marginTop: '.3rem' }}>已生成 <span className="ai-count" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--celadon-deep)', fontWeight: 600 }}>{ai.text.length}</span> 字 · 长文约需 20-60 秒，请稍候</p>
                    <div className="ai-stream-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, padding: 'var(--sp-2) 0' }}>
                      <p className="muted" style={{ fontSize: 'var(--fs-sm)', letterSpacing: '.3em', animation: 'pulse-soft 1.8s ease-in-out infinite' }}>静候呈卷 · 成文后即展全篇</p>
                    </div>
                  </div>
                )}
                {ai.status === 'done' && (
                  <div className="result-text">
                    {ai.truncated && (
                      <div className="ai-error" style={{ marginBottom: 'var(--sp-2)' }}>
                        <p className="tag-hot"><strong>内容截断</strong>：本次呈卷因篇幅限制未能完整生成，可重试。</p>
                      </div>
                    )}
                    {ai.quality === 'poor' && (
                      <div className="ai-error" style={{ marginBottom: 'var(--sp-2)' }}>
                        <p className="tag-hot"><strong>内容不完整</strong>：本次解读部分章节缺失，可重试。</p>
                      </div>
                    )}
                    {ai.report ? (
                      <ReportView report={ai.report} artName={art.name} onExport={() => exportReport(ai.report!)} />
                    ) : ai.sections.length > 0 ? ai.sections.map((s, i) => (
                      <div key={i} style={{ marginBottom: 'var(--sp-2)' }}>
                        <p className="tag-cool" style={{ marginBottom: '.3rem' }}><strong>{s.title}</strong></p>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{s.content}</p>
                      </div>
                    )) : ai.text ? <p style={{ whiteSpace: 'pre-wrap' }}>{ai.text}</p> : null}
                    {!ai.report && <p className="tiny muted" style={{ marginTop: 'var(--sp-2)', borderTop: '1px solid var(--line-soft)', paddingTop: '.6rem' }}>凡占问所得，仅供修身养性、怡情遣兴之用，不构成决策依据。</p>}
                  </div>
                )}
                {ai.status === 'error' && (
                  <div className="ai-error">
                    <p className="tag-hot"><strong>AI 未应机</strong>：{ai.errorMsg || 'AI 解读暂未应机，请稍后再试。'}</p>
                    {ai.errorCode === 'AI_UNCONFIGURED' ? (
                      <div className="ai-config-hint" style={{ marginTop: '.5rem', padding: '.6rem .8rem', border: '1px dashed var(--cinnabar)', borderRadius: 'var(--r-sm)' }}>
                        <p className="tiny"><strong>尚未配置 AI 服务的 API Key</strong>——配置后即可生成 AI 报告：</p>
                        <ol className="tiny muted" style={{ margin: '.4rem 0 0 1.2rem', lineHeight: 1.8 }}>
                          <li>终端进入项目目录，运行 <code style={{ background: 'rgba(0,0,0,.06)', padding: '0 .3rem' }}>./scripts/setup.sh --key 你的APIKey</code>（Windows：<code style={{ background: 'rgba(0,0,0,.06)', padding: '0 .3rem' }}>scripts\setup.bat --key 你的APIKey</code>）</li>
                          <li>Key 申请入口与详细步骤见 <a href="https://github.com/RubyCcll/guanwei#%F0%9F%94%91-%E8%8E%B7%E5%8F%96-api-key" target="_blank" rel="noreferrer">README · 获取 API Key</a>（DeepSeek 等 5 家任选）</li>
                          <li>配置后重启服务即可；也可运行 <code style={{ background: 'rgba(0,0,0,.06)', padding: '0 .3rem' }}>guanwei doctor</code> 检查配置</li>
                        </ol>
                      </div>
                    ) : aiErrorHint(ai.errorCode) ? (
                      <p className="tiny muted" style={{ marginTop: '.4rem' }}>{aiErrorHint(ai.errorCode)}</p>
                    ) : (
                      <p className="tiny muted">古法规则解读为备，可先依上列排盘自行观照；若为 AI 服务异常，可于服务端检查 LLM 配置后重试。</p>
                    )}
                    <div className="btn-row" style={{ marginTop: 'var(--sp-2)' }}>
                      <button className="btn-seal" style={{ fontSize: '.82rem', padding: '.4rem 1.1rem' }} onClick={() => ai.interpret({ artId: art.id, resultRaw: result, question: questionRef.current || undefined, profile: profileRef.current || undefined, reportMode: true, fit: fit || undefined })}>重 试</button>
                      <button className="btn-seal btn-ghost" style={{ fontSize: '.82rem', padding: '.4rem 1.1rem' }} onClick={ai.reset}>收 起</button>
                    </div>
                  </div>
                )}
                {isProfileArt && currentUser() && (
                  <div className="no-print" style={{ marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--line-soft)' }}>
                    <p className="tiny muted" style={{ marginBottom: '.4rem' }}>存此排盘入馆为示例档案（主档案唯一，此为示例）：</p>
                    <div className="btn-row" style={{ gap: '.5rem' }}>
                      <input className="input-line" style={{ maxWidth: 240 }} placeholder="档案名，如：1995 生辰" value={saveName} onChange={e => setSaveName(e.target.value)} />
                      <button className="btn-seal" style={{ fontSize: '.8rem', padding: '.35rem 1rem' }} onClick={doSaveProfile}>存 档</button>
                    </div>
                    {saveMsg && <p className={"tiny mt-1 " + (saveMsg.includes('已存') ? 'tag-cool' : 'tag-hot')}>{saveMsg}</p>}
                  </div>
                )}
                <button className="btn-seal btn-ghost no-print" style={{ marginTop: 'var(--sp-3)', fontSize: '.9rem', padding: '.5rem 1.4rem' }} onClick={() => { ai.reset(); reset(); }}>再 起 一 占</button>
              </div>
            ) : null}
          </div>
        </div>
        <Disclaimer />
      </div>
    </>
  );
}