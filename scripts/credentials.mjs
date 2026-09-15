// 本地凭据加载（统一入口，供各脚本复用）
//
// 设计说明（为什么不是直接让 npm 读 .env）：
//   - npm CLI **不读** .env；它只读 .npmrc，并支持 `${VAR}` 环境变量插值
//   - 因此约定：token 值集中放 internal/.env（人可读、整目录 gitignore），
//     由脚本读取后注入环境/临时 .npmrc，再调用 npm
//
// 读取优先级：环境变量 > internal/.env > internal/<name> 独立文件
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, 'internal', '.env');

/** 极简 dotenv 解析（仅 KEY=VALUE，支持 # 整行注释与引号） */
function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v) out[k] = v;
  }
  return out;
}

function readFileIfExists(rel) {
  const p = path.join(ROOT, rel);
  try { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : ''; } catch { return ''; }
}

/** 返回 { GITHUB_TOKEN, NPM_TOKEN }（缺失则为空字符串） */
export function loadCredentials() {
  const fromEnvFile = parseEnvFile(ENV_FILE);
  const pick = (key, file) =>
    process.env[key]?.trim() || fromEnvFile[key] || readFileIfExists(file) || '';
  return {
    GITHUB_TOKEN: pick('GITHUB_TOKEN', 'internal/github-token'),
    NPM_TOKEN: pick('NPM_TOKEN', 'internal/npm-token'),
  };
}

export const CRED_FILES = {
  env: 'internal/.env',
  github: 'internal/github-token',
  npm: 'internal/npm-token',
};
