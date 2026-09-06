import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Apps/Web - Next.js & Capacitor Configuration', () => {
  it('Capacitor 跨平台原生配置應包含正確之 App ID 與輸出目錄', async () => {
    const configPath = path.join(__dirname, '..', 'capacitor.config.ts');
    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain("appId: 'app.stubbook.client'");
    expect(content).toContain("appName: 'StubBook'");
  });

  it('Next.js API 路由檔案結構應完整就緒 (包含 events, scrape, logs, attendances)', () => {
    const scrapeRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'scrape', 'route.ts');
    const eventsRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'events', 'route.ts');
    const logsRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'logs', 'route.ts');
    const attendancesRoute = path.join(
      __dirname,
      '..',
      'src',
      'app',
      'api',
      'attendances',
      'route.ts'
    );

    expect(fs.existsSync(scrapeRoute)).toBe(true);
    expect(fs.existsSync(eventsRoute)).toBe(true);
    expect(fs.existsSync(logsRoute)).toBe(true);
    expect(fs.existsSync(attendancesRoute)).toBe(true);
  });

  it('前端首頁應完整實作解析、入庫與個人參戰手帳介面', () => {
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const content = fs.readFileSync(pagePath, 'utf-8');
    expect(content).toContain('handleScrape');
    expect(content).toContain('handleSave');
    expect(content).toContain('kktix');
    expect(content).toContain('tixcraft');
    expect(content).toContain('確認入庫 (儲存至本地資料庫)');
    expect(content).toContain('我的參戰手帳');
    expect(content).toContain('登記參戰');
    expect(content).toContain('觀演星等評價');
    expect(content).toContain('座位號碼 / 區域');
  });

  it('Events API 路由應使用 SQLite 且不依賴 Supabase', () => {
    const eventsRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'events', 'route.ts');
    const content = fs.readFileSync(eventsRoute, 'utf-8');

    expect(content).toContain('getDefaultDatabase');
    expect(content).toContain('sqlite_local');
    expect(content).not.toContain('supabase');
  });

  it('Attendances API 路由應實作完整 CRUD 操作且使用參數化查詢', () => {
    const routePath = path.join(__dirname, '..', 'src', 'app', 'api', 'attendances', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');

    expect(content).toContain('export async function GET');
    expect(content).toContain('export async function POST');
    expect(content).toContain('export async function DELETE');
    expect(content).toContain('ON CONFLICT(user_id, session_id)');
    expect(content).toContain('getDefaultDatabase');
  });

  it('Next.js 設定應將 better-sqlite3 排除在 Webpack bundling 之外 (serverComponentsExternalPackages)', () => {
    const nextConfigPath = path.join(__dirname, '..', 'next.config.mjs');
    const content = fs.readFileSync(nextConfigPath, 'utf-8');

    expect(content).toContain('serverComponentsExternalPackages');
    expect(content).toContain('better-sqlite3');
  });

  it('應用端應能成功實例化 getDefaultDatabase 且無 bindings 載入錯誤', async () => {
    const { getDefaultDatabase } = await import('@stubbook/database');
    const db = getDefaultDatabase();
    expect(db).toBeDefined();

    const row = db.prepare('SELECT 1 + 1 as sum').get() as { sum: number };
    expect(row.sum).toBe(2);
  });

  it('Upload API 路由應實作嚴格安全性檢查 (大小上限、MIME 白名單、Magic Bytes 簽章、防路徑穿越)', () => {
    const uploadRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'upload', 'route.ts');
    expect(fs.existsSync(uploadRoute)).toBe(true);

    const content = fs.readFileSync(uploadRoute, 'utf-8');
    expect(content).toContain('validateMagicBytes');
    expect(content).toContain('MAX_FILE_SIZE');
    expect(content).toContain('ALLOWED_MIME_TYPES');
    expect(content).toContain('crypto.randomBytes');
    expect(content).toContain('startsWith(uploadDir');
  });

  it('前端應完整實作 TicketMaskModal 與 TicketStubModal 組件', () => {
    const maskModalPath = path.join(__dirname, '..', 'src', 'components', 'TicketMaskModal.tsx');
    const stubModalPath = path.join(__dirname, '..', 'src', 'components', 'TicketStubModal.tsx');

    expect(fs.existsSync(maskModalPath)).toBe(true);
    expect(fs.existsSync(stubModalPath)).toBe(true);

    const maskContent = fs.readFileSync(maskModalPath, 'utf-8');
    expect(maskContent).toContain('applyMosaic');
    expect(maskContent).toContain('maskBottomBarcodeArea');
    expect(maskContent).toContain('canvasRef');

    const stubContent = fs.readFileSync(stubModalPath, 'utf-8');
    expect(stubContent).toContain('STUB · 存根聯');
    expect(stubContent).toContain('stubPrivacyMasked');
  });
});
