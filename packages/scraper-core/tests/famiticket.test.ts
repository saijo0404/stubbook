import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FamiTicketScraperAdapter } from '../src/adapters/famiticket';

describe('FamiTicketScraperAdapter', () => {
  const adapter = new FamiTicketScraperAdapter();
  const fixturePath = path.join(__dirname, 'fixtures', 'famiticket-sample.html');
  const sampleHtml = fs.readFileSync(fixturePath, 'utf-8');
  const targetUrl = 'https://www.famiticket.com.tw/Home/Activity/Info/2026_JOLIN';

  it('應正確識別全網購票網 (FamiTicket) 網址', () => {
    expect(adapter.canHandle('https://www.famiticket.com.tw/Home/Activity/Info/2026_JOLIN')).toBe(
      true
    );
    expect(adapter.canHandle('https://famiticket.com.tw/activity/detail')).toBe(true);
    expect(adapter.canHandle('https://kktix.cc/events/sample')).toBe(false);
    expect(adapter.canHandle('https://ticket.ibon.com.tw/event/123')).toBe(false);
  });

  it('應能正確解析 FamiTicket 活動名稱、主辦單位與宣傳封面', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.title).toBe('蔡依林 Ugly Beauty 世界巡迴演唱會 最終場');
    expect(event.organizer).toBe('凌時差音樂');
    expect(event.platform).toBe('FAMITICKET');
    expect(event.posterUrl).toBe(
      'https://www.famiticket.com.tw/Uploads/Activities/uglybeauty2026.jpg'
    );
    expect(event.description).toContain('蔡依林怪美的巡演終章降臨');
  });

  it('應能正確解析多場次演期時間、場地與跨年特別場', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.sessions).toHaveLength(2);

    // Day 1
    const s1 = event.sessions[0];
    expect(s1.sessionTitle).toContain('台北跨年週 Day 1');
    expect(s1.venueName).toBe('臺北小巨蛋');
    expect(new Date(s1.sessionDate).getFullYear()).toBe(2026);
    expect(new Date(s1.sessionDate).getUTCMonth()).toBe(11); // 12月 (0-indexed 11)
    expect(s1.ticketPlatform).toBe('FAMITICKET');

    // Day 2 (跨年夜特別場)
    const s2 = event.sessions[1];
    expect(s2.sessionTitle).toContain('台北跨年週 跨年特別場');
    expect(s2.ticketTiers[0].status).toBe('SOLD_OUT');
  });

  it('應能解析多階段售票時程 (卡友優先購與全面開賣)', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.salePhases).toBeDefined();
    expect(event.salePhases.length).toBeGreaterThanOrEqual(2);

    const presale = event.salePhases.find((p) => p.saleType === 'PRESALE');
    expect(presale).toBeDefined();
    expect(presale?.phaseName).toContain('優先');

    const general = event.salePhases.find((p) => p.saleType === 'GENERAL');
    expect(general).toBeDefined();
    expect(new Date(general!.saleStart).getUTCHours()).toBe(5); // 13:00 +0800 is 05:00 UTC
  });

  it('應能在無表格情況下優雅抽取單場次資訊', () => {
    const minimalHtml = `
      <html>
        <head><title>獨立展演活動 - 全網購票網</title></head>
        <body>
          <h1 class="act-title">獨立展演活動</h1>
          <div class="act-date">2026/11/05 19:00</div>
          <div class="act-location">Zepp New Taipei</div>
          <div class="price-row">全區自由席 NT$ 2,200</div>
        </body>
      </html>
    `;
    const event = adapter.parseHtml(minimalHtml, 'https://www.famiticket.com.tw/minimal');
    expect(event.title).toBe('獨立展演活動');
    expect(event.sessions).toHaveLength(1);
    expect(event.sessions[0].venueName).toBe('Zepp New Taipei');
    expect(event.sessions[0].ticketTiers[0].price).toBe(2200);
  });
});
