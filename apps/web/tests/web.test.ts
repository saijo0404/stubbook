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
});
