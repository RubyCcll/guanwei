// 用户库（JSON）读写：进程内串行锁 + 原子写
//
// 背景（2026-09 并发写缺陷）：原 users.ts/divine.ts 各自 read-modify-write 整份 db.json，
// 且 load→改→save 之间跨 await（scrypt 哈希），并发请求互相覆盖——实测 30 个并发注册仅 1 个落库。
// 现统一走本模块：单进程内以 Promise 链串行化写操作，落盘用 临时文件 + rename 原子替换。
import fs from 'fs';
import path from 'path';
import { USERS_DB } from './dataDir.js';

export interface UsersDb { users: any[] }

/** 读用户库（文件缺失/损坏 → 空库，交由调用方建档） */
export function readUsersDb(): UsersDb {
  try { return JSON.parse(fs.readFileSync(USERS_DB, 'utf-8')); }
  catch { return { users: [] }; }
}

/** 原子写：先写同目录临时文件再 rename，避免半截文件与并发撕裂 */
export function writeUsersDb(db: UsersDb): void {
  fs.mkdirSync(path.dirname(USERS_DB), { recursive: true });
  const tmp = USERS_DB + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, USERS_DB);
}

// 写串行队列（单进程内生效；多进程部署需外部锁，见 README 部署说明）
let chain: Promise<unknown> = Promise.resolve();

/** 串行执行一次「读-改-写」事务；fn 内可安全 await（如 scrypt） */
export function withUsersDb<T>(fn: (db: UsersDb) => T | Promise<T>): Promise<T> {
  const run = chain.then(() => {
    const db = readUsersDb();
    return Promise.resolve(fn(db)).then((result) => {
      writeUsersDb(db);   // fn 内直接改 db 对象即可；由本函数统一落盘
      return result;
    });
  });
  chain = run.catch(() => { /* 防止链断 */ });
  return run as Promise<T>;
}

/** 只读事务（不落盘） */
export function readUsers<T>(fn: (db: UsersDb) => T): T {
  return fn(readUsersDb());
}
