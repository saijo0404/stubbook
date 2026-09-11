import * as cheerio from 'cheerio';
import { BaseScraperAdapter } from './base';
import { ScrapedEvent, ScrapedSession, TicketTier } from '../types';
import { extractSalePhasesFromContent } from '../utils/datetime';

export class MetaScraperAdapter implements BaseScraperAdapter {
  readonly name = 'MetaScraperAdapter';

  canHandle(_url: string): boolean {
    // 作為通用備援，所有網址均可由 Meta 解析器處理
    return true;
  }

  parseHtml(html: string, url: string): ScrapedEvent {
    const $ = cheerio.load(html);

    // 1. 嘗試解析 JSON-LD (schema.org/MusicEvent 或 Event)
    const jsonLdData = this.extractJsonLd($);
    if (jsonLdData) {
      return this.transformJsonLdToEvent(jsonLdData, url, $);
    }

    // 2. 降級至 Open Graph 與標準 HTML 標籤
    const ogTitle =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().trim() ||
      '未命名活動';

    const ogImage =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content');

    const ogDescription =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content');

    const salePhases = extractSalePhasesFromContent(
      `${ogDescription || ''}\n${$('body').text()}`,
      url,
      'OTHER'
    );

    const session: ScrapedSession = {
      sessionDate: new Date().toISOString(),
      venueName: '待定 / 未知場館',
      ticketPlatform: 'OTHER',
      ticketTiers: [],
      ticketSaleTime: salePhases[0]?.saleStart,
      bookingUrl: url,
    };

    return {
      title: ogTitle,
      sourceUrl: url,
      posterUrl: ogImage,
      description: ogDescription,
      platform: 'OTHER',
      sessions: [session],
      salePhases,
    };
  }

  private extractJsonLd($: cheerio.CheerioAPI): Record<string, any> | null {
    const scripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i++) {
      try {
        const content = $(scripts[i]).html();
        if (!content) continue;
        const parsed = JSON.parse(content);
        if (
          parsed['@type'] === 'MusicEvent' ||
          parsed['@type'] === 'Event' ||
          parsed['@type'] === 'Festival'
        ) {
          return parsed;
        }
        if (Array.isArray(parsed['@graph'])) {
          const eventItem = parsed['@graph'].find(
            (item: any) =>
              item['@type'] === 'MusicEvent' ||
              item['@type'] === 'Event' ||
              item['@type'] === 'Festival'
          );
          if (eventItem) return eventItem;
        }
      } catch {
        // 忽略單一 JSON 解析異常
      }
    }
    return null;
  }

  private transformJsonLdToEvent(
    data: Record<string, any>,
    url: string,
    $: cheerio.CheerioAPI
  ): ScrapedEvent {
    const title = data.name || $('title').text().trim() || '未命名活動';
    const artist =
      data.performer?.name || (Array.isArray(data.performer) ? data.performer[0]?.name : undefined);
    const posterUrl =
      data.image?.url || data.image || $('meta[property="og:image"]').attr('content');
    const description = data.description || $('meta[property="og:description"]').attr('content');

    const venueName =
      data.location?.name || (typeof data.location === 'string' ? data.location : '待定場館');
    const venueAddress =
      typeof data.location?.address === 'string'
        ? data.location.address
        : data.location?.address?.streetAddress || data.location?.address?.addressLocality;

    const sessionDate = data.startDate
      ? new Date(data.startDate).toISOString()
      : new Date().toISOString();

    const ticketTiers: TicketTier[] = [];
    if (data.offers) {
      const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
      for (const offer of offers) {
        if (offer.price !== undefined) {
          ticketTiers.push({
            name: offer.name || '一般票券',
            price: Number(offer.price) || 0,
            currency: offer.priceCurrency || 'TWD',
            status: offer.availability?.includes('InStock')
              ? 'AVAILABLE'
              : offer.availability?.includes('SoldOut')
                ? 'SOLD_OUT'
                : 'UNKNOWN',
          });
        }
      }
    }

    const salePhases = extractSalePhasesFromContent(
      `${description || ''}\n${$('body').text()}`,
      url,
      'OTHER'
    );

    const session: ScrapedSession = {
      sessionDate,
      venueName,
      venueAddress,
      ticketPlatform: 'OTHER',
      ticketTiers,
      ticketSaleTime: salePhases[0]?.saleStart,
      bookingUrl: data.offers?.url || url,
    };

    return {
      title,
      artist,
      sourceUrl: url,
      posterUrl,
      description,
      organizer: data.organizer?.name,
      platform: 'OTHER',
      sessions: [session],
      salePhases,
      rawMetadata: data,
    };
  }
}
