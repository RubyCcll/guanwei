#!/usr/bin/env node
// 本地数据自查：列出账号与占卜记录概况，用于判断「库内数据是否含真实用户」
// 用法：node server/scripts/inspectLocalData.mjs [数据目录]
// 输出仅在本地终端显示，不会上传任何地方。
//
// 存储（1.3.5 起统一 SQLite）：账号在 guanwei.db 的 users 表；更早版本是 db.json，本脚本两者都认。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// 目录探测顺序与 server/src/services/dataDir.ts 一致（新位置 → 历史位置）
const candidates = [
  process.argv[2],
  process.env.GUANWEI_DATA_DIR,
  path.join(os.homedir(), '.guanwei', 'data'),
  path.resolve('server/data'),
  path.resolve('server/src/data'),
].filter(Boolean);

const TEST_PAT = /^(联调|鉴权|占位|列删|端到端|限流测试|迁移验证|首位来客|闭环用户|升级用户|全新用户|audit|victim|test|e2e)/i;

/** 读账号列表：优先统一 SQLite，回退旧 JSON */
function loadUsers() {
  const sqlite = candidates.map(d => path.join(d, 'guanwei.db')).find(p => fs.existsSync(p) && fs.statSync(p).size > 0);
  if (sqlite) {
    const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
    const db = new DatabaseSync(sqlite, { readOnly: true });
    try {
      const hasUsers = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
      if (hasUsers) {
        const rows = db.prepare('SELECT username, pass_hash, created_at, profile_json, records_json, token FROM users').all();
        const users = rows.map(r => ({
          username: r.username, passHash: r.pass_hash, createdAt: r.created_at, token: r.token,
          profile: safeJson(r.profile_json, {}), records: safeJson(r.records_json, []),
        }));
        const divs = db.prepare('SELECT COUNT(*) AS c FROM divinations').get();
        return { source: sqlite, kind: 'sqlite', users, divinations: Number(divs?.c || 0) };
      }
    } finally { db.close(); }
  }
  const json = candidates.map(d => path.join(d, 'db.json')).find(p => fs.existsSync(p) && fs.statSync(p).size > 0);
  if (json) return { source: json, kind: 'json', users: safeJson(fs.readFileSync(json, 'utf-8'), { users: [] }).users || [], divinations: null };
  return null;
}

function safeJson(raw, fallback) {
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return fallback; }
}

const data = loadUsers();
if (!data) { console.error('未找到用户库（guanwei.db / db.json），已尝试:', candidates.join(' / ')); process.exit(1); }

const us = data.users;
console.log('数据源:', data.source, data.kind === 'json' ? '(旧 JSON 库)' : '(统一 SQLite)');
console.log('账号总数:', us.length, '| 带 token:', us.filter(u => u.token).length,
  '| 正式注册:', us.filter(u => u.passHash).length, '| 有出生档案:', us.filter(u => u.profile && Object.keys(u.profile).length).length);
if (data.divinations !== null) console.log('占卜记录:', data.divinations);
console.log('\n— 疑似测试账号（命名模式命中）—');
const t = us.filter(u => TEST_PAT.test(String(u.username)));
console.log('数量:', t.length);
console.log('\n— 需人工确认的账号（请自行核对是否为你本人/真实用户）—');
const r = us.filter(u => !TEST_PAT.test(String(u.username)));
for (const u of r) {
  const p = u.profile || {};
  const created = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '?';
  console.log([String(u.username).padEnd(16), '建档', created, '| 生日', p.birthDate || '—',
    '| 时辰', p.birthTime || '—', '| 地点', p.location ? (p.location.province || '') + (p.location.city || '') : '—',
    '| token', u.token ? 'Y' : 'N', '| 记录同步', (u.records || []).length].join(' '));
}
console.log('\n提示：确认无用后，可删除整个数据目录或其中的测试账号；删除不可恢复。');
