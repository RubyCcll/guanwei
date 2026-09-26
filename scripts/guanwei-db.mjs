#!/usr/bin/env node
// 观微数据备份 / 恢复（零依赖，只用 Node 内置 node:sqlite）
//
// 为什么需要：1.3.5 起账号与占卜记录同处一个 SQLite 库（guanwei.db），
// 这个文件就是全部数据。运行中直接 `cp` 主库文件可能丢最近事务（WAL 还在 -wal 里），
// 故备份走 SQLite 官方在线快照 `VACUUM INTO`（对运行中的服务安全，取一致性读快照）。
//
// 用法：
//   node scripts/guanwei-db.mjs backup  [--out DIR] [--note 说明] [--dir 数据目录]
//   node scripts/guanwei-db.mjs list    [--out DIR]
//   node scripts/guanwei-db.mjs restore <备份文件> [--yes] [--force] [--dir 数据目录]
//     （--force：跳过「端口有服务在监听」的拒绝；PORT 环境变量参与该检查）
//
// 退出码：0 成功 / 1 参数或状态错误 / 2 校验失败
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
const argv = process.argv.slice(2);
const CMD = argv[0] || 'help';
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : ''; };

const DEFAULT_PORT = Number(process.env.PORT || 3018);

function bail(msg, code = 1) { console.error('❌ ' + msg); process.exit(code); }

/** 数据目录优先级与 server/src/services/dataDir.ts 一致 */
function pickDataDir() {
  const explicit = val('--dir') || process.env.GUANWEI_DATA_DIR;
  if (explicit) return explicit;
  const home = path.join(os.homedir(), '.guanwei', 'data');
  const candidates = [home, path.resolve('server/data'), path.resolve('server/src/data')];
  const withDb = candidates.find(d => fs.existsSync(path.join(d, 'guanwei.db')) || fs.existsSync(path.join(d, 'db.json')));
  return withDb || home;
}

function dbFiles(dir) {
  const sqlite = process.env.GUANWEI_DB_FILE || path.join(dir, 'guanwei.db');
  const json = process.env.GUANWEI_USERS_DB || path.join(dir, 'db.json');
  return { sqlite, json };
}

function openDb(file, { readOnly = false } = {}) {
  const db = new DatabaseSync(file, readOnly ? { readOnly: true } : {});
  try { db.exec('PRAGMA busy_timeout = 5000'); } catch { /* ignore */ }
  return db;
}

function tableCount(db, table) {
  try { return Number(db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()?.c || 0); } catch { return null; }
}

function stats(file) {
  const db = openDb(file, { readOnly: true });
  try {
    return { users: tableCount(db, 'users'), divinations: tableCount(db, 'divinations'), failLogs: tableCount(db, 'ai_fail_logs') };
  } finally { db.close(); }
}

/** 端口是否已有服务在监听 */
function portLive(port) {
  return new Promise(resolve => {
    const sock = net.connect({ host: '127.0.0.1', port });
    const done = (v) => { try { sock.destroy(); } catch { /* ignore */ } resolve(v); };
    sock.setTimeout(600);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
  });
}

/**
 * 目标库是否可能正被服务占用。
 * 启发式（TCP 探测）：只要 `PORT` 与默认 3018 中任一端口有监听即视为运行中——
 * 宁可多问一次，也不要在服务握有旧 inode 时替换数据库文件（会撕裂 WAL）。
 */
async function serverRunning() {
  const ports = [...new Set([process.env.PORT ? Number(process.env.PORT) : null, DEFAULT_PORT].filter(Boolean))];
  for (const p of ports) {
    if (await portLive(p)) return p;
  }
  return 0;
}

function sha256(file) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function outDir() {
  return path.resolve(val('--out') || process.env.GUANWEI_BACKUP_DIR || path.join(pickDataDir(), 'backups'));
}

function cmdBackup() {
  const dir = pickDataDir();
  const { sqlite, json } = dbFiles(dir);
  const dst = outDir();
  fs.mkdirSync(dst, { recursive: true });
  const ts = stamp();
  const made = [];

  if (fs.existsSync(sqlite) && fs.statSync(sqlite).size > 0) {
    const out = path.join(dst, `guanwei-${ts}.db`);
    if (fs.existsSync(out)) bail('备份文件已存在（同一秒重复执行？）：' + out);
    const db = openDb(sqlite);
    try {
      // VACUUM INTO：一致性快照（含 -wal 中已提交但未 checkpoint 的事务），对运行中的服务安全
      db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
    } finally { db.close(); }
    const st = stats(out);
    const meta = {
      kind: 'guanwei-backup', createdAt: new Date().toISOString(), version: readVersion(),
      source: sqlite, file: path.basename(out), bytes: fs.statSync(out).size, sha256: sha256(out),
      counts: st, note: val('--note') || undefined,
    };
    fs.writeFileSync(out + '.json', JSON.stringify(meta, null, 2) + '\n');
    made.push(out);
    console.log(`✅ 数据库快照: ${out}`);
    console.log(`   账号 ${st.users} · 占卜记录 ${st.divinations} · 失败留档 ${st.failLogs} · ${(meta.bytes / 1024).toFixed(1)} KB`);
    console.log(`   校验: sha256 ${meta.sha256.slice(0, 16)}…（同目录 .json 内附完整校验值）`);
  } else {
    console.log('ℹ️  未发现 SQLite 库（' + sqlite + '），跳过');
  }

  // 旧 JSON 用户库（尚未迁移或作为历史留档）一并备份，保证「老装新装都备份得全」
  if (fs.existsSync(json) && fs.statSync(json).size > 0) {
    const outJson = path.join(dst, `db-${ts}.json`);
    fs.copyFileSync(json, outJson);
    made.push(outJson);
    let n = null;
    try { n = (JSON.parse(fs.readFileSync(outJson, 'utf-8')).users || []).length; } catch { /* 损坏则只报路径 */ }
    console.log(`✅ 旧 JSON 用户库: ${outJson}${n === null ? '' : `（账号 ${n}）`}`);
  }

  if (!made.length) bail('没有可备份的数据文件（是否还没启动过服务？）');
  console.log(`\n备份目录: ${dst}\n恢复：node scripts/guanwei-db.mjs restore <备份文件> --yes   （恢复前请先停止服务）`);
}

function cmdList() {
  const dst = outDir();
  if (!fs.existsSync(dst)) { console.log('（无备份目录：' + dst + '）'); return; }
  const files = fs.readdirSync(dst).filter(f => /^guanwei-\d{8}-\d{6}\.db$/.test(f)).sort().reverse();
  if (!files.length) { console.log('（暂无备份：' + dst + '）'); return; }
  console.log('备份目录: ' + dst);
  for (const f of files) {
    const p = path.join(dst, f);
    let line = `  ${f}  ${(fs.statSync(p).size / 1024).toFixed(1)} KB`;
    const metaFile = p + '.json';
    if (fs.existsSync(metaFile)) {
      try {
        const m = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
        line += `  账号 ${m.counts?.users ?? '?'} · 记录 ${m.counts?.divinations ?? '?'}   ${m.note || ''}`;
      } catch { /* 元数据损坏忽略 */ }
    }
    console.log(line);
  }
}

function readVersion() {
  try { return JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8')).version; } catch { return '?'; }
}

function cmdRestore() {
  const src = argv[1] && !argv[1].startsWith('--') ? path.resolve(argv[1]) : (val('--from') ? path.resolve(val('--from')) : '');
  if (!src) bail('用法：node scripts/guanwei-db.mjs restore <备份文件> [--yes] [--force]');
  if (!fs.existsSync(src)) bail('备份文件不存在: ' + src);

  // 1) 先确认备份本身可用（能打开 + 关键表存在），避免用坏文件覆盖好库
  let st;
  try {
    const probe = openDb(src, { readOnly: true });
    try {
      const tables = probe.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
      if (!tables.includes('users') && !tables.includes('divinations')) bail('备份文件里没有 users/divinations 表，可能不是观微数据库', 2);
      st = { users: tableCount(probe, 'users'), divinations: tableCount(probe, 'divinations') };
    } finally { probe.close(); }
  } catch (e) { bail('备份文件无法打开（损坏或非 SQLite）：' + (e?.message || e), 2); }

  const dir = pickDataDir();
  const { sqlite } = dbFiles(dir);

  // 2) 服务运行中直接替换文件会撕裂 WAL → 默认拒绝
  return serverRunning().then(running => {
    if (running && !has('--force')) {
      bail(`检测到端口 ${running} 有服务在监听（后端可能仍在运行）——请先停止服务再恢复（guanwei stop）；确要强行恢复加 --force`);
    }
    if (running) console.warn('⚠️  端口 ' + running + ' 仍有服务且指定了 --force：恢复后请立即重启服务，否则可能读到不一致数据');

    if (!has('--yes')) {
      console.log(`将用 ${src}`);
      console.log(`覆盖 ${sqlite}（账号 ${st.users} · 记录 ${st.divinations}）`);
      bail('未确认：加 --yes 执行（恢复前会自动把现有库另存一份）');
    }

    fs.mkdirSync(path.dirname(sqlite), { recursive: true });
    // 3) 覆盖前自动留存现有库（含 WAL 副文件一起挪走，避免旧 WAL 污染新库）
    if (fs.existsSync(sqlite)) {
      const pre = sqlite + '.pre-restore-' + stamp();
      fs.copyFileSync(sqlite, pre);
      console.log('ℹ️  已留存现有库: ' + pre);
    }
    for (const suffix of ['-wal', '-shm']) {
      const f = sqlite + suffix;
      if (fs.existsSync(f)) { fs.renameSync(f, f + '.pre-restore-' + stamp()); console.log('ℹ️  已挪走副文件: ' + f); }
    }
    fs.copyFileSync(src, sqlite);
    const after = stats(sqlite);
    console.log(`✅ 已恢复 → ${sqlite}`);
    console.log(`   账号 ${after.users} · 占卜记录 ${after.divinations}`);
    console.log('\n请重新启动服务：guanwei start');
  });
}

function cmdHelp() {
  console.log(`观微数据备份 / 恢复

  node scripts/guanwei-db.mjs backup  [--out DIR] [--note 说明] [--dir 数据目录]
      在线快照当前 SQLite（VACUUM INTO，服务运行中也安全），同时备份旧 JSON 用户库；
      默认输出到 <数据目录>/backups/，并附带 .json 元数据（时间/版本/条数/sha256）

  node scripts/guanwei-db.mjs list    [--out DIR]
      列出已有备份与其中账号/记录条数

  node scripts/guanwei-db.mjs restore <备份文件> --yes [--force] [--dir 数据目录]
      用备份覆盖当前库：先校验备份可打开且含关键表 → 留存现有库 → 挪走 -wal/-shm → 写入；
      服务运行中默认拒绝（加 --force 可强行，但请恢复后立刻重启）`);
}

switch (CMD) {
  case 'backup': cmdBackup(); break;
  case 'list': cmdList(); break;
  case 'restore': await cmdRestore(); break;
  case 'help': case '-h': case '--help': cmdHelp(); break;
  default: console.error('未知命令: ' + CMD); cmdHelp(); process.exit(1);
}
