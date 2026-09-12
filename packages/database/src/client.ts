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
export function getDatabasePath(customPath?: string): string {
  return customPath || process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'stubbook.db');
}

export function getDatabase(options?: DatabaseOptions): Database.Database {
  let db: Database.Database;

  if (options?.inMemory) {
    db = new Database(':memory:');
  } else {
    const dbPath = getDatabasePath(options?.dbPath);

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

  // 輕量自動遷移：確保既有資料庫欄位同步
  try {
    const setlistCols = db.pragma('table_info(event_setlists)') as Array<{ name: string }>;
    if (setlistCols.length > 0 && !setlistCols.some((c) => c.name === 'youtube_music_url')) {
      db.exec('ALTER TABLE event_setlists ADD COLUMN youtube_music_url TEXT;');
    }

    const attendanceCols = db.pragma('table_info(user_attendances)') as Array<{ name: string }>;
    if (attendanceCols.length > 0) {
      const colNames = new Set(attendanceCols.map((c) => c.name));
      if (!colNames.has('rating_sound'))
        db.exec('ALTER TABLE user_attendances ADD COLUMN rating_sound INTEGER;');
      if (!colNames.has('rating_sight'))
        db.exec('ALTER TABLE user_attendances ADD COLUMN rating_sight INTEGER;');
      if (!colNames.has('rating_atmosphere'))
        db.exec('ALTER TABLE user_attendances ADD COLUMN rating_atmosphere INTEGER;');
      if (!colNames.has('rating_performance'))
        db.exec('ALTER TABLE user_attendances ADD COLUMN rating_performance INTEGER;');
      if (!colNames.has('pros')) db.exec('ALTER TABLE user_attendances ADD COLUMN pros TEXT;');
      if (!colNames.has('cons')) db.exec('ALTER TABLE user_attendances ADD COLUMN cons TEXT;');
      if (!colNames.has('tips')) db.exec('ALTER TABLE user_attendances ADD COLUMN tips TEXT;');
      if (!colNames.has('queue_time_minutes'))
        db.exec('ALTER TABLE user_attendances ADD COLUMN queue_time_minutes INTEGER;');
      if (!colNames.has('transfer_notes'))
        db.exec('ALTER TABLE user_attendances ADD COLUMN transfer_notes TEXT;');
      if (!colNames.has('privacy_level'))
        db.exec(
          "ALTER TABLE user_attendances ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'PRIVATE';"
        );
    }

    const venueCols = db.pragma('table_info(venues)') as Array<{ name: string }>;
    if (venueCols.length > 0) {
      const vColNames = new Set(venueCols.map((c) => c.name));
      if (!vColNames.has('latitude')) db.exec('ALTER TABLE venues ADD COLUMN latitude REAL;');
      if (!vColNames.has('longitude')) db.exec('ALTER TABLE venues ADD COLUMN longitude REAL;');
      if (!vColNames.has('region'))
        db.exec("ALTER TABLE venues ADD COLUMN region TEXT NOT NULL DEFAULT 'NORTH';");
      if (!vColNames.has('sub_halls'))
        db.exec("ALTER TABLE venues ADD COLUMN sub_halls TEXT NOT NULL DEFAULT '[]';");
      if (!vColNames.has('photo_url')) db.exec('ALTER TABLE venues ADD COLUMN photo_url TEXT;');
    }

    const sessionCols = db.pragma('table_info(event_sessions)') as Array<{ name: string }>;
    if (sessionCols.length > 0 && !sessionCols.some((c) => c.name === 'hall_name')) {
      db.exec('ALTER TABLE event_sessions ADD COLUMN hall_name TEXT;');
    }
  } catch {
    // 忽略建立初期的潛在異常
  }

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
