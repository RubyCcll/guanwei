// 入馆页：注册/登录 + 档案管理（列表/编辑/切换主档案/删除）
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiDivineHistory, apiDivineDetail, apiDivineDelete, downloadReport } from '@/services/api';
import ReportView from '@/components/ReportView';
import {
  register, login, logout, currentUser, updateProfile,
  updateSampleProfile, removeSampleProfile, promoteSampleProfile,
  type UserProfile, type NamedProfile,
} from '@/utils/userStore';
import { useConfirm } from '@/components/SongDialog';
import { syncRecordsFromServer } from '@/utils/recordStore';
import { syncProfileToServer } from '@/utils/userStore';
import ProfileForm from '@/components/ProfileForm';
export default function AuthPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [, tick] = useState(0);
  const refresh = () => tick(x => x + 1);
  const user = currentUser();
  const [mode, setMode] = useState<'login' | 'register' | 'profile'>(user ? 'profile' : 'register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  // 编辑态：{ type: 'primary' } 或 { type: 'sample', id }
  const [editing, setEditing] = useState<{ type: 'primary' } | { type: 'sample'; id: string } | null>(null); // 默认列表态

  const submit = () => {
    const r = mode === 'register' ? register(username, password) : login(username, password);
    setMsg(r.message);
    setMsgOk(r.ok);
    if (r.ok) {
      setMode('profile');
      setEditing({ type: 'primary' });
      navigate('/auth');
      syncRecordsFromServer().catch(() => {});
      if (r.user) syncProfileToServer(r.user.username, r.user.profile, r.user.samples).catch(() => {});
    }
  };

  const saveProfile = (p: UserProfile) => {
    if (!user) return;
    if (editing?.type === 'primary') {
      const u = updateProfile(p);
      if (u) { setMsg('主档案已存'); setMsgOk(true); syncProfileToServer(u.username, u.profile, u.samples).catch(() => {}); }
    } else if (editing?.type === 'sample') {
      const u = updateSampleProfile(editing.id, p);
      if (u) { setMsg('示例档案已存'); setMsgOk(true); syncProfileToServer(u.username, u.profile, u.samples).catch(() => {}); }
    }
    refresh();
  };

  const doLogout = () => { logout(); navigate('/'); };

  // ===== 占卜历史（v6：起占自动入库，可查看/删除） =====
  const [history, setHistory] = useState<{ divineId: string; artId: string; question: string | null; createdAt: number; hasReport: boolean; status: string }[]>([]);
  const [histLoaded, setHistLoaded] = useState(false);
  const [histDetail, setHistDetail] = useState<Record<string, unknown> | null>(null);
  const refreshHistory = async () => {
    if (!user) return;
    try {
      const r = await apiDivineHistory(user.username);
      setHistory(r.list);
      setHistLoaded(true);
    } catch { /* 后端不可用时忽略 */ }
  };
  useEffect(() => { if (user) { refreshHistory(); } /* eslint-disable-next-line */ }, [user?.username]);
  const openDetail = async (id: string) => {
    if (!user) return;
    const d = await apiDivineDetail(id, user.username);
    if (d) setHistDetail(d);
  };
  const delHistory = async (id: string) => {
    if (!user) return;
    const ok = await confirm('除「此占」于史册？', { title: '慎问', confirmText: '除 之', danger: true });
    if (ok && (await apiDivineDelete(id, user.username))) {
      setHistory(h => h.filter(x => x.divineId !== id));
    }
  };

  // 未登录：注册/登录
  if (!user) {
    return (
      <div className="wrap page-compact" style={{ paddingBottom: 'var(--sp-6)', maxWidth: 560 }}>
        <div className="section-eyebrow">入馆 · Gate</div>
        <h2 className="section-title" style={{ marginTop: '.8rem' }}>观微入馆</h2>
        <p className="section-note">录生辰档案，每日星运可依君而示；占问留痕，各归其馆。</p>
        <div className="altar-panel" style={{ position: 'static', marginTop: 'var(--sp-4)' }}>
          <div className="btn-row" style={{ marginBottom: 'var(--sp-3)' }}>
            <button className={"btn-seal " + (mode === 'register' ? '' : 'btn-ghost')} style={{ fontSize: '.9rem', padding: '.45rem 1.2rem' }} onClick={() => setMode('register')}>注 册</button>
            <button className={"btn-seal " + (mode === 'login' ? '' : 'btn-ghost')} style={{ fontSize: '.9rem', padding: '.45rem 1.2rem' }} onClick={() => setMode('login')}>登 录</button>
          </div>
          <div className="field"><label>名号</label><input className="input-line" placeholder="取一雅号" value={username} onChange={e => setUsername(e.target.value)} /></div>
          <div className="field"><label>密语</label><input className="input-line" type="password" placeholder="四字以上" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button className="btn-divine" onClick={submit}>{mode === 'register' ? '入 馆' : '入 座'}</button>
          {msg && <p className={"mt-3 " + (msgOk ? 'tag-cool' : 'tag-hot')}>{msg}</p>}
        </div>
      </div>
    );
  }

  // 编辑态：主档案或示例档案表单
  if (editing) {
    const target: NamedProfile | null = editing.type === 'sample'
      ? (user.samples.find(s => s.id === editing.id) || null)
      : null;
    const title = editing.type === 'primary' ? '主档案（默认账号档案）' : '示例档案 · ' + (target?.name || '');
    return (
      <div className="wrap page-compact" style={{ paddingBottom: 'var(--sp-6)', maxWidth: 640 }}>
        <div className="mh-row" style={{ marginBottom: 'var(--sp-3)' }}>
          <button className="back-link" onClick={() => { setEditing(null); refresh(); }}>‹ 返档案列表</button>
          <h2 className="page-title-compact">编 辑 · {title}</h2>
        </div>
        <div className="altar-panel" style={{ position: 'static', marginTop: 'var(--sp-4)' }}>
          <ProfileForm initial={editing.type === 'primary' ? user.profile : target!.profile} onChange={saveProfile} />
          <div className="btn-row mt-4">
            <button className="btn-seal" style={{ fontSize: '.85rem', padding: '.45rem 1.2rem' }} onClick={() => { setEditing(null); refresh(); }}>存 档 完 成</button>
            {editing.type === 'sample' && target && (
              <button className="btn-seal btn-ghost" style={{ fontSize: '.85rem', padding: '.45rem 1.2rem' }} onClick={async () => {
                const ok = await confirm('以「' + target.name + '」为主档案？原主档案将转示例。', { title: '慎问', confirmText: '设 为 主' });
                if (ok) { promoteSampleProfile(target.id); setEditing({ type: 'primary' }); refresh(); }
              }}>设为主档案</button>
            )}
            {editing.type === 'sample' && target && (
              <button className="btn-seal btn-ghost" style={{ fontSize: '.85rem', padding: '.45rem 1.2rem' }} onClick={async () => {
                const ok = await confirm('除「' + target.name + '」此档？', { title: '慎问', confirmText: '除 之', danger: true });
                if (ok) { removeSampleProfile(target.id); setEditing(null); refresh(); }
              }}>删 此 档</button>
            )}
          </div>
        </div>
        {msg && <p className={"mt-3 " + (msgOk ? 'tag-cool' : 'tag-hot')}>{msg}</p>}
      </div>
    );
  }

  // 列表态：主档案 + 示例档案卡片
  return (
    <div className="wrap page-compact" style={{ paddingBottom: 'var(--sp-6)', maxWidth: 760 }}>
      <div className="section-eyebrow">入馆 · 档案</div>
      <h2 className="section-title" style={{ marginTop: '.8rem' }}>吾之档案 · {user.username}</h2>
      <p className="section-note">主档案唯一（默认账号档案）；其余为示例档案，皆可编辑、切换。</p>

      <div className="profile-card primary" onClick={() => setEditing({ type: 'primary' })} role="button" tabIndex={0}>
        <div className="pc-badge">主</div>
        <div className="pc-body">
          <div className="pc-title">主档案 · {user.username}</div>
          <div className="pc-info">{profileLine(user.profile)}</div>
        </div>
        <div className="pc-action">编 辑 ›</div>
      </div>

      {user.samples.length === 0 ? (
        <div className="result-placeholder" style={{ marginTop: 'var(--sp-4)', minHeight: 140 }}>
          <div className="glyph" style={{ fontSize: '2rem' }}>档</div>
          <p>尚无示例档案 · 排盘时可「存为示例档案」</p>
        </div>
      ) : (
        <div className="mt-4" style={{ display: 'grid', gap: '.8rem' }}>
          {user.samples.map(s => (
            <div className="profile-card" key={s.id} onClick={() => setEditing({ type: 'sample', id: s.id })} role="button" tabIndex={0}>
              <div className="pc-badge sample">示</div>
              <div className="pc-body">
                <div className="pc-title">{s.name}</div>
                <div className="pc-info">{profileLine(s.profile)}</div>
              </div>
              <div className="pc-action">编 辑 ›</div>
            </div>
          ))}
        </div>
      )}

      {/* 占卜历史（起占自动入库；可查看详情、可删除） */}
      <h3 className="panel-title" style={{ marginTop: 'var(--sp-6)' }}>占卜历史 · {user.username}</h3>
      {!histLoaded ? (
        <p className="tiny muted" style={{ marginTop: 'var(--sp-2)' }}>载录中……</p>
      ) : history.length === 0 ? (
        <div className="result-placeholder" style={{ marginTop: 'var(--sp-3)', minHeight: 110 }}>
          <div className="glyph" style={{ fontSize: '1.8rem' }}>史</div>
          <p>尚无占卜记录 · 起占后自动载入此册</p>
        </div>
      ) : (
        <div className="mt-3" style={{ display: 'grid', gap: '.6rem' }}>
          {history.map(h => (
            <div className="profile-card" key={h.divineId} style={{ cursor: 'pointer' }} onClick={() => openDetail(h.divineId)} role="button" tabIndex={0}>
              <div className="pc-badge sample">{artNameOf(h.artId)}</div>
              <div className="pc-body">
                <div className="pc-title">{h.question || '（未书，心念已至）'}</div>
                <div className="pc-info">
                  {new Date(h.createdAt).toLocaleString('zh-CN')}
                  {' · ' + (h.hasReport ? '已有 AI 报告' : h.status === 'ai_poor' ? 'AI 未成' : '仅排盘')}
                </div>
              </div>
              <div className="pc-action" onClick={(e) => { e.stopPropagation(); delHistory(h.divineId); }} role="button" tabIndex={0} style={{ color: 'var(--ink-faint)' }}>删 除</div>
            </div>
          ))}
        </div>
      )}

      {/* 历史详情弹层：排盘数据 + AI 报告 */}
      {histDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,25,20,.55)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setHistDetail(null)}>
          <div className="altar-panel" style={{ position: 'static', maxWidth: 720, maxHeight: '82vh', overflowY: 'auto', background: 'var(--paper)' }} onClick={e => e.stopPropagation()}>
            <div className="mh-row" style={{ marginBottom: 'var(--sp-2)' }}>
              <h3 className="panel-title">占 卜 详 情</h3>
              <button className="btn-seal btn-ghost" style={{ fontSize: '.78rem', padding: '.3rem .9rem' }} onClick={() => setHistDetail(null)}>关 闭</button>
            </div>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-3)' }}>
              {artNameOf(String(histDetail.artId || ''))} · {new Date(Number(histDetail.createdAt)).toLocaleString('zh-CN')}
              {histDetail.question ? ' · 所问：' + String(histDetail.question) : ''}
            </p>
            {histDetail.report ? (
              <ReportView report={histDetail.report as any} artName={artNameOf(String(histDetail.artId || ''))} onExport={() => downloadReport(histDetail.report as any, artNameOf(String(histDetail.artId || '')), String(histDetail.question || ''))} />
            ) : (
              <div className="result-placeholder" style={{ minHeight: 120 }}>
                <div className="glyph" style={{ fontSize: '1.8rem' }}>盘</div>
                <p>此占尚未召 AI 成文，仅存排盘之象</p>
              </div>
            )}
            {histDetail.resultRaw ? (
              <details className="mh-intro" style={{ marginTop: 'var(--sp-2)' }}>
                <summary>排盘原始数据</summary>
                <pre style={{ fontSize: '.72rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(histDetail.resultRaw, null, 1)}</pre>
              </details>
            ) : null}
          </div>
        </div>
      )}

      <div className="btn-row mt-5">
        <button className="btn-seal btn-ghost" style={{ fontSize: '.85rem', padding: '.4rem 1.2rem' }} onClick={doLogout}>离 馆</button>
        <Link className="btn-seal" style={{ fontSize: '.85rem', padding: '.4rem 1.2rem' }} to="/">返 首 页</Link>
      </div>
    </div>
  );
}

// 档案摘要行
function profileLine(p: UserProfile): string {
  const parts = [p.birthDate + ' ' + (p.birthTime || '--:--')];
  parts.push('时辰' + (p.birthHourIndex + 1));
  parts.push(p.gender);
  if (p.location) {
    parts.push(p.location.province + p.location.city + (p.location.district || ''));
    parts.push(p.location.lng.toFixed(2) + '°E ' + p.location.lat.toFixed(2) + '°N');
  } else {
    parts.push('未录地');
  }
  return parts.join(' · ');
}

// 术名映射（占卜历史展示用）
const ART_NAMES: Record<string, string> = {
  bazi: '八字', ziwei: '紫微', astrology: '星盘',
  qimen: '奇门', meihua: '梅花', liuyao: '六爻',
  liuren: '大六壬', xiaoliuren: '小六壬', tarot: '塔罗',
};
function artNameOf(id: string): string {
  return ART_NAMES[id] || id || '占';
}