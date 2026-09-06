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

  it('應能正確解析多階段售票時程 (優先購票與全面開賣)', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.salePhases).toBeDefined();
    expect(event.salePhases.length).toBe(2);

    const [presale, general] = event.salePhases;

    // 優先購票
    expect(presale.phaseName).toContain('國泰世華CUBE卡友優先購票');
    expect(presale.saleType).toBe('PRESALE');
    expect(new Date(presale.saleStart).getDate()).toBe(10);

    // 全面開賣
    expect(general.phaseName).toContain('拓元售票系統全面開賣');
    expect(general.saleType).toBe('GENERAL');
    expect(new Date(general.saleStart).getDate()).toBe(12);

    // 場次也應綁定開賣時間
    expect(event.sessions[0].ticketSaleTime).toBe(presale.saleStart);
  });

  it('應能相容全形標點、中午時制與 .alert 警語區塊中的開賣時間', () => {
    const alertHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Maroon 5 高雄世運演唱會 - 拓元售票系統</title>
        <meta property="og:title" content="Maroon 5 高雄世運演唱會">
      </head>
      <body>
        <h2 class="activity-name">Maroon 5 高雄世運演唱會</h2>
        <div class="alert alert-info">
          注意事項：售票時間：２０２６年０９月１５日（週二）中午１２：００ Live Nation會員預購
        </div>
        <div class="alert alert-warning">
          開賣時間：2026/09/16 (三) 12:00 拓元售票系統全面開賣
        </div>
        <table id="gameList">
          <tbody>
            <tr>
              <td>2026/12/28 (一) 19:30</td>
              <td>高雄世運場</td>
              <td>高雄國家體育場</td>
              <td><button>立即購票</button></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const event = adapter.parseHtml(alertHtml, 'https://tixcraft.com/activity/detail/26_M5');
    expect(event.salePhases).toHaveLength(2);

    const [presale, general] = event.salePhases;
    expect(presale.saleType).toBe('PRESALE');
    expect(presale.phaseName).toContain('Live Nation會員預購');
    expect(new Date(presale.saleStart).getDate()).toBe(15);
    expect(new Date(presale.saleStart).getHours()).toBe(12);

    expect(general.saleType).toBe('GENERAL');
    expect(general.phaseName).toContain('全面開賣');
    expect(new Date(general.saleStart).getDate()).toBe(16);

    // 場次開賣時間
    expect(event.sessions[0].ticketSaleTime).toBe(presale.saleStart);
  });

  it('應能由 Meta Description 中成功備援抽取開賣日程', () => {
    const metaHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ed Sheeran 巡演 - 拓元售票系統</title>
        <meta property="og:description" content="全城矚目！啟售時間：2026.10.20 (二) 下午 13:00 正式開賣">
      </head>
      <body>
        <h2 class="activity-name">Ed Sheeran 巡演</h2>
      </body>
      </html>
    `;

    const event = adapter.parseHtml(metaHtml, 'https://tixcraft.com/activity/detail/26_EDS');
    expect(event.salePhases).toHaveLength(1);
    expect(event.salePhases[0].saleType).toBe('GENERAL');

    const dt = new Date(event.salePhases[0].saleStart);
    expect(dt.getFullYear()).toBe(2026);
    expect(dt.getMonth()).toBe(9); // 10月
    expect(dt.getDate()).toBe(20);
    expect(dt.getHours()).toBe(13);
  });
});
