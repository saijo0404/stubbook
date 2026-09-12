import * as cheerio from 'cheerio';
import { BaseScraperAdapter } from './base';
import { ScrapedEvent, ScrapedSession, TicketTier, TicketStatus, ScrapedSalePhase } from '../types';
import { parseChineseDateTime, extractSalePhasesFromContent } from '../utils/datetime';

export class FamiTicketScraperAdapter implements BaseScraperAdapter {
  readonly name = 'FamiTicketScraperAdapter';

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.endsWith('famiticket.com.tw');
    } catch {
      return false;
    }
  }

  parseHtml(html: string, url: string): ScrapedEvent {
    const $ = cheerio.load(html);

    // 1. 活動標題 (Title)
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('.activity-info h1').text().trim() ||
      $('.act-title').text().trim() ||
      $('h1.title').text().trim() ||
      $('h2.title').text().trim() ||
      $('.activity-title').text().trim() ||
      $('title').text().trim() ||
      'FamiTicket 活動';

    title = title.replace(/\s*[-|–]\s*(全網購票網|FamiTicket|全家便利商店).*$/i, '').trim();

    // 2. 海報封面 (Poster)
    const posterUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('.activity-img img, .act-banner img, .poster img, .cover-img img').attr('src') ||
      undefined;

    // 3. 活動介紹文字 (Description)
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('.act-desc').text().trim() ||
      $('.activity-intro').text().trim() ||
      $('.content-box').text().trim() ||
      $('.event-description').text().trim() ||
      undefined;

    // 4. 主辦單位 / 演出者
    const fullText = $('body').text();
    let organizer: string | undefined =
      $('.organizer').text().trim() || $('.sponsor-box').text().trim() || undefined;

    if (!organizer) {
      const orgMatch = fullText.match(/主辦單位[：:]\s*([^\n\r；;。]+)/);
      if (orgMatch && orgMatch[1]) {
        organizer = orgMatch[1].trim();
      }
    }

    let artist: string | undefined;
    const artistMatch = fullText.match(/(?:演出者|藝人|表演者|演出團體)[：:]\s*([^\n\r；;。]+)/);
    if (artistMatch && artistMatch[1]) {
      artist = artistMatch[1].trim();
    }

    // 5. 場地與地址
    let defaultVenue =
      $('.venue-name').text().trim() ||
      $('.act-location').text().trim() ||
      $('.place').text().trim() ||
      '';

    let defaultAddress: string | undefined = $('.venue-address').text().trim() || undefined;

    if (!defaultVenue) {
      const venueMatch = fullText.match(/(?:演出地點|活動地點|地點|場地)[：:]\s*([^\n\r；;。]+)/);
      if (venueMatch && venueMatch[1]) {
        defaultVenue = venueMatch[1].trim();
      }
    }
    if (!defaultAddress) {
      const addrMatch = fullText.match(/(?:演出地址|活動地址|地址)[：:]\s*([^\n\r；;。]+)/);
      if (addrMatch && addrMatch[1]) {
        defaultAddress = addrMatch[1].trim();
      }
    }
    if (!defaultVenue) {
      defaultVenue = '全網購票網合作場館';
    }

    // 6. 票價階梯 (Ticket Tiers)
    const globalTiers = this.extractTicketTiers($, fullText);

    // 7. 售票時程 (Sale Phases)
    const salePhases = this.extractSalePhases($, fullText, url);

    // 8. 多場次解析 (Sessions)
    const sessions = this.extractSessions(
      $,
      url,
      defaultVenue,
      defaultAddress,
      globalTiers,
      salePhases
    );

    return {
      title,
      artist: artist || organizer,
      sourceUrl: url,
      posterUrl,
      description,
      organizer,
      platform: 'FAMITICKET',
      sessions:
        sessions.length > 0
          ? sessions
          : [
              this.fallbackSession(
                $,
                url,
                fullText,
                defaultVenue,
                defaultAddress,
                globalTiers,
                salePhases
              ),
            ],
      salePhases,
    };
  }

  private extractSessions(
    $: cheerio.CheerioAPI,
    baseUrl: string,
    defaultVenue: string,
    defaultAddress: string | undefined,
    globalTiers: TicketTier[],
    salePhases: ScrapedSalePhase[]
  ): ScrapedSession[] {
    const sessions: ScrapedSession[] = [];

    const selector =
      '.session-table tbody tr, .game-item, .event-session-row, .table tbody tr, table.schedule-table tbody tr';
    $(selector).each((index, el) => {
      const tds = $(el).find('td');
      if (tds.length === 0) return;

      const rowText = $(el).text().trim();
      if (
        !rowText ||
        (/場次|日期|時間|地點|票價|購買/i.test($(tds[0]).text().trim()) &&
          tds.length > 1 &&
          index === 0)
      ) {
        return;
      }

      let dateText = $(tds[0]).text().trim();
      let sessionTitle = tds.length > 1 ? $(tds[1]).text().trim() : `第 ${index + 1} 場`;
      let venueText = tds.length > 2 ? $(tds[2]).text().trim() : defaultVenue;
      let actionCell = tds.length > 3 ? $(tds[3]) : $(tds[tds.length - 1]);

      let parsedDate = parseChineseDateTime(dateText);
      if (!parsedDate && tds.length > 1) {
        for (let i = 1; i < tds.length; i++) {
          const tryDate = parseChineseDateTime($(tds[i]).text().trim());
          if (tryDate) {
            parsedDate = tryDate;
            break;
          }
        }
      }

      if (!parsedDate) return;

      const actionText = actionCell.text().trim();
      const actionBtn = actionCell.find('a, button, input[type="button"]');
      let bookingUrl = actionBtn.attr('href');
      if (bookingUrl && !bookingUrl.startsWith('http')) {
        try {
          bookingUrl = new URL(bookingUrl, baseUrl).href;
        } catch {
          bookingUrl = baseUrl;
        }
      }

      const status = this.detectStatus(actionText);

      // 檢查本行是否有特製票價
      let rowTiers = globalTiers;
      const rowPriceMatch = rowText.match(/(?:NT\$?|\$)\s*([\d,]+)/g);
      if (rowPriceMatch && rowPriceMatch.length > 0) {
        const prices = Array.from(
          new Set(
            rowPriceMatch
              .map((p) => parseInt(p.replace(/[^\d]/g, ''), 10))
              .filter((n) => !isNaN(n) && n > 0)
          )
        ).sort((a, b) => b - a);

        if (prices.length > 0) {
          rowTiers = prices.map((price) => ({
            name: `${price} 元`,
            price,
            currency: 'TWD',
            status,
          }));
        }
      }

      sessions.push({
        sessionTitle: sessionTitle || `第 ${sessions.length + 1} 場`,
        sessionDate: parsedDate,
        venueName: (venueText || defaultVenue).replace(/\s+/g, ' ').trim(),
        venueAddress: defaultAddress,
        ticketPlatform: 'FAMITICKET',
        ticketTiers: rowTiers.map((t) => ({
          ...t,
          status: status === 'SOLD_OUT' ? 'SOLD_OUT' : t.status,
        })),
        ticketSaleTime: salePhases[0]?.saleStart,
        bookingUrl: bookingUrl || baseUrl,
      });
    });

    return sessions;
  }

  private fallbackSession(
    $: cheerio.CheerioAPI,
    url: string,
    fullText: string,
    venueName: string,
    venueAddress: string | undefined,
    globalTiers: TicketTier[],
    salePhases: ScrapedSalePhase[]
  ): ScrapedSession {
    let sessionDate: string | null = null;

    const dateElementText =
      $('.act-date').text().trim() ||
      $('.event-time').text().trim() ||
      $('.date-time').text().trim() ||
      $('.session-date').text().trim();

    if (dateElementText) {
      sessionDate = parseChineseDateTime(dateElementText);
    }

    if (!sessionDate) {
      const dateMatch = fullText.match(
        /(?:演出時間|活動時間|演出日期|日期|時間)[：:]\s*([^\n\r；;]+)/
      );
      if (dateMatch && dateMatch[1]) {
        sessionDate = parseChineseDateTime(dateMatch[1]);
      }
    }

    if (!sessionDate) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 30);
      fallback.setHours(19, 0, 0, 0);
      sessionDate = fallback.toISOString();
    }

    return {
      sessionTitle: '單一場次',
      sessionDate,
      venueName: venueName.replace(/\s+/g, ' ').trim(),
      venueAddress,
      ticketPlatform: 'FAMITICKET',
      ticketTiers: globalTiers,
      ticketSaleTime: salePhases[0]?.saleStart,
      bookingUrl: url,
    };
  }

  private extractTicketTiers($: cheerio.CheerioAPI, fullText: string): TicketTier[] {
    const tiers: TicketTier[] = [];
    const seenPrices = new Set<number>();

    // 1. 表格抽樣
    $(
      '.price-table tr, .ticket-table tr, .price-list li, .ticket-zone tr, .price-table div, .price-row'
    ).each((_, el) => {
      const text = $(el).text().trim();
      const match = text.match(/(?:NT\$?|\$)\s*([\d,]+)/);
      if (match && match[1]) {
        const price = parseInt(match[1].replace(/,/g, ''), 10);
        if (!isNaN(price) && price > 0 && !seenPrices.has(price)) {
          seenPrices.add(price);
          const name = text.replace(/(?:NT\$?|\$)\s*[\d,]+.*$/i, '').trim() || `${price} 元`;
          tiers.push({
            name: name.replace(/[:：]/g, '').trim(),
            price,
            currency: 'TWD',
            status: this.detectStatus(text),
          });
        }
      }
    });

    // 2. 內文正則搜尋
    if (tiers.length === 0) {
      const priceBlockMatch = fullText.match(/(?:票價|售價|全票|分區票價)[：:]\s*([^\n\r]+)/);
      if (priceBlockMatch && priceBlockMatch[1]) {
        const numberMatches = priceBlockMatch[1].match(/\d[\d,]*/g);
        if (numberMatches) {
          for (const numStr of numberMatches) {
            const price = parseInt(numStr.replace(/,/g, ''), 10);
            if (!isNaN(price) && price >= 100 && !seenPrices.has(price)) {
              seenPrices.add(price);
              tiers.push({
                name: `${price} 元`,
                price,
                currency: 'TWD',
                status: 'AVAILABLE',
              });
            }
          }
        }
      }
    }

    return tiers.sort((a, b) => b.price - a.price);
  }

  private extractSalePhases(
    $: cheerio.CheerioAPI,
    fullText: string,
    url: string
  ): ScrapedSalePhase[] {
    const phases = extractSalePhasesFromContent(fullText, url, 'FAMITICKET');
    if (phases.length > 0) return phases;

    const noticeText = $('.sale-time-info, .ticket-notice, .famiport-notice').text();
    if (noticeText) {
      const noticePhases = extractSalePhasesFromContent(noticeText, url, 'FAMITICKET');
      if (noticePhases.length > 0) return noticePhases;
    }

    return [];
  }

  private detectStatus(text: string): TicketStatus {
    if (/已售完|售罄|sold\s*out/i.test(text)) return 'SOLD_OUT';
    if (/尚未開賣|即將開賣|敬請期待|not\s*yet/i.test(text)) return 'NOT_STARTED';
    if (/熱賣中|立即購票|選位|尚有票券/i.test(text)) return 'AVAILABLE';
    return 'UNKNOWN';
  }
}
