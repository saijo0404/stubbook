import * as cheerio from 'cheerio';
import { BaseScraperAdapter } from './base';
import { ScrapedEvent, ScrapedSession, TicketTier, TicketStatus, ScrapedSalePhase } from '../types';
import { parseChineseDateTime, extractSalePhasesFromContent } from '../utils/datetime';

export class KhamScraperAdapter implements BaseScraperAdapter {
  readonly name = 'KhamScraperAdapter';

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.endsWith('kham.com.tw');
    } catch {
      return false;
    }
  }

  parseHtml(html: string, url: string): ScrapedEvent {
    const $ = cheerio.load(html);

    // 1. 活動標題 (Title)
    let title =
      $('#ctl00_ContentPlaceHolder1_lblPRODUCT_NAME').text().trim() ||
      $('.product-name').text().trim() ||
      $('.event-title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('h1.title').text().trim() ||
      $('title').text().trim() ||
      '寬宏售票活動';

    title = title.replace(/\s*[-|–|]\s*(寬宏售票|寬宏藝術|Kham\s*Ticketing).*$/i, '').trim();

    // 2. 海報封面 (Poster)
    const posterSrc =
      $('#ctl00_ContentPlaceHolder1_imgPRODUCT').attr('src') ||
      $('.product-image img, .poster img, .event-img img').attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      undefined;

    let posterUrl: string | undefined = posterSrc;
    if (posterUrl && !posterUrl.startsWith('http')) {
      try {
        posterUrl = new URL(posterUrl, url).href;
      } catch {
        // preserve
      }
    }

    // 3. 活動介紹文字 (Description)
    const description =
      $('#ctl00_ContentPlaceHolder1_lblINTRODUCTION').text().trim() ||
      $('.intro-content').text().trim() ||
      $('.event-description').text().trim() ||
      $('.detail-desc').text().trim() ||
      $('meta[property="og:description"]').attr('content') ||
      undefined;

    // 4. 主辦單位 / 演出者
    const fullText = $('body').text();
    let organizer: string | undefined =
      $('#ctl00_ContentPlaceHolder1_lblSPONSOR').text().trim() ||
      $('.organizer').text().trim() ||
      undefined;

    if (!organizer) {
      const orgMatch = fullText.match(/主辦單位[：:]\s*([^\n\r；;。]+)/);
      if (orgMatch && orgMatch[1]) {
        organizer = orgMatch[1].trim();
      }
    }

    let artist: string | undefined =
      $('#ctl00_ContentPlaceHolder1_lblACTOR').text().trim() || undefined;

    if (!artist) {
      const artistMatch = fullText.match(/(?:演出者|藝人|主演|表演團體)[：:]\s*([^\n\r；;。]+)/);
      if (artistMatch && artistMatch[1]) {
        artist = artistMatch[1].trim();
      }
    }

    // 5. 預設場館與地址
    let defaultVenue =
      $('#ctl00_ContentPlaceHolder1_lblPLACE').text().trim() ||
      $('.venue-name').text().trim() ||
      '';

    let defaultAddress: string | undefined = undefined;

    if (!defaultVenue) {
      const venueMatch = fullText.match(/(?:演出地點|活動地點|地點|場地)[：:]\s*([^\n\r；;。]+)/);
      if (venueMatch && venueMatch[1]) {
        defaultVenue = venueMatch[1].trim();
      }
    }
    if (!defaultVenue) {
      defaultVenue = '寬宏展演合作場館';
    }

    const addrMatch = fullText.match(/(?:演出地址|場館地址|地址)[：:]\s*([^\n\r；;。]+)/);
    if (addrMatch && addrMatch[1]) {
      defaultAddress = addrMatch[1].trim();
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
      platform: 'KHAM',
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

    // 寬宏常見表格：#ctl00_ContentPlaceHolder1_gvPERFORMANCE tr, .performance-table tr, .session-table tr
    const selector =
      '#ctl00_ContentPlaceHolder1_gvPERFORMANCE tr, table.performance-table tr, .session-table tbody tr, .schedule-list tr';
    $(selector).each((index, el) => {
      const tds = $(el).find('td');
      if (tds.length === 0) return;

      const rowText = $(el).text().trim();
      if (
        !rowText ||
        (/場次|演期|日期|時間|地點|票價|訂購/i.test($(tds[0]).text().trim()) &&
          tds.length > 1 &&
          index === 0)
      ) {
        return;
      }

      // 搜尋包含日期時間的欄位
      let parsedDate: string | null = null;
      let dateText = '';
      let sessionTitle = `第 ${index} 場`;
      let venueText = defaultVenue;

      for (let i = 0; i < tds.length; i++) {
        const text = $(tds[i]).text().trim();
        const tryDate = parseChineseDateTime(text);
        if (tryDate) {
          parsedDate = tryDate;
          dateText = text;
          break;
        }
      }

      if (!parsedDate) return;

      // 若有場次名稱或場館
      if (tds.length >= 3) {
        const candidateVenue = $(tds[1]).text().trim();
        if (candidateVenue && !parseChineseDateTime(candidateVenue)) {
          venueText = candidateVenue;
        }
      }

      const actionBtn = $(el).find('a, button, input[type="button"], input[type="submit"]');
      const actionText =
        actionBtn.length > 0 ? actionBtn.val() || actionBtn.text() : $(tds[tds.length - 1]).text();
      const status = this.detectStatus(String(actionText || ''));

      let bookingUrl: string | undefined;
      const href = actionBtn.attr('href');
      if (href) {
        try {
          bookingUrl = new URL(href, baseUrl).href;
        } catch {
          bookingUrl = baseUrl;
        }
      }

      // 檢查本行票價
      let rowTiers = globalTiers;
      const priceMatches = rowText.match(/(?:NT\$?|\$)?\s*(\d{3,5})/g);
      if (priceMatches && priceMatches.length > 0) {
        const prices = Array.from(
          new Set(
            priceMatches
              .map((p) => parseInt(p.replace(/[^\d]/g, ''), 10))
              .filter((n) => !isNaN(n) && n >= 200)
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
        ticketPlatform: 'KHAM',
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
      $('#ctl00_ContentPlaceHolder1_lblPLAY_DATE').text().trim() ||
      $('#ctl00_ContentPlaceHolder1_lblDATE').text().trim() ||
      $('.play-date').text().trim() ||
      $('.event-date').text().trim();

    if (dateElementText) {
      sessionDate = parseChineseDateTime(dateElementText);
    }

    if (!sessionDate) {
      const dateMatch = fullText.match(/(?:演出日期|演出時間|演期|活動時間)[：:]\s*([^\n\r；;]+)/);
      if (dateMatch && dateMatch[1]) {
        sessionDate = parseChineseDateTime(dateMatch[1]);
      }
    }

    if (!sessionDate) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 30);
      fallback.setHours(19, 30, 0, 0);
      sessionDate = fallback.toISOString();
    }

    return {
      sessionTitle: '單一場次',
      sessionDate,
      venueName: venueName.replace(/\s+/g, ' ').trim(),
      venueAddress,
      ticketPlatform: 'KHAM',
      ticketTiers: globalTiers,
      ticketSaleTime: salePhases[0]?.saleStart,
      bookingUrl: url,
    };
  }

  private extractTicketTiers($: cheerio.CheerioAPI, fullText: string): TicketTier[] {
    const tiers: TicketTier[] = [];
    const seenPrices = new Set<number>();

    // 寬宏特定價格欄位
    const priceText =
      $('#ctl00_ContentPlaceHolder1_lblPRICE').text().trim() || $('.price-list').text().trim();

    const parseFromText = (str: string) => {
      const nums = str.match(/\d[\d,]*/g);
      if (nums) {
        for (const num of nums) {
          const price = parseInt(num.replace(/,/g, ''), 10);
          if (!isNaN(price) && price >= 200 && !seenPrices.has(price)) {
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
    };

    if (priceText) {
      parseFromText(priceText);
    }

    if (tiers.length === 0) {
      const priceBlockMatch = fullText.match(/(?:票價|票券售價)[：:]\s*([^\n\r]+)/);
      if (priceBlockMatch && priceBlockMatch[1]) {
        parseFromText(priceBlockMatch[1]);
      }
    }

    return tiers.sort((a, b) => b.price - a.price);
  }

  private extractSalePhases(
    $: cheerio.CheerioAPI,
    fullText: string,
    url: string
  ): ScrapedSalePhase[] {
    const phases = extractSalePhasesFromContent(fullText, url, 'KHAM');
    if (phases.length > 0) return phases;

    const preSaleText = $('#ctl00_ContentPlaceHolder1_lblPRE_SALE').text().trim();
    if (preSaleText) {
      const presalePhases = extractSalePhasesFromContent(preSaleText, url, 'KHAM');
      if (presalePhases.length > 0) return presalePhases;
    }

    return [];
  }

  private detectStatus(text: string): TicketStatus {
    if (/售完|全數售罄|sold\s*out/i.test(text)) return 'SOLD_OUT';
    if (/尚未啟售|未開賣|即將啟售/i.test(text)) return 'NOT_STARTED';
    if (/立即訂購|購票|熱賣/i.test(text)) return 'AVAILABLE';
    return 'UNKNOWN';
  }
}
