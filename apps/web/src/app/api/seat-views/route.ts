import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

const VALID_VISIBILITY_TYPES = ['CLEAR', 'GOOD', 'PARTIAL', 'OBSTRUCTED', 'DISTANCE'] as const;
type VisibilityType = (typeof VALID_VISIBILITY_TYPES)[number];

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const venue = searchParams.get('venue');
    const section = searchParams.get('section');
    const sessionId = searchParams.get('sessionId');
    const query = searchParams.get('query');

    const db = getDefaultDatabase();

    const conditions: string[] = [];
    const params: any[] = [];

    if (venue && venue.trim()) {
      conditions.push('LOWER(venue_name) LIKE ?');
      params.push(`%${venue.trim().toLowerCase()}%`);
    }

    if (section && section.trim()) {
      conditions.push('LOWER(section) LIKE ?');
      params.push(`%${section.trim().toLowerCase()}%`);
    }

    if (sessionId && sessionId.trim()) {
      conditions.push('session_id = ?');
      params.push(sessionId.trim());
    }

    if (query && query.trim()) {
      const q = `%${query.trim().toLowerCase()}%`;
      conditions.push(
        '(LOWER(venue_name) LIKE ? OR LOWER(section) LIKE ? OR LOWER(COALESCE(notes, "")) LIKE ? OR LOWER(COALESCE(event_title, "")) LIKE ?)'
      );
      params.push(q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        id,
        user_id as userId,
        venue_name as venueName,
        venue_id as venueId,
        session_id as sessionId,
        attendance_id as attendanceId,
        event_title as eventTitle,
        section,
        row_number as rowNumber,
        seat_number as seatNumber,
        photo_url as photoUrl,
        view_rating as viewRating,
        visibility,
        notes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM seat_view_photos
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const views = db.prepare(sql).all(...params);

    // 取得所有具有視野照片的場館清單與數量統計
    const venueStats = db
      .prepare(
        `
      SELECT venue_name as venueName, COUNT(*) as count
      FROM seat_view_photos
      GROUP BY venue_name
      ORDER BY count DESC, venue_name ASC
    `
      )
      .all() as Array<{ venueName: string; count: number }>;

    return NextResponse.json({
      views,
      count: views.length,
      venues: venueStats,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`查詢視角資料庫失敗: ${err.message}`, 'SEAT_VIEW_API', err);
    return NextResponse.json(
      { error: err.message, views: [], count: 0, venues: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id = null,
      venueName,
      venueId = null,
      sessionId = null,
      attendanceId = null,
      eventTitle = null,
      section,
      rowNumber = null,
      seatNumber = null,
      photoUrl,
      viewRating = 5,
      visibility = 'CLEAR',
      notes = null,
    } = body;

    if (!venueName || typeof venueName !== 'string' || !venueName.trim()) {
      return NextResponse.json({ error: '場館名稱不得為空' }, { status: 400 });
    }

    if (!section || typeof section !== 'string' || !section.trim()) {
      return NextResponse.json({ error: '座位分區 (如特A區、黃2C區) 不得為空' }, { status: 400 });
    }

    if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.trim()) {
      return NextResponse.json({ error: '視野照片連結不得為空' }, { status: 400 });
    }

    if (visibility && !VALID_VISIBILITY_TYPES.includes(visibility as VisibilityType)) {
      return NextResponse.json({ error: '無效的視野能見度狀態' }, { status: 400 });
    }

    const ratingNum = viewRating ? Math.min(5, Math.max(1, Number(viewRating))) : 5;
    const trimmedNotes = typeof notes === 'string' ? notes.trim() : null;
    const trimmedRow = typeof rowNumber === 'string' ? rowNumber.trim() : null;
    const trimmedSeat = typeof seatNumber === 'string' ? seatNumber.trim() : null;
    const trimmedEventTitle = typeof eventTitle === 'string' ? eventTitle.trim() : null;

    const db = getDefaultDatabase();

    if (id) {
      const updated = db
        .prepare(
          `
        UPDATE seat_view_photos
        SET 
          venue_name = ?,
          venue_id = ?,
          session_id = ?,
          attendance_id = ?,
          event_title = ?,
          section = ?,
          row_number = ?,
          seat_number = ?,
          photo_url = ?,
          view_rating = ?,
          visibility = ?,
          notes = ?
        WHERE id = ?
        RETURNING 
          id, user_id as userId, venue_name as venueName, venue_id as venueId,
          session_id as sessionId, attendance_id as attendanceId, event_title as eventTitle,
          section, row_number as rowNumber, seat_number as seatNumber,
          photo_url as photoUrl, view_rating as viewRating, visibility, notes,
          created_at as createdAt, updated_at as updatedAt
      `
        )
        .get(
          venueName.trim(),
          venueId,
          sessionId,
          attendanceId,
          trimmedEventTitle,
          section.trim(),
          trimmedRow,
          trimmedSeat,
          photoUrl.trim(),
          ratingNum,
          visibility,
          trimmedNotes,
          id
        );

      if (!updated) {
        return NextResponse.json({ error: '找不到指定的視野照片記錄' }, { status: 404 });
      }

      logger.info(`視野照片記錄已更新: ${venueName} - ${section} (ID: ${id})`, 'SEAT_VIEW_API');
      return NextResponse.json({ item: updated });
    } else {
      const inserted = db
        .prepare(
          `
        INSERT INTO seat_view_photos (
          venue_name, venue_id, session_id, attendance_id, event_title,
          section, row_number, seat_number, photo_url, view_rating, visibility, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING 
          id, user_id as userId, venue_name as venueName, venue_id as venueId,
          session_id as sessionId, attendance_id as attendanceId, event_title as eventTitle,
          section, row_number as rowNumber, seat_number as seatNumber,
          photo_url as photoUrl, view_rating as viewRating, visibility, notes,
          created_at as createdAt, updated_at as updatedAt
      `
        )
        .get(
          venueName.trim(),
          venueId,
          sessionId,
          attendanceId,
          trimmedEventTitle,
          section.trim(),
          trimmedRow,
          trimmedSeat,
          photoUrl.trim(),
          ratingNum,
          visibility,
          trimmedNotes
        );

      logger.info(
        `視野照片記錄已新增: ${venueName} - ${section} (排: ${trimmedRow || '無'})`,
        'SEAT_VIEW_API'
      );
      return NextResponse.json({ item: inserted }, { status: 201 });
    }
  } catch (error) {
    const err = error as Error;
    logger.error(`儲存視野照片記錄失敗: ${err.message}`, 'SEAT_VIEW_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少 id 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    const result = db.prepare(`DELETE FROM seat_view_photos WHERE id = ?`).run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: '找不到指定的視野照片記錄' }, { status: 404 });
    }

    logger.info(`視野照片記錄已刪除 (ID: ${id})`, 'SEAT_VIEW_API');
    return NextResponse.json({ success: true, id });
  } catch (error) {
    const err = error as Error;
    logger.error(`刪除視野照片記錄失敗: ${err.message}`, 'SEAT_VIEW_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
