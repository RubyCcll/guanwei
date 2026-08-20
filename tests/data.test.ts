import { describe, it, expect } from 'vitest';
import { CLASSICS, classicById } from '../shared/core/data/classics';
import { COURSES, courseById } from '../shared/core/data/courses';

describe('古籍典藏数据', () => {
  it('12 部典籍，id 唯一', () => {
    expect(CLASSICS.length).toBe(12);
    expect(new Set(CLASSICS.map(c => c.id)).size).toBe(12);
  });
  it('每部典籍含提要/背景/篇章/选段/来源标注', () => {
    CLASSICS.forEach(c => {
      expect(c.summary.length).toBeGreaterThan(10);
      expect(c.background.length).toBeGreaterThan(10);
      expect(c.chapters.length).toBeGreaterThan(0);
      expect(c.excerpts.length).toBeGreaterThan(0);
      expect(c.sourceNote.length).toBeGreaterThan(5);
      c.excerpts.forEach(e => {
        expect(e.original.length).toBeGreaterThan(10);
        expect(e.source).toContain(c.title.slice(0, 2));
      });
    });
  });
  it('关联术数 id 均在九术范围内', () => {
    const arts = ['bazi', 'ziwei', 'qimen', 'meihua', 'liuyao', 'liuren', 'xiaoliuren', 'astrology', 'tarot'];
    CLASSICS.forEach(c => c.arts.forEach(a => expect(arts).toContain(a)));
  });
  it('周易选段含卦辞原文', () => {
    const zy = classicById('zhouyi')!;
    expect(zy.excerpts.some(e => e.original.includes('天行健'))).toBe(true);
  });
});

describe('学馆课程数据', () => {
  it('课程齐全，id 唯一，含练习的课程答案非空', () => {
    expect(COURSES.length).toBeGreaterThanOrEqual(14);
    expect(new Set(COURSES.map(c => c.id)).size).toBe(COURSES.length);
    COURSES.forEach(c => {
      expect(c.chapters.length).toBeGreaterThan(0);
      c.exercises.forEach(e => {
        expect(e.answer.length).toBeGreaterThan(0);
        expect(e.explain.length).toBeGreaterThan(0);
      });
    });
  });
  it('练习答案自洽（示例抽查）', () => {
    expect(courseById('foundation-wuxing')!.exercises[0].answer).toBe('火生土；火克金');
    expect(courseById('foundation-ganzhi')!.exercises[0].answer).toBe('乙巳年');
    expect(courseById('meihua-basic')!.exercises[0].answer).toContain('天泽履');
  });
});