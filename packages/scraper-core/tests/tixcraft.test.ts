import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TixcraftScraperAdapter } from '../src/adapters/tixcraft';

describe('TixcraftScraperAdapter', () => {
  const adapter = new TixcraftScraperAdapter();
  const fixturePath = path.join(__dirname, 'fixtures', 'tixcraft-sample.html');
  const sampleHtml = fs.readFileSync(fixturePath, 'utf-8');
  const targetUrl = 'https://tixcraft.com/activity/detail/26_JAY';

  it('應正確識別拓元售票網址', () => {
    expect(adapter.canHandle('https://tixcraft.com/activity/detail/26_JAY')).toBe(true);
    expect(adapter.canHandle('https://tixcraft.com/activity/game/26_JAY')).toBe(true);
    expect(adapter.canHandle('https://kktix.cc/events/sample')).toBe(false);
  });

  it('應能正確解析活動名稱與海報', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.title).toBe('2026 周杰倫「嘉年華」世界巡迴演唱會');
    expect(event.posterUrl).toBe('https://tixcraft.com/images/concerts/jaychou2026.jpg');
    expect(event.platform).toBe('TIXCRAFT');
  });

  it('應能完整解析多場次表 (#gameList) 且各自具備獨立日期與狀態', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    // 驗證是否有 3 場次
    expect(event.sessions).toHaveLength(3);

    const [day1, day2, day3] = event.sessions;

    // Day 1
    expect(day1.sessionTitle).toBe('台北大巨蛋場 Day 1');
    expect(day1.venueName).toBe('臺北大巨蛋');
    expect(day1.bookingUrl).toBe('https://tixcraft.com/ticket/order/26_JAY/1');
    expect(new Date(day1.sessionDate).getDate()).toBe(4);
    expect(day1.ticketTiers[0].status).toBe('SOLD_OUT');

    // Day 2
    expect(day2.sessionTitle).toBe('台北大巨蛋場 Day 2');
    expect(new Date(day2.sessionDate).getDate()).toBe(5);
    expect(day2.ticketTiers[0].status).toBe('AVAILABLE');

    // Day 3
    expect(day3.sessionTitle).toBe('台北大巨蛋場 Day 3 (加場)');
    expect(new Date(day3.sessionDate).getDate()).toBe(6);

    // 票價表解析驗證 (6880, 5880, 4880, 3880, 2280, 1880)
    expect(day1.ticketTiers.length).toBe(6);
    expect(day1.ticketTiers[0].price).toBe(6880);
    expect(day1.ticketTiers[5].price).toBe(1880);
  });
});
