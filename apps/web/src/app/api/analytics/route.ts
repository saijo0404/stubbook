import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const selectedYear = searchParams.get('year'); // e.g. '2026' or null for all-time

    const db = getDefaultDatabase();

    // 1. 取得所有出現過的演出年份清單供前端切換
    const yearRows = db
      .prepare(
        `
      SELECT DISTINCT strftime('%Y', session_date) as yr
      FROM event_sessions
      WHERE session_date IS NOT NULL AND session_date != ''
      ORDER BY yr DESC
    `
      )
      .all() as Array<{ yr: string }>;

    const availableYears = yearRows.map((r) => r.yr).filter(Boolean);

    // 2. 年份過濾條件
    const yearCondition =
      selectedYear && selectedYear !== 'ALL'
        ? `AND strftime('%Y', s.session_date) = ?`
        : '';
    const yearParams = selectedYear && selectedYear !== 'ALL' ? [selectedYear] : [];

    // 3. 總場次與參與統計
    const attendanceStats = db
      .prepare(
        `
      SELECT 
        COUNT(DISTINCT s.id) as totalSessions,
        COUNT(DISTINCT e.id) as totalEvents,
        COUNT(DISTINCT CASE WHEN a.status IN ('ATTENDED', 'CONFIRMED') THEN s.id END) as totalAttended,
        COUNT(DISTINCT CASE WHEN a.status = 'ATTENDED' THEN s.id END) as completedCount,
        COUNT(DISTINCT CASE WHEN a.status = 'CONFIRMED' THEN s.id END) as confirmedCount,
        COUNT(DISTINCT CASE WHEN a.status = 'WANT_TO_GO' THEN s.id END) as wantToGoCount,
        COALESCE(SUM(a.ticket_price), 0) as totalTicketSpending
      FROM event_sessions s
      JOIN events e ON s.event_id = e.id
      LEFT JOIN user_attendances a ON s.id = a.session_id
      WHERE 1=1 ${yearCondition}
    `
      )
      .get(...yearParams) as any;

    // 4. 周邊戰利品花費統計與分類圓餅資料
    const merchCondition =
      selectedYear && selectedYear !== 'ALL'
        ? `AND strftime('%Y', s.session_date) = ?`
        : '';
    const merchStats = db
      .prepare(
        `
      SELECT 
        COALESCE(SUM(m.price * m.quantity), 0) as totalMerchSpending,
        COALESCE(SUM(m.quantity), 0) as totalMerchCount
      FROM merchandise_items m
      JOIN user_attendances a ON m.attendance_id = a.id
      JOIN event_sessions s ON a.session_id = s.id
      WHERE 1=1 ${merchCondition}
    `
      )
      .get(...yearParams) as any;

    const merchBreakdown = db
      .prepare(
        `
      SELECT 
        m.category,
        COUNT(m.id) as count,
        COALESCE(SUM(m.price * m.quantity), 0) as totalCost
      FROM merchandise_items m
      JOIN user_attendances a ON m.attendance_id = a.id
      JOIN event_sessions s ON a.session_id = s.id
      WHERE 1=1 ${merchCondition}
      GROUP BY m.category
      ORDER BY totalCost DESC
    `
      )
      .all(...yearParams) as Array<{ category: string; count: number; totalCost: number }>;

    // 5. TOP 歌手排行榜
    const topArtists = db
      .prepare(
        `
      SELECT 
        COALESCE(art.name, e.title) as artistName,
        COUNT(DISTINCT s.id) as sessionsCount,
        COUNT(DISTINCT CASE WHEN a.status IN ('ATTENDED', 'CONFIRMED') THEN s.id END) as attendedCount,
        COALESCE(SUM(a.ticket_price), 0) as spending
      FROM event_sessions s
      JOIN events e ON s.event_id = e.id
      LEFT JOIN artists art ON e.artist_id = art.id
      LEFT JOIN user_attendances a ON s.id = a.session_id
      WHERE 1=1 ${yearCondition}
      GROUP BY artistName
      ORDER BY attendedCount DESC, sessionsCount DESC, spending DESC
      LIMIT 5
    `
      )
      .all(...yearParams) as Array<{
      artistName: string;
      sessionsCount: number;
      attendedCount: number;
      spending: number;
    }>;

    // 6. 場館踩點排行榜與統計
    const topVenues = db
      .prepare(
        `
      SELECT 
        COALESCE(v.name, s.venue_name_override, '其他場地') as venueName,
        COUNT(DISTINCT s.id) as visitsCount
      FROM event_sessions s
      LEFT JOIN venues v ON s.venue_id = v.id
      LEFT JOIN user_attendances a ON s.id = a.session_id
      WHERE a.status IN ('ATTENDED', 'CONFIRMED') ${yearCondition}
      GROUP BY venueName
      ORDER BY visitsCount DESC
      LIMIT 8
    `
      )
      .all(...yearParams) as Array<{ venueName: string; visitsCount: number }>;

    // 7. 月度參戰趨勢
    const monthlyStats = db
      .prepare(
        `
      SELECT 
        strftime('%Y-%m', s.session_date) as month,
        COUNT(DISTINCT s.id) as eventsCount,
        COALESCE(SUM(a.ticket_price), 0) as ticketSpend
      FROM event_sessions s
      LEFT JOIN user_attendances a ON s.id = a.session_id
      WHERE s.session_date IS NOT NULL AND a.status IN ('ATTENDED', 'CONFIRMED') ${yearCondition}
      GROUP BY month
      ORDER BY month ASC
    `
      )
      .all(...yearParams) as Array<{ month: string; eventsCount: number; ticketSpend: number }>;

    // 8. 累積相片與視角照片總數
    const mediaCount = (
      db
        .prepare('SELECT COUNT(*) as c FROM attendance_media')
        .get() as { c: number }
    ).c;
    const seatViewCount = (
      db
        .prepare('SELECT COUNT(*) as c FROM seat_view_photos')
        .get() as { c: number }
    ).c;

    const totalSpending =
      Number(attendanceStats.totalTicketSpending || 0) +
      Number(merchStats.totalMerchSpending || 0);

    // 9. 動態計算樂迷專屬封號
    let fanTitle = '音樂漫遊者 (Music Explorer)';
    const totalAttended = Number(attendanceStats.totalAttended || 0);
    const merchCountTotal = Number(merchStats.totalMerchCount || 0);

    if (totalAttended >= 10) {
      fanTitle = '傳奇巡禮大師 (Legendary Live Master)';
    } else if (totalAttended >= 5) {
      fanTitle = '硬核現場狂熱者 (Hardcore Concert Goer)';
    } else if (merchCountTotal >= 5) {
      fanTitle = '手燈應援收藏家 (Lightstick Enthusiast)';
    } else if (totalAttended >= 2) {
      fanTitle = '搖滾現場常客 (Live Regular)';
    }

    return NextResponse.json({
      selectedYear: selectedYear || 'ALL',
      availableYears,
      summary: {
        totalEvents: attendanceStats.totalEvents || 0,
        totalSessions: attendanceStats.totalSessions || 0,
        totalAttended: attendanceStats.totalAttended || 0,
        completedCount: attendanceStats.completedCount || 0,
        confirmedCount: attendanceStats.confirmedCount || 0,
        wantToGoCount: attendanceStats.wantToGoCount || 0,
        totalVenues: topVenues.length,
        totalMedia: mediaCount + seatViewCount,
        fanTitle,
      },
      spending: {
        ticketSpending: Number(attendanceStats.totalTicketSpending || 0),
        merchSpending: Number(merchStats.totalMerchSpending || 0),
        grandTotal: totalSpending,
        totalMerchCount: Number(merchStats.totalMerchCount || 0),
        merchBreakdown,
      },
      topArtists,
      topVenues,
      monthlyStats,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`統計資料聚合失敗: ${err.message}`, 'ANALYTICS_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
