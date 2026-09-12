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
      // 從 JSON-LD offers 提取高精度販售時間與補齊票種
      if (Array.isArray(jsonLd.offers)) {
        for (const offer of jsonLd.offers) {
          if (offer.validFrom) {
            try {
              const saleStart = new Date(offer.validFrom).toISOString();
              const saleEnd = offer.validThrough
                ? new Date(offer.validThrough).toISOString()
                : undefined;
              const phaseName = offer.name ? `KKTIX ${offer.name} 售票` : 'KKTIX 一般售票';

              if (!salePhases.some((p) => p.saleStart === saleStart && p.phaseName === phaseName)) {
                salePhases.push({
                  phaseName,
                  saleType: 'GENERAL',
                  saleStart,
                  saleEnd,
                  ticketingPlatform: 'KKTIX',
                  bookingUrl: url,
                  isLottery: false,
                });
              }
            } catch {
              // ignore
            }
          }

          // 若 HTML 表格未能抓取票種，從 JSON-LD offers 補齊
          if (ticketTiers.length === 0 && offer.name) {
            let status: TicketStatus = 'AVAILABLE';
            if (offer.availability === 'SoldOut') {
              status = 'SOLD_OUT';
            } else if (offer.availability === 'PreOrder') {
              status = 'NOT_STARTED';
            }
            ticketTiers.push({
              name: offer.name,
              price:
                typeof offer.price === 'number' ? offer.price : parseInt(offer.price || '0', 10),
              currency: offer.priceCurrency || 'TWD',
              status,
            });
          }
        }
        salePhases.sort(
          (a, b) => new Date(a.saleStart).getTime() - new Date(b.saleStart).getTime()
        );
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

      // 忽略表頭行
      if ($(el).find('th').length > 0) return;
      if (
        !name ||
        name === '票種' ||
        name === '票券' ||
        name === '票券名稱' ||
        name === 'Ticket' ||
        name === 'Ticket Name'
      )
        return;

      const priceMatch = priceText.replace(/,/g, '').match(/\d+/);
      const price = priceMatch ? parseInt(priceMatch[0], 10) : 0;

      let status: TicketStatus = 'AVAILABLE';
      if (
        statusText.includes('已售完') ||
        statusText.includes('Sold Out') ||
        statusText.includes('結束販售') ||
        statusText.includes('已結束')
      ) {
        status = 'SOLD_OUT';
      } else if (
        statusText.includes('即將開賣') ||
        statusText.includes('尚未開賣') ||
        statusText.includes('即將開售') ||
        statusText.includes('尚未開售')
      ) {
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
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item && (item['@type'] === 'Event' || item['@type'] === 'MusicEvent')) {
            return item;
          }
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
      '.ticket-sale-time, .sale-time, .start-sale-time, .tickets-header-info, .ticket-sales, .ticket-warning, .tickets-note, .tickets-notice, .countdown, .time-countdown, .sale-countdown'
    ).each((_, el) => {
      const text = $(el).text().trim();
      addUniquePhases(extractSalePhasesFromContent(text, url, 'KKTIX'));
    });

    // 2. KKTIX 購票表格專屬時程解析 (.tickets table)
    $('.tickets table tbody tr, .tickets tr').each((_, el) => {
      const tierName = $(el).find('.name, td.name, .ticket-name').first().text().trim();
      const periodText = $(el).find('.period, td.period, .period-time').first().text().trim();
      if (periodText) {
        // 格式通常為: 2026/08/28 18:00(+0800) ~ 2026/12/04 23:59(+0800) 結束販售
        const parts = periodText.split('~');
        const startRaw = parts[0]?.trim();
        const endRaw = parts[1]?.trim();
        const startDate = startRaw ? parseChineseDateTime(startRaw, 12, 0) : null;
        const endDate = endRaw ? parseChineseDateTime(endRaw, 23, 59) : null;

        if (startDate) {
          const phaseName = tierName ? `KKTIX ${tierName} 售票` : 'KKTIX 一般售票';
          addUniquePhases([
            {
              phaseName,
              saleType: 'GENERAL',
              saleStart: startDate,
              saleEnd: endDate || undefined,
              ticketingPlatform: 'KKTIX',
              bookingUrl: url,
              eligibilityNotes: periodText.slice(0, 200),
              isLottery: false,
            },
          ]);
        }
      }
    });

    // 3. Definition Lists (dl, dt, dd) 與表格 (table tr)
    $('dl, .dl-horizontal, .event-info-list').each((_, el) => {
      const text = $(el)
        .find('dt, dd')
        .map((_, item) => $(item).text().trim())
        .get()
        .join(' ');
      addUniquePhases(extractSalePhasesFromContent(text, url, 'KKTIX'));
    });

    $('table:not(.tickets) tr').each((_, el) => {
      const rowText = $(el)
        .find('th, td')
        .map((_, item) => $(item).text().trim())
        .get()
        .join(' ');
      addUniquePhases(extractSalePhasesFromContent(rowText, url, 'KKTIX'));
    });

    // 3. Alert, Notice, Announcement 結構
    $('.alert, .notice, .warning, .announcement, .info-box, .custom-html, .intro').each((_, el) => {
      const text = $(el).text().trim();
      addUniquePhases(extractSalePhasesFromContent(text, url, 'KKTIX'));
    });

    // 4. Description 與 Meta Tags
    const metaDesc =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';
    const descText = $('.description, #description, .event-description').text().trim();
    addUniquePhases(extractSalePhasesFromContent(metaDesc, url, 'KKTIX'));
    addUniquePhases(extractSalePhasesFromContent(descText, url, 'KKTIX'));

    // 5. 若仍未找到，全 HTML 全文掃描作為最終備援
    if (phases.length === 0) {
      addUniquePhases(extractSalePhasesFromContent(html, url, 'KKTIX'));
    }

    // 按開賣時間排序
    phases.sort((a, b) => new Date(a.saleStart).getTime() - new Date(b.saleStart).getTime());
    return phases;
  }
}
