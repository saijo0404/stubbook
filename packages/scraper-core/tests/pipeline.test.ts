import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ScraperPipeline } from '../src/pipeline';

describe('ScraperPipeline', () => {
  const pipeline = new ScraperPipeline();
  const kktixHtml = fs.readFileSync(path.join(__dirname, 'fixtures', 'kktix-sample.html'), 'utf-8');
  const tixcraftHtml = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'tixcraft-sample.html'),
    'utf-8'
  );
  const ibonHtml = fs.readFileSync(path.join(__dirname, 'fixtures', 'ibon-sample.html'), 'utf-8');
  const famiticketHtml = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'famiticket-sample.html'),
    'utf-8'
  );
  const khamHtml = fs.readFileSync(path.join(__dirname, 'fixtures', 'kham-sample.html'), 'utf-8');
  const indievoxHtml = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'indievox-sample.html'),
    'utf-8'
  );

  it('應依據 URL 自動路由至最適適配器 (包含 6 大主流售票系統)', () => {
    expect(pipeline.getAdapter('https://kktix.cc/events/concert-test').name).toBe(
      'KktixScraperAdapter'
    );
    expect(pipeline.getAdapter('https://tixcraft.com/activity/detail/test').name).toBe(
      'TixcraftScraperAdapter'
    );
    expect(
      pipeline.getAdapter('https://ticket.ibon.com.tw/ActivityInfo/Details.aspx?id=38120').name
    ).toBe('IbonScraperAdapter');
    expect(
      pipeline.getAdapter('https://www.famiticket.com.tw/Home/Activity/Info/2026_JOLIN').name
    ).toBe('FamiTicketScraperAdapter');
    expect(
      pipeline.getAdapter(
        'https://kham.com.tw/application/UTK02/UTK0201_00.aspx?PRODUCT_ID=M0KHAM26'
      ).name
    ).toBe('KhamScraperAdapter');
    expect(pipeline.getAdapter('https://www.indievox.com/activity/detail/26_NO_PARTY').name).toBe(
      'IndievoxScraperAdapter'
    );

    const unknownAdapter = pipeline.getAdapter('https://unknown-concert-website.org/events/1');
    expect(unknownAdapter.name).toBe('MetaScraperAdapter');
  });

  it('透過 parseHtml 能夠順利解析各大平台 HTML 並全數通過 Zod Schema 驗證', async () => {
    // 1. KKTIX
    const kktixEvent = await pipeline.parseHtml(kktixHtml, 'https://kktix.cc/events/test');
    expect(kktixEvent.platform).toBe('KKTIX');
    expect(kktixEvent.sessions.length).toBeGreaterThan(0);

    // 2. 拓元 tixCraft
    const tixcraftEvent = await pipeline.parseHtml(
      tixcraftHtml,
      'https://tixcraft.com/activity/detail/test'
    );
    expect(tixcraftEvent.platform).toBe('TIXCRAFT');
    expect(tixcraftEvent.sessions.length).toBeGreaterThan(0);

    // 3. 7-ELEVEN ibon
    const ibonEvent = await pipeline.parseHtml(
      ibonHtml,
      'https://ticket.ibon.com.tw/ActivityInfo/Details.aspx?id=38120'
    );
    expect(ibonEvent.platform).toBe('IBON');
    expect(ibonEvent.sessions.length).toBe(2);

    // 4. 全家 FamiTicket
    const famiEvent = await pipeline.parseHtml(
      famiticketHtml,
      'https://www.famiticket.com.tw/Home/Activity/Info/2026_JOLIN'
    );
    expect(famiEvent.platform).toBe('FAMITICKET');
    expect(famiEvent.sessions.length).toBe(2);

    // 5. 寬宏售票 Kham
    const khamEvent = await pipeline.parseHtml(
      khamHtml,
      'https://kham.com.tw/application/UTK02/UTK0201_00.aspx?PRODUCT_ID=M0KHAM26'
    );
    expect(khamEvent.platform).toBe('KHAM');
    expect(khamEvent.sessions.length).toBe(3);

    // 6. INDIEVOX 獨立音樂網
    const indievoxEvent = await pipeline.parseHtml(
      indievoxHtml,
      'https://www.indievox.com/activity/detail/26_NO_PARTY'
    );
    expect(indievoxEvent.platform).toBe('INDIEVOX');
    expect(indievoxEvent.sessions.length).toBe(1);
    expect(indievoxEvent.sessions[0].doorsOpenTime).toBe('19:00');
  });

  it('未知網址應自動降級至 MetaScraperAdapter 解析', async () => {
    const mockUnknownHtml = `
      <html>
        <head>
          <title>獨立音樂節 2026</title>
          <meta property="og:title" content="獨立音樂節 2026" />
          <meta property="og:description" content="全台最大獨立音樂盛宴" />
        </head>
        <body>
          <h1>獨立音樂節 2026</h1>
        </body>
      </html>
    `;

    const event = await pipeline.parseHtml(mockUnknownHtml, 'https://example-music-fest.org');
    expect(event.platform).toBe('OTHER');
    expect(event.title).toBe('獨立音樂節 2026');
    expect(event.description).toBe('全台最大獨立音樂盛宴');
    expect(event.sessions).toHaveLength(1);
  });
});
