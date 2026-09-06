import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

const VALID_MEDIA_TYPES = ['PHOTO', 'VIDEO', 'AUDIO'] as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const attendanceId = searchParams.get('attendanceId');

    if (!attendanceId) {
      return NextResponse.json({ error: '缺少 attendanceId 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();

    const media = db
      .prepare(
        `
      SELECT 
        id,
        attendance_id as attendanceId,
        user_id as userId,
        media_url as mediaUrl,
        media_type as mediaType,
        captured_at as capturedAt,
        caption,
        created_at as createdAt
      FROM attendance_media
      WHERE attendance_id = ?
      ORDER BY COALESCE(captured_at, created_at) ASC, created_at ASC
    `
      )
      .all(attendanceId) as Array<{
      id: string;
      attendanceId: string;
      userId: string;
      mediaUrl: string;
      mediaType: string;
      capturedAt: string | null;
      caption: string | null;
      createdAt: string;
    }>;

    return NextResponse.json({
      media,
      count: media.length,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`查詢多媒體記錄失敗: ${err.message}`, 'MEDIA_API', err);
    return NextResponse.json({ error: err.message, media: [], count: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id = null,
      attendanceId,
      mediaUrl,
      mediaType = 'PHOTO',
      capturedAt = null,
      caption = null,
    } = body;

    if (!attendanceId) {
      return NextResponse.json({ error: '缺少 attendanceId 參數' }, { status: 400 });
    }

    if (!mediaUrl || typeof mediaUrl !== 'string' || !mediaUrl.trim()) {
      return NextResponse.json({ error: '媒體連結不得為空' }, { status: 400 });
    }

    if (!VALID_MEDIA_TYPES.includes(mediaType)) {
      return NextResponse.json({ error: '無效的媒體類型' }, { status: 400 });
    }

    const trimmedCaption = typeof caption === 'string' ? caption.trim() : null;
    const db = getDefaultDatabase();

    if (id) {
      const updated = db
        .prepare(
          `
        UPDATE attendance_media
        SET 
          media_url = ?,
          media_type = ?,
          captured_at = ?,
          caption = ?
        WHERE id = ? AND attendance_id = ?
        RETURNING 
          id, attendance_id as attendanceId, media_url as mediaUrl,
          media_type as mediaType, captured_at as capturedAt, caption, created_at as createdAt
      `
        )
        .get(mediaUrl.trim(), mediaType, capturedAt, trimmedCaption, id, attendanceId);

      logger.info(`現場多媒體記錄已更新: ${mediaType} (ID: ${id})`, 'MEDIA_API');
      return NextResponse.json({ item: updated });
    } else {
      const inserted = db
        .prepare(
          `
        INSERT INTO attendance_media (attendance_id, media_url, media_type, captured_at, caption)
        VALUES (?, ?, ?, ?, ?)
        RETURNING 
          id, attendance_id as attendanceId, media_url as mediaUrl,
          media_type as mediaType, captured_at as capturedAt, caption, created_at as createdAt
      `
        )
        .get(attendanceId, mediaUrl.trim(), mediaType, capturedAt, trimmedCaption);

      logger.info(`現場多媒體記錄已新增: ${mediaType}`, 'MEDIA_API', { attendanceId });
      return NextResponse.json({ item: inserted }, { status: 201 });
    }
  } catch (error) {
    const err = error as Error;
    logger.error(`儲存現場多媒體記錄失敗: ${err.message}`, 'MEDIA_API', err);
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
    const result = db.prepare(`DELETE FROM attendance_media WHERE id = ?`).run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: '找不到指定的多媒體記錄' }, { status: 404 });
    }

    logger.info(`現場多媒體記錄已刪除 (ID: ${id})`, 'MEDIA_API');
    return NextResponse.json({ success: true, id });
  } catch (error) {
    const err = error as Error;
    logger.error(`刪除現場多媒體記錄失敗: ${err.message}`, 'MEDIA_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
