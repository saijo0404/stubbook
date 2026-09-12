import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { NextRequest } from 'next/server';

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

  it('Upload API 路由應實作嚴格安全性檢查 (大小上限、MIME 白名單、Magic Bytes 簽章、防路徑穿越、分類目錄支援)', () => {
    const uploadRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'upload', 'route.ts');
    expect(fs.existsSync(uploadRoute)).toBe(true);

    const content = fs.readFileSync(uploadRoute, 'utf-8');
    expect(content).toContain('validateMagicBytes');
    expect(content).toContain('MAX_IMAGE_SIZE');
    expect(content).toContain('ALLOWED_FOLDERS');
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

  it('Merchandise API 路由應實作完整 CRUD 操作且使用參數化查詢', () => {
    const routePath = path.join(__dirname, '..', 'src', 'app', 'api', 'merchandise', 'route.ts');
    expect(fs.existsSync(routePath)).toBe(true);

    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('export async function GET');
    expect(content).toContain('export async function POST');
    expect(content).toContain('export async function DELETE');
    expect(content).toContain('VALID_CATEGORIES');
    expect(content).toContain('getDefaultDatabase');
  });

  it('Media API 路由應實作完整 CRUD 操作且使用參數化查詢', () => {
    const routePath = path.join(__dirname, '..', 'src', 'app', 'api', 'media', 'route.ts');
    expect(fs.existsSync(routePath)).toBe(true);

    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('export async function GET');
    expect(content).toContain('export async function POST');
    expect(content).toContain('export async function DELETE');
    expect(content).toContain('VALID_MEDIA_TYPES');
    expect(content).toContain('getDefaultDatabase');
  });

  it('前端應完整實作 MerchManagerModal 與 MediaGalleryModal 組件', () => {
    const merchModalPath = path.join(__dirname, '..', 'src', 'components', 'MerchManagerModal.tsx');
    const mediaModalPath = path.join(__dirname, '..', 'src', 'components', 'MediaGalleryModal.tsx');

    expect(fs.existsSync(merchModalPath)).toBe(true);
    expect(fs.existsSync(mediaModalPath)).toBe(true);

    const merchContent = fs.readFileSync(merchModalPath, 'utf-8');
    expect(merchContent).toContain('MERCH_CATEGORIES');
    expect(merchContent).toContain('LIGHTSTICK');
    expect(merchContent).toContain('loadMerchItems');

    const mediaContent = fs.readFileSync(mediaModalPath, 'utf-8');
    expect(mediaContent).toContain('MediaGalleryModal');
    expect(mediaContent).toContain('loadMedia');
    expect(mediaContent).toContain('lightboxIndex');
  });

  it('SQLite 資料庫應能正確操作 merchandise_items 與 attendance_media 關聯表記錄', async () => {
    const { getDatabase } = await import('@stubbook/database');
    const db = getDatabase({ inMemory: true });

    // 1. 建立測試活動、場次與出席記錄
    db.prepare(
      `
      INSERT INTO events (id, title, platform, source_url)
      VALUES ('ev-test', 'Test Live Concert', 'KKTIX', 'https://test.kktix.cc')
    `
    ).run();

    db.prepare(
      `
      INSERT INTO event_sessions (id, event_id, session_title, session_date, ticket_platform)
      VALUES ('sess-test', 'ev-test', 'Day 1', '2026-10-01', 'KKTIX')
    `
    ).run();

    db.prepare(
      `
      INSERT INTO user_attendances (id, user_id, session_id, status, ticket_price, currency)
      VALUES ('att-test', 'local', 'sess-test', 'CONFIRMED', 3800, 'TWD')
    `
    ).run();

    // 2. 測試 merchandise_items 寫入與總額聚合
    db.prepare(
      `
      INSERT INTO merchandise_items (id, attendance_id, item_name, category, price, currency, quantity)
      VALUES ('m-1', 'att-test', '應援手燈', 'LIGHTSTICK', 1200, 'TWD', 1),
             ('m-2', 'att-test', '紀念T恤', 'APPAREL', 900, 'TWD', 2)
    `
    ).run();

    const merchRows = db
      .prepare(`SELECT * FROM merchandise_items WHERE attendance_id = 'att-test'`)
      .all();
    expect(merchRows.length).toBe(2);

    const totalCostRow = db
      .prepare(
        `
      SELECT SUM(price * quantity) as total FROM merchandise_items WHERE attendance_id = 'att-test'
    `
      )
      .get() as { total: number };
    expect(totalCostRow.total).toBe(1200 * 1 + 900 * 2); // 3000

    // 3. 測試 attendance_media 寫入與時序查詢
    db.prepare(
      `
      INSERT INTO attendance_media (id, attendance_id, media_url, media_type, captured_at, caption)
      VALUES ('med-1', 'att-test', '/uploads/media/pic1.jpg', 'PHOTO', '2026-10-01T18:00:00Z', '開場燈海'),
             ('med-2', 'att-test', '/uploads/media/vid1.mp4', 'VIDEO', '2026-10-01T20:30:00Z', '安可彩帶')
    `
    ).run();

    const mediaRows = db
      .prepare(
        `
      SELECT * FROM attendance_media WHERE attendance_id = 'att-test' ORDER BY captured_at ASC
    `
      )
      .all() as any[];
    expect(mediaRows.length).toBe(2);
    expect(mediaRows[0].caption).toBe('開場燈海');
    expect(mediaRows[1].media_type).toBe('VIDEO');

    // 4. 測試級聯刪除 (Cascading Delete): 刪除 attendance 應同時清理周邊與媒體
    db.prepare(`DELETE FROM user_attendances WHERE id = 'att-test'`).run();
    const remainingMerch = db
      .prepare(`SELECT COUNT(*) as count FROM merchandise_items WHERE attendance_id = 'att-test'`)
      .get() as { count: number };
    const remainingMedia = db
      .prepare(`SELECT COUNT(*) as count FROM attendance_media WHERE attendance_id = 'att-test'`)
      .get() as { count: number };
    expect(remainingMerch.count).toBe(0);
    expect(remainingMedia.count).toBe(0);
  });

  it('PWA Web App Manifest 應正確配置 share_target 與獨立視窗模式', () => {
    const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.short_name).toBe('StubBook');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.share_target).toBeDefined();
    expect(manifest.share_target.action).toBe('/');
    expect(manifest.share_target.params.url).toBe('url');
  });

  it('Service Worker 應具備靜態資源快取、離線票夾降級與圖片快取策略', () => {
    const swPath = path.join(__dirname, '..', 'public', 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain("addEventListener('install'");
    expect(swContent).toContain("addEventListener('activate'");
    expect(swContent).toContain("addEventListener('fetch'");
    expect(swContent).toContain('/uploads/');
    expect(swContent).toContain('/api/events');
    expect(swContent).toContain('/api/attendances');
    expect(swContent).toContain('現場網路離線');
  });

  it('行動端觸覺震動工具 (haptics) 應提供完整回饋等級', async () => {
    const { haptics } = await import('../src/utils/haptics');
    expect(haptics).toBeDefined();
    expect(typeof haptics.light).toBe('function');
    expect(typeof haptics.medium).toBe('function');
    expect(typeof haptics.success).toBe('function');
    expect(typeof haptics.warning).toBe('function');

    // 在 Node 測試環境中應安全降級不拋出異常
    expect(() => haptics.light()).not.toThrow();
    expect(() => haptics.success()).not.toThrow();
  });

  it('前端首頁應完整整合離線票夾模式與 Web Share Target 網址自動接收入庫', () => {
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');

    expect(pageContent).toContain('isOffline');
    expect(pageContent).toContain('現場離線票夾模式已啟動');
    expect(pageContent).toContain('shareTargetNotice');
    expect(pageContent).toContain('已由系統分享接收售票網址');
  });

  it('前端應完整實作 LiveEventHeroCard 現場模式卡片與相關提醒', () => {
    const cardPath = path.join(__dirname, '..', 'src', 'components', 'LiveEventHeroCard.tsx');
    expect(fs.existsSync(cardPath)).toBe(true);

    const cardContent = fs.readFileSync(cardPath, 'utf-8');
    expect(cardContent).toContain('export const LiveEventHeroCard');
    expect(cardContent).toContain('LIVE EVENT MODE · 現場模式');
    expect(cardContent).toContain('DEFAULT_CHECKLIST');
    expect(cardContent).toContain('入場座位快速出示');
    expect(cardContent).toContain('updateCountdown');
    expect(cardContent).toContain('stubbook_check_');

    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('LiveEventHeroCard');
    expect(pageContent).toContain('activeLiveSession');
  });

  it('SQLite 資料庫應支援 seat_view_photos 表格與 CRUD 視角照片操作', async () => {
    const { getDefaultDatabase } = await import('@stubbook/database');
    const db = getDefaultDatabase();

    // 驗證表格存在
    const tableInfo = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='seat_view_photos'")
      .get() as { name: string } | undefined;
    expect(tableInfo?.name).toBe('seat_view_photos');

    // 插入測試視角照片
    const insertRes = db
      .prepare(
        `
      INSERT INTO seat_view_photos (
        venue_name, section, row_number, seat_number, photo_url, view_rating, visibility, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `
      )
      .get(
        '臺北小巨蛋',
        '紅2B區',
        '5排',
        '12號',
        '/uploads/seat-views/test_photo.jpg',
        5,
        'CLEAR',
        '主舞台視野毫無遮擋'
      ) as any;

    expect(insertRes).toBeDefined();
    expect(insertRes.venue_name).toBe('臺北小巨蛋');
    expect(insertRes.section).toBe('紅2B區');
    expect(insertRes.view_rating).toBe(5);
    expect(insertRes.visibility).toBe('CLEAR');

    // 查詢驗證
    const queried = db
      .prepare('SELECT * FROM seat_view_photos WHERE id = ?')
      .get(insertRes.id) as any;
    expect(queried.notes).toBe('主舞台視野毫無遮擋');

    // 刪除清理
    db.prepare('DELETE FROM seat_view_photos WHERE id = ?').run(insertRes.id);
    const deleted = db.prepare('SELECT * FROM seat_view_photos WHERE id = ?').get(insertRes.id);
    expect(deleted).toBeUndefined();
  });

  it('Seat Views API 路由檔案與安全性驗證應符合規範', () => {
    const seatViewRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'seat-views', 'route.ts');
    expect(fs.existsSync(seatViewRoute)).toBe(true);

    const content = fs.readFileSync(seatViewRoute, 'utf-8');
    expect(content).toContain('export async function GET');
    expect(content).toContain('export async function POST');
    expect(content).toContain('export async function DELETE');
    expect(content).toContain('getDefaultDatabase');
    expect(content).toContain('VALID_VISIBILITY_TYPES');

    // 驗證 Upload API 包含 seat-views 目錄支援
    const uploadRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'upload', 'route.ts');
    const uploadContent = fs.readFileSync(uploadRoute, 'utf-8');
    expect(uploadContent).toContain("'seat-views'");
  });

  it('前端應完整實作 SeatViewModal 組件並整合至 LiveEventHeroCard 與首頁', () => {
    const modalPath = path.join(__dirname, '..', 'src', 'components', 'SeatViewModal.tsx');
    expect(fs.existsSync(modalPath)).toBe(true);

    const modalContent = fs.readFileSync(modalPath, 'utf-8');
    expect(modalContent).toContain('export const SeatViewModal');
    expect(modalContent).toContain('視角資料庫 (View From My Seat)');
    expect(modalContent).toContain('VISIBILITY_CONFIG');
    expect(modalContent).toContain('handleSaveView');

    // 驗證 LiveEventHeroCard 整合查看此排視野
    const cardPath = path.join(__dirname, '..', 'src', 'components', 'LiveEventHeroCard.tsx');
    const cardContent = fs.readFileSync(cardPath, 'utf-8');
    expect(cardContent).toContain('onOpenSeatViews');
    expect(cardContent).toContain('查看此排視野');

    // 驗證 page.tsx 頁籤與呼叫整合
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('SeatViewModal');
    expect(pageContent).toContain("activeTab === 'seats'");
    expect(pageContent).toContain('場館座位視野資料庫');
    expect(pageContent).toContain('handleOpenSeatViews');
  });

  it('SQLite 資料庫應支援 event_setlists 表格與 CRUD 操作', async () => {
    const { getDefaultDatabase } = await import('@stubbook/database');
    const db = getDefaultDatabase();

    // 驗證表格存在
    const tableInfo = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='event_setlists'")
      .get() as { name: string } | undefined;
    expect(tableInfo?.name).toBe('event_setlists');

    // 建立臨時 event 與 session 供外鍵約束關聯
    const ev = db
      .prepare(
        "INSERT INTO events (title, source_url) VALUES ('Test Concert', 'https://example.com') RETURNING id"
      )
      .get() as { id: string };
    const sess = db
      .prepare(
        "INSERT INTO event_sessions (event_id, session_date) VALUES (?, '2026-09-06') RETURNING id"
      )
      .get(ev.id) as { id: string };

    const songsJson = JSON.stringify([
      { name: 'Song 1', isEncore: false },
      { name: 'Song 2', isEncore: true, encoreNumber: 1, coverOf: 'Original Artist' },
    ]);

    // 插入測試歌單
    const insertRes = db
      .prepare(
        `
      INSERT INTO event_setlists (
        session_id, user_id, artist_name, tour_name, venue_name, session_date, source, songs
      )
      VALUES (?, 'local', ?, ?, ?, ?, 'MANUAL', ?)
      RETURNING *
    `
      )
      .get(sess.id, 'Test Artist', 'World Tour', 'Taipei Arena', '2026-09-06', songsJson) as any;

    expect(insertRes).toBeDefined();
    expect(insertRes.artist_name).toBe('Test Artist');
    expect(JSON.parse(insertRes.songs).length).toBe(2);

    // 查詢歌單
    const queried = db
      .prepare('SELECT * FROM event_setlists WHERE session_id = ?')
      .get(sess.id) as any;
    expect(queried.venue_name).toBe('Taipei Arena');

    // 刪除清理
    db.prepare('DELETE FROM events WHERE id = ?').run(ev.id); // 外鍵級聯刪除 session 與 setlist
    const deleted = db.prepare('SELECT * FROM event_setlists WHERE session_id = ?').get(sess.id);
    expect(deleted).toBeUndefined();
  });

  it('Setlists API 路由檔案與功能驗證應符合規範', () => {
    const setlistRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'setlists', 'route.ts');
    expect(fs.existsSync(setlistRoute)).toBe(true);

    const content = fs.readFileSync(setlistRoute, 'utf-8');
    expect(content).toContain('export async function GET');
    expect(content).toContain('export async function POST');
    expect(content).toContain('export async function DELETE');
    expect(content).toContain('search_setlist_fm');
    expect(content).toContain('ON CONFLICT(session_id, user_id)');
  });

  it('前端應完整實作 SetlistModal 組件並整合至 LiveEventHeroCard 與首頁', () => {
    const modalPath = path.join(__dirname, '..', 'src', 'components', 'SetlistModal.tsx');
    expect(fs.existsSync(modalPath)).toBe(true);

    const modalContent = fs.readFileSync(modalPath, 'utf-8');
    expect(modalContent).toContain('export const SetlistModal');
    expect(modalContent).toContain('現場演出歌單 (Setlist)');
    expect(modalContent).toContain('handleImportSetlistFm');
    expect(modalContent).toContain('handleCopySetlist');
    expect(modalContent).toContain('handleSaveSetlist');

    // 驗證 LiveEventHeroCard 整合歌單入口
    const cardPath = path.join(__dirname, '..', 'src', 'components', 'LiveEventHeroCard.tsx');
    const cardContent = fs.readFileSync(cardPath, 'utf-8');
    expect(cardContent).toContain('onOpenSetlist');
    expect(cardContent).toContain('現場歌單');

    // 驗證 page.tsx 整合呼叫
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('SetlistModal');
    expect(pageContent).toContain('viewingSetlistSession');
  });

  it('Analytics API 路由應正確聚合演唱會場次、花費、歌手與場館統計', () => {
    const routePath = path.join(__dirname, '..', 'src', 'app', 'api', 'analytics', 'route.ts');
    expect(fs.existsSync(routePath)).toBe(true);

    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('export async function GET');
    expect(content).toContain('availableYears');
    expect(content).toContain('totalTicketSpending');
    expect(content).toContain('totalMerchSpending');
    expect(content).toContain('topArtists');
    expect(content).toContain('topVenues');
    expect(content).toContain('fanTitle');
  });

  it('前端應完整實作 AnalyticsDashboard 與 ConcertWrappedModal 組件並整合至首頁', () => {
    const dashboardPath = path.join(__dirname, '..', 'src', 'components', 'AnalyticsDashboard.tsx');
    expect(fs.existsSync(dashboardPath)).toBe(true);

    const dashContent = fs.readFileSync(dashboardPath, 'utf-8');
    expect(dashContent).toContain('export const AnalyticsDashboard');
    expect(dashContent).toContain('ConcertWrappedModal');
    expect(dashContent).toContain('最常參戰歌手排行榜');
    expect(dashContent).toContain('踩點場館足跡');
    expect(dashContent).toContain('周邊戰利品分類投資');

    const wrappedPath = path.join(__dirname, '..', 'src', 'components', 'ConcertWrappedModal.tsx');
    expect(fs.existsSync(wrappedPath)).toBe(true);

    const wrappedContent = fs.readFileSync(wrappedPath, 'utf-8');
    expect(wrappedContent).toContain('export const ConcertWrappedModal');
    expect(wrappedContent).toContain('drawPoster');
    expect(wrappedContent).toContain('STUBBOOK · CONCERT WRAPPED');
    expect(wrappedContent).toContain('handleDownload');
    expect(wrappedContent).toContain('handleShare');

    // 驗證 page.tsx 整合 Tab 4 數據回顧與 Wrapped
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('AnalyticsDashboard');
    expect(pageContent).toContain("activeTab === 'analytics'");
    expect(pageContent).toContain('數據回顧 & Wrapped');
  });

  it('Events API 應支援 event_sale_phases 儲存與查詢回傳', () => {
    const eventsRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'events', 'route.ts');
    const content = fs.readFileSync(eventsRoute, 'utf-8');

    expect(content).toContain('event_sale_phases');
    expect(content).toContain('insertSalePhase');
    expect(content).toContain('salePhases');
    expect(content).toContain('salePhaseRows');
  });

  it('Calendar API 路由應正確聚合演出日、售票時程並支援年月過濾與倒數雷達', async () => {
    const calendarRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'calendar', 'route.ts');
    expect(fs.existsSync(calendarRoute)).toBe(true);

    const content = fs.readFileSync(calendarRoute, 'utf-8');
    expect(content).toContain('export async function GET');
    expect(content).toContain('event_sessions');
    expect(content).toContain('event_sale_phases');
    expect(content).toContain('user_attendances');
    expect(content).toContain('upcomingRadar');
    expect(content).toContain('eventsByDate');
    expect(content).toContain('urgencyLevel');

    // 實例化呼叫 GET 測試聚合邏輯
    const { GET } = await import('../src/app/api/calendar/route');
    const req = new Request('http://localhost:3000/api/calendar?type=all');
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.items)).toBe(true);
    expect(typeof json.eventsByDate).toBe('object');
    expect(Array.isArray(json.upcomingRadar)).toBe(true);
    expect(json.summary).toBeDefined();
    expect(typeof json.summary.totalItems).toBe('number');
  });

  it('前端應完整實作 CalendarDashboard 組件並整合至首頁', () => {
    const dashboardPath = path.join(__dirname, '..', 'src', 'components', 'CalendarDashboard.tsx');
    expect(fs.existsSync(dashboardPath)).toBe(true);

    const dashContent = fs.readFileSync(dashboardPath, 'utf-8');
    expect(dashContent).toContain('export const CalendarDashboard');
    expect(dashContent).toContain('搶票倒數雷達');
    expect(dashContent).toContain('formatCountdown');
    expect(dashContent).toContain('calendarGrid');
    expect(dashContent).toContain('currentWeekDays');
    expect(dashContent).toContain('手帳智慧行事曆');

    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('CalendarDashboard');
    expect(pageContent).toContain("activeTab === 'calendar'");
    expect(pageContent).toContain('手帳行事曆');
  });

  it('calendarSync 應符合 RFC 5545 規範並生成 VALARM 鬧鐘與 Google 日曆連結', async () => {
    const syncUtilPath = path.join(__dirname, '..', 'src', 'utils', 'calendarSync.ts');
    expect(fs.existsSync(syncUtilPath)).toBe(true);

    const { generateICalendar, formatToICSUtcDate, escapeICSText, generateGoogleCalendarUrl } =
      await import('../src/utils/calendarSync');

    // 1. 測試轉義字元
    expect(escapeICSText('台北, 台灣; 小巨蛋\n特區\\A')).toBe('台北\\, 台灣\\; 小巨蛋\\n特區\\\\A');

    // 2. 測試單一搶票時程之 iCalendar 與 VALARM 鬧鐘
    const saleItem = {
      id: 'sale-001',
      title: 'YOASOBI 2026 台北演唱會',
      subTitle: '國泰卡友優先購',
      itemType: 'SALE' as const,
      startDate: '2026-09-10T12:00:00',
      venueName: '台北小巨蛋',
      bookingUrl: 'https://tixcraft.com/activity/detail/26_yoasobi',
      platform: '拓元售票',
      notes: '記得備好卡號',
    };

    const icsSale = generateICalendar([saleItem], '搶票測試行事曆');
    expect(icsSale).toContain('BEGIN:VCALENDAR');
    expect(icsSale).toContain('VERSION:2.0');
    expect(icsSale).toContain('BEGIN:VEVENT');
    expect(icsSale).toContain('SUMMARY:【購票開賣】 YOASOBI 2026 台北演唱會 - 國泰卡友優先購');
    expect(icsSale).toContain('BEGIN:VALARM');
    expect(icsSale).toContain('TRIGGER:-PT10M'); // 10 分鐘前提醒
    expect(icsSale).toContain('TRIGGER:-PT60M'); // 1 小時前提醒
    expect(icsSale).toContain('LOCATION:台北小巨蛋');
    expect(icsSale).toContain('END:VEVENT');
    expect(icsSale).toContain('END:VCALENDAR');

    // 3. 測試演出日之 iCalendar 與 VALARM 鬧鐘 (前 1 天與前 2 小時)
    const showItem = {
      id: 'show-001',
      title: 'YOASOBI 2026 台北演唱會',
      itemType: 'SHOW' as const,
      startDate: '2026-11-20T19:30:00',
      venueName: '台北小巨蛋',
      seatInfo: '黃2B區 5排 12號',
    };

    const icsShow = generateICalendar([showItem]);
    expect(icsShow).toContain('SUMMARY:【演出】 YOASOBI 2026 台北演唱會');
    expect(icsShow).toContain('TRIGGER:-P1D'); // 前 1 天提醒
    expect(icsShow).toContain('TRIGGER:-PT2H'); // 前 2 小時提醒
    expect(icsShow).toContain('黃2B區 5排 12號');

    // 4. 測試 Google Calendar 產生之 URL
    const gUrl = generateGoogleCalendarUrl(saleItem);
    expect(gUrl).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
    expect(gUrl).toContain('text=');
    expect(gUrl).toContain('dates=');
    expect(gUrl).toContain('location=');
  });

  it('前端應完整實作 AddToCalendarMenu 組件並整合至卡片與手帳', () => {
    const menuPath = path.join(__dirname, '..', 'src', 'components', 'AddToCalendarMenu.tsx');
    expect(fs.existsSync(menuPath)).toBe(true);

    const menuContent = fs.readFileSync(menuPath, 'utf-8');
    expect(menuContent).toContain('export const AddToCalendarMenu');
    expect(menuContent).toContain('handleExportICS');
    expect(menuContent).toContain('handleGoogleCalendar');
    expect(menuContent).toContain('handleCopySchedule');
    expect(menuContent).toContain('Apple / iCalendar 檔');
    expect(menuContent).toContain('Google 行事曆');

    // 驗證 LiveEventHeroCard 整合 AddToCalendarMenu
    const heroPath = path.join(__dirname, '..', 'src', 'components', 'LiveEventHeroCard.tsx');
    const heroContent = fs.readFileSync(heroPath, 'utf-8');
    expect(heroContent).toContain('AddToCalendarMenu');

    // 驗證 CalendarDashboard 整合 AddToCalendarMenu 與月行程匯出
    const dashPath = path.join(__dirname, '..', 'src', 'components', 'CalendarDashboard.tsx');
    const dashContent = fs.readFileSync(dashPath, 'utf-8');
    expect(dashContent).toContain('AddToCalendarMenu');
    expect(dashContent).toContain('handleExportCurrentMonthICS');

    // 驗證 page.tsx 整合 AddToCalendarMenu
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('AddToCalendarMenu');
  });

  it('Events API 與前端應實作防重複入庫 (Upsert) 與活動整筆刪除級聯機制', async () => {
    // 1. 驗證 Events API 支援 DELETE 與防重複入庫
    const eventsRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'events', 'route.ts');
    const routeContent = fs.readFileSync(eventsRoute, 'utf-8');
    expect(routeContent).toContain('export async function DELETE');
    expect(routeContent).toContain('PRAGMA foreign_keys = ON;');
    expect(routeContent).toContain('DELETE FROM events WHERE id = ?');
    expect(routeContent).toContain('SELECT id, title FROM events WHERE source_url = ?');
    expect(routeContent).toContain('isUpdated');

    // 2. 驗證前端 page.tsx 具備刪除確認彈窗與刪除觸發按鈕
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('handleDeleteEvent');
    expect(pageContent).toContain('deletingEvent');
    expect(pageContent).toContain('確認刪除活動？');
    expect(pageContent).toContain('Trash2');

    // 3. 測試 SQLite 資料庫級聯刪除與資料一致性 (外鍵開啟下刪除活動應連帶刪除 sessions 與 attendances)
    const { getDatabase } = await import('@stubbook/database');
    const db = getDatabase({ inMemory: true });
    db.prepare('PRAGMA foreign_keys = ON;').run();

    // 插入測試活動
    db.prepare(
      `INSERT INTO events (id, title, platform, source_url) VALUES ('ev-del', 'Concert To Delete', 'KKTIX', 'https://test.com/del')`
    ).run();

    // 插入關聯場次
    db.prepare(
      `INSERT INTO event_sessions (id, event_id, session_title, session_date, ticket_platform) VALUES ('sess-del', 'ev-del', 'Day 1', '2026-12-01', 'KKTIX')`
    ).run();

    // 插入關聯手帳出席紀錄
    db.prepare(
      `INSERT INTO user_attendances (id, user_id, session_id, status) VALUES ('att-del', 'local', 'sess-del', 'CONFIRMED')`
    ).run();

    // 插入售票階段
    db.prepare(
      `INSERT INTO event_sale_phases (id, event_id, phase_name, sale_start) VALUES ('sale-del', 'ev-del', '公開發售', '2026-11-01T12:00:00')`
    ).run();

    // 驗證插入成功
    expect(db.prepare('SELECT count(*) as c FROM events WHERE id = ?').get('ev-del')).toEqual({
      c: 1,
    });
    expect(
      db.prepare('SELECT count(*) as c FROM event_sessions WHERE event_id = ?').get('ev-del')
    ).toEqual({ c: 1 });
    expect(
      db.prepare('SELECT count(*) as c FROM user_attendances WHERE session_id = ?').get('sess-del')
    ).toEqual({ c: 1 });
    expect(
      db.prepare('SELECT count(*) as c FROM event_sale_phases WHERE event_id = ?').get('ev-del')
    ).toEqual({ c: 1 });

    // 執行刪除
    db.prepare('DELETE FROM events WHERE id = ?').run('ev-del');

    // 驗證級聯刪除生效
    expect(db.prepare('SELECT count(*) as c FROM events WHERE id = ?').get('ev-del')).toEqual({
      c: 0,
    });
    expect(
      db.prepare('SELECT count(*) as c FROM event_sessions WHERE event_id = ?').get('ev-del')
    ).toEqual({ c: 0 });
    expect(
      db.prepare('SELECT count(*) as c FROM user_attendances WHERE session_id = ?').get('sess-del')
    ).toEqual({ c: 0 });
    expect(
      db.prepare('SELECT count(*) as c FROM event_sale_phases WHERE event_id = ?').get('ev-del')
    ).toEqual({ c: 0 });
  });

  it('日曆 API 與組件應具備即時同步與快取失效機制 (Issue #46)', async () => {
    const calendarRoutePath = path.join(
      __dirname,
      '..',
      'src',
      'app',
      'api',
      'calendar',
      'route.ts'
    );
    const calendarRouteContent = fs.readFileSync(calendarRoutePath, 'utf-8');
    expect(calendarRouteContent).toContain('no-store');
    expect(calendarRouteContent).toContain('Cache-Control');

    const calendarDashboardPath = path.join(
      __dirname,
      '..',
      'src',
      'components',
      'CalendarDashboard.tsx'
    );
    const calendarDashboardContent = fs.readFileSync(calendarDashboardPath, 'utf-8');
    expect(calendarDashboardContent).toContain('refreshTrigger');
    expect(calendarDashboardContent).toContain("cache: 'no-store'");

    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('eventsVersion');
    expect(pageContent).toContain('refreshTrigger={eventsVersion}');
  });

  it('導覽列與圖片海報應具備無裁切響應式佈局 (Issue #47)', () => {
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    // 頂部導覽需具備水平滾動與防裁切設置
    expect(pageContent).toContain('overflow-x-auto');
    expect(pageContent).toContain('shrink-0 whitespace-nowrap');
    // 票根縮圖不裁切
    expect(pageContent).toContain('object-contain bg-black/60');

    const calendarDashboardPath = path.join(
      __dirname,
      '..',
      'src',
      'components',
      'CalendarDashboard.tsx'
    );
    const calendarDashboardContent = fs.readFileSync(calendarDashboardPath, 'utf-8');
    // 行事曆海報圖片均應採用 object-contain 避免內容被裁切
    expect(calendarDashboardContent).not.toContain(
      'object-cover rounded-xl border border-gray-700/80'
    );
    expect(calendarDashboardContent).not.toContain(
      'object-cover rounded-2xl border border-gray-700'
    );
    expect(calendarDashboardContent).toContain('object-contain bg-gray-950/80');
  });

  it('售票網址解析與快速範例應完整包含開賣時間與售票時程 (Issue #48)', async () => {
    // 1. 驗證 Scrape API route 中的快速範例包含售票階段與場次開賣時間
    const scrapeRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'scrape', 'route.ts');
    const scrapeRouteContent = fs.readFileSync(scrapeRoutePath, 'utf-8');
    expect(scrapeRouteContent).toContain('ticket-sale-time');
    expect(scrapeRouteContent).toContain('粉絲會員優先購票');
    expect(scrapeRouteContent).toContain('國泰世華CUBE卡友優先購票');
    expect(scrapeRouteContent).toContain('SAMPLE_MOCKS');

    // 2. 測試 POST /api/scrape 快速範例解析
    const { POST } = await import('../src/app/api/scrape/route');
    const kktixReq = new Request('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://kktix.cc/events/sample-accupass' }),
    });
    const kktixRes = await POST(kktixReq as any);
    expect(kktixRes.status).toBe(200);
    const kktixData = await kktixRes.json();
    expect(kktixData.success).toBe(true);
    expect(kktixData.event.salePhases).toBeDefined();
    expect(kktixData.event.salePhases.length).toBeGreaterThanOrEqual(2);
    expect(kktixData.event.sessions[0].ticketSaleTime).toBeDefined();

    const tixcraftReq = new Request('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://tixcraft.com/activity/detail/26_JAY' }),
    });
    const tixcraftRes = await POST(tixcraftReq as any);
    expect(tixcraftRes.status).toBe(200);
    const tixcraftData = await tixcraftRes.json();
    expect(tixcraftData.success).toBe(true);
    expect(tixcraftData.event.salePhases).toBeDefined();
    expect(tixcraftData.event.salePhases.length).toBeGreaterThanOrEqual(2);
    expect(tixcraftData.event.sessions[0].ticketSaleTime).toBeDefined();

    // 3. 驗證前端頁面展示開賣時間預覽與行事曆同步入口
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('<span>開賣時間</span>');
    expect(pageContent).toContain('加入搶票提醒');
    expect(pageContent).toContain('多階段售票時程');
    expect(pageContent).toContain('event.salePhases.map');
  });

  it('資料備份與還原引擎應具備完整打包、SHA-256 校驗與防 Zip Slip 安全防護 (Phase 6: Issues #52, #53)', async () => {
    const {
      assertSafePath,
      computeSha256,
      exportStructuredJson,
      exportStubbookArchive,
      inspectBackup,
      restoreFromBackup,
      getBackupOverview,
    } = await import('../src/utils/backupEngine');

    // 1. 測試 Zip Slip 安全防護函式
    const safeDir = '/app/uploads';
    expect(assertSafePath(safeDir, 'stubs/ticket.jpg')).toBe(
      path.resolve(safeDir, 'stubs/ticket.jpg')
    );
    expect(() => assertSafePath(safeDir, '../../etc/passwd')).toThrow('Zip Slip');

    // 2. 測試純文字 JSON 結構化匯出
    const jsonBackup = exportStructuredJson();
    expect(jsonBackup.formatVersion).toBe('1.0.0');
    expect(jsonBackup.appName).toBe('StubBook');
    expect(jsonBackup.data).toBeDefined();
    expect(Array.isArray(jsonBackup.data.events)).toBe(true);
    expect(Array.isArray(jsonBackup.data.event_sessions)).toBe(true);
    expect(Array.isArray(jsonBackup.data.user_attendances)).toBe(true);

    // 3. 測試 JSON 備份檢查 (inspectBackup)
    const jsonBuffer = Buffer.from(JSON.stringify(jsonBackup), 'utf-8');
    const inspectedJson = inspectBackup(jsonBuffer);
    expect(inspectedJson.valid).toBe(true);
    expect(inspectedJson.format).toBe('JSON');
    expect(inspectedJson.counts).toBeDefined();

    // 4. 測試全量 .stubbook 封裝匯出 (exportStubbookArchive)
    const archiveBuffer = await exportStubbookArchive();
    expect(Buffer.isBuffer(archiveBuffer)).toBe(true);
    expect(archiveBuffer.length).toBeGreaterThan(0);

    // 5. 測試 .stubbook 檔案解析與 SHA-256 驗證 (inspectBackup)
    const inspectedArchive = inspectBackup(archiveBuffer);
    expect(inspectedArchive.valid).toBe(true);
    expect(inspectedArchive.format).toBe('STUBBOOK');
    expect(inspectedArchive.counts.events).toBe(jsonBackup.summary.totalEvents);
    expect(inspectedArchive.warnings.length).toBe(0);

    // 6. 測試概況取得 (getBackupOverview)
    const overview = getBackupOverview();
    expect(overview.totalEvents).toBeDefined();
    expect(overview.dbSizeBytes).toBeGreaterThan(0);

    // 7. 測試 JSON 還原引擎 (MERGE 模式)
    const restoreRes = await restoreFromBackup(jsonBuffer, { mode: 'MERGE' });
    expect(restoreRes.success).toBe(true);
    expect(restoreRes.mode).toBe('MERGE');
  });

  it('Backup 與 Restore API 路由應完整支援 .stubbook、JSON 與 Dry Run 預檢 (Phase 6: Issues #52, #53)', async () => {
    const backupRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'backup', 'route.ts');
    const restoreRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'restore', 'route.ts');
    expect(fs.existsSync(backupRoutePath)).toBe(true);
    expect(fs.existsSync(restoreRoutePath)).toBe(true);

    // 1. 測試 GET /api/backup?overview=true
    const { GET: backupGET } = await import('../src/app/api/backup/route');
    const overviewReq = new Request('http://localhost:3000/api/backup?overview=true');
    const overviewRes = await backupGET(overviewReq as any);
    expect(overviewRes.status).toBe(200);
    const overviewJson = await overviewRes.json();
    expect(overviewJson.success).toBe(true);
    expect(overviewJson.overview).toBeDefined();

    // 2. 測試 GET /api/backup?format=json
    const jsonReq = new Request('http://localhost:3000/api/backup?format=json');
    const jsonRes = await backupGET(jsonReq as any);
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get('Content-Type')).toContain('application/json');
    expect(jsonRes.headers.get('Content-Disposition')).toContain('.json');

    // 3. 測試 GET /api/backup?format=stubbook
    const stubbookReq = new Request('http://localhost:3000/api/backup?format=stubbook');
    const stubbookRes = await backupGET(stubbookReq as any);
    expect(stubbookRes.status).toBe(200);
    expect(stubbookRes.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(stubbookRes.headers.get('Content-Disposition')).toContain('.stubbook');

    // 4. 測試 POST /api/restore (Dry Run 預檢)
    const { POST: restorePOST } = await import('../src/app/api/restore/route');
    const jsonText = await jsonRes.text();
    const dryRunReq = new Request('http://localhost:3000/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawJson: jsonText, dryRun: true }),
    });
    const dryRunRes = await restorePOST(dryRunReq as any);
    expect(dryRunRes.status).toBe(200);
    const dryRunData = await dryRunRes.json();
    expect(dryRunData.success).toBe(true);
    expect(dryRunData.dryRun).toBe(true);
    expect(dryRunData.inspection.format).toBe('JSON');
  });

  it('前端應完整整合「資料安全與手帳備份中心」UI 面板與還原引導精靈 (Phase 6: Issue #54)', () => {
    const compPath = path.join(__dirname, '..', 'src', 'components', 'BackupRestoreDashboard.tsx');
    expect(fs.existsSync(compPath)).toBe(true);

    const compContent = fs.readFileSync(compPath, 'utf-8');
    expect(compContent).toContain('全量封裝備份 (.stubbook)');
    expect(compContent).toContain('純文字 JSON 匯出');
    expect(compContent).toContain('手帳資料還原中心');
    expect(compContent).toContain('智慧合併 (Merge)');
    expect(compContent).toContain('全部覆蓋 (Overwrite)');
    expect(compContent).toContain('handleExportStubbook');
    expect(compContent).toContain('handleExportJson');
    expect(compContent).toContain('handleConfirmRestore');

    // 驗證 page.tsx 整合 activeTab === 'backup'
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('BackupRestoreDashboard');
    expect(pageContent).toContain("activeTab === 'backup'");
    expect(pageContent).toContain('備份與還原');
  });

  it('售票平台全覆蓋擴展：API 與適配器應支援 ibon、FamiTicket、寬宏售票、INDIEVOX (Phase 7: Issues #56, #57, #58, #59)', async () => {
    const { POST } = await import('../src/app/api/scrape/route');

    // 1. 7-ELEVEN ibon (Issue #56)
    const ibonReq = new Request('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://ticket.ibon.com.tw/ActivityInfo/Details.aspx?id=38120',
      }),
    });
    const ibonRes = await POST(ibonReq as any);
    expect(ibonRes.status).toBe(200);
    const ibonData = await ibonRes.json();
    expect(ibonData.success).toBe(true);
    expect(ibonData.event.platform).toBe('IBON');
    expect(ibonData.event.title).toContain('五月天');
    expect(ibonData.event.sessions.length).toBe(2);
    expect(ibonData.event.salePhases.length).toBeGreaterThanOrEqual(2);

    // 2. 全家 FamiTicket 全網購票網 (Issue #57)
    const famiReq = new Request('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.famiticket.com.tw/Home/Activity/Info/2026_JOLIN' }),
    });
    const famiRes = await POST(famiReq as any);
    expect(famiRes.status).toBe(200);
    const famiData = await famiRes.json();
    expect(famiData.success).toBe(true);
    expect(famiData.event.platform).toBe('FAMITICKET');
    expect(famiData.event.title).toContain('蔡依林');
    expect(famiData.event.sessions.length).toBe(2);
    expect(famiData.event.salePhases.length).toBeGreaterThanOrEqual(2);

    // 3. 寬宏售票 Kham Ticketing (Issue #58)
    const khamReq = new Request('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://kham.com.tw/application/UTK02/UTK0201_00.aspx?PRODUCT_ID=M0KHAM26',
      }),
    });
    const khamRes = await POST(khamReq as any);
    expect(khamRes.status).toBe(200);
    const khamData = await khamRes.json();
    expect(khamData.success).toBe(true);
    expect(khamData.event.platform).toBe('KHAM');
    expect(khamData.event.title).toContain('鐘樓怪人');
    expect(khamData.event.sessions.length).toBe(3);
    expect(khamData.event.salePhases.length).toBeGreaterThanOrEqual(2);

    // 4. INDIEVOX 獨立音樂網 (Issue #59)
    const indievoxReq = new Request('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.indievox.com/activity/detail/26_NO_PARTY' }),
    });
    const indievoxRes = await POST(indievoxReq as any);
    expect(indievoxRes.status).toBe(200);
    const indievoxData = await indievoxRes.json();
    expect(indievoxData.success).toBe(true);
    expect(indievoxData.event.platform).toBe('INDIEVOX');
    expect(indievoxData.event.title).toContain('草東沒有派對');
    expect(indievoxData.event.sessions.length).toBe(1);
    expect(indievoxData.event.sessions[0].doorsOpenTime).toBe('19:00');
    expect(indievoxData.event.sessions[0].ticketTiers.length).toBeGreaterThanOrEqual(3);
  });

  it('前端與狀態欄應完整整合 6 大售票平台快速示範與專屬主題標籤 (Phase 7: Issue #59)', () => {
    // 1. 檢查 layout.tsx 狀態欄文字
    const layoutPath = path.join(__dirname, '..', 'src', 'app', 'layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    expect(layoutContent).toContain('全台 6 大售票解析在線');

    // 2. 檢查 page.tsx 快速示範按鈕與標籤色彩
    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('🏪 [ibon] 2026 五月天世運');
    expect(pageContent).toContain('🏪 [全網] 2026 蔡依林小巨蛋');
    expect(pageContent).toContain('🎭 [寬宏] 音樂劇《鐘樓怪人》');
    expect(pageContent).toContain('🎸 [INDIEVOX] 草東沒有派對 Legacy');
    expect(pageContent).toContain("event.platform === 'IBON'");
    expect(pageContent).toContain("event.platform === 'FAMITICKET'");
    expect(pageContent).toContain("event.platform === 'KHAM'");
    expect(pageContent).toContain("event.platform === 'INDIEVOX'");
  });

  it('串流音樂全生態深度聯動：Spotify PKCE、Apple Music 與 YouTube Music 引擎與去雜訊比對 (Phase 8: Issues #61, #62, #63)', async () => {
    const {
      cleanSongTitle,
      generateCodeVerifier,
      generateCodeChallenge,
      buildSpotifyAuthUrl,
      syncToSpotify,
      getAppleMusicSearchUrl,
      getAppleMusicSearchPlaylistDeepLink,
      syncToAppleMusic,
      getYoutubeMusicSearchUrl,
      getYoutubeMusicPlaylistDeepLink,
      syncToYoutubeMusic,
    } = await import('../src/utils/streaming');

    // 1. 去雜訊比對演算法測試 (Issue #61)
    expect(cleanSongTitle('STAR RISING (Intro)')).toBe('STAR RISING');
    expect(cleanSongTitle('Starlight Odyssey (Acoustic Version)')).toBe('Starlight Odyssey');
    expect(cleanSongTitle('Memories of Eternity [Live in Taipei 2026]')).toBe(
      'Memories of Eternity'
    );
    expect(cleanSongTitle('Light of Dawn (Remastered 2024)')).toBe('Light of Dawn');
    expect(cleanSongTitle('Echoes in the Night - Live')).toBe('Echoes in the Night');
    expect(cleanSongTitle('Collaboration Song (feat. Special Guest)')).toBe('Collaboration Song');

    // 2. Spotify PKCE 授權參數與跳轉網址生成 (Issue #61)
    const verifier = generateCodeVerifier(64);
    expect(verifier.length).toBe(64);
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toBeTruthy();
    expect(typeof challenge).toBe('string');

    const auth = await buildSpotifyAuthUrl({
      clientId: 'mock_spotify_client_id',
      redirectUri: 'http://localhost:3000/callback',
    });
    expect(auth.url).toContain('https://accounts.spotify.com/authorize');
    expect(auth.url).toContain('client_id=mock_spotify_client_id');
    expect(auth.url).toContain('code_challenge_method=S256');
    expect(auth.url).toContain('playlist-modify-public');

    // 3. Spotify 示範模式一鍵轉存 (Issue #61)
    const mockSongs = [
      { name: 'Re:START', isEncore: false },
      { name: 'STAR RISING (Intro)', isEncore: false },
      { name: 'Brave Heart', isEncore: true },
    ];
    const spotifySync = await syncToSpotify({
      songs: mockSongs,
      artistName: 'YOASOBI',
      tourName: 'ASIA TOUR 2026',
      isDemo: true,
    });
    expect(spotifySync.provider).toBe('SPOTIFY');
    expect(spotifySync.playlistUrl).toContain('open.spotify.com/playlist/');
    expect(spotifySync.tracks).toHaveLength(3);
    expect(spotifySync.matchedCount).toBeGreaterThanOrEqual(2);

    // 4. Apple Music 深度連結與同步 (Issue #62)
    const amSearch = getAppleMusicSearchUrl('YOASOBI', 'Re:START (Live)');
    expect(amSearch).toContain('music.apple.com/search');
    expect(amSearch).toContain('YOASOBI%20Re%3ASTART');

    const amPlaylist = getAppleMusicSearchPlaylistDeepLink('YOASOBI', 'ASIA TOUR');
    expect(amPlaylist).toContain('YOASOBI%20ASIA%20TOUR');

    const amSync = await syncToAppleMusic({
      songs: mockSongs,
      artistName: 'YOASOBI',
      tourName: 'ASIA TOUR 2026',
      isDemo: true,
    });
    expect(amSync.provider).toBe('APPLE_MUSIC');
    expect(amSync.playlistUrl).toContain('music.apple.com');
    expect(amSync.tracks).toHaveLength(3);

    // 5. YouTube Music 深度連結與同步 (Issue #63)
    const ytSearch = getYoutubeMusicSearchUrl('YOASOBI', 'STAR RISING (Intro)');
    expect(ytSearch).toContain('music.youtube.com/search');
    expect(ytSearch).toContain('YOASOBI%20STAR%20RISING');

    const ytPlaylist = getYoutubeMusicPlaylistDeepLink('YOASOBI', 'ASIA TOUR');
    expect(ytPlaylist).toContain('YOASOBI%20ASIA%20TOUR');

    const ytSync = await syncToYoutubeMusic({
      songs: mockSongs,
      artistName: 'YOASOBI',
      tourName: 'ASIA TOUR 2026',
      isDemo: true,
    });
    expect(ytSync.provider).toBe('YOUTUBE_MUSIC');
    expect(ytSync.playlistUrl).toContain('music.youtube.com/playlist');
    expect(ytSync.tracks).toHaveLength(3);
  });

  it('Streaming API 路由與 Setlists API 應支援三平台同步與 youtube_music_url 欄位 (Phase 8: Issues #61, #62, #63)', async () => {
    // 1. Streaming API 檢驗
    const { GET, POST: streamPost } = await import('../src/app/api/streaming/route');

    const configReq = new Request('http://localhost:3000/api/streaming?action=config');
    const configRes = await GET(configReq as any);
    expect(configRes.status).toBe(200);
    const configData = await configRes.json();
    expect(configData.success).toBe(true);
    expect(configData.features).toHaveProperty('spotify');
    expect(configData.features).toHaveProperty('appleMusic');
    expect(configData.features).toHaveProperty('youtubeMusic');

    // 測試 clean_titles
    const cleanReq = new Request('http://localhost:3000/api/streaming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clean_titles',
        titles: ['曲目 (Live)', '歌曲 (Acoustic)'],
      }),
    });
    const cleanRes = await streamPost(cleanReq as any);
    const cleanData = await cleanRes.json();
    expect(cleanData.success).toBe(true);
    expect(cleanData.cleaned[0].cleaned).toBe('曲目');
    expect(cleanData.cleaned[1].cleaned).toBe('歌曲');

    // 測試 sync action
    const syncReq = new Request('http://localhost:3000/api/streaming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync',
        provider: 'SPOTIFY',
        artistName: '草東沒有派對',
        songs: [{ name: '大風吹' }, { name: '山海' }],
        isDemo: true,
      }),
    });
    const syncRes = await streamPost(syncReq as any);
    expect(syncRes.status).toBe(200);
    const syncData = await syncRes.json();
    expect(syncData.success).toBe(true);
    expect(syncData.result.provider).toBe('SPOTIFY');
    expect(syncData.result.tracks).toHaveLength(2);

    // 2. Setlists API 儲存與查詢 youtubeMusicUrl 欄位
    const { getDefaultDatabase } = await import('@stubbook/database');
    const db = getDefaultDatabase();
    const ev = db
      .prepare(
        "INSERT INTO events (title, source_url) VALUES ('串流測試活動', 'https://kktix.cc/test_hub') RETURNING id"
      )
      .get() as any;
    const sess = db
      .prepare(
        "INSERT INTO event_sessions (event_id, session_title, session_date) VALUES (?, '測試場次', '2026-10-01') RETURNING id"
      )
      .get(ev.id) as any;

    const { POST: setlistPost, GET: setlistGet } = await import('../src/app/api/setlists/route');

    const saveReq = new Request('http://localhost:3000/api/setlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sess.id,
        artistName: '告五人',
        tourName: '宇宙超有趣',
        songs: [{ name: '披星戴月的想你' }],
        spotifyPlaylistUrl: 'https://open.spotify.com/playlist/sp_test',
        appleMusicUrl: 'https://music.apple.com/playlist/am_test',
        youtubeMusicUrl: 'https://music.youtube.com/playlist?list=yt_test',
        notes: '三大串流同步測試成功',
      }),
    });
    const saveRes = await setlistPost(saveReq as any);
    expect(saveRes.status).toBe(200);
    const saveData = await saveRes.json();
    expect(saveData.success).toBe(true);
    expect(saveData.setlist.youtubeMusicUrl).toBe(
      'https://music.youtube.com/playlist?list=yt_test'
    );
    expect(saveData.setlist.spotifyPlaylistUrl).toBe('https://open.spotify.com/playlist/sp_test');
    expect(saveData.setlist.appleMusicUrl).toBe('https://music.apple.com/playlist/am_test');

    const getReq = new Request(`http://localhost:3000/api/setlists?sessionId=${sess.id}`);
    const getRes = await setlistGet(getReq as any);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.setlist.youtubeMusicUrl).toBe('https://music.youtube.com/playlist?list=yt_test');

    // 刪除清理
    db.prepare('DELETE FROM events WHERE id = ?').run(ev.id);
  });

  it('前端應完整實作 StreamingSyncHub 組件並整合至 SetlistModal (Phase 8: Issue #64)', () => {
    const hubPath = path.join(__dirname, '..', 'src', 'components', 'StreamingSyncHub.tsx');
    expect(fs.existsSync(hubPath)).toBe(true);
    const hubContent = fs.readFileSync(hubPath, 'utf-8');
    expect(hubContent).toContain('export const StreamingSyncHub');
    expect(hubContent).toContain('串流音樂深度聯動中心');
    expect(hubContent).toContain('Spotify');
    expect(hubContent).toContain('Apple Music');
    expect(hubContent).toContain('YT Music');
    expect(hubContent).toContain('handleStartSpotifyAuth');
    expect(hubContent).toContain('handleSync');
    expect(hubContent).toContain('showInspector');

    const modalPath = path.join(__dirname, '..', 'src', 'components', 'SetlistModal.tsx');
    const modalContent = fs.readFileSync(modalPath, 'utf-8');
    expect(modalContent).toContain('StreamingSyncHub');
    expect(modalContent).toContain('youtubeMusicUrl');
  });

  it('所有彈窗與互動視窗應具備防裁切、垂直滾動與安全邊界適配 (Issue #72)', () => {
    const componentsToCheck = [
      {
        file: path.join(__dirname, '..', 'src', 'components', 'TicketStubModal.tsx'),
        checks: ['overflow-y-auto', 'pt-safe', 'pb-safe', 'min-h-full', 'my-auto', 'sticky top-0'],
      },
      {
        file: path.join(__dirname, '..', 'src', 'components', 'ConcertWrappedModal.tsx'),
        checks: ['overflow-y-auto', 'pt-safe', 'pb-safe', 'min-h-full', 'my-auto', 'max-h-[50dvh]'],
      },
      {
        file: path.join(__dirname, '..', 'src', 'components', 'TicketMaskModal.tsx'),
        checks: ['overflow-y-auto', 'pt-safe', 'pb-safe', 'min-h-full', 'my-auto'],
      },
      {
        file: path.join(__dirname, '..', 'src', 'components', 'SeatViewModal.tsx'),
        checks: ['overflow-y-auto', 'pt-safe', 'pb-safe', 'min-h-full', 'my-auto'],
      },
      {
        file: path.join(__dirname, '..', 'src', 'components', 'SetlistModal.tsx'),
        checks: ['overflow-y-auto', 'pt-safe', 'pb-safe', 'min-h-full', 'my-auto'],
      },
      {
        file: path.join(__dirname, '..', 'src', 'components', 'MerchManagerModal.tsx'),
        checks: ['overflow-y-auto', 'pt-safe', 'pb-safe', 'min-h-full', 'my-auto'],
      },
      {
        file: path.join(__dirname, '..', 'src', 'components', 'MediaGalleryModal.tsx'),
        checks: ['overflow-y-auto', 'pt-safe', 'pb-safe', 'min-h-full', 'my-auto'],
      },
      {
        file: path.join(__dirname, '..', 'src', 'components', 'AddToCalendarMenu.tsx'),
        checks: ['max-w-[calc(100vw-2rem)]'],
      },
    ];

    for (const { file, checks } of componentsToCheck) {
      expect(fs.existsSync(file)).toBe(true);
      const content = fs.readFileSync(file, 'utf-8');
      for (const check of checks) {
        expect(content).toContain(check);
      }
    }

    const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('editingSession');
    expect(pageContent).toContain('showLogs');
    expect(pageContent).toContain('deletingEvent');
  });

  describe('Phase 10: 視覺相片月曆、推活祈願儀式感與多維手帳範本 (Visual Photo Calendar & Fan Rituals)', () => {
    it('應完整提供 /api/prayers 祈願集氣與開賣幸運籤詩御守端點', async () => {
      const prayersRoute = path.join(__dirname, '..', 'src', 'app', 'api', 'prayers', 'route.ts');
      expect(fs.existsSync(prayersRoute)).toBe(true);

      const content = fs.readFileSync(prayersRoute, 'utf-8');
      expect(content).toContain('export async function GET');
      expect(content).toContain('export async function POST');
      expect(content).toContain('OMIKUJI_FORTUNES');
      expect(content).toContain('超大吉');
      expect(content).toContain('神席吉');
      expect(content).toContain('luckyOmikuji');
      expect(content).toContain('totalPrayers');
    });

    it('應完整實作 TicketPrayerModal 與木魚敲擊音效集氣、御守卡生成功能', () => {
      const modalPath = path.join(__dirname, '..', 'src', 'components', 'TicketPrayerModal.tsx');
      expect(fs.existsSync(modalPath)).toBe(true);

      const content = fs.readFileSync(modalPath, 'utf-8');
      expect(content).toContain('playWoodFishSound');
      expect(content).toContain('handleWoodFishClick');
      expect(content).toContain('handleDrawOmikuji');
      expect(content).toContain('handleDownloadOmikujiCard');
      expect(content).toContain('BLESSING_TAGS');
      // Issue #72 防裁切規範
      expect(content).toContain('overflow-y-auto');
      expect(content).toContain('pt-safe');
      expect(content).toContain('pb-safe');
      expect(content).toContain('min-h-full');
      expect(content).toContain('my-auto');
    });

    it('應完整實作 SafeTransferGuideModal 讓換票安全防詐指南與交易備忘', () => {
      const modalPath = path.join(
        __dirname,
        '..',
        'src',
        'components',
        'SafeTransferGuideModal.tsx'
      );
      expect(fs.existsSync(modalPath)).toBe(true);

      const content = fs.readFileSync(modalPath, 'utf-8');
      expect(content).toContain('防詐五不原則');
      expect(content).toContain('實名換票檢核清單');
      expect(content).toContain('換票資訊備忘錄');
      expect(content).toContain('handleCopySafetyTemplate');
      // Issue #72 防裁切規範
      expect(content).toContain('overflow-y-auto');
      expect(content).toContain('pt-safe');
      expect(content).toContain('pb-safe');
      expect(content).toContain('min-h-full');
      expect(content).toContain('my-auto');
    });

    it('CalendarDashboard 應支援視覺相片月曆 (Photo Calendar) 與 9:16 手機手帳桌布導出', () => {
      const calPath = path.join(__dirname, '..', 'src', 'components', 'CalendarDashboard.tsx');
      expect(fs.existsSync(calPath)).toBe(true);

      const content = fs.readFileSync(calPath, 'utf-8');
      expect(content).toContain('calendarStyle');
      expect(content).toContain('相片月曆');
      expect(content).toContain('標籤月曆');
      expect(content).toContain('handleOpenWallpaperModal');
      expect(content).toContain('handleDownloadWallpaper');
      expect(content).toContain('匯出月份桌布');
      expect(content).toContain('1080');
      expect(content).toContain('1920');
      // Issue #72 防裁切規範
      expect(content).toContain('overflow-y-auto');
      expect(content).toContain('pt-safe');
      expect(content).toContain('pb-safe');
    });

    it('TicketStubModal 與主頁面應完整支援五維演出評鑑與結構化參戰手帳筆記', () => {
      const stubPath = path.join(__dirname, '..', 'src', 'components', 'TicketStubModal.tsx');
      expect(fs.existsSync(stubPath)).toBe(true);

      const stubContent = fs.readFileSync(stubPath, 'utf-8');
      expect(stubContent).toContain('LIFECYCLE_TAGS');
      expect(stubContent).toContain('PURCHASED');
      expect(stubContent).toContain('LOTTERY_ENTERED');
      expect(stubContent).toContain('TRANSFERRING');
      expect(stubContent).toContain('ratingSound');
      expect(stubContent).toContain('ratingSight');
      expect(stubContent).toContain('ratingAtmosphere');
      expect(stubContent).toContain('ratingPerformance');
      expect(stubContent).toContain('queueTimeMinutes');
      expect(stubContent).toContain('transferNotes');
      expect(stubContent).toContain('TicketPrayerModal');
      expect(stubContent).toContain('SafeTransferGuideModal');

      const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
      const pageContent = fs.readFileSync(pagePath, 'utf-8');
      expect(pageContent).toContain('ratingSound');
      expect(pageContent).toContain('ratingSight');
      expect(pageContent).toContain('ratingAtmosphere');
      expect(pageContent).toContain('ratingPerformance');
      expect(pageContent).toContain('queueTimeMinutes');
      expect(pageContent).toContain('transferNotes');
      expect(pageContent).toContain('WAITING_TO_BUY');
      expect(pageContent).toContain('LOTTERY_ENTERED');
      expect(pageContent).toContain('PURCHASED');
      expect(pageContent).toContain('TRANSFERRING');
    });
  });

  describe('Phase 11: 巡迴足跡地圖、秒級即時動態與多舞台場館庫 (Tour Footprint Map & Live Activities)', () => {
    it('Footprint API 路由應正確聚合場館座標、參戰歷史、消費與次廳別 (#78)', async () => {
      const { GET: getFootprint, POST: postFootprint } =
        await import('../src/app/api/footprint/route');
      const res = await getFootprint();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.venues)).toBe(true);
      expect(json.stats).toBeDefined();
      expect(json.stats.totalVenues).toBeGreaterThanOrEqual(0);
      expect(json.stats.regionBreakdown).toBeDefined();

      // 驗證預設字典知名場館座標補全
      const taipeiArena = json.venues.find((v: any) => v.name.includes('小巨蛋'));
      if (taipeiArena) {
        expect(taipeiArena.latitude).toBeCloseTo(25.051, 1);
        expect(taipeiArena.longitude).toBeCloseTo(121.5501, 1);
        expect(taipeiArena.region).toBe('NORTH');
      }

      // 測試 POST 更新場館座標
      if (json.venues.length > 0) {
        const target = json.venues[0];
        const postReq = new NextRequest('http://localhost:3000/api/footprint', {
          method: 'POST',
          body: JSON.stringify({
            id: target.id,
            latitude: 25.05,
            longitude: 121.55,
            region: 'NORTH',
            sub_halls: ['主場館', '副館'],
          }),
        });
        const postRes = await postFootprint(postReq);
        expect(postRes.status).toBe(200);
      }
    });

    it('TourFootprintMap 組件應支援全台向量地圖、海外朝聖地標與場館歷史時間軸 (#78)', () => {
      const mapPath = path.join(__dirname, '..', 'src', 'components', 'TourFootprintMap.tsx');
      expect(fs.existsSync(mapPath)).toBe(true);

      const content = fs.readFileSync(mapPath, 'utf-8');
      expect(content).toContain('TAIWAN STRAIT');
      expect(content).toContain('PACIFIC OCEAN');
      expect(content).toContain('mapCoordinates');
      expect(content).toContain('taiwanVenues');
      expect(content).toContain('overseasVenues');
      expect(content).toContain('sub_halls');
      expect(content).toContain('Google 地圖導航前往');
      // Issue #72 防裁切規範
      expect(content).toContain('overflow-y-auto');
      expect(content).toContain('pt-safe');
      expect(content).toContain('pb-safe');
      expect(content).toContain('min-h-full');
      expect(content).toContain('my-auto');
    });

    it('LiveActivity API 與 LiveCountdownCard 應支援秒級精密倒數與 5 階段狀態機 (#79)', async () => {
      const { GET: getLiveActivity, POST: postLiveActivity } =
        await import('../src/app/api/live-activity/route');
      const req = new NextRequest('http://localhost:3000/api/live-activity');
      const res = await getLiveActivity(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      // 測試 POST 靈動島通知模擬
      const postReq = new NextRequest('http://localhost:3000/api/live-activity', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'dummy-session', phase: 'LIVE' }),
      });
      const postRes = await postLiveActivity(postReq);
      expect(postRes.status).toBe(200);
      const postJson = await postRes.json();
      expect(postJson.message).toContain('LIVE');

      // 驗證 LiveCountdownCard 組件程式碼結構
      const cardPath = path.join(__dirname, '..', 'src', 'components', 'LiveCountdownCard.tsx');
      expect(fs.existsSync(cardPath)).toBe(true);

      const cardContent = fs.readFileSync(cardPath, 'utf-8');
      expect(cardContent).toContain('LIVE ACTIVITIES');
      expect(cardContent).toContain('DAYS');
      expect(cardContent).toContain('HOURS');
      expect(cardContent).toContain('MINS');
      expect(cardContent).toContain('SECS');
      expect(cardContent).toContain('QUEUEING');
      expect(cardContent).toContain('DOORS_OPEN');
      expect(cardContent).toContain('COUNTDOWN');
      expect(cardContent).toContain('LIVE');
      expect(cardContent).toContain('EXIT');
      expect(cardContent).toContain('handleSimulateDynamicIsland');
    });

    it('Festival API 與 FestivalTimetableModal 應支援多舞台排程與衝堂警示機制 (#80)', async () => {
      const { GET: getFestival, PUT: putFestival } = await import('../src/app/api/festival/route');
      const req = new NextRequest('http://localhost:3000/api/festival');
      const res = await getFestival(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.stages)).toBe(true);
      expect(Array.isArray(json.timetables)).toBe(true);
      expect(Array.isArray(json.clashes)).toBe(true);

      // 驗證多舞台時程組件
      const modalPath = path.join(
        __dirname,
        '..',
        'src',
        'components',
        'FestivalTimetableModal.tsx'
      );
      expect(fs.existsSync(modalPath)).toBe(true);

      const content = fs.readFileSync(modalPath, 'utf-8');
      expect(content).toContain('Multi-Stage Timetable');
      expect(content).toContain('衝堂警示');
      expect(content).toContain('clashes');
      expect(content).toContain('handleCopySchedule');
      expect(content).toContain('toggleSlotSelection');
      // Issue #72 防裁切規範
      expect(content).toContain('overflow-y-auto');
      expect(content).toContain('pt-safe');
      expect(content).toContain('pb-safe');
      expect(content).toContain('min-h-full');
      expect(content).toContain('my-auto');
    });

    it('Wishlist API 與 WishlistModal 應支援朝聖心願池管理與售票雷達智慧匹配 (#81)', async () => {
      const {
        GET: getWishlist,
        POST: postWishlist,
        PUT: putWishlist,
        DELETE: deleteWishlist,
      } = await import('../src/app/api/wishlist/route');

      // GET
      const getRes = await getWishlist();
      expect(getRes.status).toBe(200);
      const json = await getRes.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.items)).toBe(true);
      expect(json.stats).toBeDefined();

      // POST
      const postReq = new NextRequest('http://localhost:3000/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({
          target_type: 'ARTIST',
          target_name: 'ONE OK ROCK',
          priority: 5,
          reason: '想要在現場大合唱 We Are！',
        }),
      });
      const postRes = await postWishlist(postReq);
      expect(postRes.status).toBe(200);
      const postJson = await postRes.json();
      expect(postJson.success).toBe(true);
      const createdId = postJson.item.id;

      // PUT (圓夢標記)
      const putReq = new NextRequest('http://localhost:3000/api/wishlist', {
        method: 'PUT',
        body: JSON.stringify({ id: createdId, is_fulfilled: true }),
      });
      const putRes = await putWishlist(putReq);
      expect(putRes.status).toBe(200);

      // DELETE
      const delReq = new NextRequest(`http://localhost:3000/api/wishlist?id=${createdId}`, {
        method: 'DELETE',
      });
      const delRes = await deleteWishlist(delReq);
      expect(delRes.status).toBe(200);

      // 驗證 WishlistModal 組件
      const modalPath = path.join(__dirname, '..', 'src', 'components', 'WishlistModal.tsx');
      expect(fs.existsSync(modalPath)).toBe(true);

      const content = fs.readFileSync(modalPath, 'utf-8');
      expect(content).toContain('Pilgrimage Bucket List');
      expect(content).toContain('朝聖心願池');
      expect(content).toContain('handleAddWish');
      expect(content).toContain('handleToggleFulfilled');
      expect(content).toContain('售票雷達已命中');
      // Issue #72 防裁切規範
      expect(content).toContain('overflow-y-auto');
      expect(content).toContain('pt-safe');
      expect(content).toContain('pb-safe');
      expect(content).toContain('min-h-full');
      expect(content).toContain('my-auto');
    });

    it('主頁面 page.tsx 應整合 LiveCountdownCard 與 Phase 11 捷徑工具列', () => {
      const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('LiveCountdownCard');
      expect(content).toContain('TourFootprintMap');
      expect(content).toContain('FestivalTimetableModal');
      expect(content).toContain('WishlistModal');
      expect(content).toContain('巡迴足跡地圖');
      expect(content).toContain('音樂祭 Timetable 排程');
      expect(content).toContain('朝聖心願池');
    });
  });

  describe('Phase 12: 推活熱量大數據、全出費分析與潮流社群卡工廠 (Passion Analytics & Aesthetic Card Generator)', () => {
    it('Expenses API (/api/expenses) 應支援全量出費明細 CRUD、分類彙整與遠征佔比計算 (#83)', async () => {
      const {
        GET: getExpenses,
        POST: postExpenses,
        PUT: putExpenses,
        DELETE: deleteExpenses,
      } = await import('../src/app/api/expenses/route');

      const { getDefaultDatabase } = await import('@stubbook/database');
      const db = getDefaultDatabase();

      // 先建立一筆測試出席記錄以滿足外鍵約束
      const testEvent = db
        .prepare(
          "INSERT INTO events (title, source_url) VALUES ('遠征支出測試活動', 'https://test.com/exp') RETURNING id"
        )
        .get() as { id: string };
      const testSession = db
        .prepare(
          "INSERT INTO event_sessions (event_id, session_date) VALUES (?, '2026-11-20') RETURNING id"
        )
        .get(testEvent.id) as { id: string };
      const testAtt = db
        .prepare(
          "INSERT INTO user_attendances (user_id, session_id, status) VALUES ('local', ?, 'ATTENDED') RETURNING id"
        )
        .get(testSession.id) as { id: string };

      // 1. 建立測試支出項目
      const postReq = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          attendance_id: testAtt.id,
          category: 'TRANSPORT',
          item_name: '高鐵台北-高雄來回',
          amount: 2980,
          currency: 'TWD',
          notes: '提早搶票早鳥 8 折',
        }),
      });
      const postRes = await postExpenses(postReq);
      expect(postRes.status).toBe(200);
      const postJson = await postRes.json();
      expect(postJson.success).toBe(true);
      expect(postJson.expense.category).toBe('TRANSPORT');
      expect(postJson.expense.amount).toBe(2980);
      const createdId = postJson.expense.id;

      // 2. 查詢特定出席項目
      const getByAttReq = new NextRequest(
        `http://localhost:3000/api/expenses?attendanceId=${testAtt.id}`
      );
      const getByAttRes = await getExpenses(getByAttReq);
      expect(getByAttRes.status).toBe(200);
      const getByAttJson = await getByAttRes.json();
      expect(getByAttJson.success).toBe(true);
      expect(Array.isArray(getByAttJson.expenses)).toBe(true);
      expect(getByAttJson.totalAmount).toBeGreaterThanOrEqual(2980);

      // 3. 查詢全量分類彙總與遠征佔比
      const getAllReq = new NextRequest('http://localhost:3000/api/expenses');
      const getAllRes = await getExpenses(getAllReq);
      expect(getAllRes.status).toBe(200);
      const getAllJson = await getAllRes.json();
      expect(getAllJson.success).toBe(true);
      expect(getAllJson.categoryMap).toBeDefined();
      expect(getAllJson.categoryMap.TRANSPORT).toBeGreaterThanOrEqual(2980);
      expect(typeof getAllJson.grandTotal).toBe('number');
      expect(typeof getAllJson.expeditionRate).toBe('number');

      // 4. 更新支出項目
      const putReq = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'PUT',
        body: JSON.stringify({
          id: createdId,
          amount: 3200,
          notes: '改搭高鐵商務艙',
        }),
      });
      const putRes = await putExpenses(putReq);
      expect(putRes.status).toBe(200);

      // 5. 刪除支出項目
      const delReq = new NextRequest(`http://localhost:3000/api/expenses?id=${createdId}`, {
        method: 'DELETE',
      });
      const delRes = await deleteExpenses(delReq);
      expect(delRes.status).toBe(200);
    });

    it('Passion API (/api/passion) 應聚合 365 日熱力矩陣、星期規律、解鎖現場神曲榜與狂粉熱量指數 (#84)', async () => {
      const { GET: getPassion } = await import('../src/app/api/passion/route');

      const req = new NextRequest('http://localhost:3000/api/passion');
      const res = await getPassion(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const a = json.analytics;
      expect(a).toBeDefined();

      // 365 日熱力矩陣
      expect(Array.isArray(a.heatmapDays)).toBe(true);
      expect(a.heatmapDays.length).toBe(365);
      expect(a.heatmapDays[0]).toHaveProperty('date');
      expect(a.heatmapDays[0]).toHaveProperty('count');
      expect(a.heatmapDays[0]).toHaveProperty('level');

      // 狂粉熱量指標
      expect(typeof a.passionScore).toBe('number');
      expect(typeof a.passionRankTitle).toBe('string');
      expect(typeof a.passionRankBadge).toBe('string');

      // 星期與月份分佈
      expect(a.weekdayDistribution).toBeDefined();
      expect(typeof a.mostFrequentWeekday).toBe('string');
      expect(a.monthlyDistribution).toBeDefined();

      // 現場神曲解鎖排行
      expect(Array.isArray(a.topSongs)).toBe(true);
      expect(typeof a.totalUniqueSongsHeard).toBe('number');

      // 出費結構
      expect(typeof a.totalExpeditionSpend).toBe('number');
      expect(a.spendByCategory).toBeDefined();
    });

    it('前端應完整實作 PassionHeatmapDashboard 組件並遵循 Issue #72 防裁切規範 (#83, #84)', () => {
      const dashPath = path.join(
        __dirname,
        '..',
        'src',
        'components',
        'PassionHeatmapDashboard.tsx'
      );
      expect(fs.existsSync(dashPath)).toBe(true);

      const content = fs.readFileSync(dashPath, 'utf-8');
      expect(content).toContain('PassionHeatmapDashboard');
      expect(content).toContain('推活熱量大數據');
      expect(content).toContain('365 日參戰熱力矩陣');
      expect(content).toContain('推活遠征全出費分佈');
      expect(content).toContain('參戰星期規律與神曲解鎖榜');
      expect(content).toContain('遠征開銷記帳明細');

      // Issue #72 防裁切與全螢幕滾動安全邊界
      expect(content).toContain('overflow-y-auto');
      expect(content).toContain('pt-safe');
      expect(content).toContain('pb-safe');
      expect(content).toContain('min-h-full');
      expect(content).toContain('my-auto');
      expect(content).toContain('max-h-[92dvh]');
    });

    it('前端應完整實作 AestheticCardGeneratorModal 組件支援收據、CD 盒、透明貼紙與調色盤 (#85, #86)', () => {
      const modalPath = path.join(
        __dirname,
        '..',
        'src',
        'components',
        'AestheticCardGeneratorModal.tsx'
      );
      expect(fs.existsSync(modalPath)).toBe(true);

      const content = fs.readFileSync(modalPath, 'utf-8');
      expect(content).toContain('AestheticCardGeneratorModal');
      expect(content).toContain('潮流社群卡工廠');
      expect(content).toContain('VINTAGE_RECEIPT');
      expect(content).toContain('JEWEL_CASE');
      expect(content).toContain('TRANSPARENT_STICKER');
      expect(content).toContain('DARK_OBSIDIAN');
      expect(content).toContain('POLAROID_WHITE');
      expect(content).toContain('CYBERPUNK_NEON');
      expect(content).toContain('VINTAGE_KRAFT');
      expect(content).toContain('handleDownload');
      expect(content).toContain('handleShare');

      // Issue #72 防裁切安全邊界
      expect(content).toContain('overflow-y-auto');
      expect(content).toContain('pt-safe');
      expect(content).toContain('pb-safe');
      expect(content).toContain('min-h-full');
      expect(content).toContain('my-auto');
      expect(content).toContain('max-h-[92dvh]');
    });

    it('主頁面 page.tsx 應完整整合 Phase 12 快捷工具列與彈窗掛載 (#83, #84, #85, #86)', () => {
      const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('PassionHeatmapDashboard');
      expect(content).toContain('AestheticCardGeneratorModal');
      expect(content).toContain('推活熱量大數據');
      expect(content).toContain('潮流社群卡工廠');
      expect(content).toContain('passionModalOpen');
      expect(content).toContain('cardGeneratorModalOpen');
    });
  });
});
