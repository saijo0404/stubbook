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
 * - 2026年9月10日 (週四) 12:00
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
  const datePattern = /(\d{4})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})\s*日?/;
  const dateMatch = text.match(datePattern);
  if (!dateMatch) return null;

  const [_, yearStr, monthStr, dayStr] = dateMatch;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // 取得日期之後的字串進行時間提取
  const afterDateIndex = dateMatch.index! + dateMatch[0].length;
  const subStr = text.slice(afterDateIndex, afterDateIndex + 60);

  // 2. 檢測時段修飾詞 (AM/PM/中午/下午/晚上/早上)
  const isPM = /下午|晚上|晚間|夜間|pm/i.test(subStr);
  const isAM = /上午|早上|晨間|凌晨|am/i.test(subStr);
  const isNoon = /中午/i.test(subStr);

  let hour = defaultHour;
  let minute = defaultMinute;
  let second = 0;

  // 3. 匹配時間格式：
  // 3a. HH:mm(:ss)?
  const timeColonMatch = subStr.match(/(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?/);
  // 3b. X點Y分 / X點半 / X點
  const timeChineseMatch = subStr.match(/(\d{1,2})\s*點\s*(?:(\d{1,2})\s*分?|(半))?/);

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
  /(?:售票時間|開賣時間|啟售時間|預售時間|優先購票|會員預購|登記抽票|全面開賣|搶票時間|開賣日程|售票日程|售票日|開賣日|開票時間|公售時間|一般售票|卡友優先|會員優先|正式開賣|清票時間|釋票時間|清票|釋票|二次開賣)/i;

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

  // 切分成行或標點句進行精準抽取
  const lines = normalized
    .split(/[\n\r；;。]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!SALE_KEYWORD_REGEX.test(line)) continue;

    const parsedDate = parseChineseDateTime(line, 12, 0);
    if (!parsedDate) continue;

    // 判斷售票類型
    let saleType: SaleType = 'GENERAL';
    if (/抽票|登記|抽選|實名制抽票|抽選登記/i.test(line)) {
      saleType = 'LOTTERY';
    } else if (/優先|會員|預購|卡友|先行|早鳥|國泰|中信|台新|玉山|富邦|星展|粉絲/i.test(line)) {
      saleType = 'PRESALE';
    } else if (/清票|釋票|二次開賣/i.test(line)) {
      saleType = 'RERELEASE';
    }

    // 擷取階段標題
    let phaseName =
      platform === 'TIXCRAFT'
        ? '拓元全面開賣'
        : platform === 'KKTIX'
          ? 'KKTIX 一般售票'
          : '活動公開售票';

    if (saleType === 'PRESALE') {
      phaseName =
        platform === 'TIXCRAFT'
          ? '拓元會員/優先預購'
          : platform === 'KKTIX'
            ? 'KKTIX 會員/優先預購'
            : '優先預購';
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
    const cleanedLine = line
      .replace(
        /(?:售票時間|開賣時間|啟售時間|預售時間|優先購票|會員預購|登記抽票|全面開賣|搶票時間|開賣日程|售票日程|售票日|開賣日|開票時間|公售時間|一般售票|卡友優先|會員優先|正式開賣|清票時間|釋票時間|清票|釋票|二次開賣)[:：]?\s*/i,
        ''
      )
      .replace(
        /(\d{4})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})\s*日?(?:\s*[\(（]?[^\)）]+[\)）]?)?\s*(?:(?:中午|上午|早上|下午|晚上|晚間|夜間|凌晨)?\s*(?:\d{1,2}[:：點]\d{2}(?:[:：分]\d{2})?|\d{1,2}點(?:半)?|\d{1,2}點\d{1,2}分?))?/i,
        ''
      )
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
