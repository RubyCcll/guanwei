// 统一 SQLite 句柄（单一数据源）
//
// 背景（2026-09 W38 架构欠债 #4）：用户库曾是 JSON（db.json）、占卜记录是 SQLite（guanwei.db），
// 两套存储两套写法：JSON 侧靠「进程内 Promise 串行 + 临时文件 rename」，SQLite 侧靠事务。
// 现合并为**同一个 SQLite 库**：users / divinations / ai_fail_logs / meta 四张表，
// 所有写操作走 BEGIN IMMEDIATE 事务，跨进程亦安全（busy_timeout + WAL）。
//
// 依赖：node:sqlite（Node 22 内置，零依赖）
import { createRequire } from 'node:module';
import { DIVINE_DB } from './dataDir.js';
import fs from 'fs';
import path from 'path';

// node:sqlite 用 createRequire 运行时加载：
//  - 前端测试（vitest/jsdom）会沿 import 链把 server 模块也走 Vite 打包，静态 import 会被判为
//    「Cannot bundle built-in module "node:sqlite"」；require 形式可避免。运行时行为完全一致。
//  - 顺带让「仅导入而不使用存储」的场景不加载 SQLite。
type DatabaseSync = import('node:sqlite').DatabaseSync;
type DatabaseSyncCtor = typeof import('node:sqlite').DatabaseSync;

let DatabaseSyncImpl: DatabaseSyncCtor | null = null;
function sqlite(): DatabaseSyncCtor {
  if (!DatabaseSyncImpl) {
    DatabaseSyncImpl = createRequire(import.meta.url)('node:sqlite').DatabaseSync as DatabaseSyncCtor;
  }
  return DatabaseSyncImpl;
}

let db: DatabaseSync | null = null;

/** 取库句柄（首次调用建表 + 迁移） */
export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(path.dirname(DIVINE_DB), { recursive: true });
  db = new (sqlite())(DIVINE_DB);
  // WAL：读写不互斥（外部工具/测试可同时只读）；busy_timeout：多进程时等待而非立刻 SQLITE_BUSY
  try { db.exec('PRAGMA journal_mode = WAL'); } catch (e: any) { console.warn('[db] WAL 未启用:', e?.message || e); }
  try { db.exec('PRAGMA busy_timeout = 5000'); } catch { /* 老版本忽略 */ }
  try { db.exec('PRAGMA foreign_keys = ON'); } catch { /* 同上 */ }
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username      TEXT PRIMARY KEY,
      pass_hash     TEXT NOT NULL DEFAULT '',
      created_at    INTEGER NOT NULL,
      profile_json  TEXT NOT NULL DEFAULT '{}',
      samples_json  TEXT NOT NULL DEFAULT '[]',
      records_json  TEXT NOT NULL DEFAULT '[]',
      token         TEXT,
      token_expires INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);

    CREATE TABLE IF NOT EXISTS divinations (
      id            TEXT PRIMARY KEY,
      username      TEXT NOT NULL,
      art_id        TEXT NOT NULL,
      kind          TEXT NOT NULL,
      question      TEXT,
      profile_id    TEXT NOT NULL DEFAULT 'main',
      profile_json  TEXT,
      params_json   TEXT,
      result_raw_json TEXT NOT NULL,
      display_json  TEXT NOT NULL,
      report_json   TEXT,
      report_quality TEXT,
      status        TEXT NOT NULL DEFAULT 'divined',
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_div_user_time ON divinations(username, created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_fail_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      art_id      TEXT NOT NULL,
      kind        TEXT NOT NULL,
      divine_id   TEXT,
      raw_output  TEXT,
      fail_reason TEXT,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      k TEXT PRIMARY KEY,
      v TEXT NOT NULL
    );
  `);
  // 老库迁移：补 divinations.profile_id 列（2026-08-20 档案隔离）——必须在引用该列的索引之前
  try {
    db.exec("ALTER TABLE divinations ADD COLUMN profile_id TEXT NOT NULL DEFAULT 'main'");
  } catch (e: any) {
    if (!/duplicate column/i.test(e.message || '')) console.error('[db] 迁移 profile_id 失败:', e.message);
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_div_user_profile ON divinations(username, profile_id, created_at DESC)');
  return db;
}

/**
 * 立即写事务：fn 内**不得 await**（node:sqlite 为同步 API）。
 * BEGIN IMMEDIATE 立刻取写锁，避免「读后写」之间的竞态（并发注册/建档的唯一性由此保证）。
 */
export function withTx<T>(fn: () => T): T {
  const d = getDb();
  d.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    d.exec('COMMIT');
    return result;
  } catch (e) {
    try { d.exec('ROLLBACK'); } catch { /* 回滚失败时以原异常为准 */ }
    throw e;
  }
}

/** 读取元信息（迁移标记等） */
export function getMeta(k: string): string | null {
  try {
    const row = getDb().prepare('SELECT v FROM meta WHERE k = ?').get(k) as { v?: string } | undefined;
    return row?.v ?? null;
  } catch { return null; }
}

/** 写入元信息 */
export function setMeta(k: string, v: string): void {
  getDb().prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run(k, v);
}

/** 仅测试/运维用：关闭句柄（下次调用重新打开） */
export function closeDb(): void {
  try { db?.close(); } catch { /* ignore */ }
  db = null;
}
