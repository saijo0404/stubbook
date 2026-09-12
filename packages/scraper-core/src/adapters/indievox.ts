import * as cheerio from 'cheerio';
import { BaseScraperAdapter } from './base';
import { ScrapedEvent, ScrapedSession, TicketTier, TicketStatus, ScrapedSalePhase } from '../types';
import { parseChineseDateTime, extractSalePhasesFromContent } from '../utils/datetime';

export class IndievoxScraperAdapter implements BaseScraperAdapter {
  readonly name = 'IndievoxScraperAdapter';

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.endsWith('indievox.com');
    } catch {
      return false;
    }
  }

  parseHtml(html: string, url: string): ScrapedEvent {
    const $ = cheerio.load(html);

    // 1. 活動標題 (Title)
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('h1.event-title').text().trim() ||
      $('.activity-title').text().trim() ||
      $('h1.title').text().trim() ||
      $('.event-name').text().trim() ||
      $('title').text().trim() ||
      'INDIEVOX 獨立音樂活動';

    title = title.replace(/\s*[-|–|]\s*(INDIEVOX|獨立音樂網).*$/i, '').trim();

    // 2. 海報封面 (Poster)
    const posterUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('.event-poster img, .activity-banner img, .cover-img img, .activity-img img').attr('src') ||
      undefined;

    // 3. 活動介紹文字 (Description)
    const description =
      $('.event-intro').text().trim() ||
      $('.activity-desc').text().trim() ||
      $('.content-wrapper').text().trim() ||
      $('.memo-content').text().trim() ||
      $('meta[property="og:description"]').attr('content') ||
      undefined;

    // 4. 主辦單位 / 演出者
    const fullText = $('body').text();
    let artist: string | undefined =
      $('.performer').text().trim() ||
      $('.artist-name').text().trim() ||
      $('a[href*="/artist/"]').first().text().trim() ||
      undefined;

    let organizer: string | undefined =
      $('.organizer').text().trim() || $('.host-name').text().trim() || undefined;

    if (!organizer) {
      const orgMatch = fullText.match(/主辦單位[：:]\s*([^\n\r；;。]+)/);
      if (orgMatch && orgMatch[1]) {
        organizer = orgMatch[1].trim();
      }
    }

    // 5. 場地與地址 (常見如 Legacy, THE WALL, PIPE, Revolver)
    let defaultVenue =
      $('.event-venue').text().trim() ||
      $('.venue-name').text().trim() ||
      $('a[href*="/venue/"]').first().text().trim() ||
      '';

    let defaultAddress: string | undefined = $('.venue-address').text().trim() || undefined;

    if (!defaultVenue) {
      const venueMatch = fullText.match(/(?:演出場地|演出地點|場地|地點)[：:]\s*([^\n\r；;。]+)/);
      if (venueMatch && venueMatch[1]) {
        defaultVenue = venueMatch[1].trim();
      }
    }
    if (!defaultVenue) {
      defaultVenue = 'Livehouse 音樂展演空間';
    }

    if (!defaultAddress) {
      const addrMatch = fullText.match(/(?:場地地址|演出地址|地址)[：:]\s*([^\n\r；;。]+)/);
      if (addrMatch && addrMatch[1]) {
        defaultAddress = addrMatch[1].trim();
      }
    }

    // 6. 票價階梯 (Ticket Tiers - 預售票、現場票、雙人套票等)
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
      platform: 'INDIEVOX',
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
      '.event-session-list .item, .session-table tbody tr, .schedule-list li, .activity-games-table tr';
    $(selector).each((index, el) => {
      const rowText = $(el).text().trim();
      if (!rowText || (/場次|演期|日期|時間|地點|票價/i.test(rowText) && index === 0)) {
        return;
      }

      let parsedDate: string | null = null;
      let sessionTitle = `第 ${index + 1} 場`;
      let venueText = defaultVenue;

      const dateMatch = parseChineseDateTime(rowText);
      if (dateMatch) {
        parsedDate = dateMatch;
      }

      if (!parsedDate) return;

      // 檢查進場時間 (Doors open)
      let doorsOpenTime: string | undefined;
      const doorsMatch =
        rowText.match(/(?:進場|入場|doors\s*open)[：:]?\s*(\d{1,2}[:：]\d{2})/i) ||
        rowText.match(/(\d{1,2}[:：]\d{2})\s*(?:進場|入場)/i);
      if (doorsMatch && doorsMatch[1]) {
        doorsOpenTime = doorsMatch[1];
      }

      const actionBtn = $(el).find('a, button');
      const actionText = actionBtn.text().trim();
      const status = this.detectStatus(actionText || rowText);

      let bookingUrl: string | undefined;
      const href = actionBtn.attr('href');
      if (href) {
        try {
          bookingUrl = new URL(href, baseUrl).href;
        } catch {
          bookingUrl = baseUrl;
        }
      }

      sessions.push({
        sessionTitle: sessionTitle || `第 ${sessions.length + 1} 場`,
        sessionDate: parsedDate,
        doorsOpenTime,
        venueName: (venueText || defaultVenue).replace(/\s+/g, ' ').trim(),
        venueAddress: defaultAddress,
        ticketPlatform: 'INDIEVOX',
        ticketTiers: globalTiers.map((t) => ({
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
    let doorsOpenTime: string | undefined;

    const dateElementText =
      $('.event-time').text().trim() ||
      $('.date-time').text().trim() ||
      $('.activity-time').text().trim() ||
      $('.session-time').text().trim();

    if (dateElementText) {
      sessionDate = parseChineseDateTime(dateElementText);
      const doorsMatch =
        dateElementText.match(/(?:進場|入場|doors\s*open)[：:]?\s*(\d{1,2}[:：]\d{2})/i) ||
        dateElementText.match(/(\d{1,2}[:：]\d{2})\s*(?:進場|入場)/i);
      if (doorsMatch && doorsMatch[1]) {
        doorsOpenTime = doorsMatch[1];
      }
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
      fallback.setHours(20, 0, 0, 0);
      sessionDate = fallback.toISOString();
    }

    return {
      sessionTitle: '單一場次',
      sessionDate,
      doorsOpenTime,
      venueName: venueName.replace(/\s+/g, ' ').trim(),
      venueAddress,
      ticketPlatform: 'INDIEVOX',
      ticketTiers: globalTiers,
      ticketSaleTime: salePhases[0]?.saleStart,
      bookingUrl: url,
    };
  }

  private extractTicketTiers($: cheerio.CheerioAPI, fullText: string): TicketTier[] {
    const tiers: TicketTier[] = [];
    const seenPrices = new Set<number>();

    // 1. INDIEVOX 票種列表抽樣 (.ticket-type-list, .ticket-tier, table.ticket-table tr)
    $('.ticket-type-list li, .ticket-tier, table.ticket-table tr, .price-row').each((_, el) => {
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

    // 2. 獨立音樂常見關鍵字匹配：預售票、現場票、雙人票
    if (tiers.length === 0) {
      const tierKeywords = [
        { regex: /預售[票票券]?\s*(?:NT\$?|\$)?\s*([\d,]+)/i, defaultName: '預售票' },
        { regex: /現場[票票券]?\s*(?:NT\$?|\$)?\s*([\d,]+)/i, defaultName: '現場票' },
        { regex: /雙人[套票票券]?\s*(?:NT\$?|\$)?\s*([\d,]+)/i, defaultName: '雙人套票' },
        { regex: /早鳥[票票券]?\s*(?:NT\$?|\$)?\s*([\d,]+)/i, defaultName: '早鳥票' },
        { regex: /身障[票票券]?\s*(?:NT\$?|\$)?\s*([\d,]+)/i, defaultName: '愛心票' },
      ];

      for (const kw of tierKeywords) {
        const match = fullText.match(kw.regex);
        if (match && match[1]) {
          const price = parseInt(match[1].replace(/,/g, ''), 10);
          if (!isNaN(price) && price > 0 && !seenPrices.has(price)) {
            seenPrices.add(price);
            tiers.push({
              name: kw.defaultName,
              price,
              currency: 'TWD',
              status: 'AVAILABLE',
            });
          }
        }
      }
    }

    // 3. 一般票價數字提取
    if (tiers.length === 0) {
      const priceBlockMatch = fullText.match(/(?:票價|售價|票券)[：:]\s*([^\n\r]+)/);
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
    const phases = extractSalePhasesFromContent(fullText, url, 'INDIEVOX');
    if (phases.length > 0) return phases;

    const noticeText = $('.ticket-notice, .presale-info, .sale-info').text();
    if (noticeText) {
      const noticePhases = extractSalePhasesFromContent(noticeText, url, 'INDIEVOX');
      if (noticePhases.length > 0) return noticePhases;
    }

    return [];
  }

  private detectStatus(text: string): TicketStatus {
    if (/已售完|完售|sold\s*out/i.test(text)) return 'SOLD_OUT';
    if (/尚未開賣|即將開賣|敬請期待/i.test(text)) return 'NOT_STARTED';
    if (/熱賣中|立即購票|我要購票|選位/i.test(text)) return 'AVAILABLE';
    return 'UNKNOWN';
  }
}
