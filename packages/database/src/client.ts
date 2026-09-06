import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { SCHEMA_SQL } from './schema';

export interface DatabaseOptions {
  /** 資料庫檔案路徑。預設為專案根目錄下 data/stubbook.db */
  dbPath?: string;
  /** 是否使用記憶體資料庫（用於測試） */
  inMemory?: boolean;
}

/**
 * 取得 SQLite 資料庫實例。
 *
 * - 自動建立 data/ 目錄與資料庫檔案
 * - 啟用 WAL 模式提升並發讀寫效能
 * - 啟用外鍵約束
 * - 首次連線自動執行 schema 建表
 *
 * @security 使用 parameterized queries 操作此實例，嚴禁字串拼接 SQL。
 */
export function getDatabase(options?: DatabaseOptions): Database.Database {
  let db: Database.Database;

  if (options?.inMemory) {
    db = new Database(':memory:');
  } else {
    const dbPath =
      options?.dbPath ||
      process.env.DATABASE_PATH ||
      path.join(process.cwd(), 'data', 'stubbook.db');

    // 確保目錄存在
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbPath);
  }

  // 啟用 WAL 模式（提升並發讀寫效能）
  db.pragma('journal_mode = WAL');
  // 啟用外鍵約束
  db.pragma('foreign_keys = ON');

  // 初始化 Schema（CREATE IF NOT EXISTS，冪等操作）
  db.exec(SCHEMA_SQL);

  return db;
}

/**
 * 預設資料庫實例（Singleton）。
 * 適用於 Next.js API Route 等需要共用連線的場景。
 */
let _defaultDb: Database.Database | null = null;

export function getDefaultDatabase(): Database.Database {
  if (!_defaultDb) {
    _defaultDb = getDatabase();
  }
  return _defaultDb;
}

/**
 * 關閉預設資料庫連線。用於測試清理或程序關閉。
 */
export function closeDefaultDatabase(): void {
  if (_defaultDb) {
    _defaultDb.close();
    _defaultDb = null;
  }
}
