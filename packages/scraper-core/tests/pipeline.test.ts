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

  it('應依據 URL 自動路由至最適適配器', () => {
    const kktixAdapter = pipeline.getAdapter('https://kktix.cc/events/concert-test');
    expect(kktixAdapter.name).toBe('KktixScraperAdapter');

    const tixcraftAdapter = pipeline.getAdapter('https://tixcraft.com/activity/detail/test');
    expect(tixcraftAdapter.name).toBe('TixcraftScraperAdapter');

    const unknownAdapter = pipeline.getAdapter('https://unknown-concert-website.org/events/1');
    expect(unknownAdapter.name).toBe('MetaScraperAdapter');
  });

  it('透過 parseHtml 能夠順利解析並通過 Zod Schema 驗證', async () => {
    const event = await pipeline.parseHtml(kktixHtml, 'https://kktix.cc/events/test');
    expect(event.title).toBeDefined();
    expect(event.sessions.length).toBeGreaterThan(0);
    expect(event.platform).toBe('KKTIX');
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
