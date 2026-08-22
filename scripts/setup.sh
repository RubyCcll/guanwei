#!/usr/bin/env bash
# ============================================================
# 观微 Guanwei · 一键配置与启动
# 用法：
#   ./scripts/setup.sh                          # 交互式：选择服务商 → 输入 API Key → 自动装依赖并启动
#   ./scripts/setup.sh --key sk-xxx             # 非交互（默认 DeepSeek）
#   ./scripts/setup.sh --provider gemini --key xxxx
#   ./scripts/setup.sh --key sk-xxx --docker    # 用 Docker 启动（无需本机 Node）
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

PROVIDER=""
KEY=""
MODE="local"   # local | docker

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider) PROVIDER="$2"; shift 2 ;;
    --key)      KEY="$2"; shift 2 ;;
    --docker)   MODE="docker"; shift ;;
    -h|--help)
      sed -n '1,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "未知参数: $1（--provider / --key / --docker / --help）"; exit 1 ;;
  esac
done

# ---------- 1. 选择服务商与 Key ----------
if [[ -z "$PROVIDER" ]]; then
  if [[ -n "$KEY" ]]; then
    # 只给了 --key：默认 DeepSeek
    PROVIDER=deepseek
  else
    echo "=============================================="
    echo "  观微 Guanwei · 一键配置"
    echo "=============================================="
    echo "选择 AI 服务商："
    echo "  1) DeepSeek（推荐，性价比高）"
    echo "  2) Gemini（Google）"
    echo "  3) Groq（免费额度）"
    echo "  4) 通义千问（阿里云）"
    echo "  5) 自定义 OpenAI 兼容端点"
    read -rp "请输入编号 [1]: " CHOICE
    case "${CHOICE:-1}" in
      1) PROVIDER=deepseek ;;
      2) PROVIDER=gemini ;;
      3) PROVIDER=groq ;;
      4) PROVIDER=qwen ;;
      5) PROVIDER=custom ;;
      *) echo "无效编号"; exit 1 ;;
    esac
  fi
fi
if [[ -z "$KEY" ]]; then
  read -rsp "请输入你的 ${PROVIDER} API Key（输入不回显）: " KEY; echo
fi
if [[ -z "$KEY" ]]; then
  echo "错误：API Key 不能为空"; exit 1
fi

# ---------- 2. 生成 server/.env ----------
mkdir -p server
cat > server/.env <<EOF
# 由 scripts/setup.sh 生成（$(date '+%Y-%m-%d %H:%M')）
LLM_PROVIDER=${PROVIDER}
EOF
case "$PROVIDER" in
  deepseek) echo "LLM_DEEPSEEK_KEY=${KEY}" >> server/.env
            echo "LLM_DEEPSEEK_MODEL=deepseek-chat" >> server/.env ;;
  gemini)   echo "LLM_GEMINI_KEY=${KEY}" >> server/.env ;;
  groq)     echo "LLM_GROQ_KEY=${KEY}" >> server/.env ;;
  qwen)     echo "LLM_QWEN_KEY=${KEY}" >> server/.env ;;
  custom)
    echo "LLM_CUSTOM_KEY=${KEY}" >> server/.env
    read -rp "自定义端点 URL [https://your-endpoint/v1/chat/completions]: " EP
    echo "LLM_CUSTOM_ENDPOINT=${EP:-https://your-endpoint/v1/chat/completions}" >> server/.env ;;
esac
echo "✅ server/.env 已生成（API Key 仅存本地，已 gitignore）"

# ---------- 3. 前端环境 ----------
if [[ ! -f .env.development ]] && [[ -f .env.development.example ]]; then
  cp .env.development.example .env.development
  echo "✅ .env.development 已就绪"
fi

# ---------- 4. 安装依赖并启动 ----------
if [[ "$MODE" == "docker" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "错误：未检测到 Docker，请先安装 https://www.docker.com/"; exit 1
  fi
  # 兼容 docker compose 插件与独立 docker-compose
  if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
  else
    echo "错误：未找到 docker compose 插件（docker-compose）"; exit 1
  fi
  echo "🐳 正在构建并启动（首次构建需几分钟）..."
  $COMPOSE up -d --build
  echo "✅ 已启动：前端 http://localhost:5173 · 后端 http://localhost:3018"
  echo "   停止：$COMPOSE down"
else
  echo "📦 安装依赖（首次较慢）..."
  npm install --no-fund --no-audit
  (cd server && npm install --no-fund --no-audit)
  echo "🚀 启动服务..."
  echo "   后端 :3018（tsx watch）"
  echo "   前端 :5173（vite dev）"
  echo "   Ctrl+C 停止"
  (cd server && npm run dev) &
  npm run dev
fi
