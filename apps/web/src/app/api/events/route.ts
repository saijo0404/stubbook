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
    const events = db
      .prepare(
        `
      SELECT 
        e.id,
        e.title,
        e.platform,
        e.source_url as sourceUrl,
        e.poster_url as posterUrl,
        e.created_at as createdAt,
        COUNT(s.id) as sessionsCount
      FROM events e
      LEFT JOIN event_sessions s ON s.event_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `
      )
      .all();

    return NextResponse.json({ events });
  } catch (error) {
    const err = error as Error;
    logger.error(`查詢活動清單失敗: ${err.message}`, 'DATABASE_API', err);
    return NextResponse.json({ error: err.message, events: [] }, { status: 500 });
  }
}
