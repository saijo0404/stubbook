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
      // 2026/09/10 (四) 12:00
      const d1 = parseChineseDateTime('2026/09/10 (四) 12:00');
      expect(d1).not.toBeNull();
      const dt1 = new Date(d1!);
      expect(dt1.getFullYear()).toBe(2026);
      expect(dt1.getMonth()).toBe(8); // 9月 (0-based)
      expect(dt1.getDate()).toBe(10);
      expect(dt1.getHours()).toBe(12);

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
      // 中午 12:00
      const noon = parseChineseDateTime('2026/09/10 (四) 中午 12:00');
      expect(new Date(noon!).getHours()).toBe(12);

      // 中午12點
      const noonChinese = parseChineseDateTime('2026/09/10 (四) 中午12點');
      expect(new Date(noonChinese!).getHours()).toBe(12);
      expect(new Date(noonChinese!).getMinutes()).toBe(0);

      // 下午 1:00 -> 13:00
      const pm1 = parseChineseDateTime('2026/09/10 (四) 下午 1:00');
      expect(new Date(pm1!).getHours()).toBe(13);

      // 下午 13:00 -> 13:00
      const pm13 = parseChineseDateTime('2026/09/10 (四) 下午 13:00');
      expect(new Date(pm13!).getHours()).toBe(13);

      // 晚上 7:30 -> 19:30
      const night = parseChineseDateTime('2026/09/10 (四) 晚上 7:30');
      expect(new Date(night!).getHours()).toBe(19);
      expect(new Date(night!).getMinutes()).toBe(30);

      // 晚上7點半 -> 19:30
      const nightHalf = parseChineseDateTime('2026/09/10 (四) 晚上7點半');
      expect(new Date(nightHalf!).getHours()).toBe(19);
      expect(new Date(nightHalf!).getMinutes()).toBe(30);

      // 上午 11:00 -> 11:00
      const morning = parseChineseDateTime('2026/09/10 (四) 上午 11:00');
      expect(new Date(morning!).getHours()).toBe(11);
    });

    it('全形數字與符號混雜時應能精準解析', () => {
      const raw = '２０２６年０９月１０日（週四）中午１２：００';
      const parsed = parseChineseDateTime(raw);
      expect(parsed).not.toBeNull();
      const dt = new Date(parsed!);
      expect(dt.getFullYear()).toBe(2026);
      expect(dt.getMonth()).toBe(8);
      expect(dt.getDate()).toBe(10);
      expect(dt.getHours()).toBe(12);
    });

    it('未指定時間時應使用預設時間', () => {
      const dateOnly = parseChineseDateTime('2026/09/10', 12, 0);
      expect(new Date(dateOnly!).getHours()).toBe(12);
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
      expect(new Date(phases[0].saleStart).getDate()).toBe(10);
      expect(new Date(phases[0].saleStart).getHours()).toBe(12);

      expect(phases[1].saleType).toBe('GENERAL');
      expect(phases[1].phaseName).toContain('拓元售票系統全面開賣');
      expect(new Date(phases[1].saleStart).getDate()).toBe(12);
      expect(new Date(phases[1].saleStart).getHours()).toBe(12);

      expect(phases[2].saleType).toBe('RERELEASE');
      expect(phases[2].phaseName).toContain('系統釋票');
      expect(new Date(phases[2].saleStart).getHours()).toBe(15);
    });

    it('應能精準識別抽票/抽選/登記抽票 (LOTTERY)', () => {
      const text = '登記抽票時間：2026/10/05 (一) 10:00 官方會員實名制抽票登記';
      const phases = extractSalePhasesFromContent(text, url, 'KKTIX');

      expect(phases).toHaveLength(1);
      expect(phases[0].saleType).toBe('LOTTERY');
      expect(phases[0].isLottery).toBe(true);
      expect(phases[0].phaseName).toContain('官方會員實名制抽票登記');
    });
  });
});
