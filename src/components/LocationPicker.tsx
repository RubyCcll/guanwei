// 出生地点选择器：省 → 市 → 区 三级级联 + 经纬度/真太阳时预览
import { useState } from 'react';
import { REGIONS, resolveLocation, type GeoSelection } from '@core/data/region';
import SongSearchSelect from '@/components/SongSearchSelect';
import { trueSolarTime } from '@core/engine/trueSolarTime';

interface Props {
  value: GeoSelection | null;
  onChange: (v: GeoSelection | null) => void;
  // 可选的时刻预览（真太阳时校正显示；hourIndex 0-11）
  previewHourIndex?: number;
}

const HOUR_LABELS = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];

export default function LocationPicker({ value, onChange, previewHourIndex }: Props) {
  const [province, setProvince] = useState(value?.province ?? '');
  const [city, setCity] = useState(value?.city ?? '');
  const [district, setDistrict] = useState(value?.district ?? '');

  const cities = REGIONS.find(p => p.name === province)?.cities ?? [];
  const districts = cities.find(c => c.name === city)?.districts ?? [];

  const handleProvince = (v: string) => {
    setProvince(v); setCity(''); setDistrict('');
    onChange(null);
  };
  const handleCity = (v: string) => {
    setCity(v); setDistrict('');
    onChange(null);
  };
  const handleDistrict = (v: string) => {
    setDistrict(v);
    const sel = resolveLocation(province, city, v || '城区');
    onChange(sel);
  };

  const sel = resolveLocation(province, city, district || '城区');

  return (
    <div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="loc-province">省份</label>
          <SongSearchSelect id="loc-province" value={province} placeholder="择省…" options={REGIONS.map(p => ({ value: p.name, label: p.name }))} onChange={handleProvince} />
        </div>
        <div className="field">
          <label htmlFor="loc-city">城市</label>
          <SongSearchSelect id="loc-city" value={city} placeholder="择市…" options={cities.map(c => ({ value: c.name, label: c.name }))} onChange={handleCity} disabled={!province} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="loc-district">县/区</label>
        <SongSearchSelect id="loc-district" value={district} placeholder="择区/县，或直接输入…" options={districts.map(d => ({ value: d.name, label: d.name }))} onChange={handleDistrict} disabled={!city} allowCustom />
      </div>
      {sel && district && !districts.some(d => d.name === district) && (
        <p className="hint" style={{ color: 'var(--cinnabar)' }}>该区县未收录坐标，暂以城市中心计（精度约 ±20km）；排盘以城市级经纬度为准。</p>
      )}
      {sel && (
        <p className="hint">
          经纬 {sel.lng.toFixed(2)}°E · {sel.lat.toFixed(2)}°N
          {previewHourIndex !== undefined && (() => {
            // 真太阳时预览：按时辰中点估算
            const hour = (previewHourIndex * 2) % 24;
            const t = trueSolarTime(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate(), hour, 0, sel.lng, false);
            const corrected = Math.floor(t.trueSolarHours);
            const mins = Math.round((t.trueSolarHours - corrected) * 60);
            const correctedIdx = Math.floor(((t.trueSolarHours + 1) % 24) / 2);
            return ` · ${HOUR_LABELS[previewHourIndex]}校正为 ${String(corrected).padStart(2, '0')}:${String(mins).padStart(2, '0')}（${HOUR_LABELS[correctedIdx]}）`;
          })()}
        </p>
      )}
    </div>
  );
}