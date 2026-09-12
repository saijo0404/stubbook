import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const attendanceId = searchParams.get('attendanceId');

    const db = getDefaultDatabase();

    let query = `
      SELECT 
        te.id,
        te.attendance_id as attendanceId,
        te.session_id as sessionId,
        te.user_id as userId,
        te.exchange_type as exchangeType,
        te.target_name as targetName,
        te.contact_info as contactInfo,
        te.platform,
        te.my_seat as mySeat,
        te.target_seat as targetSeat,
        te.price_difference as priceDifference,
        te.currency,
        te.status,
        te.meetup_location as meetupLocation,
        te.meetup_time as meetupTime,
        te.serial_number as serialNumber,
        te.anti_fraud_checked as antiFraudChecked,
        te.notes,
        te.created_at as createdAt,
        te.updated_at as updatedAt,
        s.session_date as sessionDate,
        s.venue_name_override as venueName,
        e.title as eventTitle
      FROM ticket_exchanges te
      LEFT JOIN event_sessions s ON te.session_id = s.id
      LEFT JOIN events e ON s.event_id = e.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('te.status = ?');
      params.push(status);
    }
    if (attendanceId) {
      conditions.push('te.attendance_id = ?');
      params.push(attendanceId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY te.created_at DESC';

    const exchanges = db.prepare(query).all(...params);

    return NextResponse.json({ exchanges });
  } catch (error) {
    const err = error as Error;
    logger.error(`查詢讓換票進度失敗: ${err.message}`, 'EXCHANGES_API', err);
    return NextResponse.json({ error: err.message, exchanges: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      exchangeType = 'TRANSFER_OUT',
      targetName,
      contactInfo = null,
      platform = 'OTHER',
      mySeat = null,
      targetSeat = null,
      priceDifference = 0,
      currency = 'TWD',
      status = 'INITIATED',
      meetupLocation = null,
      meetupTime = null,
      serialNumber = null,
      notes = null,
      attendanceId = null,
      sessionId = null,
      userId = 'local',
    } = body;

    if (!targetName || !targetName.trim()) {
      return NextResponse.json({ error: '請提供讓換票對象姓名或暱稱' }, { status: 400 });
    }

    const validTypes = ['TRANSFER_OUT', 'EXCHANGE', 'SEEK_TICKET'];
    const safeType = validTypes.includes(exchangeType) ? exchangeType : 'TRANSFER_OUT';

    const validPlatforms = ['FACEBOOK', 'THREADS', 'PTT', 'DCARD', 'OFFICIAL', 'OTHER'];
    const safePlatform = validPlatforms.includes(platform) ? platform : 'OTHER';

    const validStatuses = [
      'INITIATED',
      'PAID_DEPOSIT',
      'IN_PERSON_MEETUP',
      'TICKET_RECEIVED',
      'COMPLETED',
      'CANCELLED',
    ];
    const safeStatus = validStatuses.includes(status) ? status : 'INITIATED';

    const db = getDefaultDatabase();

    const insertStmt = db.prepare(`
      INSERT INTO ticket_exchanges (
        attendance_id, session_id, user_id, exchange_type, target_name,
        contact_info, platform, my_seat, target_seat, price_difference,
        currency, status, meetup_location, meetup_time, serial_number,
        anti_fraud_checked, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      RETURNING *
    `);

    const result = insertStmt.get(
      attendanceId || null,
      sessionId || null,
      userId,
      safeType,
      targetName.trim(),
      contactInfo ? contactInfo.trim() : null,
      safePlatform,
      mySeat ? mySeat.trim() : null,
      targetSeat ? targetSeat.trim() : null,
      Number(priceDifference) || 0,
      currency,
      safeStatus,
      meetupLocation ? meetupLocation.trim() : null,
      meetupTime ? meetupTime.trim() : null,
      serialNumber ? serialNumber.trim() : null,
      notes ? notes.trim() : null
    ) as any;

    logger.info(`讓換票進度已建立: [${safeType}] 與 ${targetName}`, 'EXCHANGES_API');

    return NextResponse.json({
      success: true,
      exchange: result,
      message: '讓換票流轉記錄已建立！',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`建立讓換票進度失敗: ${err.message}`, 'EXCHANGES_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      status,
      antiFraudChecked,
      meetupLocation,
      meetupTime,
      serialNumber,
      priceDifference,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少 id 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();

    const existing = db.prepare('SELECT * FROM ticket_exchanges WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: '找不到指定的讓換票記錄' }, { status: 404 });
    }

    const validStatuses = [
      'INITIATED',
      'PAID_DEPOSIT',
      'IN_PERSON_MEETUP',
      'TICKET_RECEIVED',
      'COMPLETED',
      'CANCELLED',
    ];
    const safeStatus = status && validStatuses.includes(status) ? status : existing.status;

    const updateStmt = db.prepare(`
      UPDATE ticket_exchanges
      SET 
        status = ?,
        anti_fraud_checked = ?,
        meetup_location = ?,
        meetup_time = ?,
        serial_number = ?,
        price_difference = ?,
        notes = ?,
        updated_at = datetime('now')
      WHERE id = ?
      RETURNING *
    `);

    const updated = updateStmt.get(
      safeStatus,
      antiFraudChecked !== undefined ? (antiFraudChecked ? 1 : 0) : existing.anti_fraud_checked,
      meetupLocation !== undefined
        ? meetupLocation
          ? meetupLocation.trim()
          : null
        : existing.meetup_location,
      meetupTime !== undefined ? (meetupTime ? meetupTime.trim() : null) : existing.meetup_time,
      serialNumber !== undefined
        ? serialNumber
          ? serialNumber.trim()
          : null
        : existing.serial_number,
      priceDifference !== undefined ? Number(priceDifference) : existing.price_difference,
      notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      id
    ) as any;

    logger.info(`讓換票狀態已更新: ${updated.target_name} -> ${safeStatus}`, 'EXCHANGES_API');

    return NextResponse.json({
      success: true,
      exchange: updated,
      message: '讓換票狀態已更新！',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`更新讓換票進度失敗: ${err.message}`, 'EXCHANGES_API', err);
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

    const existing = db
      .prepare('SELECT id, target_name FROM ticket_exchanges WHERE id = ?')
      .get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: '該記錄不存在或已刪除' }, { status: 404 });
    }

    db.prepare('DELETE FROM ticket_exchanges WHERE id = ?').run(id);

    logger.info(`讓換票記錄已刪除: ${existing.target_name} (${id})`, 'EXCHANGES_API');

    return NextResponse.json({
      success: true,
      message: '讓換票記錄已成功刪除',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`刪除讓換票記錄失敗: ${err.message}`, 'EXCHANGES_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
