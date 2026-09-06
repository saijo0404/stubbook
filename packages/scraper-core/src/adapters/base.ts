import { ScrapedEvent } from '../types';

export interface BaseScraperAdapter {
  readonly name: string;
  /**
   * 檢查此適配器是否支援解析該網址
   */
  canHandle(url: string): boolean;

  /**
   * 解析 HTML 內容並輸出結構化活動資料
   */
  parseHtml(html: string, url: string): Promise<ScrapedEvent> | ScrapedEvent;
}
