#!/usr/bin/env node
// npm 发布工具（读本地凭据 → 校验 → 包内容守卫 → 发布）
//
// 用法：
//   node scripts/npm-release.mjs --check            # 只校验凭据与登录态（不发布）
//   node scripts/npm-release.mjs --dry-run          # 走一遍打包与守卫，不真正发布
//   node scripts/npm-release.mjs                    # 正式发布（用 internal/.env 的 NPM_TOKEN）
//   node scripts/npm-release.mjs --otp 123456       # 用动态码（无 Automation token 时）
//
// 为什么需要它：npm 不读 .env；本脚本把 internal/.env 的 NPM_TOKEN 注入临时 .npmrc 后调用 npm。
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadCredentials, CRED_FILES } from './credentials.mjs';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : ''; };
const REGISTRY = 'https://registry.npmjs.org';
const ROOT = process.cwd();

const { NPM_TOKEN } = loadCredentials();
const otp = val('--otp');

async function whoami(token) {
  const res = await fetch(`${REGISTRY}/-/whoami`, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
  if (!res.ok) return null;
  return (await res.json()).username;
}

const run = async () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`包 ${pkg.name}@${pkg.version} → ${REGISTRY}`);

  // 1) 凭据检查
  let user = null;
  if (NPM_TOKEN) {
    user = await whoami(NPM_TOKEN);
    console.log(`NPM_TOKEN 校验: ${user ? '✅ 有效（账号 ' + user + '）' : '❌ 无效/已撤销'}`);
    if (!user) process.exit(1);
  } else {
    console.log(`未找到 NPM_TOKEN（可写入 ${CRED_FILES.env} 或 ${CRED_FILES.npm}）`);
    user = await whoami('');   // 回退系统 ~/.npmrc
    console.log(`系统 npm 登录态: ${user ? '✅ ' + user : '❌ 未登录/已失效'}`);
    if (!user && !otp) { console.error('既无 NPM_TOKEN 也无有效登录态 → 无法发布'); process.exit(1); }
  }
  if (has('--check')) return;

  // 2) 包内容守卫（硬门槛）
  if (!has('--skip-guard')) {
    console.log('包内容守卫...');
    execFileSync('node', ['scripts/check-package.mjs'], { stdio: 'inherit' });
  }

  // 3) 临时 userconfig（仅当使用 NPM_TOKEN）
  let cfgPath = '';
  if (NPM_TOKEN) {
    cfgPath = path.join(ROOT, 'internal', '.npmrc');
    fs.writeFileSync(cfgPath, `registry=${REGISTRY}\n//registry.npmjs.org/:_authToken=\${NPM_TOKEN}\n`);
    fs.chmodSync(cfgPath, 0o600);
  }

  // 4) 发布
  const args = ['publish', '--registry', REGISTRY];
  if (cfgPath) args.push('--userconfig', cfgPath);
  if (otp) args.push('--otp', String(otp));
  if (has('--dry-run')) args.push('--dry-run');
  console.log('执行: npm ' + args.join(' '));
  const r = spawnSync('npm', args, {
    stdio: 'inherit',
    env: { ...process.env, ...(NPM_TOKEN ? { NPM_TOKEN } : {}), npm_config_cache: path.join(ROOT, '.npm-cache') },
  });
  if (cfgPath) { try { fs.unlinkSync(cfgPath); } catch { /* ignore */ } }
  try { fs.rmSync(path.join(ROOT, '.npm-cache'), { recursive: true, force: true }); } catch { /* ignore */ }
  if (r.status !== 0) { console.error('❌ 发布失败（退出码 ' + r.status + '）'); process.exit(r.status || 1); }
  console.log('✅ 发布完成');
};

run().catch(e => { console.error('执行失败:', e.message); process.exit(1); });
