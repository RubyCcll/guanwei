// 出生地点选择器：省 → 市 → 区 三级级联 + 经纬度/真太阳时预览
import { useState } from 'react';
import { allProvinces, citiesOf, districtsOf, resolveLocation, type GeoSelection } from '@core/data/region';
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
  // 手动经纬度（乡镇/村兜底，优先于行政区划）
  const [manual, setManual] = useState(false);
  const [lngTxt, setLngTxt] = useState('');
  const [latTxt, setLatTxt] = useState('');

  // 显示名归一化（档案里可能是无后缀名，如「广东」→「广东省」）
  const provNames = allProvinces();
  const provShow = provNames.includes(province) ? province : (provNames.find(p => p.replace(/壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|省|市$/, '') === province.replace(/壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|省|市$/, '')) || province);
  const cities = citiesOf(provShow);
  const districts = districtsOf(provShow, city);

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

  const manualLng = parseFloat(lngTxt);
  const manualLat = parseFloat(latTxt);
  const manualValid = manual && !isNaN(manualLng) && !isNaN(manualLat) && Math.abs(manualLng) <= 180 && Math.abs(manualLat) <= 90;
  const manualSel: GeoSelection | null = manualValid ? { province, city, district: district || '手动定位', lng: manualLng, lat: manualLat } : null;
  const sel = manualSel ?? resolveLocation(province, city, district || '城区');

  return (
    <div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="loc-province">省份</label>
          <SongSearchSelect id="loc-province" value={provShow} placeholder="择省…" options={provNames.map(p => ({ value: p, label: p }))} onChange={handleProvince} />
        </div>
        <div className="field">
          <label htmlFor="loc-city">城市</label>
          <SongSearchSelect id="loc-city" value={city} placeholder="择市…" options={cities.map(c => ({ value: c.name, label: c.name }))} onChange={handleCity} disabled={!province} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="loc-district">县/区（选至区县；乡镇村请用下方手动定位）</label>
        <SongSearchSelect id="loc-district" value={district} placeholder="择区/县…" options={districts.map(d => ({ value: d.name, label: d.name }))} onChange={handleDistrict} disabled={!city} allowCustom />
      </div>
      <div className="field">
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={manual} onChange={e => { setManual(e.target.checked); onChange(manualSel); }} style={{ width: 'auto' }} />
          手动定位（乡镇/村等未收录地点：从地图 App 获取经纬度填入）
        </label>
        {manual && (
          <div className="field-row" style={{ marginTop: '.4rem' }}>
            <div className="field"><label htmlFor="loc-lng">东经（如 121.796）</label>
              <input className="input-line" id="loc-lng" type="number" step="0.0001" placeholder="121.796" value={lngTxt} onChange={e => { setLngTxt(e.target.value); onChange(manualValid ? manualSel : null); }} /></div>
            <div className="field"><label htmlFor="loc-lat">北纬（如 41.599）</label>
              <input className="input-line" id="loc-lat" type="number" step="0.0001" placeholder="41.599" value={latTxt} onChange={e => { setLatTxt(e.target.value); onChange(manualValid ? manualSel : null); }} /></div>
          </div>
        )}
      </div>
      {sel && !manual && district && !districts.some(d => d.name === district) && (
        <p className="hint" style={{ color: 'var(--cinnabar)' }}>该区县未收录坐标，暂以城市中心计；如需乡镇/村级精度，请勾选手动定位。</p>
      )}
      {manualValid && <p className="hint" style={{ color: 'var(--celadon-deep)' }}>已用手动坐标（优先于行政区划）</p>}
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