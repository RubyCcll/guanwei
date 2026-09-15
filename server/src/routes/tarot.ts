import { Router } from 'express';
import { tarotCards } from '../../../shared/core/data/tarotCards.js';
import { defaultSpreads } from '../../../shared/core/data/spreads.js';
import { drawCards, generateInterpretation } from '../../../shared/core/engine/tarotEngine.js';
import { analyzeQuestion } from '../../../shared/core/engine/semanticAnalyzer.js';
import type { QuestionCategory, Spread } from '../types/index.js';

const router = Router();

router.get('/cards', (_req, res) => {
  res.json({ cards: tarotCards });
});

router.get('/spreads', (_req, res) => {
  res.json({ spreads: defaultSpreads });
});

router.post('/draw', (req, res) => {
  const { spreadId, customSpread } = req.body;
  
  let spread: Spread | undefined;
  
  if (customSpread) {
    // 自定义牌阵限长（2026-09 修 P0-5）：原实现按 positions.length 无上限循环，可被 10 万项拖死
    const pos = Array.isArray(customSpread?.positions) ? customSpread.positions : [];
    if (pos.length === 0 || pos.length > 20) {
      return res.status(400).json({ error: 'BAD_SPREAD', message: '自定义牌阵位数为 1-20' });
    }
    spread = { ...customSpread, positions: pos.slice(0, 20) } as Spread;
  } else {
    spread = defaultSpreads.find(s => s.id === spreadId);
  }
  
  if (!spread) {
    return res.status(400).json({ error: '牌阵不存在' });
  }
  
  const cards = drawCards(spread);
  res.json({ cards, spread });
});

router.post('/interpret', (req, res) => {
  const { cards, spread, question, category } = req.body;
  
  if (!cards || !spread || !question) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  // 抽牌/解读入参限长（同上）
  if (!Array.isArray(cards) || cards.length === 0 || cards.length > 20) {
    return res.status(400).json({ error: 'BAD_CARDS', message: '牌数需为 1-20' });
  }
  if (String(question).length > 300) {
    return res.status(400).json({ error: 'BAD_QUESTION', message: '所问之事请控制在 300 字以内' });
  }
  const result = generateInterpretation(
    cards.slice(0, 20),
    { ...spread, positions: (spread.positions || []).slice(0, 20) },
    String(question).slice(0, 300),
    category as QuestionCategory
  );
  
  res.json(result);
});

router.post('/analyze', (req, res) => {
  const { question, category } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: '缺少问题' });
  }
  
  const result = analyzeQuestion(question, category);
  res.json(result);
});

router.post('/interpret/stream', (req, res) => {
  const { cards, spread, question, category } = req.body;
  
  if (!cards || !spread || !question) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  // 抽牌/解读入参限长（同上）
  if (!Array.isArray(cards) || cards.length === 0 || cards.length > 20) {
    return res.status(400).json({ error: 'BAD_CARDS', message: '牌数需为 1-20' });
  }
  if (String(question).length > 300) {
    return res.status(400).json({ error: 'BAD_QUESTION', message: '所问之事请控制在 300 字以内' });
  }
  const result = generateInterpretation(
    cards.slice(0, 20),
    { ...spread, positions: (spread.positions || []).slice(0, 20) },
    String(question).slice(0, 300),
    category as QuestionCategory
  );
  
  let closed = false;
  req.on('close', () => { closed = true; });   // 客户端断开 → 停止逐字推送（修 P3-2）
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  let sectionIndex = 0;
  
  const sendSection = () => {
    if (closed) return;                              // 客户端已断开：停止计时器链
    if (sectionIndex >= result.sections.length) {
      res.write('event: done\n');
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    
    const section = result.sections[sectionIndex];
    const chars = section.content.split('');
    let charIndex = 0;
    
    const typeChar = () => {
      if (closed) return;                            // 同上
      if (charIndex >= chars.length) {
        sectionIndex++;
        setTimeout(sendSection, 300);
        return;
      }
      
      res.write(`data: ${JSON.stringify({
        type: 'char',
        sectionIndex,
        sectionType: section.type,
        sectionTitle: section.title,
        char: chars[charIndex],
        isFirst: charIndex === 0,
      })}\n\n`);
      
      charIndex++;
      setTimeout(typeChar, 20 + Math.random() * 30);
    };
    
    typeChar();
  };
  
  res.write(`data: ${JSON.stringify({
    type: 'start',
    totalSections: result.sections.length,
    semantic: result.semantic,
  })}\n\n`);
  
  setTimeout(sendSection, 500);
});

export default router;
