import * as cheerio from 'cheerio';
import { BaseScraperAdapter } from './base';
import {
  ScrapedEvent,
  ScrapedSession,
  TicketTier,
  TicketStatus,
  ScrapedSalePhase,
  SaleType,
} from '../types';
import { parseChineseDateTime, extractSalePhasesFromContent } from '../utils/datetime';

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

    // 8. 售票時程解析 (Sale Phases)
    const salePhases = this.extractSalePhases($, html, url);

    // 9. 嘗試讀取 JSON-LD 作為精準度補全
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
      ticketSaleTime: salePhases[0]?.saleStart,
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
      salePhases,
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
    const timeText =
      $('.event-time').text().trim() ||
      $('.timezoneSuffix').parent().text().trim() ||
      $('.date-range').text().trim() ||
      $('.info-block').text().trim();

    if (timeText) {
      const parsed = parseChineseDateTime(timeText, 19, 30);
      if (parsed) return parsed;
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

  private extractSalePhases($: cheerio.CheerioAPI, html: string, url: string): ScrapedSalePhase[] {
    const phases: ScrapedSalePhase[] = [];

    const addUniquePhases = (found: ScrapedSalePhase[]) => {
      for (const p of found) {
        if (
          !phases.some(
            (existing) => existing.saleStart === p.saleStart && existing.phaseName === p.phaseName
          )
        ) {
          phases.push(p);
        }
      }
    };

    // 1. Selector-based lookup: 特殊開賣時間容器
    $(
      '.ticket-sale-time, .sale-time, .start-sale-time, .tickets-header-info, .ticket-sales, .ticket-warning, .tickets-note'
    ).each((_, el) => {
      const text = $(el).text().trim();
      addUniquePhases(extractSalePhasesFromContent(text, url, 'KKTIX'));
    });

    // 2. Alert, Notice, Announcement 結構
    $('.alert, .notice, .warning, .announcement, .info-box, .custom-html').each((_, el) => {
      const text = $(el).text().trim();
      addUniquePhases(extractSalePhasesFromContent(text, url, 'KKTIX'));
    });

    // 3. Description 與 Meta Tags
    const metaDesc =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';
    const descText = $('.description, #description, .event-description').text().trim();
    addUniquePhases(extractSalePhasesFromContent(metaDesc, url, 'KKTIX'));
    addUniquePhases(extractSalePhasesFromContent(descText, url, 'KKTIX'));

    // 4. 若仍未找到，全 HTML 全文掃描作為最終備援
    if (phases.length === 0) {
      addUniquePhases(extractSalePhasesFromContent(html, url, 'KKTIX'));
    }

    // 按開賣時間排序
    phases.sort((a, b) => new Date(a.saleStart).getTime() - new Date(b.saleStart).getTime());
    return phases;
  }
}
