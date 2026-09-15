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
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 运行时数据目录：默认 server/data（可用 GUANWEI_DATA_DIR 覆盖） */
export const DATA_DIR = process.env.GUANWEI_DATA_DIR || path.join(__dirname, '..', '..', 'data');
/** 旧数据目录（兼容迁移用） */
const LEGACY_DIR = path.join(__dirname, '..', 'data');

/** 解析数据文件路径（含旧目录一次性迁移） */
export function dataFile(name: string): string {
  const target = path.join(DATA_DIR, name);
  try {
    const legacy = path.join(LEGACY_DIR, name);
    const legacyOk = fs.existsSync(legacy) && fs.statSync(legacy).size > 0;
    const targetExists = fs.existsSync(target);
    const targetSize = targetExists ? fs.statSync(target).size : 0;
    let needFill = !targetExists || targetSize === 0;
    // SQLite 库启发式：目标存在但显著小于旧库（如历史遗留的空壳库）→ 也迁移，避免真实记录被空库遮蔽
    if (!needFill && /\.(db|sqlite|sqlite3)$/.test(name) && legacyOk && targetSize < fs.statSync(legacy).size / 2) {
      needFill = true;
    }
    if (legacyOk && needFill) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      if (targetExists && targetSize > 0) {
        const bak = target + '.bak-' + Date.now();
        fs.copyFileSync(target, bak);       // 覆盖前备份，可人工回滚
        console.log('[data] 目标库较小，已备份: ' + bak);
      }
      fs.copyFileSync(legacy, target);
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
