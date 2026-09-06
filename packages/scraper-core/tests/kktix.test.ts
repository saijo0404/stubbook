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
});
