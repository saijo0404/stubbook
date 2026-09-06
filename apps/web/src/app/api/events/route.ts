import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';
import { ScrapedEvent } from '@stubbook/scraper-core';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event as ScrapedEvent;

    if (!event || !event.title || !event.sessions || event.sessions.length === 0) {
      return NextResponse.json({ error: '無效的活動資料' }, { status: 400 });
    }

    logger.info(`收到活動入庫請求: ${event.title}`, 'DATABASE_API', {
      platform: event.platform,
      sessionsCount: event.sessions.length,
    });

    const db = getDefaultDatabase();

    // 準備 SQL statements（使用參數化查詢防止 SQL 注入）
    const insertEvent = db.prepare(`
      INSERT INTO events (title, tour_name, source_url, poster_url, platform, description, organizer, raw_metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `);

    const insertSession = db.prepare(`
      INSERT INTO event_sessions (
        event_id, session_title, session_date, doors_open_time,
        ticket_sale_time, ticket_platform, ticket_tiers, booking_url, venue_name_override
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSalePhase = db.prepare(`
      INSERT INTO event_sale_phases (
        event_id, session_id, phase_name, sale_type, sale_start, sale_end,
        ticketing_platform, booking_url, eligibility_notes, is_lottery
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 使用 SQLite Transaction 保證原子性寫入
    const saveEventTx = db.transaction((ev: ScrapedEvent) => {
      const row = insertEvent.get(
        ev.title,
        ev.tourName || null,
        ev.sourceUrl,
        ev.posterUrl || null,
        ev.platform,
        ev.description || null,
        ev.organizer || null,
        JSON.stringify(ev.rawMetadata || {})
      ) as { id: string };

      for (const s of ev.sessions) {
        insertSession.run(
          row.id,
          s.sessionTitle || null,
          s.sessionDate,
          s.doorsOpenTime || null,
          s.ticketSaleTime || null,
          s.ticketPlatform,
          JSON.stringify(s.ticketTiers || []),
          s.bookingUrl || null,
          s.venueName || null
        );
      }

      if (ev.salePhases && ev.salePhases.length > 0) {
        for (const phase of ev.salePhases) {
          insertSalePhase.run(
            row.id,
            null,
            phase.phaseName,
            phase.saleType || 'GENERAL',
            phase.saleStart,
            phase.saleEnd || null,
            phase.ticketingPlatform || ev.platform,
            phase.bookingUrl || ev.sourceUrl,
            phase.eligibilityNotes || null,
            phase.isLottery ? 1 : 0
          );
        }
      } else {
        const firstSaleTime = ev.sessions.find((s) => s.ticketSaleTime)?.ticketSaleTime;
        if (firstSaleTime) {
          insertSalePhase.run(
            row.id,
            null,
            '活動公開售票',
            'GENERAL',
            firstSaleTime,
            null,
            ev.platform,
            ev.sourceUrl,
            null,
            0
          );
        }
      }

      return row.id;
    });

    const eventId = saveEventTx(event);

    logger.info(`活動成功入庫至本地 SQLite (Event ID: ${eventId})`, 'DATABASE_API');

    return NextResponse.json({
      success: true,
      eventId,
      storage: 'sqlite_local',
      message: '活動與場次已成功儲存至本地 SQLite 資料庫！',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`本地入庫失敗: ${err.message}`, 'DATABASE_API', err);
    return NextResponse.json({ error: `入庫失敗: ${err.message}` }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDefaultDatabase();

    const eventRows = db
      .prepare(
        `
      SELECT 
        e.id,
        e.title,
        e.tour_name as tourName,
        e.platform,
        e.source_url as sourceUrl,
        e.poster_url as posterUrl,
        e.description,
        e.organizer,
        e.created_at as createdAt
      FROM events e
      ORDER BY e.created_at DESC
    `
      )
      .all() as any[];

    const sessionRows = db
      .prepare(
        `
      SELECT 
        s.id,
        s.event_id as eventId,
        s.session_title as sessionTitle,
        s.session_date as sessionDate,
        s.doors_open_time as doorsOpenTime,
        s.ticket_sale_time as ticketSaleTime,
        s.ticket_platform as ticketPlatform,
        s.ticket_tiers as ticketTiers,
        s.booking_url as bookingUrl,
        s.venue_name_override as venueName,
        a.id as attendanceId,
        a.status as attendanceStatus,
        a.seat_info as attendanceSeatInfo,
        a.ticket_type as attendanceTicketType,
        a.ticket_price as attendanceTicketPrice,
        a.currency as attendanceCurrency,
        a.rating as attendanceRating,
        a.notes as attendanceNotes,
        a.ticket_stub_url as attendanceTicketStubUrl,
        a.stub_privacy_masked as attendanceStubPrivacyMasked,
        COALESCE((SELECT COUNT(*) FROM merchandise_items m WHERE m.attendance_id = a.id), 0) as attendanceMerchCount,
        COALESCE((SELECT SUM(m.price * m.quantity) FROM merchandise_items m WHERE m.attendance_id = a.id), 0) as attendanceMerchTotalCost,
        COALESCE((SELECT COUNT(*) FROM attendance_media med WHERE med.attendance_id = a.id), 0) as attendanceMediaCount
      FROM event_sessions s
      LEFT JOIN user_attendances a ON a.session_id = s.id
      ORDER BY s.session_date ASC
    `
      )
      .all() as any[];

    // 組裝 sessions 到對應 event
    const sessionsByEvent = new Map<string, any[]>();
    for (const s of sessionRows) {
      let tiers = [];
      try {
        tiers = typeof s.ticketTiers === 'string' ? JSON.parse(s.ticketTiers) : s.ticketTiers;
      } catch {
        tiers = [];
      }

      const sessionObj = {
        id: s.id,
        sessionTitle: s.sessionTitle,
        sessionDate: s.sessionDate,
        doorsOpenTime: s.doorsOpenTime,
        ticketSaleTime: s.ticketSaleTime,
        ticketPlatform: s.ticketPlatform,
        ticketTiers: tiers,
        bookingUrl: s.bookingUrl,
        venueName: s.venueName,
        attendance: s.attendanceId
          ? {
              id: s.attendanceId,
              status: s.attendanceStatus,
              seatInfo: s.attendanceSeatInfo,
              ticketType: s.attendanceTicketType,
              ticketPrice: s.attendanceTicketPrice,
              currency: s.attendanceCurrency,
              rating: s.attendanceRating,
              notes: s.attendanceNotes,
              ticketStubUrl: s.attendanceTicketStubUrl,
              stubPrivacyMasked: Boolean(s.attendanceStubPrivacyMasked),
              merchCount: s.attendanceMerchCount || 0,
              merchTotalCost: s.attendanceMerchTotalCost || 0,
              mediaCount: s.attendanceMediaCount || 0,
            }
          : null,
      };

      if (!sessionsByEvent.has(s.eventId)) {
        sessionsByEvent.set(s.eventId, []);
      }
      sessionsByEvent.get(s.eventId)!.push(sessionObj);
    }

    const salePhaseRows = db
      .prepare(
        `
      SELECT
        p.id,
        p.event_id as eventId,
        p.session_id as sessionId,
        p.phase_name as phaseName,
        p.sale_type as saleType,
        p.sale_start as saleStart,
        p.sale_end as saleEnd,
        p.ticketing_platform as ticketingPlatform,
        p.booking_url as bookingUrl,
        p.eligibility_notes as eligibilityNotes,
        p.is_lottery as isLottery,
        p.reminder_enabled as reminderEnabled
      FROM event_sale_phases p
      ORDER BY p.sale_start ASC
    `
      )
      .all() as any[];

    const salePhasesByEvent = new Map<string, any[]>();
    for (const p of salePhaseRows) {
      if (!salePhasesByEvent.has(p.eventId)) {
        salePhasesByEvent.set(p.eventId, []);
      }
      salePhasesByEvent.get(p.eventId)!.push({
        id: p.id,
        phaseName: p.phaseName,
        saleType: p.saleType,
        saleStart: p.saleStart,
        saleEnd: p.saleEnd,
        ticketingPlatform: p.ticketingPlatform,
        bookingUrl: p.bookingUrl,
        eligibilityNotes: p.eligibilityNotes,
        isLottery: Boolean(p.isLottery),
        reminderEnabled: Boolean(p.reminderEnabled),
      });
    }

    const events = eventRows.map((e) => ({
      ...e,
      sessions: sessionsByEvent.get(e.id) || [],
      sessionsCount: (sessionsByEvent.get(e.id) || []).length,
      salePhases: salePhasesByEvent.get(e.id) || [],
    }));

    return NextResponse.json({ events });
  } catch (error) {
    const err = error as Error;
    logger.error(`查詢活動清單失敗: ${err.message}`, 'DATABASE_API', err);
    return NextResponse.json({ error: err.message, events: [] }, { status: 500 });
  }
}
