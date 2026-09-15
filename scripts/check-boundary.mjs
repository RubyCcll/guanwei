#!/usr/bin/env node
// 仓库边界守卫：明确区分「公开区 / 内部区 / 打包区」，并拦截越界
//
//   公开区（git 跟踪 → GitHub 可见）   ：src/ server/src/ shared/ packages/ scripts/ tests/ .github/ README 等
//   内部区（仅本地，git 忽略 → 不可见）：internal/（规划、监控、审计、SOP、草稿、真实案例）
//   打包区（npm publish 内容）        ：package.json `files` 白名单（必须是公开区子集）
//
// 用法：node scripts/check-boundary.mjs        退出码 0=边界干净；1=越界
// 接入：.github/workflows/ci.yml、scripts/preflight-release.sh
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);

// ── 1) 路径级：公开区不得出现内部/敏感路径 ──
const FORBIDDEN_PATH = [
  [/^internal\//, '内部区目录（应仅本地存在）'],
  [/^docs\/.*\.md$/, '内部文档（内部文档应放 internal/docs/；docs/ 只留对外素材）'],
  [/(^|\/)\.env(\.|$)/, '环境变量文件'],
  [/\.(db|sqlite|sqlite3)$/, '运行时数据库'],
  [/(^|\/)db\.json$/, '用户档案库'],
  [/(^|\/)(id_rsa|.*\.pem)$/, '私钥'],
  [/(^|\/)(\.audit|audit-tmp)/, '审计临时文件'],
  [/^tests\/tmp-test-/, '本地临时测试（可能含真实案例）'],
];
const pathViolations = [];
for (const f of tracked) {
  if (/\.example$/.test(f)) continue;   // *.env.example 为公开模板（无值），可入库
  for (const [re, why] of FORBIDDEN_PATH) if (re.test(f)) pathViolations.push(`${f}  ← ${why}`);
}

// ── 2) 内容级：公开区文件不得含密钥/隐私特征（跳过二进制与压缩产物）──
const KEY_PATTERNS = [
  [/sk-[A-Za-z0-9_-]{20,}/, '疑似 LLM API key'],
  [/AIza[0-9A-Za-z_-]{30,}/, '疑似 Google API key'],
  [/gsk_[A-Za-z0-9]{40,}/, '疑似 Groq key'],
  [/gh[pousr]_[A-Za-z0-9]{30,}/, '疑似 GitHub token'],
  [/_authToken\s*=/, 'npm 认证 token'],
];
const SKIP_EXT = /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf|pdf|zip|gz|mp4|db)$/i;
const contentViolations = [];
for (const f of tracked) {
  if (SKIP_EXT.test(f)) continue;
  let text;
  try { if (fs.statSync(f).size > 4 * 1024 * 1024) continue; text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  for (const [re, why] of KEY_PATTERNS) if (re.test(text)) contentViolations.push(`${f}  ← ${why}`);
}

// ── 3) 打包区：npm files 白名单必须是公开区子集 ──
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const files = pkg.files || [];
const BAD_ALLOW = [
  [/^internal/, '内部区不得进 npm 包'],
  [/^docs/, 'docs/ 仅 GitHub 素材，无需进包'],
  [/^tests/, '测试不入包'],
  [/^\.github/, 'CI 配置不入包'],
  [/^server\/src\/data/, '运行时数据不入包'],
];
const allowViolations = files.filter(f => BAD_ALLOW.some(([re]) => re.test(f))).map(f => `files 白名单含 ${f}`);

// ── 报告 ──
const count = (prefix) => tracked.filter(f => f === prefix || f.startsWith(prefix + '/')).length;
const dist = Object.fromEntries(['src', 'shared', 'server', 'packages', 'scripts', 'tests', '.github']
  .map(d => [d, count(d)]).filter(([, n]) => n > 0));

console.log('公开区（git 跟踪）:', tracked.length, '个文件');
console.log('  顶层分布:', JSON.stringify(dist));
console.log('  内部区（仅本地）: internal/ 下', fs.existsSync('internal')
  ? execFileSync('find', ['internal', '-type', 'f'], { encoding: 'utf8' }).split('\n').filter(Boolean).length
  : 0, '个文件（git 忽略，永不公开）');
console.log('打包区（npm files 白名单）:', files.length, '条 → 内容由 scripts/check-package.mjs 二次校验');

const all = [...pathViolations, ...contentViolations, ...allowViolations];
if (all.length) {
  console.error('\n✗ 边界守卫未通过：');
  for (const v of all.slice(0, 20)) console.error('  -', v);
  process.exit(1);
}
console.log('\n✅ 边界干净：公开区无内部内容，打包区是公开区子集');
