#!/usr/bin/env bash
# ============================================================
# 观微 Guanwei · 一键安装脚本
# 用法（复制这一行到终端执行）：
#   curl -fsSL https://raw.githubusercontent.com/RubyCcll/guanwei/main/scripts/install.sh | bash
#
# 做什么：拉取项目 → 安装依赖 → 全局安装 guanwei 命令
# 装完：guanwei setup 配置 Key → guanwei start 启动
# 只想快速跑？装完 Docker 后（不装本脚本也行）：
#   docker run -d --name guanwei -p 5173:80 -e LLM_DEEPSEEK_KEY=你的Key ghcr.io/rubyccll/guanwei:latest
# ============================================================
set -euo pipefail

REPO="https://github.com/RubyCcll/guanwei.git"
INSTALL_DIR="${GUANWEI_DIR:-$HOME/guanwei}"
BRANCH="main"

echo "=============================================="
echo "  观微 Guanwei · 一键安装"
echo "=============================================="

# 1. 检查 git / node
if ! command -v git >/dev/null 2>&1; then
  echo "❌ 未检测到 git——请先安装：https://git-scm.com/downloads"
  echo "   或者用 Docker 方式：docker run -d -p 5173:80 -e LLM_DEEPSEEK_KEY=你的Key ghcr.io/rubyccll/guanwei:latest"
  exit 1
fi

# 2. 拉取/更新项目
if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "📦 检测到已有项目，更新到最新..."
  git -C "$INSTALL_DIR" fetch origin >/dev/null 2>&1 || true
  git -C "$INSTALL_DIR" merge --ff-only origin/$BRANCH >/dev/null 2>&1 || git -C "$INSTALL_DIR" pull --rebase origin $BRANCH >/dev/null 2>&1 || true
else
  echo "📦 拉取项目到 $INSTALL_DIR ..."
  git clone --depth 1 -b $BRANCH "$REPO" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

# 3. 安装依赖
echo "📦 安装依赖（首次约 1-3 分钟）..."
npm install --no-fund --no-audit >/dev/null 2>&1 || echo "   ⚠️  前端依赖安装警告"
(cd server && npm install --no-fund --no-audit >/dev/null 2>&1) || echo "   ⚠️  后端依赖安装警告"

# 4. 全局安装 guanwei 命令
echo "🔗 安装 guanwei 全局命令..."
npm link >/dev/null 2>&1 || echo "   ⚠️  npm link 失败（可手动：cd $INSTALL_DIR && npm link）"

echo "=============================================="
echo "🎉 安装完成！项目位于：$INSTALL_DIR"
echo ""
echo "下一步："
echo "  1) 配置 API Key：   guanwei setup --key 你的APIKey"
echo "  2) 启动：           guanwei start（或 guanwei start --docker）"
echo "  3) 浏览器打开：     http://localhost:5173"
echo ""
echo "常用命令：guanwei status / doctor / update / stop"
echo "=============================================="
