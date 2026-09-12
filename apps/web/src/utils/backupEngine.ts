import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import AdmZip from 'adm-zip';
import {
  getDefaultDatabase,
  closeDefaultDatabase,
  getDatabasePath,
  getDatabase,
} from '@stubbook/database';
import { logger } from '@stubbook/logger';

export interface BackupOverview {
  totalEvents: number;
  totalSessions: number;
  totalAttendances: number;
  totalMerchandise: number;
  totalMedia: number;
  totalSeatViews: number;
  totalSetlists: number;
  totalSalePhases: number;
  dbSizeBytes: number;
  mediaSizeBytes: number;
  mediaCount: number;
  lastUpdated?: string;
}

export interface StubbookManifest {
  formatVersion: '1.0.0';
  appName: 'StubBook';
  appVersion: string;
  createdAt: string;
  database: {
    filename: string;
    sha256: string;
    size: number;
    counts: {
      events: number;
      sessions: number;
      attendances: number;
      merchandise: number;
      media: number;
      seatViews: number;
      setlists: number;
      salePhases: number;
    };
  };
  mediaFiles: Array<{
    path: string;
    sha256: string;
    size: number;
  }>;
}

export interface StubbookJsonBackup {
  formatVersion: '1.0.0';
  appName: 'StubBook';
  appVersion: string;
  exportedAt: string;
  data: {
    artists: any[];
    venues: any[];
    events: any[];
    event_sessions: any[];
    user_attendances: any[];
    merchandise_items: any[];
    attendance_media: any[];
    seat_view_photos: any[];
    event_setlists: any[];
    event_sale_phases: any[];
  };
  summary: {
    totalEvents: number;
    totalSessions: number;
    totalAttendances: number;
    totalMerchandise: number;
    totalMedia: number;
    totalSeatViews: number;
    totalSetlists: number;
    totalSalePhases: number;
  };
}

export interface BackupInspectResult {
  format: 'STUBBOOK' | 'JSON';
  valid: boolean;
  appVersion: string;
  createdAt: string;
  counts: {
    events: number;
    sessions: number;
    attendances: number;
    merchandise: number;
    media: number;
    seatViews: number;
    setlists: number;
    salePhases: number;
  };
  mediaFileCount: number;
  totalSizeBytes: number;
  warnings: string[];
}

export type RestoreMode = 'OVERWRITE' | 'MERGE' | 'DIFF';

export interface RestoreOptions {
  mode: RestoreMode;
  targetDbPath?: string;
  targetUploadsDir?: string;
}

export interface RestoreResult {
  success: boolean;
  mode: RestoreMode;
  format: 'STUBBOOK' | 'JSON';
  restoredCounts: {
    events: number;
    sessions: number;
    attendances: number;
    merchandise: number;
    media: number;
    seatViews: number;
    setlists: number;
    salePhases: number;
  };
  mediaFilesRestored: number;
  message: string;
}

/**
 * 取得本機上傳多媒體檔案根目錄
 */
export function getUploadsDir(customDir?: string): string {
  if (customDir) return customDir;
  const directPath = path.join(process.cwd(), 'public', 'uploads');
  if (fs.existsSync(directPath)) return directPath;

  const monorepoPath = path.join(process.cwd(), 'apps', 'web', 'public', 'uploads');
  if (fs.existsSync(monorepoPath)) return monorepoPath;

  return directPath;
}

/**
 * 計算 Buffer 之 SHA-256 雜湊
 */
export function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Zip Slip 防護：驗證解壓路徑未越出目標目錄邊界
 */
export function assertSafePath(destinationDir: string, targetRelPath: string): string {
  const resolved = path.resolve(destinationDir, targetRelPath);
  const safePrefix = path.resolve(destinationDir);

  if (resolved !== safePrefix && !resolved.startsWith(safePrefix + path.sep)) {
    throw new Error(`安全性威脅: 偵測到 Zip Slip 路徑穿越攻擊 (${targetRelPath})`);
  }
  return resolved;
}

/**
 * 取得當前手帳與資料庫之全域概況
 */
export function getBackupOverview(customDbPath?: string): BackupOverview {
  const db = customDbPath ? getDatabase({ dbPath: customDbPath }) : getDefaultDatabase();
  const dbPath = getDatabasePath(customDbPath);
  const uploadsDir = getUploadsDir();

  let dbSizeBytes = 0;
  try {
    if (fs.existsSync(dbPath)) {
      dbSizeBytes = fs.statSync(dbPath).size;
      const walPath = `${dbPath}-wal`;
      if (fs.existsSync(walPath)) {
        dbSizeBytes += fs.statSync(walPath).size;
      }
    }
  } catch (err) {
    logger.warn('讀取資料庫檔案大小失敗', 'BACKUP_ENGINE', { error: String(err) });
  }

  // 掃描 uploads 目錄
  let mediaSizeBytes = 0;
  let mediaCount = 0;

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(full);
      } else if (ent.isFile()) {
        mediaCount++;
        try {
          mediaSizeBytes += fs.statSync(full).size;
        } catch {
          // ignore
        }
      }
    }
  }

  scanDir(uploadsDir);

  const getCount = (table: string): number => {
    try {
      const row = db.prepare(`SELECT count(*) as c FROM ${table}`).get() as { c: number };
      return row?.c || 0;
    } catch {
      return 0;
    }
  };

  const totalEvents = getCount('events');
  const totalSessions = getCount('event_sessions');
  const totalAttendances = getCount('user_attendances');
  const totalMerchandise = getCount('merchandise_items');
  const totalMedia = getCount('attendance_media');
  const totalSeatViews = getCount('seat_view_photos');
  const totalSetlists = getCount('event_setlists');
  const totalSalePhases = getCount('event_sale_phases');

  let lastUpdated: string | undefined;
  try {
    const latest = db
      .prepare(
        `
      SELECT max(updated_at) as m FROM (
        SELECT updated_at FROM events
        UNION ALL
        SELECT updated_at FROM user_attendances
        UNION ALL
        SELECT updated_at FROM event_setlists
        UNION ALL
        SELECT updated_at FROM event_sale_phases
      )
    `
      )
      .get() as { m: string } | undefined;
    lastUpdated = latest?.m;
  } catch {
    // ignore
  }

  return {
    totalEvents,
    totalSessions,
    totalAttendances,
    totalMerchandise,
    totalMedia,
    totalSeatViews,
    totalSetlists,
    totalSalePhases,
    dbSizeBytes,
    mediaSizeBytes,
    mediaCount,
    lastUpdated,
  };
}

/**
 * 匯出結構化純文字 JSON 資料集 (輕量免媒體備份)
 */
export function exportStructuredJson(customDbPath?: string): StubbookJsonBackup {
  const db = customDbPath ? getDatabase({ dbPath: customDbPath }) : getDefaultDatabase();

  const artists = db.prepare('SELECT * FROM artists ORDER BY created_at ASC').all();
  const venues = db.prepare('SELECT * FROM venues ORDER BY created_at ASC').all();
  const events = db.prepare('SELECT * FROM events ORDER BY created_at ASC').all();
  const event_sessions = db.prepare('SELECT * FROM event_sessions ORDER BY created_at ASC').all();
  const user_attendances = db
    .prepare('SELECT * FROM user_attendances ORDER BY created_at ASC')
    .all();
  const merchandise_items = db
    .prepare('SELECT * FROM merchandise_items ORDER BY created_at ASC')
    .all();
  const attendance_media = db
    .prepare('SELECT * FROM attendance_media ORDER BY created_at ASC')
    .all();
  const seat_view_photos = db
    .prepare('SELECT * FROM seat_view_photos ORDER BY created_at ASC')
    .all();
  const event_setlists = db.prepare('SELECT * FROM event_setlists ORDER BY created_at ASC').all();
  const event_sale_phases = db
    .prepare('SELECT * FROM event_sale_phases ORDER BY created_at ASC')
    .all();

  return {
    formatVersion: '1.0.0',
    appName: 'StubBook',
    appVersion: '2.1.0',
    exportedAt: new Date().toISOString(),
    data: {
      artists,
      venues,
      events,
      event_sessions,
      user_attendances,
      merchandise_items,
      attendance_media,
      seat_view_photos,
      event_setlists,
      event_sale_phases,
    },
    summary: {
      totalEvents: events.length,
      totalSessions: event_sessions.length,
      totalAttendances: user_attendances.length,
      totalMerchandise: merchandise_items.length,
      totalMedia: attendance_media.length,
      totalSeatViews: seat_view_photos.length,
      totalSetlists: event_setlists.length,
      totalSalePhases: event_sale_phases.length,
    },
  };
}

/**
 * 匯出全量 .stubbook 容器封裝檔案 (包含 SQLite 快照 + 多媒體 + SHA-256 Manifest)
 */
export async function exportStubbookArchive(
  customDbPath?: string,
  customUploadsDir?: string
): Promise<Buffer> {
  const db = customDbPath ? getDatabase({ dbPath: customDbPath }) : getDefaultDatabase();
  const uploadsDir = getUploadsDir(customUploadsDir);
  const overview = getBackupOverview(customDbPath);

  // 1. 透過 VACUUM INTO 建立一致性快照 (避免 WAL 檔案分離或讀寫並發鎖定)
  const tempDir = os.tmpdir();
  const tempDbName = `stubbook_snapshot_${Date.now()}_${Math.random().toString(36).slice(2)}.db`;
  const tempDbPath = path.join(tempDir, tempDbName);

  let dbBuffer: Buffer;
  try {
    // 確保 WAL 寫入磁碟並產出一體化快照
    db.prepare('VACUUM INTO ?').run(tempDbPath);
    dbBuffer = fs.readFileSync(tempDbPath);
  } finally {
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // ignore
      }
    }
  }

  const dbSha256 = computeSha256(dbBuffer);

  // 2. 收集所有多媒體檔案並計算 SHA-256
  const mediaFiles: Array<{ path: string; fullPath: string; sha256: string; size: number }> = [];

  function collectMedia(dir: string, baseRel: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      const rel = path.join(baseRel, ent.name).replace(/\\/g, '/');
      if (ent.isDirectory()) {
        collectMedia(full, rel);
      } else if (ent.isFile()) {
        try {
          const buf = fs.readFileSync(full);
          mediaFiles.push({
            path: `uploads/${rel}`,
            fullPath: full,
            sha256: computeSha256(buf),
            size: buf.length,
          });
        } catch {
          // ignore
        }
      }
    }
  }

  collectMedia(uploadsDir, '');

  // 3. 建立 Manifest
  const manifest: StubbookManifest = {
    formatVersion: '1.0.0',
    appName: 'StubBook',
    appVersion: '2.1.0',
    createdAt: new Date().toISOString(),
    database: {
      filename: 'database.sqlite',
      sha256: dbSha256,
      size: dbBuffer.length,
      counts: {
        events: overview.totalEvents,
        sessions: overview.totalSessions,
        attendances: overview.totalAttendances,
        merchandise: overview.totalMerchandise,
        media: overview.totalMedia,
        seatViews: overview.totalSeatViews,
        setlists: overview.totalSetlists,
        salePhases: overview.totalSalePhases,
      },
    },
    mediaFiles: mediaFiles.map((m) => ({
      path: m.path,
      sha256: m.sha256,
      size: m.size,
    })),
  };

  // 4. 打包為 ZIP (.stubbook)
  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'));
  zip.addFile('database.sqlite', dbBuffer);

  for (const m of mediaFiles) {
    zip.addFile(m.path, fs.readFileSync(m.fullPath));
  }

  logger.info('全量 .stubbook 容器打包成功', 'BACKUP_ENGINE', {
    dbSize: dbBuffer.length,
    mediaCount: mediaFiles.length,
  });

  return zip.toBuffer();
}

/**
 * 預檢與解析備份檔案內容 (支援 Dry-Run 預覽)
 */
export function inspectBackup(buffer: Buffer): BackupInspectResult {
  const warnings: string[] = [];

  // 1. 嘗試以 JSON 解析
  try {
    const text = buffer.toString('utf-8').trim();
    if (text.startsWith('{') && text.endsWith('}')) {
      const json = JSON.parse(text) as StubbookJsonBackup;
      if (json.appName === 'StubBook' && json.data) {
        return {
          format: 'JSON',
          valid: true,
          appVersion: json.appVersion || '1.0.0',
          createdAt: json.exportedAt || new Date().toISOString(),
          counts: {
            events: json.data.events?.length || 0,
            sessions: json.data.event_sessions?.length || 0,
            attendances: json.data.user_attendances?.length || 0,
            merchandise: json.data.merchandise_items?.length || 0,
            media: json.data.attendance_media?.length || 0,
            seatViews: json.data.seat_view_photos?.length || 0,
            setlists: json.data.event_setlists?.length || 0,
            salePhases: json.data.event_sale_phases?.length || 0,
          },
          mediaFileCount: 0,
          totalSizeBytes: buffer.length,
          warnings: ['此檔案為純文字 JSON 結構，不包含實體多媒體檔案 (相片/影片)。'],
        };
      }
    }
  } catch {
    // 續行嘗試 ZIP
  }

  // 2. 嘗試以 .stubbook ZIP 解析
  try {
    const zip = new AdmZip(buffer);
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      throw new Error('未找到 manifest.json 封裝資訊，非合法的 .stubbook 備份檔');
    }

    const manifestText = manifestEntry.getData().toString('utf-8');
    const manifest = JSON.parse(manifestText) as StubbookManifest;

    const dbEntry = zip.getEntry('database.sqlite');
    if (!dbEntry) {
      throw new Error('未找到 database.sqlite 資料庫核心檔案');
    }

    // 校驗資料庫 SHA-256
    const actualDbSha = computeSha256(dbEntry.getData());
    if (actualDbSha !== manifest.database.sha256) {
      warnings.push('資料庫 SHA-256 簽章不吻合，備份檔案可能已毀損。');
    }

    return {
      format: 'STUBBOOK',
      valid: warnings.length === 0,
      appVersion: manifest.appVersion || '2.1.0',
      createdAt: manifest.createdAt,
      counts: manifest.database.counts,
      mediaFileCount: manifest.mediaFiles?.length || 0,
      totalSizeBytes: buffer.length,
      warnings,
    };
  } catch (err) {
    throw new Error(`無法識別此備份檔案格式: ${(err as Error).message}`);
  }
}

/**
 * 執行資料還原 (支援 OVERWRITE / MERGE / DIFF 模式)
 */
export async function restoreFromBackup(
  buffer: Buffer,
  options: RestoreOptions
): Promise<RestoreResult> {
  const { mode, targetDbPath, targetUploadsDir } = options;
  const inspection = inspectBackup(buffer);

  const uploadsDir = getUploadsDir(targetUploadsDir);
  const dbPath = getDatabasePath(targetDbPath);

  logger.info(`開始還原資料 (模式: ${mode}, 格式: ${inspection.format})`, 'RESTORE_ENGINE');

  if (inspection.format === 'STUBBOOK') {
    return restoreStubbookArchive(buffer, mode, dbPath, uploadsDir);
  } else {
    return restoreJsonBackup(buffer, mode, targetDbPath);
  }
}

/**
 * 還原 .stubbook 容器檔案
 */
async function restoreStubbookArchive(
  buffer: Buffer,
  mode: RestoreMode,
  dbPath: string,
  uploadsDir: string
): Promise<RestoreResult> {
  const zip = new AdmZip(buffer);
  const manifestEntry = zip.getEntry('manifest.json');
  const manifest = JSON.parse(manifestEntry!.getData().toString('utf-8')) as StubbookManifest;

  const dbEntry = zip.getEntry('database.sqlite');
  if (!dbEntry) {
    throw new Error('封裝檔案缺少 database.sqlite');
  }

  const incomingDbBuffer = dbEntry.getData();
  const actualDbSha = computeSha256(incomingDbBuffer);
  if (actualDbSha !== manifest.database.sha256) {
    throw new Error('資料庫檔案校驗碼 (SHA-256) 驗證失敗，終止還原以策安全');
  }

  let mediaFilesRestored = 0;

  if (mode === 'OVERWRITE') {
    // 1. 關閉當前連線並建立本地 .bak 備份
    closeDefaultDatabase();
    const backupBakPath = `${dbPath}.pre_restore.bak`;
    if (fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(dbPath, backupBakPath);
      } catch {
        // ignore
      }
    }

    try {
      // 2. 清理 WAL 與 SHM
      if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
      if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);

      // 3. 寫入新資料庫
      fs.writeFileSync(dbPath, incomingDbBuffer);

      // 4. 驗證新資料庫完整性
      const testDb = getDatabase({ dbPath });
      const integrity = testDb.prepare('PRAGMA integrity_check').get() as {
        integrity_check: string;
      };
      if (integrity.integrity_check !== 'ok') {
        throw new Error(`SQLite 完整性檢查未通過: ${integrity.integrity_check}`);
      }

      // 5. 解壓媒體檔案（防範 Zip Slip）
      for (const item of manifest.mediaFiles || []) {
        const entry = zip.getEntry(item.path);
        if (!entry) continue;

        // 移除開頭的 "uploads/"
        const relPath = item.path.replace(/^uploads[\\/]/, '');
        const targetFull = assertSafePath(uploadsDir, relPath);

        const targetFolder = path.dirname(targetFull);
        if (!fs.existsSync(targetFolder)) {
          fs.mkdirSync(targetFolder, { recursive: true });
        }

        fs.writeFileSync(targetFull, entry.getData());
        mediaFilesRestored++;
      }

      // 成功後移除 .bak
      if (fs.existsSync(backupBakPath)) {
        try {
          fs.unlinkSync(backupBakPath);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      // 失敗回滾
      if (fs.existsSync(backupBakPath)) {
        try {
          fs.copyFileSync(backupBakPath, dbPath);
          fs.unlinkSync(backupBakPath);
        } catch {
          // ignore
        }
      }
      throw err;
    }

    return {
      success: true,
      mode: 'OVERWRITE',
      format: 'STUBBOOK',
      restoredCounts: manifest.database.counts,
      mediaFilesRestored,
      message: `成功完成全量覆蓋還原，共匯入 ${manifest.database.counts.events} 場活動與 ${mediaFilesRestored} 個多媒體檔案。`,
    };
  } else {
    // MERGE / DIFF 模式：將備份中的資料庫附加為 ATTACH DATABASE 並執行合併插入
    const tempDir = os.tmpdir();
    const tempIncomingPath = path.join(
      tempDir,
      `incoming_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
    );
    fs.writeFileSync(tempIncomingPath, incomingDbBuffer);

    const mainDb = getDatabase({ dbPath });

    try {
      mainDb.exec('PRAGMA foreign_keys = OFF;');
      mainDb.exec(`ATTACH DATABASE '${tempIncomingPath.replace(/'/g, "''")}' AS incoming;`);

      mainDb.transaction(() => {
        const tables = [
          'artists',
          'venues',
          'events',
          'event_sessions',
          'user_attendances',
          'merchandise_items',
          'attendance_media',
          'seat_view_photos',
          'event_setlists',
          'event_sale_phases',
        ];

        for (const tbl of tables) {
          if (mode === 'MERGE') {
            mainDb.exec(`INSERT OR IGNORE INTO main.${tbl} SELECT * FROM incoming.${tbl};`);
          } else {
            mainDb.exec(`INSERT OR REPLACE INTO main.${tbl} SELECT * FROM incoming.${tbl};`);
          }
        }
      })();

      mainDb.exec('DETACH DATABASE incoming;');
      mainDb.exec('PRAGMA foreign_keys = ON;');

      // 復原多媒體檔案 (MERGE 時僅新增不存在者)
      for (const item of manifest.mediaFiles || []) {
        const relPath = item.path.replace(/^uploads[\\/]/, '');
        const targetFull = assertSafePath(uploadsDir, relPath);

        if (mode === 'MERGE' && fs.existsSync(targetFull)) {
          continue;
        }

        const entry = zip.getEntry(item.path);
        if (!entry) continue;

        const targetFolder = path.dirname(targetFull);
        if (!fs.existsSync(targetFolder)) {
          fs.mkdirSync(targetFolder, { recursive: true });
        }

        fs.writeFileSync(targetFull, entry.getData());
        mediaFilesRestored++;
      }
    } finally {
      try {
        if (fs.existsSync(tempIncomingPath)) fs.unlinkSync(tempIncomingPath);
      } catch {
        // ignore
      }
    }

    const currentOverview = getBackupOverview(dbPath);
    return {
      success: true,
      mode,
      format: 'STUBBOOK',
      restoredCounts: {
        events: currentOverview.totalEvents,
        sessions: currentOverview.totalSessions,
        attendances: currentOverview.totalAttendances,
        merchandise: currentOverview.totalMerchandise,
        media: currentOverview.totalMedia,
        seatViews: currentOverview.totalSeatViews,
        setlists: currentOverview.totalSetlists,
        salePhases: currentOverview.totalSalePhases,
      },
      mediaFilesRestored,
      message: `成功完成智慧合併還原，目前資料庫共有 ${currentOverview.totalEvents} 場活動。`,
    };
  }
}

/**
 * 還原純文字 JSON 資料集
 */
async function restoreJsonBackup(
  buffer: Buffer,
  mode: RestoreMode,
  customDbPath?: string
): Promise<RestoreResult> {
  const json = JSON.parse(buffer.toString('utf-8')) as StubbookJsonBackup;
  const db = customDbPath ? getDatabase({ dbPath: customDbPath }) : getDefaultDatabase();

  const data = json.data;

  db.exec('PRAGMA foreign_keys = OFF;');

  try {
    db.transaction(() => {
      if (mode === 'OVERWRITE') {
        const tables = [
          'event_sale_phases',
          'event_setlists',
          'seat_view_photos',
          'attendance_media',
          'merchandise_items',
          'user_attendances',
          'event_sessions',
          'events',
          'venues',
          'artists',
        ];
        for (const tbl of tables) {
          db.exec(`DELETE FROM ${tbl};`);
        }
      }

      const insertRows = (tableName: string, rows: any[]) => {
        if (!rows || rows.length === 0) return;
        for (const row of rows) {
          const keys = Object.keys(row);
          const placeholders = keys.map(() => '?').join(', ');
          const values = keys.map((k) => row[k]);
          const sql =
            mode === 'DIFF'
              ? `INSERT OR REPLACE INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`
              : `INSERT OR IGNORE INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
          db.prepare(sql).run(...values);
        }
      };

      insertRows('artists', data.artists);
      insertRows('venues', data.venues);
      insertRows('events', data.events);
      insertRows('event_sessions', data.event_sessions);
      insertRows('user_attendances', data.user_attendances);
      insertRows('merchandise_items', data.merchandise_items);
      insertRows('attendance_media', data.attendance_media);
      insertRows('seat_view_photos', data.seat_view_photos);
      insertRows('event_setlists', data.event_setlists);
      insertRows('event_sale_phases', data.event_sale_phases);
    })();
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
  }

  const overview = getBackupOverview(customDbPath);

  return {
    success: true,
    mode,
    format: 'JSON',
    restoredCounts: {
      events: overview.totalEvents,
      sessions: overview.totalSessions,
      attendances: overview.totalAttendances,
      merchandise: overview.totalMerchandise,
      media: overview.totalMedia,
      seatViews: overview.totalSeatViews,
      setlists: overview.totalSetlists,
      salePhases: overview.totalSalePhases,
    },
    mediaFilesRestored: 0,
    message: `成功從 JSON 匯入手帳資料 (模式: ${mode})，現有 ${overview.totalEvents} 場活動。`,
  };
}
