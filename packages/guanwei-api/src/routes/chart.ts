// POST /v1/chart —— 九术排盘（免费，纯计算零 token）
import { Router } from 'express';
import { chartCalc, CHART_ARTS } from '../../../../shared/core/engine/chart.js';

const router = Router();

router.post('/', (req, res, next) => {
  try {
    const { art, inputs } = req.body || {};
    if (!art || typeof art !== 'string') {
      return res.status(400).json({ error: 'BAD_REQUEST', message: '缺少 art（术名）' });
    }
    if (!CHART_ARTS.includes(art as any)) {
      return res.status(400).json({ error: 'UNKNOWN_ART', message: '术无此名: ' + art + '（可用 GET /v1/arts 查能力清单）' });
    }
    (req as any).artId = art;
    const resultRaw = chartCalc(art, inputs);
    res.json({ ok: true, art, resultRaw, free: true });
  } catch (e: any) {
    next({ status: 400, code: 'CHART_FAILED', message: e?.message || '排盘失败' });
  }
});

export default router;
