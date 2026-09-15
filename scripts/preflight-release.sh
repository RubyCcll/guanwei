#!/usr/bin/env bash
# 发版前自检（本地硬门槛）：内容干净 + 测试通过 + 版本一致
# 用法：./scripts/preflight-release.sh [期望版本号]
set -euo pipefail
cd "$(dirname "$0")/.."

echo "1/5 仓库边界守卫（公开区不得含内部内容；打包区须为公开区子集）..."
node scripts/check-boundary.mjs

echo "2/5 包内容守卫（文件名 + 内容级扫描，拒绝任何运行时数据/密钥）..."
node scripts/check-package.mjs

echo "3/5 类型检查..."
npx tsc --noEmit
(cd server && npx tsc --noEmit)

echo "4/5 全量测试..."
npx vitest run --reporter=dot >/tmp/gw-preflight-test.log 2>&1 || { echo "✗ 测试未通过，见 /tmp/gw-preflight-test.log"; tail -20 /tmp/gw-preflight-test.log; exit 1; }
grep -E "Test Files|Tests " /tmp/gw-preflight-test.log | tail -2

echo "5/5 版本一致性..."
V=$(node -e "console.log(require('./package.json').version)")
for f in server/package.json packages/guanwei-api/package.json package-lock.json server/package-lock.json; do
  Vf=$(node -e "const d=require('./$f');console.log(d.version||d.packages?.['']?.version||'?')")
  [ "$Vf" = "$V" ] || { echo "✗ 版本漂移：$f = $Vf，根 = $V"; exit 1; }
done
grep -q "version: '$V'" packages/guanwei-api/src/mcp.ts || echo "⚠️  MCP serverInfo.version 未同步到 $V"
if [ -n "${1:-}" ] && [ "$1" != "$V" ]; then echo "✗ 参数版本 $1 ≠ package.json $V"; exit 1; fi
echo "✅ 自检通过：v$V 可发布"
