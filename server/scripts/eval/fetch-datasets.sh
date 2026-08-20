#!/usr/bin/env bash
# 拉取 MingLi-Bench 数据集（jsDelivr CDN 优先，raw 兜底）
# 数据许可：MIT（https://github.com/DestinyLinker/MingLi-Bench）
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)/datasets"
mkdir -p "$DIR"
BASE="https://cdn.jsdelivr.net/gh/DestinyLinker/MingLi-Bench@main/data"
RAW="https://raw.githubusercontent.com/DestinyLinker/MingLi-Bench/main/data"
for f in data.json fortune_api_results.json; do
  if [ ! -f "$DIR/$f" ]; then
    echo "拉取 $f ..."
    if curl -sL --retry 3 --max-time 90 "$BASE/$f" -o "$DIR/$f.tmp" && mv "$DIR/$f.tmp" "$DIR/$f"; then
      echo "  ✓ $f ($(wc -c < "$DIR/$f") bytes, CDN)"
    else
      echo "  CDN 失败，改用 raw.githubusercontent.com ..."
      curl -sL --retry 3 --max-time 120 "$RAW/$f" -o "$DIR/$f"
      echo "  ✓ $f ($(wc -c < "$DIR/$f") bytes, raw)"
    fi
  else
    echo "已存在 $f，跳过（删除后重跑可强制刷新）"
  fi
done
