import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { IndievoxScraperAdapter } from '../src/adapters/indievox';

describe('IndievoxScraperAdapter', () => {
  const adapter = new IndievoxScraperAdapter();
  const fixturePath = path.join(__dirname, 'fixtures', 'indievox-sample.html');
  const sampleHtml = fs.readFileSync(fixturePath, 'utf-8');
  const targetUrl = 'https://www.indievox.com/activity/detail/26_NO_PARTY';

  it('應正確識別 INDIEVOX 獨立音樂網網址', () => {
    expect(adapter.canHandle('https://www.indievox.com/activity/detail/26_NO_PARTY')).toBe(true);
    expect(adapter.canHandle('https://indievox.com/events/12345')).toBe(true);
    expect(adapter.canHandle('https://kktix.cc/events/sample')).toBe(false);
    expect(adapter.canHandle('https://ticket.ibon.com.tw/event/123')).toBe(false);
  });

  it('應能正確解析 INDIEVOX 活動名稱、表演樂團、主辦單位與宣傳海報', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.title).toBe('草東沒有派對 [北風呼呼] 專場巡演 台北場');
    expect(event.artist).toContain('草東沒有派對');
    expect(event.organizer).toBe('黑市音樂');
    expect(event.platform).toBe('INDIEVOX');
    expect(event.posterUrl).toBe('https://www.indievox.com/upload/activity/noparty2026.jpg');
    expect(event.description).toContain('華山 Legacy');
  });

  it('應能結構化解析演出時間、進場時間 (Doors Open) 與 Livehouse 場館', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.sessions).toHaveLength(1);
    const session = event.sessions[0];

    expect(session.venueName).toBe('Legacy Taipei 音樂展演空間');
    expect(session.venueAddress).toContain('台北市中正區八德路一段一號');
    expect(new Date(session.sessionDate).getFullYear()).toBe(2026);
    expect(new Date(session.sessionDate).getUTCMonth()).toBe(10); // 11月 (0-indexed 10)
    expect(session.doorsOpenTime).toBe('19:00');
    expect(session.ticketPlatform).toBe('INDIEVOX');
  });

  it('應能解析 Livehouse 常見票種 (雙人套票、現場票、預售票、身障票) 與狀態', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);
    const session = event.sessions[0];

    expect(session.ticketTiers.length).toBeGreaterThanOrEqual(4);

    const doubleTicket = session.ticketTiers.find((t) => t.name.includes('雙人'));
    expect(doubleTicket).toBeDefined();
    expect(doubleTicket?.price).toBe(2200);

    const presale = session.ticketTiers.find((t) => t.name.includes('預售'));
    expect(presale).toBeDefined();
    expect(presale?.price).toBe(1200);
    expect(presale?.status).toBe('SOLD_OUT');

    const doorTicket = session.ticketTiers.find((t) => t.name.includes('現場'));
    expect(doorTicket).toBeDefined();
    expect(doorTicket?.price).toBe(1500);
    expect(doorTicket?.status).toBe('NOT_STARTED');
  });

  it('應能正確抽取多階段售票時程 (預售開賣與現場開賣)', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.salePhases).toBeDefined();
    expect(event.salePhases.length).toBeGreaterThanOrEqual(2);

    const presalePhase = event.salePhases.find((p) => p.saleType === 'PRESALE');
    expect(presalePhase).toBeDefined();
    expect(new Date(presalePhase!.saleStart).getUTCHours()).toBe(4); // 12:00 +0800 is 04:00 UTC

    const doorPhase = event.salePhases.find((p) => p.phaseName.includes('現場'));
    expect(doorPhase).toBeDefined();
  });

  it('在無結構化標籤時應能以內文關鍵字抽取獨立音樂專場資訊', () => {
    const fallbackHtml = `
      <html>
        <head><title>獨立樂團專場 - INDIEVOX</title></head>
        <body>
          <h1 class="event-title">獨立樂團專場</h1>
          <div class="date-time">2026/10/20 20:00 (19:30 入場)</div>
          <div class="venue-name">THE WALL Live House</div>
          <div class="memo-content">
            預售票 NT$ 800 / 現場票 NT$ 1000
            預售開賣時間：2026/09/10 12:00
          </div>
        </body>
      </html>
    `;
    const event = adapter.parseHtml(fallbackHtml, 'https://www.indievox.com/fallback');
    expect(event.title).toBe('獨立樂團專場');
    expect(event.sessions[0].venueName).toBe('THE WALL Live House');
    expect(event.sessions[0].doorsOpenTime).toBe('19:30');
    expect(event.sessions[0].ticketTiers.length).toBeGreaterThanOrEqual(2);
  });
});
