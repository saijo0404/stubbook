import { ScrapedSalePhase, SaleType, TicketPlatform } from '../types';

/**
 * 將文字中的全形字元、全形標點與全形空白轉換為標準半形字元
 */
export function normalizeChineseText(input: string): string {
  if (!input) return '';

  return (
    input
      // 全形空白轉半形空白
      .replace(/\u3000/g, ' ')
      // 全形數字 ０-９ 轉半形 0-9
      .replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      // 全形英文 Ａ-Ｚ, ａ-ｚ 轉半形
      .replace(/[\uFF21-\uFF3A\uFF41-\uFF5A]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
      )
      // 全形冒號 ： 轉半形 :
      .replace(/[\uFF1A]/g, ':')
      // 全形斜線 ／ 轉半形 /
      .replace(/[\uFF0F]/g, '/')
      // 全形括號 （ ） 轉半形 ( )
      .replace(/[\uFF08]/g, '(')
      .replace(/[\uFF09]/g, ')')
      // 全形粗括號 【 】 〔 〕 ［ ］ 轉半形空白與中括號
      .replace(/[【〔［]/g, ' [')
      .replace(/[】〕］]/g, '] ')
      // 全形句點/小數點 ． 轉半形 .
      .replace(/[\uFF0E]/g, '.')
      // 全形減號/破折號 － 轉半形 -
      .replace(/[\uFF0D]/g, '-')
      // 去除 HTML tag
      .replace(/<[^>]+>/g, ' ')
      // 壓縮連續空白
      .replace(/[ \t]+/g, ' ')
      .trim()
  );
}

/**
 * 解析台灣/中文常見之日期時間字串，支援：
 * - 2026/09/10 (四) 12:00, 2026/09/10(四) 12:00
 * - 2026年9月10日 (週四) 12:00, 民國115年5月10日
 * - 2026.09.10 12:00:00
 * - 2026-09-10 12:00
 * - 中午12:00, 上午11:00, 下午1:00, 下午13:00, 晚上7:30
 * - 12點, 12點00分, 7點半
 * 回傳標準 ISO 8601 字串 (台北時區 +08:00)
 */
export function parseChineseDateTime(
  rawText: string,
  defaultHour = 12,
  defaultMinute = 0
): string | null {
  if (!rawText) return null;

  const text = normalizeChineseText(rawText);

  // 1. 匹配年月日部分
  // 支援 2026/09/10, 2026-09-10, 2026.09.10, 2026年9月10日, 2026年09月10
  let datePattern = /(\d{4})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})\s*日?/;
  let dateMatch = text.match(datePattern);
  let year: number;
  let month: number;
  let day: number;

  if (dateMatch) {
    year = parseInt(dateMatch[1], 10);
    month = parseInt(dateMatch[2], 10);
    day = parseInt(dateMatch[3], 10);
  } else {
    // 支援民國年 (例: 115年5月10日、民國115/05/10)
    const rocPattern = /(?:民國\s*)?(\d{2,3})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})\s*日?/;
    const rocMatch = text.match(rocPattern);
    if (!rocMatch) return null;
    dateMatch = rocMatch;
    year = parseInt(rocMatch[1], 10) + 1911;
    month = parseInt(rocMatch[2], 10);
    day = parseInt(rocMatch[3], 10);
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // 取得日期之後的字串進行時間提取
  const afterDateIndex = dateMatch.index! + dateMatch[0].length;
  const subStr = text.slice(afterDateIndex, afterDateIndex + 60);

  // 搜尋時間 (優先在日期後方搜尋，若無則在日期前方搜尋)
  let timeColonMatch = subStr.match(/(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?/);
  let timeChineseMatch = subStr.match(/(\d{1,2})\s*點\s*(?:(\d{1,2})\s*分?|(半))?/);

  if (!timeColonMatch && !timeChineseMatch) {
    const beforeStr = text.slice(Math.max(0, dateMatch.index! - 40), dateMatch.index!);
    timeColonMatch = beforeStr.match(/(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?/);
    timeChineseMatch = beforeStr.match(/(\d{1,2})\s*點\s*(?:(\d{1,2})\s*分?|(半))?/);
  }

  // 2. 檢測時段修飾詞 (AM/PM/中午/下午/晚上/早上)
  const searchContext = text.slice(Math.max(0, dateMatch.index! - 40), afterDateIndex + 60);
  const isPM = /下午|晚上|晚間|夜間|pm/i.test(searchContext);
  const isAM = /上午|早上|晨間|凌晨|am/i.test(searchContext);
  const isNoon = /中午/i.test(searchContext);

  let hour = defaultHour;
  let minute = defaultMinute;
  let second = 0;

  if (timeColonMatch) {
    hour = parseInt(timeColonMatch[1], 10);
    minute = parseInt(timeColonMatch[2], 10);
    if (timeColonMatch[3]) {
      second = parseInt(timeColonMatch[3], 10);
    }
  } else if (timeChineseMatch) {
    hour = parseInt(timeChineseMatch[1], 10);
    if (timeChineseMatch[3] === '半') {
      minute = 30;
    } else if (timeChineseMatch[2]) {
      minute = parseInt(timeChineseMatch[2], 10);
    } else {
      minute = 0;
    }
  }

  // 4. 時制校正 (12小時制轉24小時制)
  if (isNoon) {
    if (hour < 12) hour += 12;
  } else if (isPM) {
    if (hour < 12) hour += 12;
  } else if (isAM) {
    if (hour === 12) hour = 0;
  }

  // 邊界防禦
  if (hour < 0 || hour > 23) hour = defaultHour;
  if (minute < 0 || minute > 59) minute = defaultMinute;
  if (second < 0 || second > 59) second = 0;

  const yStr = String(year);
  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  const hStr = String(hour).padStart(2, '0');
  const minStr = String(minute).padStart(2, '0');
  const sStr = String(second).padStart(2, '0');

  const iso = `${yStr}-${mStr}-${dStr}T${hStr}:${minStr}:${sStr}+08:00`;
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return null;

  return dt.toISOString();
}

/**
 * 售票階段關鍵字清單
 */
export const SALE_KEYWORD_REGEX =
  /(?:售票時間|售票日期|售票日程|售票日|售票時程|售票開放|開放售票|售票資訊|開始售票|開賣時間|開賣日期|開賣日程|開賣日|正式開賣|全面開賣|啟售時間|啟售日期|啟售日程|啟售日|一般啟售|會員啟售|卡友啟售|優先啟售|正式啟售|購票時間|購票日期|購票日程|購票日|開放購票|開始購票|預售時間|預售日期|預售日|預售開賣|預售|現場售票|現場開賣|現場票|預購時間|預購日期|會員預購|卡友優先|卡友預售|卡友購票|優先預購|優先購票|優先售票|先行預約|先行販售|登記抽票|抽選登記|抽票登記|實名制抽票|抽票|抽選|搶票時間|開票時間|公售時間|一般售票|會員優先|早鳥會員|早鳥優先|清票時間|釋票時間|清票|釋票|二次開賣|加開開賣|二次售票|開始販售|販售時間|販售日期|ticket\s*sale|on\s*sale|general\s*sale|presale|public\s*sale|sale\s*start|sale\s*date|sale\s*time|ticketing)/i;

/**
 * 自內文或 HTML 片段中提取售票時程 (Sale Phases)
 */
export function extractSalePhasesFromContent(
  content: string,
  url: string,
  platform: TicketPlatform = 'OTHER'
): ScrapedSalePhase[] {
  const phases: ScrapedSalePhase[] = [];
  if (!content) return phases;

  const normalized = normalizeChineseText(content);

  // 切分成行或標點句進行精準抽取（包含逗號後連接獨立開賣時程的分割）
  const lines = normalized
    .split(/[\n\r；;。|｜]+/)
    .flatMap((seg) => {
      if (
        /[，,]\s*(?=[^，,]*?(?:售票|開賣|啟售|預售|預購|抽票|一般|優先|全面|現場|早鳥|會員))/i.test(
          seg
        )
      ) {
        return seg
          .split(/[，,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [seg.trim()];
    })
    .filter(Boolean);

  for (const line of lines) {
    if (!SALE_KEYWORD_REGEX.test(line)) continue;

    const parsedDate = parseChineseDateTime(line, 12, 0);
    if (!parsedDate) continue;

    // 判斷售票類型
    let saleType: SaleType = 'GENERAL';
    if (/抽票|登記|抽選|實名制抽票|抽選登記|lottery|raffle|ballot/i.test(line)) {
      saleType = 'LOTTERY';
    } else if (
      /優先|會員|預購|預售|卡友|先行|早鳥|國泰|中信|台新|玉山|富邦|星展|粉絲|presale|priority|fanclub|early\s*bird/i.test(
        line
      )
    ) {
      saleType = 'PRESALE';
    } else if (/現場/i.test(line)) {
      saleType = 'DOOR';
    } else if (/清票|釋票|二次開賣|加開|rerelease|resale/i.test(line)) {
      saleType = 'RERELEASE';
    }

    // 擷取階段標題預設值
    let phaseName =
      platform === 'TIXCRAFT'
        ? '拓元全面開賣'
        : platform === 'KKTIX'
          ? 'KKTIX 一般售票'
          : platform === 'IBON'
            ? 'ibon 全面啟售'
            : platform === 'FAMITICKET'
              ? 'FamiTicket 全網啟售'
              : platform === 'KHAM'
                ? '寬宏售票全面開賣'
                : platform === 'INDIEVOX'
                  ? 'INDIEVOX 正式開賣'
                  : '活動公開售票';

    if (saleType === 'PRESALE') {
      phaseName =
        platform === 'TIXCRAFT'
          ? '拓元會員/優先預購'
          : platform === 'KKTIX'
            ? 'KKTIX 會員/優先預購'
            : platform === 'IBON'
              ? 'ibon 優先預售'
              : platform === 'FAMITICKET'
                ? '全網優先預購'
                : platform === 'KHAM'
                  ? '寬宏會員/早鳥開賣'
                  : platform === 'INDIEVOX'
                    ? 'INDIEVOX 預售開賣'
                    : '優先預購';
    } else if (saleType === 'DOOR') {
      phaseName = platform === 'INDIEVOX' ? 'INDIEVOX 現場售票' : '現場票開賣';
    } else if (saleType === 'LOTTERY') {
      phaseName =
        platform === 'TIXCRAFT'
          ? '拓元實名制登記抽票'
          : platform === 'KKTIX'
            ? 'KKTIX 實名制抽票登記'
            : '登記抽票';
    } else if (saleType === 'RERELEASE') {
      phaseName =
        platform === 'TIXCRAFT'
          ? '拓元釋票/清票開賣'
          : platform === 'KKTIX'
            ? 'KKTIX 釋票/清票開賣'
            : '系統釋票/清票';
    }

    // 嘗試從該行提取更豐富的說明文字作為 phaseName (例如：國泰世華CUBE卡友優先購票)
    let cleanedLine = line
      // 1. 移除前置公告警語標籤
      .replace(
        /^[\[【〔［]?(?:重要(?:購票)?提醒|注意事項|購票須知|溫馨提醒|公告)[\]】〕］]?[:：\s]*/i,
        ''
      )
      // 2. 移除前置售票關鍵字標籤
      .replace(
        /^[\[【〔［]?(?:售票時間|開賣時間|啟售時間|預售時間|優先購票|會員預購|登記抽票|全面開賣|搶票時間|開賣日程|售票日程|售票日|開賣日|開票時間|公售時間|一般售票|卡友優先|會員優先|正式開賣|清票時間|釋票時間|開始販售|販售時間|販售日期|購票時間|購票日期|啟售日期|開賣日期|一般啟售|優先啟售|會員啟售|卡友啟售|ticket\s*sale|on\s*sale|general\s*sale|presale|public\s*sale|sale\s*start|sale\s*time|ticketing)[\]】〕］]?(?:時間)?[:：\s]*/i,
        ''
      )
      // 3. 移除日期與時間本體
      .replace(
        /(\d{2,4})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})\s*日?(?:\s*[\(（]?[^\)）]+[\)）]?)?\s*(?:(?:中午|上午|早上|下午|晚上|晚間|夜間|凌晨)?\s*(?:\d{1,2}[:：點]\d{2}(?:[:：分]\d{2})?|\d{1,2}點(?:半)?|\d{1,2}點\d{1,2}分?))?/i,
        ''
      )
      // 4. 移除逗號後方附帶限制（例如：，每人限購4張）
      .replace(/[,，、].*$/, '')
      // 5. 清理殘留符號
      .replace(/[\[\]【】〔〕［］「」『』★◆●▲■:：\-~～—_]+/g, ' ')
      .trim();

    if (cleanedLine && cleanedLine.length >= 2 && cleanedLine.length <= 40) {
      phaseName = cleanedLine;
    }

    // 去重判定（若相同 saleStart 與 phaseName 則略過）
    if (!phases.some((p) => p.saleStart === parsedDate && p.phaseName === phaseName)) {
      phases.push({
        phaseName,
        saleType,
        saleStart: parsedDate,
        ticketingPlatform: platform,
        bookingUrl: url,
        eligibilityNotes: line.slice(0, 200),
        isLottery: saleType === 'LOTTERY',
      });
    }
  }

  // 依照開賣時間先後排序
  phases.sort((a, b) => new Date(a.saleStart).getTime() - new Date(b.saleStart).getTime());

  return phases;
}
