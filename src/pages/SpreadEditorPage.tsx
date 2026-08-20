// 自创牌阵：创建/编辑自定义塔罗牌阵（2-10 位，localStorage）
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCustomTarotSpreads, saveCustomTarotSpread, deleteCustomTarotSpread } from '@core/data/tarotSpreads';
import { useConfirm } from '@/components/SongDialog';

export default function SpreadEditorPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [positions, setPositions] = useState<{ id: number; name: string; description: string }[]>([
    { id: 0, name: '现况', description: '当下的状况' },
    { id: 1, name: '指引', description: '可为之径' },
  ]);

  const addPos = () => {
    if (positions.length >= 10) return;
    setPositions([...positions, { id: positions.length, name: '位' + (positions.length + 1), description: '请书其义' }]);
  };

  const removePos = (i: number) => {
    if (positions.length <= 2) return;
    setPositions(positions.filter((_, j) => j !== i).map((p, j) => ({ ...p, id: j })));
  };

  const upd = (i: number, field: 'name' | 'description', v: string) => {
    setPositions(positions.map((p, j) => j === i ? { ...p, [field]: v } : p));
  };

  const save = () => {
    if (!name.trim() || positions.length < 2) return;
    const spread = {
      id: 'custom-' + Date.now(),
      name: name.trim(),
      description: description.trim() || '君之自创牌阵',
      positions,
      isCustom: true,
    };
    saveCustomTarotSpread(spread);
    navigate('/art/tarot');
  };

  const clearAll = async () => {
    const custom = getCustomTarotSpreads();
    if (!custom.length) return;
    const ok = await confirm('将尽除所创牌阵，共 ' + custom.length + ' 个，是否确然？', { title: '慎问', confirmText: '尽 除', danger: true });
    if (ok) {
      custom.forEach(s => deleteCustomTarotSpread(s.id));
      navigate('/art/tarot');
    }
  };

  const customList = getCustomTarotSpreads();

  return (
    <div className="wrap" style={{ paddingTop: 'var(--sp-7)', paddingBottom: 'var(--sp-6)', maxWidth: 760 }}>
      <Link className="back-link" to="/art/tarot">‹ 返问镜</Link>
      <div className="module-kicker">镜鉴 · 自创</div>
      <div className="module-title-row">
        <h2 className="module-title"><span className="cn">自创牌阵</span>布位立义</h2>
      </div>
      <p className="module-intro">为所问之事，自定牌位之序与其义。二至十位皆可。</p>

      <div className="altar-panel" style={{ position: 'static', marginTop: 'var(--sp-4)' }}>
        <div className="field"><label>牌阵名</label>
          <input className="input-line" placeholder="例：吾之三问" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="field"><label>牌阵述</label>
          <input className="input-line" placeholder="此阵为何而设…" value={description} onChange={e => setDescription(e.target.value)} /></div>
        <div className="field"><label>牌位（{positions.length}/10）</label>
          {positions.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem', alignItems: 'center' }}>
              <span className="tiny muted" style={{ width: '1.6rem', textAlign: 'right' }}>#{i + 1}</span>
              <input className="input-line" style={{ maxWidth: 180 }} placeholder="位名" value={p.name} onChange={e => upd(i, 'name', e.target.value)} />
              <input className="input-line" placeholder="位义" value={p.description} onChange={e => upd(i, 'description', e.target.value)} />
              <button className="pill hot" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => removePos(i)} disabled={positions.length <= 2}>删</button>
            </div>
          ))}
          <button className="btn-seal btn-ghost" style={{ fontSize: '.8rem', padding: '.35rem 1rem' }} onClick={addPos} disabled={positions.length >= 10}>增 位</button>
        </div>
        <div style={{ display: 'flex', gap: '.8rem', marginTop: 'var(--sp-3)' }}>
          <button className="btn-divine" style={{ width: 'auto', padding: '.7rem 2rem', marginTop: 0 }} onClick={save}>存 阵</button>
          <button className="btn-seal btn-ghost" style={{ fontSize: '.85rem', padding: '.5rem 1.2rem' }} onClick={clearAll}>清 所 创</button>
        </div>
      </div>

      {customList.length > 0 && (
        <div className="mt-4">
          <h3 className="tag-cool" style={{ letterSpacing: '.25em', marginBottom: 'var(--sp-2)' }}>已创牌阵</h3>
          {customList.map(s => (
            <div className="result-card" key={s.id} style={{ marginBottom: '.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{s.name}</strong> <span className="tiny muted">· {s.positions.length} 位 · {s.description}</span>
              </div>
              <button className="pill hot" style={{ cursor: 'pointer' }} onClick={async () => {
                const ok = await confirm('除「' + s.name + '」此阵？', { title: '慎问', confirmText: '除 之', danger: true });
                if (ok) { deleteCustomTarotSpread(s.id); navigate(0); }
              }}>删</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}