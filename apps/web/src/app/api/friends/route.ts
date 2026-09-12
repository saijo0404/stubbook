import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tier = searchParams.get('tier');

    const db = getDefaultDatabase();

    let query = `
      SELECT 
        f.id,
        f.user_id as userId,
        f.friend_name as friendName,
        f.friend_avatar as friendAvatar,
        f.relationship_tier as relationshipTier,
        f.contact_handle as contactHandle,
        f.notes,
        f.created_at as createdAt,
        f.updated_at as updatedAt,
        COALESCE((
          SELECT COUNT(DISTINCT c.attendance_id) 
          FROM attendance_companions c 
          WHERE c.friend_id = f.id
        ), 0) as attendedCount
      FROM user_friends f
    `;
    const params: any[] = [];

    if (tier && ['FRIEND', 'CLOSE_FRIEND'].includes(tier)) {
      query += ' WHERE f.relationship_tier = ?';
      params.push(tier);
    }

    query += ' ORDER BY attendedCount DESC, f.created_at DESC';

    const friends = db.prepare(query).all(...params);

    return NextResponse.json({ friends });
  } catch (error) {
    const err = error as Error;
    logger.error(`查詢好友圈失敗: ${err.message}`, 'FRIENDS_API', err);
    return NextResponse.json({ error: err.message, friends: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      friendName,
      friendAvatar = '👤',
      relationshipTier = 'FRIEND',
      contactHandle = null,
      notes = null,
      userId = 'local',
    } = body;

    if (!friendName || !friendName.trim()) {
      return NextResponse.json({ error: '請提供好友名稱' }, { status: 400 });
    }

    const validTiers = ['FRIEND', 'CLOSE_FRIEND'];
    const safeTier = validTiers.includes(relationshipTier) ? relationshipTier : 'FRIEND';

    const db = getDefaultDatabase();

    const insertStmt = db.prepare(`
      INSERT INTO user_friends (
        user_id, friend_name, friend_avatar, relationship_tier, contact_handle, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const result = insertStmt.get(
      userId,
      friendName.trim(),
      friendAvatar || '👤',
      safeTier,
      contactHandle ? contactHandle.trim() : null,
      notes ? notes.trim() : null
    ) as any;

    logger.info(`好友已新增: ${friendName} [${safeTier}]`, 'FRIENDS_API');

    return NextResponse.json({
      success: true,
      friend: result,
      message: '好友已成功新增至好友名冊！',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`新增好友失敗: ${err.message}`, 'FRIENDS_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, friendName, friendAvatar, relationshipTier, contactHandle, notes } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少好友 id 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();

    const existing = db.prepare('SELECT * FROM user_friends WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: '找不到指定的好友資料' }, { status: 404 });
    }

    const validTiers = ['FRIEND', 'CLOSE_FRIEND'];
    const safeTier =
      relationshipTier && validTiers.includes(relationshipTier)
        ? relationshipTier
        : existing.relationship_tier;

    const updateStmt = db.prepare(`
      UPDATE user_friends
      SET 
        friend_name = ?,
        friend_avatar = ?,
        relationship_tier = ?,
        contact_handle = ?,
        notes = ?,
        updated_at = datetime('now')
      WHERE id = ?
      RETURNING *
    `);

    const updated = updateStmt.get(
      friendName !== undefined ? friendName.trim() : existing.friend_name,
      friendAvatar !== undefined ? friendAvatar : existing.friend_avatar,
      safeTier,
      contactHandle !== undefined
        ? contactHandle
          ? contactHandle.trim()
          : null
        : existing.contact_handle,
      notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      id
    ) as any;

    logger.info(`好友資訊已更新: ${updated.friend_name}`, 'FRIENDS_API');

    return NextResponse.json({
      success: true,
      friend: updated,
      message: '好友資料已成功更新！',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`更新好友失敗: ${err.message}`, 'FRIENDS_API', err);
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
      .prepare('SELECT id, friend_name FROM user_friends WHERE id = ?')
      .get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: '該好友不存在或已刪除' }, { status: 404 });
    }

    db.prepare('DELETE FROM user_friends WHERE id = ?').run(id);

    logger.info(`好友已刪除: ${existing.friend_name} (${id})`, 'FRIENDS_API');

    return NextResponse.json({
      success: true,
      message: '好友已自名冊中移除',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`刪除好友失敗: ${err.message}`, 'FRIENDS_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
