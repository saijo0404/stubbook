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

export class TixcraftScraperAdapter implements BaseScraperAdapter {
  readonly name = 'TixcraftScraperAdapter';

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.endsWith('tixcraft.com');
    } catch {
      return false;
    }
  }

  parseHtml(html: string, url: string): ScrapedEvent {
    const $ = cheerio.load(html);

    // 1. 活動名稱 (Title)
    let title =
      $('h2.activity-name').text().trim() ||
      $('.activity-title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title')
        .text()
        .replace(/[-|]\s*tixCraft.*$/i, '')
        .trim() ||
      '拓元售票活動';

    // 2. 海報封面 (Poster)
    const posterUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('.activity-img img, .thumbnail img').attr('src') ||
      undefined;

    // 3. 活動介紹文字 (Description)
    const description =
      $('#intro').text().trim() ||
      $('.activity-intro').text().trim() ||
      $('meta[property="og:description"]').attr('content') ||
      undefined;

    // 4. 解析售票時程 (Sale Phases)
    const salePhases = this.extractSalePhases($, html, url);

    // 5. 解析全場通用的票價階梯 (從說明內文或票價清單提取)
    const globalTiers = this.extractTicketTiers($, html);

    // 6. 解析多場次表格 (#gameList)
    const sessions = this.extractSessions($, url, globalTiers, salePhases);

    return {
      title,
      sourceUrl: url,
      posterUrl,
      description,
      platform: 'TIXCRAFT',
      sessions:
        sessions.length > 0 ? sessions : [this.fallbackSession($, url, globalTiers, salePhases)],
      salePhases,
    };
  }

  private extractSessions(
    $: cheerio.CheerioAPI,
    baseUrl: string,
    globalTiers: TicketTier[],
    salePhases: ScrapedSalePhase[] = []
  ): ScrapedSession[] {
    const sessions: ScrapedSession[] = [];

    // 拓元場次表格通常為 #gameList tbody tr
    $('#gameList tbody tr').each((index, el) => {
      const tds = $(el).find('td');
      if (tds.length === 0) return;

      // 典型欄位：[0] 演出時間 [1] 場次/名稱 [2] 場地 [3] 購買狀態/按鈕
      const dateText = $(tds[0]).text().trim();
      const sessionTitle = $(tds[1]).text().trim() || `第 ${index + 1} 場`;
      const venueText = $(tds[2]).text().trim() || '拓元合作場館';
      const actionBtn = $(tds[3]).find('button, a, input[type="button"]');
      const actionText = $(tds[3]).text().trim();
      const bookingHref = actionBtn.attr('href');

      const parsedDate = this.parseDateString(dateText);
      const status = this.detectStatus(actionText);

      // 複製票價階梯並套用本場次狀態
      const tiers = globalTiers.map((tier) => ({
        ...tier,
        status: status === 'SOLD_OUT' ? 'SOLD_OUT' : tier.status,
      }));

      let fullBookingUrl: string | undefined = undefined;
      if (bookingHref) {
        try {
          fullBookingUrl = new URL(bookingHref, baseUrl).toString();
        } catch {
          fullBookingUrl = bookingHref;
        }
      }

      sessions.push({
        id: `tixcraft-session-${index + 1}`,
        sessionTitle,
        sessionDate: parsedDate,
        venueName: venueText.replace(/\s+/g, ' '),
        ticketPlatform: 'TIXCRAFT',
        ticketTiers: tiers,
        ticketSaleTime: salePhases[0]?.saleStart,
        bookingUrl: fullBookingUrl || baseUrl,
      });
    });

    return sessions;
  }

  private parseDateString(dateStr: string): string {
    // 拓元常見格式：2026/12/05 (六) 19:30 或 2026/08/15 19:00
    const match = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2}).*?(\d{1,2}):(\d{2})/);
    if (match) {
      const [_, y, m, d, hh, mm] = match;
      const isoStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00+08:00`;
      const dt = new Date(isoStr);
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }

    const fallbackMatch = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (fallbackMatch) {
      const [_, y, m, d] = fallbackMatch;
      const dt = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T19:30:00+08:00`);
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }

    return new Date().toISOString();
  }

  private detectStatus(text: string): TicketStatus {
    if (text.includes('售完') || text.includes('完售') || text.includes('Sold out')) {
      return 'SOLD_OUT';
    }
    if (text.includes('尚未開賣') || text.includes('即將開賣')) {
      return 'NOT_STARTED';
    }
    if (text.includes('立即購票') || text.includes('立即訂購') || text.includes('選購')) {
      return 'AVAILABLE';
    }
    return 'UNKNOWN';
  }

  private extractTicketTiers($: cheerio.CheerioAPI, html: string): TicketTier[] {
    const tiers: TicketTier[] = [];

    // 拓元常見票價描述：票　　價：NT$5880 / 4880 / 3880 / 2880 / 1880 / 800
    const priceLineRegex = /(?:票\s*價|票\s*種)[：:]\s*([^\n\r]+)/gi;
    const matches = html.match(priceLineRegex);

    if (matches && matches.length > 0) {
      for (const line of matches) {
        const prices = line.replace(/,/g, '').match(/\d{3,5}/g);
        if (prices) {
          prices.forEach((p) => {
            const priceNum = parseInt(p, 10);
            if (priceNum >= 100 && !tiers.some((t) => t.price === priceNum)) {
              tiers.push({
                name: `NT$ ${priceNum.toLocaleString()}`,
                price: priceNum,
                currency: 'TWD',
                status: 'AVAILABLE',
              });
            }
          });
        }
      }
    }

    // 遞減排序票價
    tiers.sort((a, b) => b.price - a.price);

    return tiers;
  }

  private fallbackSession(
    $: cheerio.CheerioAPI,
    url: string,
    tiers: TicketTier[],
    salePhases: ScrapedSalePhase[] = []
  ): ScrapedSession {
    return {
      sessionTitle: '單一場次',
      sessionDate: new Date().toISOString(),
      venueName: $('.venue').text().trim() || '拓元活動場館',
      ticketPlatform: 'TIXCRAFT',
      ticketTiers: tiers,
      ticketSaleTime: salePhases[0]?.saleStart,
      bookingUrl: url,
    };
  }

  private extractSalePhases($: cheerio.CheerioAPI, html: string, url: string): ScrapedSalePhase[] {
    const phases: ScrapedSalePhase[] = [];

    // 拓元常見售票時間描述：
    // 售票時間：2026/09/10 (四) 12:00 國泰世華CUBE卡友優先購票
    // 售票時間：2026/09/12 (六) 12:00 拓元售票系統全面開賣
    const saleLineRegex =
      /(?:售票時間|開賣時間|啟售時間|預售時間|優先購票|會員預購|登記抽票|全面開賣)[：:]\s*([^\n\r<]+)/gi;
    const matches = html.match(saleLineRegex);

    if (matches) {
      for (const match of matches) {
        const phase = this.parseSalePhaseText(match, url);
        if (
          phase &&
          !phases.some((p) => p.phaseName === phase.phaseName && p.saleStart === phase.saleStart)
        ) {
          phases.push(phase);
        }
      }
    }

    return phases;
  }

  private parseSalePhaseText(text: string, url: string): ScrapedSalePhase | null {
    // 匹配日期與時間：2026/09/10 (四) 12:00 或 2026-09-10 12:00
    const match = text.match(
      /(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[^\d]*?(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (!match) return null;

    const [_, y, m, d, hh = '12', mm = '00', ss = '00'] = match;
    const isoStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}+08:00`;
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return null;

    let saleType: SaleType = 'GENERAL';
    if (
      text.includes('優先') ||
      text.includes('會員') ||
      text.includes('預購') ||
      text.includes('卡友') ||
      text.includes('先行')
    ) {
      saleType = 'PRESALE';
    } else if (text.includes('抽票') || text.includes('登記') || text.includes('抽選')) {
      saleType = 'LOTTERY';
    } else if (text.includes('清票') || text.includes('釋票')) {
      saleType = 'RERELEASE';
    }

    // 階段名稱判定
    let phaseName = '拓元全面開賣';
    const stripped = text
      .replace(
        /(?:售票時間|開賣時間|啟售時間|預售時間|優先購票|會員預購|登記抽票|全面開賣)[：:]\s*/i,
        ''
      )
      .replace(
        /(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s*\([^\)]+\))?\s*(?:\d{1,2}:\d{2}(?::\d{2})?)?/,
        ''
      )
      .trim();

    if (stripped) {
      phaseName = stripped;
    } else if (saleType === 'PRESALE') {
      phaseName = '拓元會員/優先預購';
    } else if (saleType === 'LOTTERY') {
      phaseName = '拓元實名制登記抽票';
    }

    return {
      phaseName,
      saleType,
      saleStart: dt.toISOString(),
      ticketingPlatform: 'TIXCRAFT',
      bookingUrl: url,
      eligibilityNotes: text.replace(/\s+/g, ' ').trim(),
      isLottery: saleType === 'LOTTERY',
    };
  }
}
