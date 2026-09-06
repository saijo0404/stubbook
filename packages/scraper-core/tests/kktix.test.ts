import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { KktixScraperAdapter } from '../src/adapters/kktix';

describe('KktixScraperAdapter', () => {
  const adapter = new KktixScraperAdapter();
  const fixturePath = path.join(__dirname, 'fixtures', 'kktix-sample.html');
  const sampleHtml = fs.readFileSync(fixturePath, 'utf-8');
  const targetUrl = 'https://kktix.cc/events/accupass-sample';

  it('應正確識別 KKTIX 相關網址', () => {
    expect(adapter.canHandle('https://kktix.cc/events/sample-123')).toBe(true);
    expect(adapter.canHandle('https://myorg.kktix.cc/events/concert-2026')).toBe(true);
    expect(adapter.canHandle('https://kktix.com/events/sample')).toBe(true);
    expect(adapter.canHandle('https://tixcraft.com/activity/detail/24_sample')).toBe(false);
  });

  it('應能正確解析活動主資訊與海報', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.title).toBe('2026 告五人 [宇宙的有趣] 巡迴演唱會');
    expect(event.organizer).toBe('相信音樂');
    expect(event.posterUrl).toBe('https://images.kktix.cc/events/accupass-sample-poster.jpg');
    expect(event.platform).toBe('KKTIX');
  });

  it('應能精準抽取單一場次時間、場館與票價級距', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.sessions).toHaveLength(1);
    const session = event.sessions[0];

    expect(session.venueName).toBe('臺北小巨蛋');
    expect(session.venueAddress).toContain('台北市松山區南京東路四段2號');
    expect(new Date(session.sessionDate).getFullYear()).toBe(2026);

    // 驗證票價列表
    expect(session.ticketTiers).toHaveLength(3);
    expect(session.ticketTiers[0]).toEqual({
      name: '搖滾特A區',
      price: 3800,
      currency: 'TWD',
      status: 'SOLD_OUT',
    });
    expect(session.ticketTiers[1].price).toBe(2800);
    expect(session.ticketTiers[1].status).toBe('AVAILABLE');
  });

  it('應能正確解析開賣時程 (Sale Phases) 並綁定場次開賣時間', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.salePhases).toBeDefined();
    expect(event.salePhases.length).toBeGreaterThan(0);
    expect(event.salePhases[0].phaseName).toBe('KKTIX 一般售票');
    expect(event.salePhases[0].saleType).toBe('GENERAL');
    expect(new Date(event.salePhases[0].saleStart).getMonth()).toBe(8); // 9月 (0-indexed 8)
    expect(event.sessions[0].ticketSaleTime).toBe(event.salePhases[0].saleStart);
  });

  it('應能相容中文星期、中午時制與公告警語區塊 (.alert) 內之開賣時間', () => {
    const customHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>告五人 2026 高雄巨蛋演唱會</title>
        <meta property="og:title" content="告五人 2026 高雄巨蛋演唱會">
      </head>
      <body>
        <h1>告五人 2026 高雄巨蛋演唱會</h1>
        <div class="alert alert-warning">
          【重要購票提醒】啟售時間：2026年09月10日（週四）中午12:00 全面開賣，每人限購4張。
        </div>
        <div class="event-time">2026/12/25 (五) 19:30</div>
        <div class="location">高雄巨蛋</div>
      </body>
      </html>
    `;

    const event = adapter.parseHtml(customHtml, 'https://kktix.cc/events/accupass-alert');
    expect(event.salePhases).toHaveLength(1);
    expect(event.salePhases[0].phaseName).toContain('全面開賣');
    expect(event.salePhases[0].saleType).toBe('GENERAL');

    const dt = new Date(event.salePhases[0].saleStart);
    expect(dt.getFullYear()).toBe(2026);
    expect(dt.getMonth()).toBe(8); // 9月
    expect(dt.getDate()).toBe(10);
    expect(dt.getHours()).toBe(12);

    // 場次開賣時間亦應自動對齊
    expect(event.sessions[0].ticketSaleTime).toBe(event.salePhases[0].saleStart);
  });

  it('應能相容全形符號與 Meta Description 中之後備開賣資訊', () => {
    const metaHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>YOASOBI 台北小巨蛋演唱會</title>
        <meta name="description" content="售票時間：２０２６／１０／０１（四）１２：００ 國泰世華CUBE卡友優先購票">
      </head>
      <body>
        <div class="event-time">2026-11-20 19:30</div>
        <div class="location">台北小巨蛋</div>
      </body>
      </html>
    `;

    const event = adapter.parseHtml(metaHtml, 'https://kktix.cc/events/yoasobi-meta');
    expect(event.salePhases).toHaveLength(1);
    expect(event.salePhases[0].saleType).toBe('PRESALE');
    expect(event.salePhases[0].phaseName).toContain('國泰世華CUBE卡友優先購票');

    const dt = new Date(event.salePhases[0].saleStart);
    expect(dt.getFullYear()).toBe(2026);
    expect(dt.getMonth()).toBe(9); // 10月
    expect(dt.getDate()).toBe(1);
    expect(dt.getHours()).toBe(12);
  });
});
