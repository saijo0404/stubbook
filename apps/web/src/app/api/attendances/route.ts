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
          a.id, a.user_id as userId, a.session_id as sessionId, a.status,
          a.seat_info as seatInfo, a.ticket_type as ticketType,
          a.ticket_price as ticketPrice, a.currency, a.rating,
          a.rating_sound as ratingSound,
          a.rating_sight as ratingSight,
          a.rating_atmosphere as ratingAtmosphere,
          a.rating_performance as ratingPerformance,
          a.pros, a.cons, a.tips,
          a.queue_time_minutes as queueTimeMinutes,
          a.transfer_notes as transferNotes,
          a.notes,
          a.ticket_stub_url as ticketStubUrl, a.stub_privacy_masked as stubPrivacyMasked,
          a.created_at as createdAt, a.updated_at as updatedAt,
          COALESCE((SELECT COUNT(*) FROM merchandise_items m WHERE m.attendance_id = a.id), 0) as merchCount,
          COALESCE((SELECT SUM(m.price * m.quantity) FROM merchandise_items m WHERE m.attendance_id = a.id), 0) as merchTotalCost,
          COALESCE((SELECT COUNT(*) FROM attendance_media med WHERE med.attendance_id = a.id), 0) as mediaCount
        FROM user_attendances a
        WHERE a.session_id = ?
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
        a.rating_sound as ratingSound,
        a.rating_sight as ratingSight,
        a.rating_atmosphere as ratingAtmosphere,
        a.rating_performance as ratingPerformance,
        a.pros,
        a.cons,
        a.tips,
        a.queue_time_minutes as queueTimeMinutes,
        a.transfer_notes as transferNotes,
        a.notes,
        a.ticket_stub_url as ticketStubUrl,
        a.stub_privacy_masked as stubPrivacyMasked,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        COALESCE((SELECT COUNT(*) FROM merchandise_items m WHERE m.attendance_id = a.id), 0) as merchCount,
        COALESCE((SELECT SUM(m.price * m.quantity) FROM merchandise_items m WHERE m.attendance_id = a.id), 0) as merchTotalCost,
        COALESCE((SELECT COUNT(*) FROM attendance_media med WHERE med.attendance_id = a.id), 0) as mediaCount,
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
      ratingSound = null,
      ratingSight = null,
      ratingAtmosphere = null,
      ratingPerformance = null,
      pros = null,
      cons = null,
      tips = null,
      queueTimeMinutes = null,
      transferNotes = null,
      notes = null,
      ticketStubUrl = null,
      stubPrivacyMasked = 0,
      userId = 'local',
    } = body;

    if (!sessionId) {
      return NextResponse.json({ error: '缺少 sessionId 參數' }, { status: 400 });
    }

    const validStatuses = [
      'WANT_TO_GO',
      'TICKETING',
      'CONFIRMED',
      'ATTENDED',
      'MISSED',
      'PURCHASED',
      'WAITING_TO_BUY',
      'LOTTERY_ENTERED',
      'TRANSFERRING',
      'ABANDONED',
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: '無效的參戰狀態' }, { status: 400 });
    }

    const validTicketTypes = ['PHYSICAL', 'DIGITAL', 'WRISTBAND', 'OTHER'];
    if (!validTicketTypes.includes(ticketType)) {
      return NextResponse.json({ error: '無效的票種形式' }, { status: 400 });
    }

    const parseRating = (val: any) =>
      val !== null && val !== undefined && val !== '' ? Number(val) : null;

    const db = getDefaultDatabase();

    const upsertStmt = db.prepare(`
      INSERT INTO user_attendances (
        user_id, session_id, status, seat_info, ticket_type, ticket_price,
        currency, rating, rating_sound, rating_sight, rating_atmosphere, rating_performance,
        pros, cons, tips, queue_time_minutes, transfer_notes,
        notes, ticket_stub_url, stub_privacy_masked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, session_id) DO UPDATE SET
        status = excluded.status,
        seat_info = excluded.seat_info,
        ticket_type = excluded.ticket_type,
        ticket_price = excluded.ticket_price,
        currency = excluded.currency,
        rating = excluded.rating,
        rating_sound = excluded.rating_sound,
        rating_sight = excluded.rating_sight,
        rating_atmosphere = excluded.rating_atmosphere,
        rating_performance = excluded.rating_performance,
        pros = excluded.pros,
        cons = excluded.cons,
        tips = excluded.tips,
        queue_time_minutes = excluded.queue_time_minutes,
        transfer_notes = excluded.transfer_notes,
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
      parseRating(rating),
      parseRating(ratingSound),
      parseRating(ratingSight),
      parseRating(ratingAtmosphere),
      parseRating(ratingPerformance),
      pros || null,
      cons || null,
      tips || null,
      queueTimeMinutes !== null && queueTimeMinutes !== '' ? Number(queueTimeMinutes) : null,
      transferNotes || null,
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
