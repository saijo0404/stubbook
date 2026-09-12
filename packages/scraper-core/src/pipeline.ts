import { BaseScraperAdapter } from './adapters/base';
import { KktixScraperAdapter } from './adapters/kktix';
import { TixcraftScraperAdapter } from './adapters/tixcraft';
import { IbonScraperAdapter } from './adapters/ibon';
import { FamiTicketScraperAdapter } from './adapters/famiticket';
import { KhamScraperAdapter } from './adapters/kham';
import { IndievoxScraperAdapter } from './adapters/indievox';
import { MetaScraperAdapter } from './adapters/meta';
import { ScrapedEvent, ScrapedEventSchema } from './types';

export interface ScraperPipelineOptions {
  customAdapters?: BaseScraperAdapter[];
  userAgent?: string;
}

export class ScraperPipeline {
  private adapters: BaseScraperAdapter[];
  private userAgent: string;

  constructor(options?: ScraperPipelineOptions) {
    this.adapters = options?.customAdapters || [
      new KktixScraperAdapter(),
      new TixcraftScraperAdapter(),
      new IbonScraperAdapter(),
      new FamiTicketScraperAdapter(),
      new KhamScraperAdapter(),
      new IndievoxScraperAdapter(),
      new MetaScraperAdapter(), // 永遠放最後作為萬用備援
    ];
    this.userAgent =
      options?.userAgent ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 StubBook/1.0';
  }

  /**
   * 根據網址匹配最適配的爬蟲器
   */
  getAdapter(url: string): BaseScraperAdapter {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(url)) {
        return adapter;
      }
    }
    // 預設返回 MetaScraperAdapter
    return new MetaScraperAdapter();
  }

  /**
   * 解析給定的 HTML 字串與原始網址
   */
  async parseHtml(html: string, url: string): Promise<ScrapedEvent> {
    const adapter = this.getAdapter(url);
    const result = await adapter.parseHtml(html, url);

    // 使用 Zod 綱要進行執行期驗證，確保回傳資料結構穩健
    return ScrapedEventSchema.parse(result);
  }

  /**
   * 直接擷取特定網址並回傳結構化活動資訊
   */
  async scrapeUrl(url: string, requestInit?: RequestInit): Promise<ScrapedEvent> {
    const response = await fetch(url, {
      ...requestInit,
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        ...requestInit?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL [${response.status} ${response.statusText}]: ${url}`);
    }

    const html = await response.text();
    return this.parseHtml(html, url);
  }
}
