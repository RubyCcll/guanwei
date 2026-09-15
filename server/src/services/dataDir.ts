// 运行时数据路径解析（用户档案 JSON / 占卜 SQLite / 测试库）
//
// 设计（2026-09 安全修复）：
//  - 默认目录 **server/data/**（与 server/src 源码分离）——原 server/src/data 会被
//    package.json 的 files 白名单（"server/src"）强制打进 npm tarball，导致用户档案
//    （含 token/passHash/出生信息）与占卜记录随包公开（1.3.2 及更早版本已发生）。
//  - 兼容旧路径：首次访问某文件时，若旧路径 server/src/data/<name> 存在且新路径不存在，
//    自动复制一份（幂等，不删除旧文件，便于回滚）。
//  - 环境变量优先：GUANWEI_DATA_DIR（目录）、GUANWEI_USERS_DB / GUANWEI_DB_FILE（单文件，测试隔离用）。
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 运行时数据目录：默认 **用户主目录** `~/.guanwei/data`（可用 GUANWEI_DATA_DIR 覆盖）。
 *
 * 为什么放在项目目录之外（2026-09 事故后的硬门槛）：
 * 原默认 server/src/data 在项目树内，npm 的 `files` 白名单一旦包含它就会被 publish 打包公开
 * （1.1.1–1.3.2 全部版本因此泄漏用户档案与占卜记录）。移出项目树后，
 * 即使白名单再次写错，npm/Docker 构建上下文也**物理上取不到**这些文件。
 */
/** 选择数据目录：env > 用户主目录（推荐）> 项目内 server/data（受限环境回退，仍受三重发布守卫保护） */
function pickDataDir(): string {
  const envDir = process.env.GUANWEI_DATA_DIR;
  if (envDir) return envDir;
  const home = path.join(os.homedir(), '.guanwei', 'data');
  try {
    fs.mkdirSync(home, { recursive: true });
    fs.accessSync(home, fs.constants.W_OK);
    return home;
  } catch {
    const fallback = path.join(__dirname, '..', '..', 'data');
    console.warn('[data] 用户主目录不可写，回退到项目内目录: ' + fallback + '（发布守卫仍会阻止其进入 npm 包）');
    return fallback;
  }
}

export const DATA_DIR = pickDataDir();
/** 兼容迁移源（按序尝试）：曾经使用过的项目内目录 */
const LEGACY_DIRS = [
  path.join(__dirname, '..', '..', 'data'),   // server/data（1.3.3 过渡路径）
  path.join(__dirname, '..', 'data'),         // server/src/data（1.1.1–1.3.2 旧路径）
];

/** 解析数据文件路径（含旧目录一次性迁移） */
export function dataFile(name: string): string {
  const target = path.join(DATA_DIR, name);
  try {
    const legacy = LEGACY_DIRS.map(d => path.join(d, name)).find(p => fs.existsSync(p) && fs.statSync(p).size > 0);
    const legacyOk = !!legacy;
    const targetExists = fs.existsSync(target);
    const targetSize = targetExists ? fs.statSync(target).size : 0;
    let needFill = !targetExists || targetSize === 0;
    // SQLite 库启发式：目标存在但显著小于旧库（如历史遗留的空壳库）→ 也迁移，避免真实记录被空库遮蔽
    if (!needFill && /\.(db|sqlite|sqlite3)$/.test(name) && legacyOk && targetSize < fs.statSync(legacy!).size / 2) {
      needFill = true;
    }
    if (legacyOk && needFill) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      if (targetExists && targetSize > 0) {
        const bak = target + '.bak-' + Date.now();
        fs.copyFileSync(target, bak);       // 覆盖前备份，可人工回滚
        console.log('[data] 目标库较小，已备份: ' + bak);
      }
      fs.copyFileSync(legacy!, target);
      console.log('[data] 已从旧路径迁移: ' + legacy + ' → ' + target + ' (' + fs.statSync(target).size + ' bytes)');
    }
  } catch (e: any) {
    console.error('[data] 迁移失败（将按新路径处理）:', e?.message || e);
  }
  return target;
}

/** 用户档案库（JSON） */
export const USERS_DB = process.env.GUANWEI_USERS_DB || dataFile('db.json');
/** 占卜记录库（SQLite） */
export const DIVINE_DB = process.env.GUANWEI_DB_FILE || dataFile('guanwei.db');
