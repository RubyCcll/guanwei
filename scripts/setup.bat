@echo off
REM 观微一键配置与启动（Windows）—— 用法：setup.bat --key sk-xxx [--docker]
setlocal
set KEY=
set MODE=local

:parse
if "%~1"=="" goto done
if "%~1"=="--key" (set KEY=%~2 & shift & shift & goto parse)
if "%~1"=="--docker" (set MODE=docker & shift & goto parse)
echo 未知参数: %~1
exit /b 1
:done

if "%KEY%"=="" (
  echo 请用: setup.bat --key 你的APIKey [--docker]
  echo 或先手动创建 server\.env（参考 server\.env.example）
  exit /b 1
)

echo 生成 server\.env ...
> server\.env echo LLM_PROVIDER=deepseek
>> server\.env echo LLM_DEEPSEEK_KEY=%KEY%
>> server\.env echo LLM_DEEPSEEK_MODEL=deepseek-chat

if "%MODE%"=="docker" (
  docker compose up -d --build
  echo 已启动: http://localhost:5173
) else (
  call npm install
  pushd server
  call npm install
  popd
  start "guanwei-backend" cmd /c "cd server && npm run dev"
  call npm run dev
)
