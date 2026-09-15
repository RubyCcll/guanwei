#!/usr/bin/env node
// 发布内容守卫（硬门槛）：断言 npm 包内不含任何运行时数据与密钥
//
// 用法：node scripts/check-package.mjs   （CI / release / 本地发布前均调用）
// 退出码：0=干净；1=命中敏感内容（拒绝发布）
//
// 背景（2026-09 事故）：`files` 白名单曾含 `server/src`，而运行时数据默认写在
// `server/src/data/`，导致 1.1.1–1.3.2 全部 npm 版本把用户档案（含 token/passHash/
// 出生信息）与占卜记录打包公开。此守卫对**文件名与文件内容**双重检查。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-pack-'));
let tgz;
try {
  // --cache 指向临时目录：避免依赖本机 ~/.npm 缓存状态（权限异常时 npm 会直接失败）
  const out = execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', tmp, '--cache', path.join(tmp, 'npmcache')],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  tgz = path.join(tmp, JSON.parse(out)[0].filename);
} catch (e) {
  console.error('✗ npm pack 失败：', e.message);
  process.exit(1);
}

// 1) 文件名黑名单
const BAD_NAME = [
  /(^|\/)\.env(\.|$)/, /(^|\/)db\.json$/, /(^|\/)guanwei\.db$/, /\.(sqlite|sqlite3|db)$/,
  /(^|\/)\.npmrc$/, /(^|\/)id_rsa/, /\.pem$/, /(^|\/)secret/i,
];
const names = execFileSync('tar', ['-tzf', tgz], { encoding: 'utf8' }).split('\n').filter(Boolean);
const badNames = names.filter(n => BAD_NAME.some(re => re.test(n)));

// 2) 内容级扫描（解包后逐文件，跳过二进制大文件）
const dir = path.join(tmp, 'x');
fs.mkdirSync(dir);
execFileSync('tar', ['-xzf', tgz, '-C', dir]);
const BAD_CONTENT = [
  [/sk-[A-Za-z0-9_-]{20,}/, '疑似 OpenAI/DeepSeek 风格 key'],
  [/AIza[0-9A-Za-z_-]{30,}/, '疑似 Google API key'],
  [/gsk_[A-Za-z0-9]{40,}/, '疑似 Groq key'],
  [/sk-[a-f0-9]{32}/, '疑似 DashScope key'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, '疑似 Slack token'],
  [/gh[pousr]_[A-Za-z0-9]{30,}/, '疑似 GitHub token'],
  [/_authToken\s*=\s*(?!\$\{)[A-Za-z0-9_.\-]{16,}/, 'npm 认证 token（真实值）'],
  [/"(passHash|tokenExpires)"\s*:/, '用户档案库特征字段'],
];
const hits = [];
const walk = (d) => {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, ent.name);
    if (ent.isDirectory()) { walk(p); continue; }
    const rel = path.relative(dir, p);
    if (/\.(png|jpg|jpeg|gif|ico|woff2?|ttf|db|zip|pdf)$/i.test(ent.name)) continue;   // 二进制跳过
    if (fs.statSync(p).size > 8 * 1024 * 1024) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const [re, label] of BAD_CONTENT) if (re.test(text)) hits.push(rel + ' ← ' + label);
  }
};
walk(dir);

fs.rmSync(tmp, { recursive: true, force: true });

if (badNames.length || hits.length) {
  console.error('✗ 包内容守卫未通过——拒绝发布');
  if (badNames.length) console.error('  敏感文件：', badNames.slice(0, 10));
  if (hits.length) console.error('  敏感内容：', hits.slice(0, 10));
  process.exit(1);
}
console.log(`✅ 包内容干净（${names.length} 个文件，无运行时数据/密钥）`);
