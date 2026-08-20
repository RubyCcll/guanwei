import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, GripVertical } from 'lucide-react';
import type { Spread, SpreadPosition } from '@/types';
import { saveCustomSpread, getCustomSpreads, deleteCustomSpread } from '@/utils/spreadStorage';

export default function SpreadEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [positions, setPositions] = useState<SpreadPosition[]>([
    { id: 0, name: '现状', description: '当前状态', x: 50, y: 50 },
  ]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      const custom = getCustomSpreads();
      const spread = custom.find(s => s.id === id);
      if (spread) {
        setName(spread.name);
        setDescription(spread.description);
        setPositions(spread.positions);
      }
    }
  }, [id, isEdit]);

  const addPosition = () => {
    if (positions.length >= 12) return;
    const newId = positions.length;
    const cols = Math.ceil(Math.sqrt(positions.length + 1));
    const row = Math.floor(positions.length / cols);
    const col = positions.length % cols;
    setPositions([
      ...positions,
      {
        id: newId,
        name: `位置${newId + 1}`,
        description: '请输入描述',
        x: 15 + (col * 70 / (cols - 1 || 1)),
        y: 15 + (row * 70 / (cols - 1 || 1)),
      },
    ]);
  };

  const updatePosition = (idx: number, field: keyof SpreadPosition, value: string | number) => {
    setPositions(positions.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removePosition = (idx: number) => {
    if (positions.length <= 2) return;
    setPositions(positions.filter((_, i) => i !== idx).map((p, i) => ({ ...p, id: i })));
  };

  const handleSave = () => {
    if (!name.trim() || positions.length < 2) return;

    const spread: Spread = {
      id: isEdit && id ? id : `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || '我的自定义牌阵',
      positions,
      category: 'custom',
      isCustom: true,
      scene: ['general'],
    };

    saveCustomSpread(spread);
    navigate('/spread-library');
  };

  const handleDelete = () => {
    if (!isEdit || !id) return;
    if (confirm('确定删除这个牌阵？')) {
      deleteCustomSpread(id);
      navigate('/spread-library');
    }
  };

  const handlePositionDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingIdx === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPositions(positions.map((p, i) => i === draggingIdx ? { ...p, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) } : p));
  };

  return (
    <div className="relative min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-stardust/60 hover:text-ancient text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        <h1 className="font-display text-3xl text-ancient tracking-wider mb-8">
          {isEdit ? '编辑牌阵' : '创建自定义牌阵'}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Form */}
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-ancient/80 text-sm mb-2">牌阵名称</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例：感情发展三步"
                    className="w-full bg-void/50 border border-ancient/20 rounded px-3 py-2 text-stardust placeholder-stardust/30 focus:border-ancient/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-ancient/80 text-sm mb-2">牌阵描述</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="描述这个牌阵的用途..."
                    className="w-full bg-void/50 border border-ancient/20 rounded px-3 py-2 text-stardust placeholder-stardust/30 focus:border-ancient/60 focus:outline-none resize-none h-20"
                  />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-ancient text-sm tracking-wider">牌位（{positions.length}/12）</h3>
                <button
                  onClick={addPosition}
                  disabled={positions.length >= 12}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-ancient/20 border border-ancient/50 text-ancient rounded-sm text-xs hover:bg-ancient/30 transition-all disabled:opacity-30"
                >
                  <Plus className="w-3 h-3" />
                  增加
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {positions.map((pos, idx) => (
                  <div key={pos.id} className="bg-abyss/40 border border-ancient/10 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ancient/60">#{idx + 1}</span>
                      <button
                        onClick={() => removePosition(idx)}
                        disabled={positions.length <= 2}
                        className="text-stardust/40 hover:text-crimson disabled:opacity-30"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={pos.name}
                      onChange={(e) => updatePosition(idx, 'name', e.target.value)}
                      placeholder="牌位名称"
                      className="w-full bg-void/50 border border-ancient/20 rounded px-2 py-1 text-sm text-stardust focus:border-ancient/60 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={pos.description}
                      onChange={(e) => updatePosition(idx, 'description', e.target.value)}
                      placeholder="牌位含义"
                      className="w-full bg-void/50 border border-ancient/20 rounded px-2 py-1 text-xs text-stardust focus:border-ancient/60 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!name.trim() || positions.length < 2}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-ancient/20 border border-ancient/50 text-ancient hover:bg-ancient/30 transition-all rounded-sm disabled:opacity-30"
              >
                <Save className="w-4 h-4" />
                {isEdit ? '保存修改' : '保存牌阵'}
              </button>
              {isEdit && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 px-4 py-3 border border-crimson/40 text-crimson/70 hover:border-crimson hover:text-crimson transition-all rounded-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
            </div>
          </div>

          {/* Layout Preview */}
          <div className="glass-panel p-6">
            <h3 className="font-display text-ancient text-sm tracking-wider mb-4">布局预览</h3>
            <p className="text-xs text-stardust/40 mb-4">点击下方画布的牌位可拖拽调整位置</p>
            <div
              className="relative w-full bg-void/40 border border-ancient/20 rounded-lg"
              style={{ aspectRatio: '1', minHeight: '300px' }}
              onMouseMove={handlePositionDrag}
              onMouseUp={() => setDraggingIdx(null)}
              onMouseLeave={() => setDraggingIdx(null)}
            >
              {positions.map((pos, idx) => (
                <div
                  key={pos.id}
                  onMouseDown={() => setDraggingIdx(idx)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move group"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <div className="w-16 h-24 bg-abyss border-2 border-ancient/60 rounded flex flex-col items-center justify-center text-center p-1 group-hover:border-ancient transition-colors">
                    <GripVertical className="w-3 h-3 text-ancient/40 absolute -top-3 opacity-0 group-hover:opacity-100" />
                    <span className="text-[9px] text-ancient/60">#{idx + 1}</span>
                    <span className="text-[10px] text-stardust truncate w-full">{pos.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
