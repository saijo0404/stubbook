/**
 * 智慧行事曆匯出與同步工具 (RFC 5545 iCalendar & Google Calendar)
 * 支援跨平台 Apple Calendar / Google / Outlook / iOS / Android 整合
 */

export interface CalendarExportItem {
  id: string;
  title: string;
  subTitle?: string | null;
  itemType: 'SHOW' | 'SALE' | 'RERELEASE' | 'LOTTERY';
  startDate: string; // ISO 或支援的日期字串
  endDate?: string | null;
  venueName?: string | null;
  bookingUrl?: string | null;
  platform?: string | null;
  notes?: string | null;
  seatInfo?: string | null;
}

/**
 * 將日期轉換為 RFC 5545 標準 UTC 日期格式 (YYYYMMDDTHHMMSSZ)
 */
export function formatToICSUtcDate(dateStr: string, addHours = 0): string {
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) {
    // 降級為目前時間 + addHours
    const fallback = new Date();
    fallback.setHours(fallback.getHours() + addHours);
    return fallback
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  }

  if (addHours !== 0) {
    d.setTime(d.getTime() + addHours * 3600 * 1000);
  }

  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/**
 * 轉義 RFC 5545 純文字特殊符號 (, ; \ \n)
 */
export function escapeICSText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * 產出標準 RFC 5545 iCalendar (.ics) 字串
 */
export function generateICalendar(
  items: CalendarExportItem[],
  calendarName = '票根手帳演唱會行事曆'
): string {
  const nowUtc = formatToICSUtcDate(new Date().toISOString());

  const eventsICS = items
    .map((item) => {
      const isSale = item.itemType !== 'SHOW';
      const typePrefix =
        item.itemType === 'SHOW'
          ? '【演出】'
          : item.itemType === 'LOTTERY'
            ? '【抽選登記】'
            : item.itemType === 'RERELEASE'
              ? '【清票釋票】'
              : '【購票開賣】';

      const summary = escapeICSText(
        `${typePrefix} ${item.title}${item.subTitle ? ` - ${item.subTitle}` : ''}`
      );

      // 計算結束時間 (若無則演出預設 3 小時，開賣預設 1 小時)
      const defaultDurationHours = isSale ? 1 : 3;
      const startUtc = formatToICSUtcDate(item.startDate);
      const endUtc = item.endDate
        ? formatToICSUtcDate(item.endDate)
        : formatToICSUtcDate(item.startDate, defaultDurationHours);

      // 描述欄位組裝
      const descLines: string[] = [
        `活動名稱：${item.title}`,
        item.subTitle ? `階段說明：${item.subTitle}` : '',
        item.venueName ? `演出場館：${item.venueName}` : '',
        item.platform ? `售票平台：${item.platform}` : '',
        item.seatInfo ? `座位資訊：${item.seatInfo}` : '',
        item.bookingUrl ? `網址連結：${item.bookingUrl}` : '',
        item.notes ? `備忘筆記：${item.notes}` : '',
        '',
        '── 票根手帳 StubBook 智慧排程 ──',
      ].filter(Boolean);

      const description = escapeICSText(descLines.join('\n'));
      const location = escapeICSText(
        item.venueName || (item.platform ? `${item.platform} 線上售票` : '')
      );
      const url = item.bookingUrl || '';

      // 鬧鐘提醒設定 (VALARM)
      let valarms = '';
      if (isSale) {
        // 售票開賣前 1 小時與前 10 分鐘強提醒
        valarms = `
BEGIN:VALARM
TRIGGER:-PT60M
ACTION:DISPLAY
DESCRIPTION:${escapeICSText(`[搶票倒數 1 小時] ${item.title} 即將開賣，請確認帳號登入與信用卡！`)}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT10M
ACTION:DISPLAY
DESCRIPTION:${escapeICSText(`[搶票最後 10 分鐘] ${item.title} 即將開賣！請預先就緒！`)}
END:VALARM`;
      } else {
        // 現場演出前 1 天與當天前 2 小時提醒
        valarms = `
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:${escapeICSText(`[演出前 1 天] 明天是 ${item.title} 現場演出！請檢查門票與交通！`)}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT2H
ACTION:DISPLAY
DESCRIPTION:${escapeICSText(`[入場倒數 2 小時] ${item.title} 即將開演，祝觀演愉快！`)}
END:VALARM`;
      }

      return `BEGIN:VEVENT
UID:stubbook-${item.id}-${Date.now()}@stubbook.local
DTSTAMP:${nowUtc}
DTSTART:${startUtc}
DTEND:${endUtc}
SUMMARY:${summary}
DESCRIPTION:${description}
${location ? `LOCATION:${location}` : ''}
${url ? `URL:${url}` : ''}
STATUS:CONFIRMED${valarms}
END:VEVENT`;
    })
    .join('\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//StubBook//Concert Calendar//ZH-TW
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeICSText(calendarName)}
X-WR-TIMEZONE:Asia/Taipei
${eventsICS}
END:VCALENDAR`;
}

/**
 * 瀏覽器端觸發下載 .ics 檔案
 */
export function downloadICS(filename: string, icsContent: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 生成 Google Calendar 單一活動新增 URL
 */
export function generateGoogleCalendarUrl(item: CalendarExportItem): string {
  const isSale = item.itemType !== 'SHOW';
  const typePrefix =
    item.itemType === 'SHOW'
      ? '【演出】'
      : item.itemType === 'LOTTERY'
        ? '【抽選登記】'
        : item.itemType === 'RERELEASE'
          ? '【清票釋票】'
          : '【購票開賣】';

  const title = `${typePrefix} ${item.title}${item.subTitle ? ` - ${item.subTitle}` : ''}`;
  const defaultDurationHours = isSale ? 1 : 3;
  const startUtc = formatToICSUtcDate(item.startDate);
  const endUtc = item.endDate
    ? formatToICSUtcDate(item.endDate)
    : formatToICSUtcDate(item.startDate, defaultDurationHours);

  const descLines: string[] = [
    `活動：${item.title}`,
    item.subTitle ? `時程：${item.subTitle}` : '',
    item.venueName ? `場館：${item.venueName}` : '',
    item.platform ? `平台：${item.platform}` : '',
    item.bookingUrl ? `購票網址：${item.bookingUrl}` : '',
    item.seatInfo ? `座位資訊：${item.seatInfo}` : '',
    item.notes ? `備註：${item.notes}` : '',
    '',
    '來自 票根手帳 StubBook 智慧排程',
  ].filter(Boolean);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details: descLines.join('\n'),
    location: item.venueName || (item.platform ? `${item.platform} 售票` : ''),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
