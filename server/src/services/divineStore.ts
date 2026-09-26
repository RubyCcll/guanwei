// 占卜数据存储（SQLite）：起占记录 / AI 报告 / 失败留档 / 占卜历史
// 句柄与建表统一由 services/db 提供（与用户库同库，见 db.ts）
import { getDb, withTx } from './db.js';
import { randomUUID } from 'node:crypto';

export { getDb };
export { withTx };

export interface DivineRecord {
  id: string;
  username: string;
  artId: string;
  kind: string;
  question?: string;
  profile?: unknown;
  params?: unknown;
  resultRaw: unknown;
  display: unknown;
  report?: unknown | null;
  reportQuality?: string | null;
  status: string;
  createdAt: number;
}

export interface CreateDivinationArgs {
  username: string;
  artId: string;
  kind: 'mingpan' | 'zhanwen';
  question?: string;
  profileId?: string;   // 档案标识：'main' 主档案 / 示例档案 id
  profile?: unknown;
  params?: unknown;
  resultRaw: unknown;
  display?: unknown;
}

function toRecord(row: any): DivineRecord {
  return {
    id: row.id,
    username: row.username,
    artId: row.art_id,
    kind: row.kind,
    question: row.question || undefined,
    profile: row.profile_json ? JSON.parse(row.profile_json) : undefined,
    params: row.params_json ? JSON.parse(row.params_json) : undefined,
    resultRaw: JSON.parse(row.result_raw_json),
    display: JSON.parse(row.display_json),
    report: row.report_json ? JSON.parse(row.report_json) : null,
    reportQuality: row.report_quality || null,
    status: row.status,
    createdAt: row.created_at,
  };
}

// 起占入库（status='divined'），返回记录
export function createDivination(args: CreateDivinationArgs): DivineRecord {
  const d = getDb();
  const now = Date.now();
  // 原 Date.now()+Math.random() 可枚举（配合 403/404 差异可探测记录存在性）→ 改 CSPRNG UUID
  const id = 'd_' + now + '_' + randomUUID();
  const display = args.display !== undefined ? args.display : args.resultRaw;
  d.prepare(`INSERT INTO divinations
    (id, username, art_id, kind, question, profile_id, profile_json, params_json, result_raw_json, display_json, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'divined', ?, ?)`).run(
    id, args.username, args.artId, args.kind,
    args.question || null,
    args.profileId || 'main',
    args.profile ? JSON.stringify(args.profile) : null,
    args.params ? JSON.stringify(args.params) : null,
    JSON.stringify(args.resultRaw),
    JSON.stringify(display),
    now, now,
  );
  return {
    id, username: args.username, artId: args.artId, kind: args.kind,
    question: args.question, profile: args.profile, params: args.params,
    resultRaw: args.resultRaw, display, report: null, reportQuality: null,
    status: 'divined', createdAt: now,
  };
}

// AI 链路读取（调用方需校验归属）
export function getDivination(id: string): DivineRecord | null {
  const d = getDb();
  const row = d.prepare('SELECT * FROM divinations WHERE id = ?').get(id);
  return row ? toRecord(row as any) : null;
}

// quality=ok 才调用：写报告 + status='ai_done'
export function attachReport(id: string, report: unknown, quality: 'ok' | 'poor' = 'ok'): boolean {
  const d = getDb();
  const r = d.prepare('UPDATE divinations SET report_json = ?, report_quality = ?, status = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(report), quality, 'ai_done', Date.now(), id);
  return r.changes > 0;
}

// poor 时：记录 fail 日志 + status='ai_poor'（不入 report）
export function markAiFailed(id: string | null, artId: string, kind: string, reason: string, rawOutput?: string): void {
  const d = getDb();
  d.prepare('INSERT INTO ai_fail_logs (art_id, kind, divine_id, raw_output, fail_reason, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(artId, kind, id || null, rawOutput || null, reason, Date.now());
  if (id) {
    d.prepare('UPDATE divinations SET status = ?, report_quality = ?, updated_at = ? WHERE id = ?')
      .run('ai_poor', 'poor', Date.now(), id);
  }
}

// 占卜历史分页（时间倒序，摘要字段）
// 同一毫秒内建立的记录（如冒烟/并发场景）以 rowid 兜底，保证分页顺序确定（原按 id 比较 uuid，顺序随机）
export function listDivinations(username: string, page = 1, pageSize = 20, profileId?: string): { list: { divineId: string; artId: string; question: string | null; createdAt: number; hasReport: boolean; status: string; profileId: string }[]; total: number } {
  const d = getDb();
  const pageN = Math.max(1, page);
  const size = Math.min(50, Math.max(1, pageSize));
  const where = profileId ? 'WHERE username = ? AND profile_id = ?' : 'WHERE username = ?';
  const params = profileId ? [username, profileId] : [username];
  const totalRow = d.prepare('SELECT COUNT(*) AS c FROM divinations ' + where).get(...params) as any;
  const rows = d.prepare('SELECT id, art_id, question, created_at, report_json, status, profile_id FROM divinations ' + where + ' ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?')
    .all(...params, size, (pageN - 1) * size) as any[];
  return {
    list: rows.map(r => ({
      divineId: r.id,
      artId: r.art_id,
      question: r.question || null,
      createdAt: r.created_at,
      hasReport: !!r.report_json,
      status: r.status,
      profileId: r.profile_id || 'main',
    })),
    total: totalRow.c,
  };
}

// 删除（校验归属由路由层做）
export function deleteDivination(id: string, username: string): boolean {
  const d = getDb();
  const r = d.prepare('DELETE FROM divinations WHERE id = ? AND username = ?').run(id, username);
  return r.changes > 0;
}