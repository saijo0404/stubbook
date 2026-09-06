import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../src/logger';
import { sanitizeLogData } from '../src/sanitizer';

describe('Logger & Sanitizer', () => {
  const testLogDir = path.join(__dirname, 'temp_logs');
  const testLogFile = 'test.log';

  beforeEach(() => {
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  it('敏感資訊過濾器應自動遮罩 Token、密碼與 Authorization 標頭', () => {
    const rawData = {
      password: 'superSecretPassword123',
      apiKey: 'sb-anon-key-secret-999',
      authHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample',
      normalField: 'hello world',
      userEmail: 'user@example.com',
    };

    const sanitized = sanitizeLogData(rawData) as any;
    expect(sanitized.password).toBe('***REDACTED***');
    expect(sanitized.apiKey).toBe('***REDACTED***');
    expect(sanitized.authHeader).toBe('***REDACTED***');
    expect(sanitized.normalField).toBe('hello world');
    expect(sanitized.userEmail).toContain('***@example.com');
  });

  it('Logger 應正常寫入日誌檔案且能記錄結構化 JSON', () => {
    const logger = new Logger({
      logDir: testLogDir,
      logFileName: testLogFile,
      consoleOutput: false,
      level: 'DEBUG',
    });

    logger.info('測試活動擷取成功', 'KKTIX_PARSER', { eventId: '123' });
    logger.error('資料庫連線超時', 'DATABASE', new Error('Connection timeout'));

    const filePath = path.join(testLogDir, testLogFile);
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBe(2);

    const firstEntry = JSON.parse(lines[0]);
    expect(firstEntry.level).toBe('INFO');
    expect(firstEntry.message).toBe('測試活動擷取成功');
    expect(firstEntry.context).toBe('KKTIX_PARSER');

    const secondEntry = JSON.parse(lines[1]);
    expect(secondEntry.level).toBe('ERROR');
    expect(secondEntry.error.message).toBe('Connection timeout');
  });

  it('達到檔案大小上限時應自動輪替 (Rotation) 且限制總容量', () => {
    // 設定較小的上限 250 bytes 以測試輪替
    const maxFileSize = 250;
    const logger = new Logger({
      logDir: testLogDir,
      logFileName: testLogFile,
      maxFileSize,
      maxFiles: 2,
      consoleOutput: false,
    });

    // 寫入多筆日誌觸發多次輪替
    for (let i = 0; i < 10; i++) {
      logger.info(`Message index number ${i} with extra padding payload text...`, 'TEST');
    }

    const currentFile = path.join(testLogDir, testLogFile);
    const backupFile1 = path.join(testLogDir, `${testLogFile}.1`);
    const backupFile2 = path.join(testLogDir, `${testLogFile}.2`);
    const excessiveFile = path.join(testLogDir, `${testLogFile}.3`);

    expect(fs.existsSync(currentFile)).toBe(true);
    expect(fs.existsSync(backupFile1)).toBe(true);
    // 超過 maxFiles 的備份檔案不應存在
    expect(fs.existsSync(excessiveFile)).toBe(false);

    // 驗證輪替後的當前日誌檔大小在控制範圍內
    const stats = fs.statSync(currentFile);
    expect(stats.size).toBeLessThanOrEqual(maxFileSize * 2); // 允許單行邊界緩衝
  });

  it('exportBugReportSnippet 應能輸出 Markdown 格式之錯誤摘要', () => {
    const logger = new Logger({
      logDir: testLogDir,
      logFileName: testLogFile,
      consoleOutput: false,
    });

    logger.error(
      '拓元場次解析失敗: DOM Selector changed',
      'SCRAPER',
      new Error('Element not found')
    );

    const snippet = logger.exportBugReportSnippet();
    expect(snippet).toContain('### 📋 StubBook Debug Log Snippet');
    expect(snippet).toContain('DOM Selector changed');
  });
});
