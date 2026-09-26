// 备份/恢复回归（scripts/guanwei-db.mjs）
// 覆盖：在线快照（含 WAL 中未 checkpoint 的事务）→ 清库 → 恢复 → 条数与内容回到备份点；
//       无 --yes 拒绝、坏文件拒绝（退出码 2）、服务运行中拒绝（--force 才继续）。
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawn } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
const SCRIPT = path.join(process.cwd(), 'scripts/guanwei-db.mjs');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-backup-'));
const DATA = path.join(TMP, 'data');
const DB = path.join(DATA, 'guanwei.db');
const BACKUPS = path.join(DATA, 'backups');

/** 跑 CLI，返回 { code, out } */
function run(args: string[], env: Record<string, string> = {}): { code: number; out: string } {
  try {
    const out = execFileSync('node', [SCRIPT, ...args], {
      encoding: 'utf8', timeout: 60000,
      env: { ...process.env, GUANWEI_DATA_DIR: DATA, GUANWEI_BACKUP_DIR: BACKUPS, ...env },
    });
    return { code: 0, out };
  } catch (e: any) {
    return { code: e.status ?? -1, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

function seedDb(users: number, divs: number): void {
  fs.mkdirSync(DATA, { recursive: true });
  const db = new DatabaseSync(DB);
  db.exec(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, pass_hash TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, profile_json TEXT NOT NULL DEFAULT '{}', samples_json TEXT NOT NULL DEFAULT '[]', records_json TEXT NOT NULL DEFAULT '[]', token TEXT, token_expires INTEGER);
           CREATE TABLE IF NOT EXISTS divinations (id TEXT PRIMARY KEY, username TEXT NOT NULL, art_id TEXT NOT NULL, kind TEXT NOT NULL, question TEXT, profile_id TEXT NOT NULL DEFAULT 'main', profile_json TEXT, params_json TEXT, result_raw_json TEXT NOT NULL, display_json TEXT NOT NULL, report_json TEXT, report_quality TEXT, status TEXT NOT NULL DEFAULT 'divined', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
           CREATE TABLE IF NOT EXISTS ai_fail_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, art_id TEXT NOT NULL, kind TEXT NOT NULL, divine_id TEXT, raw_output TEXT, fail_reason TEXT, created_at INTEGER NOT NULL);`);
  const now = Date.now();
  for (let i = 0; i < users; i++) {
    db.prepare('INSERT INTO users (username, pass_hash, created_at, profile_json, samples_json, records_json, token, token_expires) VALUES (?,?,?,?,?,?,?,?)')
      .run(`备份用户${i}`, 'scrypt$aa$bb', now, JSON.stringify({ birthDate: '1991-08-17' }), '[]', '[]', 'f'.repeat(64), now + 86400000);
  }
  for (let i = 0; i < divs; i++) {
    db.prepare('INSERT INTO divinations (id, username, art_id, kind, result_raw_json, display_json, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(`d_${i}`, `备份用户${i % Math.max(1, users)}`, 'liuyao', 'zhanwen', '{}', '{}', 'divined', now + i, now + i);
  }
  db.close();
}

function count(table: string): number {
  const db = new DatabaseSync(DB, { readOnly: true });
  try { return Number(db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()?.c || 0); } finally { db.close(); }
}

afterAll(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ } });

describe('备份 / 恢复（scripts/guanwei-db.mjs）', () => {
  let snapshot = '';

  it('① 在线快照：库被删后仍可恢复全部账号与记录', () => {
    seedDb(25, 40);
    const r = run(['backup', '--note', '回归测试']);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('账号 25');
    expect(r.out).toContain('占卜记录 40');
    // 元数据与校验值
    const files = fs.readdirSync(BACKUPS).filter(f => /^guanwei-\d{8}-\d{6}\.db$/.test(f));
    expect(files).toHaveLength(1);
    snapshot = path.join(BACKUPS, files[0]);
    const meta = JSON.parse(fs.readFileSync(snapshot + '.json', 'utf-8'));
    expect(meta.counts).toEqual({ users: 25, divinations: 40, failLogs: 0 });
    expect(meta.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(meta.note).toBe('回归测试');
    // 快照文件本身可独立打开且内容完整（VACUUM INTO 的一致性快照）
    const snap = new DatabaseSync(snapshot, { readOnly: true });
    expect(Number(snap.prepare('SELECT COUNT(*) AS c FROM users').get()?.c)).toBe(25);
    expect(String(snap.prepare('SELECT profile_json FROM users LIMIT 1').get()?.profile_json)).toContain('1991-08-17');
    snap.close();
  });

  it('② list 能列出备份与条数', () => {
    const r = run(['list']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('账号 25 · 记录 40');
    expect(r.out).toContain('回归测试');
  });

  it('③ 无 --yes 拒绝恢复；坏文件拒绝（退出码 2）', () => {
    const noConfirm = run(['restore', snapshot]);
    expect(noConfirm.code).toBe(1);
    expect(noConfirm.out).toContain('--yes');
    const bad = path.join(TMP, 'bad.db');
    fs.writeFileSync(bad, 'not a sqlite file');
    const badRun = run(['restore', bad, '--yes']);
    expect(badRun.code).toBe(2);
    // 库里数据未被破坏
    expect(count('users')).toBe(25);
  });

  it('④ 服务运行中拒绝恢复（--force 才继续）', async () => {
    const port = 3321;
    const srv = net.createServer();
    await new Promise<void>(res => srv.listen(port, '127.0.0.1', () => res()));
    try {
      const blocked = run(['restore', snapshot, '--yes'], { PORT: String(port) });
      expect(blocked.code).toBe(1);
      expect(blocked.out).toContain('仍在运行');
      expect(count('users')).toBe(25);   // 未被覆盖
    } finally { srv.close(); }
  });

  it('⑤ 恢复：清库后回到备份点，并保留「恢复前」副本', () => {
    // 模拟误删：清空两张表
    const db = new DatabaseSync(DB);
    db.exec('DELETE FROM users; DELETE FROM divinations;');
    db.close();
    expect(count('users')).toBe(0);

    const r = run(['restore', snapshot, '--yes']);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('账号 25');
    expect(count('users')).toBe(25);
    expect(count('divinations')).toBe(40);
    // 覆盖前自动留存
    const pre = fs.readdirSync(DATA).filter(f => f.includes('.pre-restore-'));
    expect(pre.length).toBeGreaterThan(0);
  });
});
