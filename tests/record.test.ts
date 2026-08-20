import { describe, it, expect, beforeEach } from 'vitest';
import { getRecords, saveRecord, deleteRecord, getRecord, clearRecords } from '../src/utils/recordStore';

describe('占问记录存储', () => {
  beforeEach(() => { clearRecords(); });
  it('保存与读取', () => {
    saveRecord({ artId: 'bazi', createdAt: 1000, result: { dayGZ: '壬申' } });
    const recs = getRecords();
    expect(recs.length).toBe(1);
    expect(recs[0].artId).toBe('bazi');
    expect(getRecord(recs[0].id)?.result).toEqual({ dayGZ: '壬申' });
  });
  it('删除', () => {
    saveRecord({ artId: 'meihua', createdAt: 2000, result: { benGua: { name: '天泽履' } } });
    const recs = getRecords();
    deleteRecord(recs[0].id);
    expect(getRecords().length).toBe(0);
  });
  it('倒序排列（新记录在前）', () => {
    saveRecord({ artId: 'bazi', createdAt: 1000, result: {} });
    saveRecord({ artId: 'tarot', createdAt: 2000, result: {} });
    const recs = getRecords();
    expect(recs[0].artId).toBe('tarot');
  });
});