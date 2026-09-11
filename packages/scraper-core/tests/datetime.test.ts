import { describe, it, expect } from 'vitest';
import {
  normalizeChineseText,
  parseChineseDateTime,
  extractSalePhasesFromContent,
} from '../src/utils/datetime';

describe('Chinese DateTime & Sale Phase Parser', () => {
  describe('normalizeChineseText', () => {
    it('應能將全形字元、全形標點、全形空白轉為標準半形字元', () => {
      const input = '２０２６／０９／１０　（四）　１２：００　啟售－搶票';
      const output = normalizeChineseText(input);
      expect(output).toBe('2026/09/10 (四) 12:00 啟售-搶票');
    });

    it('應能濾除 HTML 標籤並壓縮連續空白', () => {
      const input = '<div class="alert"><strong>售票時間：</strong>  2026/10/01 12:00</div>';
      const output = normalizeChineseText(input);
      expect(output).toBe('售票時間: 2026/10/01 12:00');
    });
  });

  describe('parseChineseDateTime', () => {
    it('應正確解析包含星期符號之日期時間格式', () => {
      // 2026/09/10 (四) 12:00 -> 台北時間中午 12:00，對應 UTC 04:00
      const d1 = parseChineseDateTime('2026/09/10 (四) 12:00');
      expect(d1).toBe('2026-09-10T04:00:00.000Z');

      // 2026/09/10(四) 12:00 (無空格括號)
      const d2 = parseChineseDateTime('2026/09/10(四) 12:00');
      expect(d2).toBe(d1);

      // 2026年9月10日 (週四) 12:00
      const d3 = parseChineseDateTime('2026年9月10日 (週四) 12:00');
      expect(d3).toBe(d1);

      // 2026.09.10 (星期四) 12:00
      const d4 = parseChineseDateTime('2026.09.10 (星期四) 12:00');
      expect(d4).toBe(d1);

      // 2026-09-10（四）12:00 (全形括號)
      const d5 = parseChineseDateTime('2026-09-10（四）12:00');
      expect(d5).toBe(d1);
    });

    it('應正確解析中文時制 (中午、下午、晚上、上午)', () => {
      // 中午 12:00 -> UTC 04:00
      const noon = parseChineseDateTime('2026/09/10 (四) 中午 12:00');
      expect(noon).toBe('2026-09-10T04:00:00.000Z');

      // 中午12點 -> UTC 04:00
      const noonChinese = parseChineseDateTime('2026/09/10 (四) 中午12點');
      expect(noonChinese).toBe('2026-09-10T04:00:00.000Z');

      // 下午 1:00 -> 13:00 -> UTC 05:00
      const pm1 = parseChineseDateTime('2026/09/10 (四) 下午 1:00');
      expect(pm1).toBe('2026-09-10T05:00:00.000Z');

      // 下午 13:00 -> 13:00 -> UTC 05:00
      const pm13 = parseChineseDateTime('2026/09/10 (四) 下午 13:00');
      expect(pm13).toBe('2026-09-10T05:00:00.000Z');

      // 晚上 7:30 -> 19:30 -> UTC 11:30
      const night = parseChineseDateTime('2026/09/10 (四) 晚上 7:30');
      expect(night).toBe('2026-09-10T11:30:00.000Z');

      // 晚上7點半 -> 19:30 -> UTC 11:30
      const nightHalf = parseChineseDateTime('2026/09/10 (四) 晚上7點半');
      expect(nightHalf).toBe('2026-09-10T11:30:00.000Z');

      // 上午 11:00 -> 11:00 -> UTC 03:00
      const morning = parseChineseDateTime('2026/09/10 (四) 上午 11:00');
      expect(morning).toBe('2026-09-10T03:00:00.000Z');
    });

    it('全形數字與符號混雜時應能精準解析', () => {
      const raw = '２０２６年０９月１０日（週四）中午１２：００';
      const parsed = parseChineseDateTime(raw);
      expect(parsed).toBe('2026-09-10T04:00:00.000Z');
    });

    it('未指定時間時應使用預設時間', () => {
      const dateOnly = parseChineseDateTime('2026/09/10', 12, 0);
      expect(dateOnly).toBe('2026-09-10T04:00:00.000Z');
    });
  });

  describe('extractSalePhasesFromContent', () => {
    const url = 'https://tixcraft.com/activity/detail/26_TEST';

    it('應能從包含中文標點、全形符號與說明的多行文字中提取多個售票階段', () => {
      const text = `
        演出地點：台北小巨蛋
        售票時間：2026/09/10 (四) 中午12:00 國泰世華CUBE卡友優先購票
        開賣時間：2026/09/12 (六) 中午12:00 拓元售票系統全面開賣
        清票時間：2026/09/12 (六) 下午15:00 系統釋票
      `;

      const phases = extractSalePhasesFromContent(text, url, 'TIXCRAFT');
      expect(phases).toHaveLength(3);

      expect(phases[0].saleType).toBe('PRESALE');
      expect(phases[0].phaseName).toContain('國泰世華CUBE卡友優先購票');
      expect(phases[0].saleStart).toBe('2026-09-10T04:00:00.000Z');

      expect(phases[1].saleType).toBe('GENERAL');
      expect(phases[1].phaseName).toContain('拓元售票系統全面開賣');
      expect(phases[1].saleStart).toBe('2026-09-12T04:00:00.000Z');

      expect(phases[2].saleType).toBe('RERELEASE');
      expect(phases[2].phaseName).toContain('系統釋票');
      expect(phases[2].saleStart).toBe('2026-09-12T07:00:00.000Z');
    });

    it('應能精準識別抽票/抽選/登記抽票 (LOTTERY)', () => {
      const text = '登記抽票時間：2026/10/05 (一) 10:00 官方會員實名制抽票登記';
      const phases = extractSalePhasesFromContent(text, url, 'KKTIX');

      expect(phases).toHaveLength(1);
      expect(phases[0].saleType).toBe('LOTTERY');
      expect(phases[0].isLottery).toBe(true);
      expect(phases[0].phaseName).toContain('官方會員實名制抽票登記');
    });

    it('應能解析時間在日期前方之字串與民國年 (Issue #48)', () => {
      // 時間在日期前方
      const beforeDate = parseChineseDateTime('中午12:00 2026/05/10');
      expect(beforeDate).toBe('2026-05-10T04:00:00.000Z');

      // 民國年支援 (115年 = 2026年)
      const roc = parseChineseDateTime('民國115年5月10日 12:00');
      expect(roc).toBe('2026-05-10T04:00:00.000Z');
    });

    it('應能處理粗括號【】與中英雙語售票關鍵字 (Issue #48)', () => {
      const text = `
        【售票時間】2026/05/10 (日) 中午12:00 全面開賣
        【優先購票】2026/05/09 (六) 上午10:00 卡友優先預購
        Ticket On Sale: 2026/06/01 12:00 General Sale
      `;
      const phases = extractSalePhasesFromContent(text, url, 'KKTIX');
      expect(phases.length).toBeGreaterThanOrEqual(3);

      expect(phases[0].saleType).toBe('PRESALE');
      expect(phases[0].phaseName).toContain('卡友優先預購');

      expect(phases[1].saleType).toBe('GENERAL');
      expect(phases[1].phaseName).toContain('全面開賣');

      expect(phases[2].saleStart).toBe('2026-06-01T04:00:00.000Z');
    });
  });
});
