#!/usr/bin/env bash
# ============================================================
# 观微发版脚本：升级版本号 → 同步 lockfile → 打 tag → 推送 git → （可选）发布 npm
# 用法：./scripts/release.sh 1.1.2            仅 git 发版（tag 触发 CI/Release/镜像）
#       ./scripts/release.sh 1.1.2 --npm      额外发布 npm 包（需先配置 npm 登录）
# 要求：工作区无未提交改动；CHANGELOG.md 已写好本次版本条目
# 详见（本地文档）：docs/RELEASE-SOP.md
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

NEW_VER="${1:-}"
DO_NPM=0
if [[ "${2:-}" == "--npm" ]]; then DO_NPM=1; fi
if [[ -z "$NEW_VER" ]] || ! [[ "$NEW_VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "用法: ./scripts/release.sh <版本号> [--npm]   例如: ./scripts/release.sh 1.1.2 --npm"; exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠️  工作区有未提交改动，先提交或 stash 再发版"; exit 1
fi

# 0. 发版前必须全量测试通过（后端集成测试会起服务）
echo "0️⃣  全量测试（npm test）..."
if ! npm test >/tmp/guanwei-release-test.log 2>&1; then
  echo "   ❌ 测试未通过，见 /tmp/guanwei-release-test.log"; exit 1
fi
echo "   ✅ 测试通过"

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

echo "3️⃣  提交 + 打 tag + 推送 git"
git add package.json package-lock.json server/package.json server/package-lock.json CHANGELOG.md
git commit -m "chore: 版本升级 ${NEW_VER}"
git tag "v${NEW_VER}"
git push origin main
git push origin "v${NEW_VER}"
echo "   ✅ 已推送——CI / Release / 镜像 / Pages 将自动执行"

if [[ "$DO_NPM" == "1" ]]; then
  echo "4️⃣  发布 npm（registry 必须是官方源，本机默认 npmmirror 需显式指定）..."
  # 用本地缓存避免 ~/.npm 写入受限；发布失败不中断后续提示
  npm publish --registry https://registry.npmjs.org --cache ./.npm-cache || echo "   ⚠️  npm publish 失败——按 docs/RELEASE-SOP.md 第四节排查（2FA/权限/registry）"
  rm -rf .npm-cache
  echo "5️⃣  验证线上版本..."
  npm view guanwei version --registry https://registry.npmjs.org --cache ./.npm-cache 2>/dev/null || true
  rm -rf .npm-cache
else
  echo "（未加 --npm：跳过 npm 发布。如需发布：./scripts/release.sh ${NEW_VER} --npm，或手动 npm publish）"
fi
echo "🎉 v${NEW_VER} 发版完成"
