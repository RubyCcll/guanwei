#!/usr/bin/env bash
# ============================================================
# 观微发版脚本：升级版本号 → 同步 lockfile → 打 tag → 推送
# 用法：./scripts/release.sh 1.1.2        （新版本号，不带 v 前缀）
# 要求：工作区无未提交改动；CHANGELOG.md 已写好本次版本条目
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

NEW_VER="${1:-}"
if [[ -z "$NEW_VER" ]] || ! [[ "$NEW_VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "用法: ./scripts/release.sh <版本号>   例如: ./scripts/release.sh 1.1.2"; exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠️  工作区有未提交改动，先提交或 stash 再发版"; exit 1
fi

echo "1️⃣  更新 package.json / server/package.json -> ${NEW_VER}"
node -e "
const fs = require('fs');
for (const p of ['package.json', 'server/package.json', 'package-lock.json', 'server/package-lock.json']) {
  const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
  d.version = '${NEW_VER}';
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
}
"
echo "   ✅ 版本号与 lockfile 已同步"

echo "2️⃣  检查 CHANGELOG.md 是否已有 [${NEW_VER}] 条目..."
if ! grep -q "^## \[${NEW_VER}\]" CHANGELOG.md; then
  echo "   ⚠️  CHANGELOG.md 缺少 [${NEW_VER}] 条目——请补上后再继续（Ctrl+C 中断）"
  read -rp "   已补好？回车继续: " _
fi

echo "3️⃣  提交 + 打 tag + 推送"
git add package.json package-lock.json server/package.json server/package-lock.json CHANGELOG.md
git commit -m "chore: 版本升级 ${NEW_VER}"
git tag "v${NEW_VER}"
git push origin main
git push origin "v${NEW_VER}"
echo "🎉 v${NEW_VER} 已推送——CI / Release / 镜像 / Pages 将自动执行"
