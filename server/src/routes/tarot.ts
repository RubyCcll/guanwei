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
    spread = customSpread;
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
  
  const result = generateInterpretation(
    cards,
    spread,
    question,
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
  
  const result = generateInterpretation(
    cards,
    spread,
    question,
    category as QuestionCategory
  );
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  let sectionIndex = 0;
  
  const sendSection = () => {
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
