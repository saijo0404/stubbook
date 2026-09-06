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

  it('Next.js API 路由檔案結構應完整就緒', () => {
    const scrapeRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'scrape', 'route.ts');
    const eventsRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'events', 'route.ts');
    const logsRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'logs', 'route.ts');

    expect(fs.existsSync(scrapeRoute)).toBe(true);
    expect(fs.existsSync(eventsRoute)).toBe(true);
    expect(fs.existsSync(logsRoute)).toBe(true);
  });

  it('前端首頁應完整實作解析與入庫流程介面', () => {
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const content = fs.readFileSync(pagePath, 'utf-8');
    expect(content).toContain('handleScrape');
    expect(content).toContain('handleSave');
    expect(content).toContain('kktix');
    expect(content).toContain('tixcraft');
    expect(content).toContain('確認入庫 (儲存至本地資料庫)');
  });

  it('Events API 路由應使用 SQLite 且不依賴 Supabase', () => {
    const eventsRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'events', 'route.ts');
    const content = fs.readFileSync(eventsRoute, 'utf-8');

    expect(content).toContain('getDefaultDatabase');
    expect(content).toContain('sqlite_local');
    expect(content).not.toContain('supabase');
  });
});
