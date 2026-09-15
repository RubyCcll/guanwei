#!/bin/sh
# 观微一体容器：后台启动后端，前台运行 nginx
set -e
echo "· 启动观微后端 (127.0.0.1:3018) ..."
(cd /app/server && npx tsx src/index.ts) &
BACKEND_PID=$!
# 等待后端就绪
READY=0
for i in $(seq 1 30); do
  if wget -q -O /dev/null http://127.0.0.1:3018/api/health 2>/dev/null; then
    echo "· 后端就绪"
    READY=1
    break
  fi
  sleep 1
done
if [ "$READY" != "1" ]; then
  echo "✗ 后端启动失败（30s 未就绪），退出容器" >&2
  exit 1
fi
# 后端进程守护：nginx 运行期间若后端退出，则一并退出（原实现后端崩溃后容器仍报健康，nginx 持续 502）
( while kill -0 "$BACKEND_PID" 2>/dev/null; do sleep 5; done; echo "✗ 后端进程已退出，停止容器" >&2; kill -TERM $$ 2>/dev/null ) &
echo "· 启动 nginx (0.0.0.0:80) ..."
nginx -g 'daemon off;'
