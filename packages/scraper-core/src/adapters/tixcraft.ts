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
    const parsed = parseChineseDateTime(dateStr, 19, 30);
    if (parsed) return parsed;

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

    // 1. 簡介與警語區塊 (#intro, .activity-intro, .alert, .panel-body)
    $(
      '#intro, .activity-intro, .activity-content, .news-content, .panel-body, .alert, .alert-info, .alert-danger, .alert-warning'
    ).each((_, el) => {
      const text = $(el).text().trim();
      addUniquePhases(extractSalePhasesFromContent(text, url, 'TIXCRAFT'));
    });

    // 2. Meta Tags (description, og:description)
    const metaDesc =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';
    addUniquePhases(extractSalePhasesFromContent(metaDesc, url, 'TIXCRAFT'));

    // 3. 全文備援掃描 (若上述特定區塊未找到開賣時程)
    if (phases.length === 0) {
      addUniquePhases(extractSalePhasesFromContent(html, url, 'TIXCRAFT'));
    }

    // 依開賣時間先後排序
    phases.sort((a, b) => new Date(a.saleStart).getTime() - new Date(b.saleStart).getTime());
    return phases;
  }
}
