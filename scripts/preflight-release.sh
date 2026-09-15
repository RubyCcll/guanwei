#!/usr/bin/env bash
# 发版前自检（本地硬门槛）：内容干净 + 测试通过 + 版本一致
# 用法：./scripts/preflight-release.sh [期望版本号]
set -euo pipefail
cd "$(dirname "$0")/.."

echo "1/4 包内容守卫（文件名 + 内容级扫描，拒绝任何运行时数据/密钥）..."
node scripts/check-package.mjs

echo "2/4 类型检查..."
npx tsc --noEmit
(cd server && npx tsc --noEmit)

echo "3/4 全量测试..."
npx vitest run --reporter=dot >/tmp/gw-preflight-test.log 2>&1 || { echo "✗ 测试未通过，见 /tmp/gw-preflight-test.log"; tail -20 /tmp/gw-preflight-test.log; exit 1; }
grep -E "Test Files|Tests " /tmp/gw-preflight-test.log | tail -2

echo "4/4 版本一致性..."
V=$(node -e "console.log(require('./package.json').version)")
for f in server/package.json packages/guanwei-api/package.json package-lock.json server/package-lock.json; do
  Vf=$(node -e "const d=require('./$f');console.log(d.version||d.packages?.['']?.version||'?')")
  [ "$Vf" = "$V" ] || { echo "✗ 版本漂移：$f = $Vf，根 = $V"; exit 1; }
done
grep -q "version: '$V'" packages/guanwei-api/src/mcp.ts || echo "⚠️  MCP serverInfo.version 未同步到 $V"
if [ -n "${1:-}" ] && [ "$1" != "$V" ]; then echo "✗ 参数版本 $1 ≠ package.json $V"; exit 1; fi
echo "✅ 自检通过：v$V 可发布"
