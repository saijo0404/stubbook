import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const attendanceId = searchParams.get('attendanceId');

    const db = getDefaultDatabase();

    let query = `
      SELECT 
        c.id,
        c.attendance_id as attendanceId,
        c.friend_id as friendId,
        c.companion_name as companionName,
        c.companion_role as companionRole,
        c.seat_nearby as seatNearby,
        c.notes,
        c.created_at as createdAt,
        f.friend_name as friendRegisteredName,
        f.friend_avatar as friendAvatar,
        f.relationship_tier as relationshipTier,
        f.contact_handle as contactHandle
      FROM attendance_companions c
      LEFT JOIN user_friends f ON c.friend_id = f.id
    `;
    const params: any[] = [];

    if (attendanceId) {
      query += ' WHERE c.attendance_id = ?';
      params.push(attendanceId);
    }

    query += ' ORDER BY c.created_at ASC';

    const companions = db.prepare(query).all(...params);

    return NextResponse.json({ companions });
  } catch (error) {
    const err = error as Error;
    logger.error(`查詢同行夥伴失敗: ${err.message}`, 'COMPANIONS_API', err);
    return NextResponse.json({ error: err.message, companions: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      attendanceId,
      friendId = null,
      companionName,
      companionRole = 'FAN_CLUB',
      seatNearby = null,
      notes = null,
    } = body;

    if (!attendanceId) {
      return NextResponse.json({ error: '缺少 attendanceId 參數' }, { status: 400 });
    }

    if (!companionName || !companionName.trim()) {
      return NextResponse.json({ error: '請提供同行夥伴姓名' }, { status: 400 });
    }

    const validRoles = ['COUPLE', 'BESTIE', 'FAMILY', 'FAN_CLUB', 'OTHER'];
    const safeRole = validRoles.includes(companionRole) ? companionRole : 'FAN_CLUB';

    const db = getDefaultDatabase();

    // 確認 attendance 存在
    const att = db.prepare('SELECT id FROM user_attendances WHERE id = ?').get(attendanceId);
    if (!att) {
      return NextResponse.json({ error: '對應的參戰記錄不存在' }, { status: 404 });
    }

    const insertStmt = db.prepare(`
      INSERT INTO attendance_companions (
        attendance_id, friend_id, companion_name, companion_role, seat_nearby, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const result = insertStmt.get(
      attendanceId,
      friendId || null,
      companionName.trim(),
      safeRole,
      seatNearby ? seatNearby.trim() : null,
      notes ? notes.trim() : null
    ) as any;

    logger.info(`同行夥伴已新增: ${companionName} [${safeRole}]`, 'COMPANIONS_API');

    return NextResponse.json({
      success: true,
      companion: result,
      message: '同行夥伴已成功標記！',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`新增同行夥伴失敗: ${err.message}`, 'COMPANIONS_API', err);
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
      .prepare('SELECT id, companion_name FROM attendance_companions WHERE id = ?')
      .get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: '該同行標記不存在或已刪除' }, { status: 404 });
    }

    db.prepare('DELETE FROM attendance_companions WHERE id = ?').run(id);

    logger.info(`同行夥伴已移除: ${existing.companion_name} (${id})`, 'COMPANIONS_API');

    return NextResponse.json({
      success: true,
      message: '同行夥伴標記已成功移除',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`移除同行夥伴失敗: ${err.message}`, 'COMPANIONS_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
