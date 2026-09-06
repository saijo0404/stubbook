import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    const db = getDefaultDatabase();

    if (sessionId) {
      const attendance = db
        .prepare(
          `
        SELECT 
          id, user_id as userId, session_id as sessionId, status,
          seat_info as seatInfo, ticket_type as ticketType,
          ticket_price as ticketPrice, currency, rating, notes,
          ticket_stub_url as ticketStubUrl, stub_privacy_masked as stubPrivacyMasked,
          created_at as createdAt, updated_at as updatedAt
        FROM user_attendances
        WHERE session_id = ?
      `
        )
        .get(sessionId);

      return NextResponse.json({ attendance: attendance || null });
    }

    const attendances = db
      .prepare(
        `
      SELECT 
        a.id,
        a.user_id as userId,
        a.session_id as sessionId,
        a.status,
        a.seat_info as seatInfo,
        a.ticket_type as ticketType,
        a.ticket_price as ticketPrice,
        a.currency,
        a.rating,
        a.notes,
        a.ticket_stub_url as ticketStubUrl,
        a.stub_privacy_masked as stubPrivacyMasked,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        s.session_title as sessionTitle,
        s.session_date as sessionDate,
        s.ticket_platform as ticketPlatform,
        s.venue_name_override as venueName,
        e.id as eventId,
        e.title as eventTitle,
        e.poster_url as posterUrl,
        e.platform as eventPlatform
      FROM user_attendances a
      JOIN event_sessions s ON a.session_id = s.id
      JOIN events e ON s.event_id = e.id
      ORDER BY s.session_date DESC
    `
      )
      .all();

    return NextResponse.json({ attendances });
  } catch (error) {
    const err = error as Error;
    logger.error(`查詢參戰記錄失敗: ${err.message}`, 'ATTENDANCE_API', err);
    return NextResponse.json({ error: err.message, attendances: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      status = 'CONFIRMED',
      seatInfo = null,
      ticketType = 'DIGITAL',
      ticketPrice = null,
      currency = 'TWD',
      rating = null,
      notes = null,
      ticketStubUrl = null,
      stubPrivacyMasked = 0,
      userId = 'local',
    } = body;

    if (!sessionId) {
      return NextResponse.json({ error: '缺少 sessionId 參數' }, { status: 400 });
    }

    const validStatuses = ['WANT_TO_GO', 'TICKETING', 'CONFIRMED', 'ATTENDED', 'MISSED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: '無效的參戰狀態' }, { status: 400 });
    }

    const validTicketTypes = ['PHYSICAL', 'DIGITAL', 'WRISTBAND', 'OTHER'];
    if (!validTicketTypes.includes(ticketType)) {
      return NextResponse.json({ error: '無效的票種形式' }, { status: 400 });
    }

    const db = getDefaultDatabase();

    const upsertStmt = db.prepare(`
      INSERT INTO user_attendances (
        user_id, session_id, status, seat_info, ticket_type, ticket_price,
        currency, rating, notes, ticket_stub_url, stub_privacy_masked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, session_id) DO UPDATE SET
        status = excluded.status,
        seat_info = excluded.seat_info,
        ticket_type = excluded.ticket_type,
        ticket_price = excluded.ticket_price,
        currency = excluded.currency,
        rating = excluded.rating,
        notes = excluded.notes,
        ticket_stub_url = excluded.ticket_stub_url,
        stub_privacy_masked = excluded.stub_privacy_masked,
        updated_at = datetime('now')
      RETURNING *
    `);

    const result = upsertStmt.get(
      userId,
      sessionId,
      status,
      seatInfo || null,
      ticketType,
      ticketPrice !== null && ticketPrice !== '' ? Number(ticketPrice) : null,
      currency,
      rating !== null && rating !== '' ? Number(rating) : null,
      notes || null,
      ticketStubUrl || null,
      stubPrivacyMasked ? 1 : 0
    ) as any;

    logger.info(`參戰手帳已記錄: Session ${sessionId} -> Status: ${status}`, 'ATTENDANCE_API');

    return NextResponse.json({
      success: true,
      attendance: result,
      message: '參戰手帳已成功儲存！',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`儲存參戰手帳失敗: ${err.message}`, 'ATTENDANCE_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const sessionId = searchParams.get('sessionId');

    if (!id && !sessionId) {
      return NextResponse.json({ error: '缺少 id 或 sessionId 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    if (id) {
      db.prepare('DELETE FROM user_attendances WHERE id = ?').run(id);
    } else if (sessionId) {
      db.prepare('DELETE FROM user_attendances WHERE session_id = ?').run(sessionId);
    }

    logger.info(`已移除參戰記錄: ${id || sessionId}`, 'ATTENDANCE_API');
    return NextResponse.json({ success: true, message: '參戰手帳已移除' });
  } catch (error) {
    const err = error as Error;
    logger.error(`刪除參戰記錄失敗: ${err.message}`, 'ATTENDANCE_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
