#!/usr/bin/env node
// GitHub 仓库历史清理工具（可复用于任何仓库）
//
// 场景：用 git filter-repo 重写历史后，远端仍残留指向旧历史的 tag / release / 分支
//      （尤其 immutable release 的 tag 会被 GitHub 永久绑定，无法用 git push 更新）。
//
// 用法：
//   GITHUB_TOKEN=xxx node scripts/github-history-cleanup.mjs list   --repo owner/name
//   GITHUB_TOKEN=xxx node scripts/github-history-cleanup.mjs purge  --repo owner/name --keep v1.3.4 [--apply]
//   GITHUB_TOKEN=xxx node scripts/github-history-cleanup.mjs branches --repo owner/name [--apply]
//
//   token 读取顺序：--token-file > $GITHUB_TOKEN > internal/github-token（本地私有，git 忽略）
//   默认 **dry-run**：不加 --apply 只打印将要执行的操作。
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const cmd = argv[0];
const arg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const has = (name) => argv.includes(name);
const REPO = arg('--repo');
const KEEP = (arg('--keep', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const APPLY = has('--apply');
if (!REPO || !REPO.includes('/')) {
  console.error('用法: node scripts/github-history-cleanup.mjs <list|purge|branches|releases> --repo owner/name [--keep tag,...] [--apply]');
  process.exit(1);
}
const TOKEN = (() => {
  const f = arg('--token-file');
  const candidates = [f, process.env.GITHUB_TOKEN && '(env)', path.resolve('internal/github-token')].filter(Boolean);
  if (f && fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  const local = path.resolve('internal/github-token');
  if (fs.existsSync(local)) return fs.readFileSync(local, 'utf8').trim();
  console.error('缺少 token（--token-file / $GITHUB_TOKEN / internal/github-token 均不可用）', candidates);
  process.exit(1);
})();

async function api(method, p, body) {
  const res = await fetch('https://api.github.com' + p, {
    method,
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function listAll(p) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const { status, body } = await api('GET', `${p}${p.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (status !== 200 || !Array.isArray(body) || body.length === 0) break;
    out.push(...body);
    if (body.length < 100) break;
  }
  return out;
}

const info = async () => {
  const { status, body } = await api('GET', `/repos/${REPO}`);
  if (status !== 200) { console.error('仓库不可读:', status, body?.message); process.exit(1); }
  return body;
};

const run = async () => {
  const repo = await info();
  const releases = await listAll(`/repos/${REPO}/releases`);
  const tags = await listAll(`/repos/${REPO}/git/refs/tags`);
  const branches = await listAll(`/repos/${REPO}/branches`);
  const tagNames = tags.map(t => t.ref.replace('refs/tags/', ''));

  if (cmd === 'list') {
    console.log(`仓库 ${REPO}（默认分支 ${repo.default_branch}）`);
    console.log(`  releases (${releases.length}):`, releases.map(r => `${r.tag_name}${r.immutable ? '(immutable)' : ''}`).join(', ') || '无');
    console.log(`  tags (${tagNames.length}):`, tagNames.join(', ') || '无');
    console.log(`  branches (${branches.length}):`, branches.map(b => b.name).join(', '));
    const stale = tagNames.filter(t => !KEEP.includes(t));
    console.log(`\n--keep 之外的 tag（purge 将删除其 release + tag）:`, stale.join(', ') || '无');
    return;
  }

  if (cmd === 'branches') {
    const stale = branches.map(b => b.name).filter(n => n !== repo.default_branch);
    if (!stale.length) return console.log('无非默认分支');
    for (const n of stale) {
      if (!APPLY) { console.log(`[dry-run] 将删除分支 ${n}`); continue; }
      const { status } = await api('DELETE', `/repos/${REPO}/git/refs/heads/${n}`);
      console.log(`删除分支 ${n} → ${status}`);
    }
    return;
  }

  if (cmd === 'purge' || cmd === 'releases') {
    // 防误删：未显式 --keep 时，默认保留「最新版本 tag」（latest release → semver 最大者）
    let keep = [...KEEP];
    if (keep.length === 0) {
      const { body: latest } = await api('GET', `/repos/${REPO}/releases/latest`);
      const cand = latest?.tag_name || tagNames
        .slice()
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .pop();
      if (cand) { keep = [cand]; console.log(`（未指定 --keep，默认保留最新版本 ${cand}）`); }
    }
    const staleTags = tagNames.filter(t => !keep.includes(t));
    const byTag = new Map(releases.map(r => [r.tag_name, r]));
    for (const t of staleTags) {
      const rel = byTag.get(t);
      if (rel) {
        if (!APPLY) console.log(`[dry-run] 将删除 release ${t}${rel.immutable ? '（immutable）' : ''} + tag ${t}`);
        else {
          const d1 = await api('DELETE', `/repos/${REPO}/releases/${rel.id}`);
          const d2 = await api('DELETE', `/repos/${REPO}/git/refs/tags/${t}`);
          console.log(`删除 ${t}: release=${d1.status} tag=${d2.status}`);
        }
      } else if (cmd === 'purge') {
        if (!APPLY) console.log(`[dry-run] 将删除 tag ${t}（无 release）`);
        else {
          const d = await api('DELETE', `/repos/${REPO}/git/refs/tags/${t}`);
          console.log(`删除 tag ${t} → ${d.status}`);
        }
      }
    }
    if (!APPLY) console.log(`\n共 ${staleTags.length} 个待处理；确认后加 --apply 执行`);
    return;
  }

  console.error('未知子命令:', cmd);
  process.exit(1);
};

run().catch(e => { console.error('执行失败:', e.message); process.exit(1); });
