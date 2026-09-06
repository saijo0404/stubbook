import * as cheerio from 'cheerio';
import { BaseScraperAdapter } from './base';
import { ScrapedEvent, ScrapedSession, TicketTier, TicketStatus } from '../types';

export class KktixScraperAdapter implements BaseScraperAdapter {
  readonly name = 'KktixScraperAdapter';

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.endsWith('kktix.cc') || parsed.hostname.endsWith('kktix.com');
    } catch {
      return false;
    }
  }

  parseHtml(html: string, url: string): ScrapedEvent {
    const $ = cheerio.load(html);

    // 1. 活動主標題 (Title)
    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('.header-title').text().trim() ||
      $('h1.title').text().trim() ||
      $('title').text().split('|')[0]?.trim() ||
      'KKTIX 活動';

    // 2. 活動海報封面 (Poster)
    const posterUrl =
      $('meta[property="og:image"]').attr('content') || $('.banner img').attr('src') || undefined;

    // 3. 活動介紹 (Description)
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('.description').text().trim() ||
      undefined;

    // 4. 主辦單位 / 演出者
    const organizer =
      $('.host-name').text().trim() ||
      $('.organizer a').text().trim() ||
      $('a[href*="/users/"]').first().text().trim() ||
      undefined;

    // 5. 地點 / 場館資訊
    let venueName =
      $('.location').text().trim() ||
      $('[itemprop="location"] [itemprop="name"]').text().trim() ||
      $('.venue-info').text().trim() ||
      '未知場館';

    let venueAddress: string | undefined =
      $('[itemprop="location"] [itemprop="address"]').text().trim() ||
      $('.address').text().trim() ||
      undefined;

    // 6. 場次時間解析
    let sessionDate = this.extractEventDate($, html);

    // 7. 票種與票價階梯 (Ticket Tiers)
    const ticketTiers = this.extractTicketTiers($);

    // 8. 嘗試讀取 JSON-LD 作為精準度補全
    const jsonLd = this.extractJsonLd($);
    if (jsonLd) {
      if (jsonLd.location?.name) venueName = jsonLd.location.name;
      if (jsonLd.startDate) {
        try {
          sessionDate = new Date(jsonLd.startDate).toISOString();
        } catch {
          // preserve sessionDate
        }
      }
    }

    const session: ScrapedSession = {
      sessionTitle: '單一場次',
      sessionDate,
      venueName: venueName.replace(/\s+/g, ' ').trim(),
      venueAddress: venueAddress ? venueAddress.replace(/\s+/g, ' ').trim() : undefined,
      ticketPlatform: 'KKTIX',
      ticketTiers,
      bookingUrl: url,
    };

    return {
      title,
      artist: organizer, // KKTIX 常見主辦/歌手
      sourceUrl: url,
      posterUrl,
      description,
      organizer,
      platform: 'KKTIX',
      sessions: [session],
    };
  }

  private extractEventDate($: cheerio.CheerioAPI, html: string): string {
    // 檢查 itemprop="startDate"
    const metaDate = $('[itemprop="startDate"]').attr('content');
    if (metaDate) {
      const parsed = new Date(metaDate);
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    }

    // 檢查 .event-time 或常見時間容器文字
    const timeText = $('.event-time').text().trim() || $('.timezoneSuffix').parent().text().trim();
    if (timeText) {
      const match = timeText.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
      if (match) {
        const [_, y, m, d, hh = '19', mm = '00'] = match;
        const dt = new Date(
          `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00+08:00`
        );
        if (!isNaN(dt.getTime())) return dt.toISOString();
      }
    }

    return new Date().toISOString();
  }

  private extractTicketTiers($: cheerio.CheerioAPI): TicketTier[] {
    const tiers: TicketTier[] = [];

    // KKTIX 購票表格票種選擇器
    $('.ticket-unit, .tickets tr, .ticket-list-item').each((_, el) => {
      const name =
        $(el).find('.ticket-name, .name, td.ticket-name').text().trim() ||
        $(el).find('h3, h4').text().trim();
      const priceText =
        $(el).find('.ticket-price, .price, td.price').text().trim() ||
        $(el).find('.amount').text().trim();
      const statusText = $(el).find('.ticket-status, .status').text().trim();

      if (!name) return;

      const priceMatch = priceText.replace(/,/g, '').match(/\d+/);
      const price = priceMatch ? parseInt(priceMatch[0], 10) : 0;

      let status: TicketStatus = 'AVAILABLE';
      if (statusText.includes('已售完') || statusText.includes('Sold Out')) {
        status = 'SOLD_OUT';
      } else if (statusText.includes('即將開賣') || statusText.includes('尚未開賣')) {
        status = 'NOT_STARTED';
      } else if (statusText.includes('暫停') || statusText.includes('取消')) {
        status = 'CANCELLED';
      }

      tiers.push({
        name,
        price,
        currency: 'TWD',
        status,
      });
    });

    return tiers;
  }

  private extractJsonLd($: cheerio.CheerioAPI): Record<string, any> | null {
    const scripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i++) {
      try {
        const raw = $(scripts[i]).html();
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed['@type'] === 'Event' || parsed['@type'] === 'MusicEvent') {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return null;
  }
}
