import * as fs from 'fs';
import * as path from 'path';
import { sanitizeLogData } from './sanitizer';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LoggerOptions {
  logDir?: string;
  logFileName?: string;
  maxFileSize?: number; // 預設 5MB (5 * 1024 * 1024 bytes)
  maxFiles?: number; // 最多保留備份檔數，預設 3
  level?: LogLevel;
  consoleOutput?: boolean;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context?: string;
  message: string;
  metadata?: unknown;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export class Logger {
  private logDir: string;
  private logFilePath: string;
  private maxFileSize: number;
  private maxFiles: number;
  private level: LogLevel;
  private consoleOutput: boolean;

  constructor(options?: LoggerOptions) {
    this.logDir = options?.logDir || path.join(process.cwd(), 'logs');
    this.logFilePath = path.join(this.logDir, options?.logFileName || 'stubbook.log');
    this.maxFileSize = options?.maxFileSize || 5 * 1024 * 1024; // 5 MB
    this.maxFiles = options?.maxFiles || 3;
    this.level = options?.level || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG');
    this.consoleOutput = options?.consoleOutput ?? true;

    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch {
      // 容錯處理（例如唯讀環境）
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.level];
  }

  private writeLog(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: unknown,
    err?: unknown
  ): void {
    if (!this.shouldLog(level)) return;

    let errorObj: { name?: string; message: string; stack?: string } | undefined = undefined;
    if (err instanceof Error) {
      errorObj = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    } else if (typeof err === 'string') {
      errorObj = { message: err };
    }

    const rawEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      metadata,
      error: errorObj,
    };

    const sanitizedEntry = sanitizeLogData(rawEntry) as LogEntry;
    const logLine = JSON.stringify(sanitizedEntry) + '\n';

    // 1. Console 輸出
    if (this.consoleOutput) {
      const prefix = `[${sanitizedEntry.timestamp}] [${level}]${context ? ` [${context}]` : ''}`;
      if (level === 'ERROR') {
        console.error(`${prefix} ${message}`, metadata || '', errorObj || '');
      } else if (level === 'WARN') {
        console.warn(`${prefix} ${message}`, metadata || '');
      } else {
        console.log(`${prefix} ${message}`, metadata || '');
      }
    }

    // 2. 寫入本機檔案（支援大小上限自動輪替）
    this.writeToFile(logLine);
  }

  private writeToFile(line: string): void {
    try {
      this.ensureLogDirectory();
      const lineBytes = Buffer.byteLength(line, 'utf-8');

      // 檢查目前日誌大小是否即將超越上限
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        if (stats.size + lineBytes > this.maxFileSize) {
          this.rotateFiles();
        }
      }

      fs.appendFileSync(this.logFilePath, line, 'utf-8');
    } catch {
      // 容錯：避免日誌寫入失敗導致主應用程式崩潰
    }
  }

  /**
   * 日誌滾動輪替演算法：
   * stubbook.log.2 -> 刪除
   * stubbook.log.1 -> stubbook.log.2
   * stubbook.log   -> stubbook.log.1
   * 新開乾淨的 stubbook.log
   */
  private rotateFiles(): void {
    try {
      // 刪除最老舊的備份檔
      const oldestFile = `${this.logFilePath}.${this.maxFiles}`;
      if (fs.existsSync(oldestFile)) {
        fs.unlinkSync(oldestFile);
      }

      // 將歷史備份往後移一位
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const currentBackup = `${this.logFilePath}.${i}`;
        const nextBackup = `${this.logFilePath}.${i + 1}`;
        if (fs.existsSync(currentBackup)) {
          fs.renameSync(currentBackup, nextBackup);
        }
      }

      // 將當前主日誌重命名為 .1
      if (fs.existsSync(this.logFilePath)) {
        fs.renameSync(this.logFilePath, `${this.logFilePath}.1`);
      }
    } catch (e) {
      console.error('Failed to rotate log files:', e);
    }
  }

  debug(message: string, context?: string, metadata?: unknown): void {
    this.writeLog('DEBUG', message, context, metadata);
  }

  info(message: string, context?: string, metadata?: unknown): void {
    this.writeLog('INFO', message, context, metadata);
  }

  warn(message: string, context?: string, metadata?: unknown): void {
    this.writeLog('WARN', message, context, metadata);
  }

  error(message: string, context?: string, err?: unknown, metadata?: unknown): void {
    this.writeLog('ERROR', message, context, metadata, err);
  }

  /**
   * 讀取最近的錯誤日誌並輸出 Markdown 格式片段，便於貼入 GitHub Bug Report
   */
  exportBugReportSnippet(options?: { maxLines?: number; onlyErrors?: boolean }): string {
    const maxLines = options?.maxLines || 30;
    const onlyErrors = options?.onlyErrors ?? true;

    if (!fs.existsSync(this.logFilePath)) {
      return '*(No local log records found)*';
    }

    try {
      const content = fs.readFileSync(this.logFilePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      let filtered = lines;
      if (onlyErrors) {
        filtered = lines.filter((line) => line.includes('"level":"ERROR"'));
        if (filtered.length === 0) {
          filtered = lines; // 若無純 ERROR 則呈現最後的日誌
        }
      }

      const recentLines = filtered.slice(-maxLines);

      return ['### 📋 StubBook Debug Log Snippet', '```json', ...recentLines, '```'].join('\n');
    } catch (e) {
      return `*(Error reading log file: ${(e as Error).message})*`;
    }
  }
}

// 導出全局單例實例方便直接引用
export const logger = new Logger();
