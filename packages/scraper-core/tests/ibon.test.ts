import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { IbonScraperAdapter } from '../src/adapters/ibon';

describe('IbonScraperAdapter', () => {
  const adapter = new IbonScraperAdapter();
  const fixturePath = path.join(__dirname, 'fixtures', 'ibon-sample.html');
  const sampleHtml = fs.readFileSync(fixturePath, 'utf-8');
  const targetUrl = 'https://ticket.ibon.com.tw/ActivityInfo/Details.aspx?id=38120';

  it('應正確識別 7-ELEVEN ibon 相關售票網址', () => {
    expect(adapter.canHandle('https://ticket.ibon.com.tw/ActivityInfo/Details.aspx?id=38120')).toBe(
      true
    );
    expect(adapter.canHandle('https://ticket.ibon.com.tw/ActivityInfo/GameInfo/38120')).toBe(true);
    expect(adapter.canHandle('https://ibon.com.tw/event/123')).toBe(true);
    expect(adapter.canHandle('https://kktix.cc/events/sample')).toBe(false);
    expect(adapter.canHandle('https://tixcraft.com/activity/detail/sample')).toBe(false);
  });

  it('應能正確解析 ibon 活動主資訊、演出者、主辦單位與海報封面', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.title).toBe('2026 五月天 [回到那一天] 25週年巡迴演唱會 高雄無限放大版');
    expect(event.organizer).toBe('相信音樂');
    expect(event.platform).toBe('IBON');
    expect(event.posterUrl).toBe('https://ticket.ibon.com.tw/Upload/Activity/38120/banner.jpg');
    expect(event.description).toContain('高雄世運主館震撼開唱');
  });

  it('應能結構化解析多場次演期、場館與不同場次狀態', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.sessions).toHaveLength(2);

    // Day 1
    const s1 = event.sessions[0];
    expect(s1.sessionTitle).toContain('高雄世運場 Day 1');
    expect(s1.venueName).toBe('高雄國家體育場 (世運主館)');
    expect(new Date(s1.sessionDate).getFullYear()).toBe(2026);
    expect(new Date(s1.sessionDate).getUTCMonth()).toBe(9); // 10月 (0-indexed 9)
    expect(s1.ticketPlatform).toBe('IBON');
    expect(s1.ticketTiers.length).toBeGreaterThanOrEqual(3);

    // Day 2 (已售完)
    const s2 = event.sessions[1];
    expect(s2.sessionTitle).toContain('高雄世運場 Day 2');
    expect(s2.ticketTiers[0].status).toBe('SOLD_OUT');
  });

  it('應能解析多階段售票時程 (Sale Phases) 與優先購/全面開賣', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.salePhases).toBeDefined();
    expect(event.salePhases.length).toBeGreaterThanOrEqual(2);

    const presale = event.salePhases.find((p) => p.saleType === 'PRESALE');
    expect(presale).toBeDefined();
    expect(presale?.phaseName).toContain('優先');

    const general = event.salePhases.find((p) => p.saleType === 'GENERAL');
    expect(general).toBeDefined();
    expect(new Date(general!.saleStart).getUTCHours()).toBe(4); // 12:00 +0800 is 04:00 UTC
  });

  it('當無表格時應能優雅降級為單一場次並維持資料完整性', () => {
    const minimalHtml = `
      <html>
        <head><title>ibon 展演專場 - ibon售票系統</title></head>
        <body>
          <h1 class="activity-title">ibon 展演專場</h1>
          <div class="event-time">2026/12/10 19:30</div>
          <div class="location">Legacy Max</div>
          <div class="ticket-unit">全票 NT$ 1,200</div>
        </body>
      </html>
    `;
    const event = adapter.parseHtml(minimalHtml, 'https://ticket.ibon.com.tw/minimal');
    expect(event.title).toBe('ibon 展演專場');
    expect(event.sessions).toHaveLength(1);
    expect(event.sessions[0].venueName).toBe('Legacy Max');
    expect(new Date(event.sessions[0].sessionDate).getFullYear()).toBe(2026);
  });
});
