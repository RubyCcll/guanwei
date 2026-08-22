#!/bin/sh
# 观微一体容器：后台启动后端，前台运行 nginx
set -e
echo "· 启动观微后端 (127.0.0.1:3018) ..."
(cd /app/server && npx tsx src/index.ts) &
BACKEND_PID=$!
# 等待后端就绪
for i in $(seq 1 20); do
  if wget -q -O /dev/null http://127.0.0.1:3018/api/health 2>/dev/null; then
    echo "· 后端就绪"
    break
  fi
  sleep 1
done
echo "· 启动 nginx (0.0.0.0:80) ..."
nginx -g 'daemon off;'
