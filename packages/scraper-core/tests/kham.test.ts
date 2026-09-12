import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { KhamScraperAdapter } from '../src/adapters/kham';

describe('KhamScraperAdapter', () => {
  const adapter = new KhamScraperAdapter();
  const fixturePath = path.join(__dirname, 'fixtures', 'kham-sample.html');
  const sampleHtml = fs.readFileSync(fixturePath, 'utf-8');
  const targetUrl = 'https://kham.com.tw/application/UTK02/UTK0201_00.aspx?PRODUCT_ID=M0KHAM26';

  it('應正確識別寬宏售票相關網址', () => {
    expect(
      adapter.canHandle('https://kham.com.tw/application/UTK02/UTK0201_00.aspx?PRODUCT_ID=M0KHAM26')
    ).toBe(true);
    expect(adapter.canHandle('https://www.kham.com.tw/application/UTK01/UTK0101_06.aspx')).toBe(
      true
    );
    expect(adapter.canHandle('https://kham.com.tw/events/musical')).toBe(true);
    expect(adapter.canHandle('https://kktix.cc/events/sample')).toBe(false);
  });

  it('應能正確解析寬宏售票活動名稱、主辦單位、主演與海報封面', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.title).toBe('法文音樂劇《鐘樓怪人》二十五週年亞洲巡迴 台北站');
    expect(event.organizer).toBe('寬宏藝術');
    expect(event.platform).toBe('KHAM');
    expect(event.posterUrl).toBe('https://kham.com.tw/Upload/Product/kham_notredame.jpg');
    expect(event.description).toContain('紀念巡演');
  });

  it('應能結構化解析 ASP.NET 表格中的多場次演期時間、場館與售票狀態', () => {
    const event = adapter.parseHtml(sampleHtml, targetUrl);

    expect(event.sessions).toHaveLength(3);

    // 第 1 場
    const s1 = event.sessions[0];
    expect(s1.venueName).toBe('國家戲劇院');
    expect(new Date(s1.sessionDate).getFullYear()).toBe(2026);
    expect(new Date(s1.sessionDate).getUTCMonth()).toBe(8); // 9月 (0-indexed 8)
    expect(s1.ticketPlatform).toBe('KHAM');
    expect(s1.ticketTiers.length).toBeGreaterThanOrEqual(4);

    // 第 3 場 (已售罄)
    const s3 = event.sessions[2];
    expect(s3.ticketTiers[0].status).toBe('SOLD_OUT');
  });

  it('應能正確解析多階段售票時程 (早鳥會員開賣與全面開賣)', () => {
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

  it('在無表格結構時應能安全回退至單一場次解析', () => {
    const fallbackHtml = `
      <html>
        <head><title>百老匯音樂劇 - 寬宏售票</title></head>
        <body>
          <h1 id="ctl00_ContentPlaceHolder1_lblPRODUCT_NAME">百老匯音樂劇</h1>
          <span id="ctl00_ContentPlaceHolder1_lblPLAY_DATE">2026/10/10 19:30</span>
          <span id="ctl00_ContentPlaceHolder1_lblPLACE">高雄衛武營</span>
          <span id="ctl00_ContentPlaceHolder1_lblPRICE">1200, 2400, 3600</span>
        </body>
      </html>
    `;
    const event = adapter.parseHtml(fallbackHtml, 'https://kham.com.tw/fallback');
    expect(event.title).toBe('百老匯音樂劇');
    expect(event.sessions).toHaveLength(1);
    expect(event.sessions[0].venueName).toBe('高雄衛武營');
    expect(event.sessions[0].ticketTiers[0].price).toBe(3600);
  });
});
