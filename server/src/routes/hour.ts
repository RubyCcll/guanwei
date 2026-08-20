// 时辰反推路由：POST /api/hour-infer
import { Router } from 'express';
import { inferHour, type HourInferEvent } from '../services/hourInference.js';

const router = Router();

router.post('/hour-infer', (req, res) => {
  const { y, m, d, gender, location, candidates, events } = req.body || {};
  if (!y || !m || !d || !gender) {
    return res.status(400).json({ error: '缺少必要参数（y/m/d/gender）' });
  }
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: '请至少提供一条关键人生事件' });
  }
  const cleanEvents: HourInferEvent[] = events
    .map((e: any) => ({
      year: Number(e?.year),
      text: String(e?.text || '').slice(0, 60),
      type: ['health', 'love', 'job', 'family', 'money', 'study', 'move', 'breakup'].includes(e?.type) ? e.type : undefined,
    }))
    .filter((e: HourInferEvent) => Number.isFinite(e.year) && e.year >= 1900 && e.year <= 2100 && e.text);
  if (cleanEvents.length === 0) {
    return res.status(400).json({ error: '事件格式不正确（需 年份 + 描述）' });
  }
  try {
    const result = inferHour({
      y: Number(y), m: Number(m), d: Number(d),
      gender: gender === '女' ? '女' : '男',
      location: location || null,
      candidates: Array.isArray(candidates) ? candidates.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 11) : undefined,
      events: cleanEvents,
    });
    res.json(result);
  } catch (e: any) {
    console.error('[hour-infer]', e);
    res.status(500).json({ error: 'INFER_FAILED', message: '时辰推演未应机' });
  }
});

export default router;
