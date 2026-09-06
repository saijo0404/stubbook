import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export const dynamic = 'force-dynamic';

export interface CalendarItem {
  id: string;
  eventId: string;
  sessionId?: string | null;
  eventTitle: string;
  subTitle?: string | null;
  itemType: 'SHOW' | 'SALE' | 'RERELEASE' | 'LOTTERY';
  saleType?: string | null;
  typeLabel: string;
  date: string;
  dateKey: string; // YYYY-MM-DD
  timeString: string; // HH:mm
  endDate?: string | null;
  venueName?: string | null;
  posterUrl?: string | null;
  bookingUrl?: string | null;
  platform?: string | null;
  eligibilityNotes?: string | null;
  isLottery?: boolean;
  doorsOpenTime?: string | null;
  attendance?: {
    id: string;
    status: 'WANT_TO_GO' | 'TICKETING' | 'CONFIRMED' | 'ATTENDED' | 'MISSED';
    seatInfo: string | null;
    ticketType: string;
    ticketPrice: number | null;
    rating: number | null;
    notes: string | null;
  } | null;
  timeUntilMs: number;
}

export interface CalendarRadarItem extends CalendarItem {
  urgencyLevel: 'CRITICAL_10M' | 'HIGH_1H' | 'MEDIUM_24H' | 'UPCOMING' | 'PASSED';
}

function parseDateKeyAndTime(dateStr: string): {
  dateKey: string;
  timeString: string;
  timestamp: number;
} {
  if (!dateStr) {
    const today = new Date().toISOString().slice(0, 10);
    return { dateKey: today, timeString: '00:00', timestamp: 0 };
  }

  // 支援 YYYY-MM-DDTHH:mm:ss 或 YYYY-MM-DD HH:mm 等多種格式
  const cleanStr = dateStr.trim();
  const dateMatch = cleanStr.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
  let dateKey = dateMatch ? dateMatch[1].replace(/\//g, '-') : cleanStr.slice(0, 10);

  // 標準化 dateKey 為 YYYY-MM-DD (補 0)
  const parts = dateKey.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    dateKey = `${y}-${m}-${d}`;
  }

  // 提取時間 HH:mm
  const timeMatch = cleanStr.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
  const timeString = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '00:00';

  const dObj = new Date(dateStr.replace(' ', 'T'));
  const timestamp = isNaN(dObj.getTime()) ? new Date(dateKey).getTime() : dObj.getTime();

  return { dateKey, timeString, timestamp };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const typeParam = searchParams.get('type'); // all, show, sale, rerelease, lottery
    const attendanceOnly = searchParams.get('attendanceOnly') === 'true';

    const db = getDefaultDatabase();

    // 1. 查詢所有演出場次與手帳紀錄
    const sessionRows = db
      .prepare(
        `
      SELECT 
        s.id as sessionId,
        s.event_id as eventId,
        e.title as eventTitle,
        e.poster_url as posterUrl,
        e.description as eventDescription,
        s.session_title as sessionTitle,
        s.session_date as sessionDate,
        s.doors_open_time as doorsOpenTime,
        s.ticket_platform as ticketPlatform,
        COALESCE(s.booking_url, e.source_url) as bookingUrl,
        s.venue_name_override as venueName,
        a.id as attendanceId,
        a.status as attendanceStatus,
        a.seat_info as attendanceSeatInfo,
        a.ticket_type as attendanceTicketType,
        a.ticket_price as attendanceTicketPrice,
        a.rating as attendanceRating,
        a.notes as attendanceNotes
      FROM event_sessions s
      JOIN events e ON e.id = s.event_id
      LEFT JOIN user_attendances a ON a.session_id = s.id
      ORDER BY s.session_date ASC
    `
      )
      .all() as any[];

    // 2. 查詢所有售票時程
    const salePhaseRows = db
      .prepare(
        `
      SELECT 
        p.id as phaseId,
        p.event_id as eventId,
        p.session_id as sessionId,
        e.title as eventTitle,
        e.poster_url as posterUrl,
        p.phase_name as phaseName,
        p.sale_type as saleType,
        p.sale_start as saleStart,
        p.sale_end as saleEnd,
        p.ticketing_platform as ticketingPlatform,
        COALESCE(p.booking_url, e.source_url) as bookingUrl,
        p.eligibility_notes as eligibilityNotes,
        p.is_lottery as isLottery,
        p.reminder_enabled as reminderEnabled,
        (SELECT s.venue_name_override FROM event_sessions s WHERE s.event_id = e.id LIMIT 1) as venueName,
        a.id as attendanceId,
        a.status as attendanceStatus
      FROM event_sale_phases p
      JOIN events e ON e.id = p.event_id
      LEFT JOIN user_attendances a ON a.session_id = p.session_id
      ORDER BY p.sale_start ASC
    `
      )
      .all() as any[];

    const now = Date.now();
    const items: CalendarItem[] = [];

    // 轉換演出日為 CalendarItem
    for (const row of sessionRows) {
      if (attendanceOnly && !row.attendanceId) {
        continue;
      }

      const { dateKey, timeString, timestamp } = parseDateKeyAndTime(row.sessionDate);

      items.push({
        id: `show_${row.sessionId}`,
        eventId: row.eventId,
        sessionId: row.sessionId,
        eventTitle: row.eventTitle,
        subTitle: row.sessionTitle || null,
        itemType: 'SHOW',
        typeLabel: '演出日 🎫',
        date: row.sessionDate,
        dateKey,
        timeString,
        venueName: row.venueName || null,
        posterUrl: row.posterUrl || null,
        bookingUrl: row.bookingUrl || null,
        platform: row.ticketPlatform || null,
        doorsOpenTime: row.doorsOpenTime || null,
        attendance: row.attendanceId
          ? {
              id: row.attendanceId,
              status: row.attendanceStatus,
              seatInfo: row.attendanceSeatInfo,
              ticketType: row.attendanceTicketType,
              ticketPrice: row.attendanceTicketPrice,
              rating: row.attendanceRating,
              notes: row.attendanceNotes,
            }
          : null,
        timeUntilMs: timestamp - now,
      });
    }

    // 轉換開賣時程為 CalendarItem
    for (const row of salePhaseRows) {
      if (attendanceOnly && !row.attendanceId) {
        continue;
      }

      const { dateKey, timeString, timestamp } = parseDateKeyAndTime(row.saleStart);

      let itemType: CalendarItem['itemType'] = 'SALE';
      let typeLabel = '開賣購票 🏷️';

      if (row.saleType === 'LOTTERY' || row.isLottery) {
        itemType = 'LOTTERY';
        typeLabel = '抽選登記 🎲';
      } else if (row.saleType === 'RERELEASE') {
        itemType = 'RERELEASE';
        typeLabel = '清票釋票 🎟️';
      } else if (row.saleType === 'PRESALE') {
        itemType = 'SALE';
        typeLabel = '優先預購 🏷️';
      }

      items.push({
        id: `sale_${row.phaseId}`,
        eventId: row.eventId,
        sessionId: row.sessionId || null,
        eventTitle: row.eventTitle,
        subTitle: row.phaseName,
        itemType,
        saleType: row.saleType,
        typeLabel,
        date: row.saleStart,
        dateKey,
        timeString,
        endDate: row.saleEnd || null,
        venueName: row.venueName || null,
        posterUrl: row.posterUrl || null,
        bookingUrl: row.bookingUrl || null,
        platform: row.ticketingPlatform || null,
        eligibilityNotes: row.eligibilityNotes || null,
        isLottery: Boolean(row.isLottery),
        attendance: row.attendanceId
          ? {
              id: row.attendanceId,
              status: row.attendanceStatus,
              seatInfo: null,
              ticketType: 'DIGITAL',
              ticketPrice: null,
              rating: null,
              notes: null,
            }
          : null,
        timeUntilMs: timestamp - now,
      });
    }

    // 過濾邏輯 (Year, Month, Type)
    let filteredItems = items;

    if (typeParam && typeParam !== 'all') {
      const lowerType = typeParam.toLowerCase();
      filteredItems = filteredItems.filter((it) => {
        if (lowerType === 'show') return it.itemType === 'SHOW';
        if (lowerType === 'sale') return it.itemType === 'SALE';
        if (lowerType === 'rerelease') return it.itemType === 'RERELEASE';
        if (lowerType === 'lottery') return it.itemType === 'LOTTERY';
        return true;
      });
    }

    if (yearParam) {
      filteredItems = filteredItems.filter((it) => it.dateKey.startsWith(yearParam));
    }

    if (monthParam) {
      const monthPadded = monthParam.padStart(2, '0');
      filteredItems = filteredItems.filter((it) => {
        const parts = it.dateKey.split('-');
        return parts[1] === monthPadded;
      });
    }

    // 依時間先後排序
    filteredItems.sort((a, b) => {
      if (a.dateKey !== b.dateKey) {
        return a.dateKey.localeCompare(b.dateKey);
      }
      return a.timeString.localeCompare(b.timeString);
    });

    // 依 dateKey 分組
    const eventsByDate: Record<string, CalendarItem[]> = {};
    for (const item of filteredItems) {
      if (!eventsByDate[item.dateKey]) {
        eventsByDate[item.dateKey] = [];
      }
      eventsByDate[item.dateKey].push(item);
    }

    // 搶票倒數雷達清單 (所有非演出、且開賣時間在未來或過去 3 小時內之開賣項目)
    const radarItems: CalendarRadarItem[] = items
      .filter((it) => it.itemType !== 'SHOW')
      .map((it) => {
        const ms = it.timeUntilMs;
        let urgencyLevel: CalendarRadarItem['urgencyLevel'] = 'UPCOMING';

        if (ms < -3 * 3600 * 1000) {
          urgencyLevel = 'PASSED';
        } else if (ms <= 10 * 60 * 1000 && ms >= -30 * 60 * 1000) {
          urgencyLevel = 'CRITICAL_10M';
        } else if (ms <= 60 * 60 * 1000 && ms > 10 * 60 * 1000) {
          urgencyLevel = 'HIGH_1H';
        } else if (ms <= 24 * 3600 * 1000 && ms > 60 * 60 * 1000) {
          urgencyLevel = 'MEDIUM_24H';
        }

        return {
          ...it,
          urgencyLevel,
        };
      })
      .filter((it) => it.urgencyLevel !== 'PASSED')
      .sort((a, b) => a.timeUntilMs - b.timeUntilMs);

    return NextResponse.json({
      success: true,
      items: filteredItems,
      eventsByDate,
      upcomingRadar: radarItems,
      summary: {
        totalItems: filteredItems.length,
        totalShows: filteredItems.filter((i) => i.itemType === 'SHOW').length,
        totalSales: filteredItems.filter((i) => i.itemType !== 'SHOW').length,
        radarCount: radarItems.length,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`日曆 API 查詢失敗: ${err.message}`, 'CALENDAR_API', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        items: [],
        eventsByDate: {},
        upcomingRadar: [],
        summary: { totalItems: 0, totalShows: 0, totalSales: 0, radarCount: 0 },
      },
      { status: 500 }
    );
  }
}
