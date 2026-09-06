// GET /v1/arts —— 能力清单（程序化发现：九术 + 参数 schema）
import { Router } from 'express';
import { CHART_ARTS, CHART_INPUT_SCHEMA } from '../../../../shared/core/engine/chart.js';

const router = Router();

const ART_NAMES: Record<string, string> = {
  bazi: '四柱八字', ziwei: '紫微斗数', astrology: '古典星盘',
  qimen: '奇门遁甲', meihua: '梅花易数', liuyao: '六爻',
  liuren: '大六壬', xiaoliuren: '小六壬', tarot: '塔罗',
};

router.get('/', (_req, res) => {
  res.json({
    arts: CHART_ARTS.map(id => ({
      id,
      name: ART_NAMES[id] || id,
      inputs: CHART_INPUT_SCHEMA[id] || {},
    })),
  });
});

export default router;
