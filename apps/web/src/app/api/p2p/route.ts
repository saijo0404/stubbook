import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase, P2PStubPacket } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const attendanceId = searchParams.get('attendanceId');
    const senderName = searchParams.get('senderName') || '推友';

    if (!attendanceId) {
      return NextResponse.json({ error: '缺少 attendanceId 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();

    const record = db
      .prepare(
        `
      SELECT 
        a.id as attendanceId,
        a.session_id as sessionId,
        a.notes,
        a.pros,
        a.tips,
        s.session_date as sessionDate,
        s.doors_open_time as doorsOpenTime,
        s.ticket_platform as ticketPlatform,
        s.venue_name_override as venueName,
        e.id as eventId,
        e.title as eventTitle,
        e.tour_name as tourName,
        e.poster_url as posterUrl,
        COALESCE(e.organizer, e.title) as artistName
      FROM user_attendances a
      JOIN event_sessions s ON a.session_id = s.id
      JOIN events e ON s.event_id = e.id
      WHERE a.id = ?
    `
      )
      .get(attendanceId) as any;

    if (!record) {
      return NextResponse.json({ error: '找不到指定的參戰手帳記錄' }, { status: 404 });
    }

    // 取得 Setlist
    const setlistRow = db
      .prepare('SELECT songs FROM event_setlists WHERE session_id = ?')
      .get(record.sessionId) as any;

    let setlists: Array<{
      songOrder: number;
      songName: string;
      originalArtist?: string;
      isEncore: boolean;
    }> = [];

    if (setlistRow && setlistRow.songs) {
      try {
        const parsed = JSON.parse(setlistRow.songs);
        if (Array.isArray(parsed)) {
          setlists = parsed.map((s: any, idx: number) => ({
            songOrder: idx + 1,
            songName: s.name || s.songName || `Track ${idx + 1}`,
            originalArtist: s.originalArtist || undefined,
            isEncore: Boolean(s.isEncore),
          }));
        }
      } catch {
        // ignore
      }
    }

    // 格式化 P2P 分享封包（去除個資與條碼敏感資料）
    const packet: P2PStubPacket = {
      version: '1.0.0',
      senderName: senderName.trim(),
      sharedAt: new Date().toISOString(),
      event: {
        title: record.eventTitle,
        tourName: record.tourName || undefined,
        posterUrl: record.posterUrl || undefined,
        artistName: record.artistName,
        venueName: record.venueName || '未知場館',
        sessionDate: record.sessionDate,
        doorsOpenTime: record.doorsOpenTime || undefined,
        ticketPlatform: record.ticketPlatform || undefined,
      },
      setlist:
        setlists.length > 0
          ? setlists.map((s) => ({
              songOrder: s.songOrder,
              songName: s.songName,
              originalArtist: s.originalArtist || undefined,
              isEncore: Boolean(s.isEncore),
            }))
          : undefined,
      sharedNotes: record.notes || record.pros || record.tips || undefined,
    };

    const jsonString = JSON.stringify(packet);
    const encoded = `stubbook-p2p://${Buffer.from(jsonString, 'utf-8').toString('base64')}`;

    logger.info(`P2P 快傳封包已生成: ${record.eventTitle} (${attendanceId})`, 'P2P_API');

    return NextResponse.json({
      success: true,
      packet,
      encoded,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`生成 P2P 封包失敗: ${err.message}`, 'P2P_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let packet: P2PStubPacket | null = body.packet || null;
    const { encodedPayload, markAsCompanion = true, userId = 'local' } = body;

    // 若傳入字串則進行解碼
    if (!packet && encodedPayload) {
      let rawBase64 = encodedPayload.trim();
      if (rawBase64.startsWith('stubbook-p2p://')) {
        rawBase64 = rawBase64.replace('stubbook-p2p://', '');
      }
      const decodedJson = Buffer.from(rawBase64, 'base64').toString('utf-8');
      packet = JSON.parse(decodedJson);
    }

    if (!packet || !packet.event || !packet.event.title || !packet.event.sessionDate) {
      return NextResponse.json({ error: '無效的 P2P 票根封包內容' }, { status: 400 });
    }

    const db = getDefaultDatabase();

    // 1. 查找或建立 Event
    let event = db.prepare('SELECT id FROM events WHERE title = ?').get(packet.event.title) as any;

    if (!event) {
      const insertEvent = db.prepare(`
        INSERT INTO events (title, tour_name, poster_url, organizer, source_url)
        VALUES (?, ?, ?, ?, ?)
        RETURNING id
      `);
      event = insertEvent.get(
        packet.event.title,
        packet.event.tourName || null,
        packet.event.posterUrl || null,
        packet.event.artistName || null,
        'p2p://' + (packet.senderName || 'peer')
      ) as any;
    }

    // 2. 查找或建立 EventSession
    let session = db
      .prepare('SELECT id FROM event_sessions WHERE event_id = ? AND session_date = ?')
      .get(event.id, packet.event.sessionDate) as any;

    if (!session) {
      const insertSession = db.prepare(`
        INSERT INTO event_sessions (
          event_id, session_date, doors_open_time, ticket_platform, venue_name_override
        ) VALUES (?, ?, ?, ?, ?)
        RETURNING id
      `);
      session = insertSession.get(
        event.id,
        packet.event.sessionDate,
        packet.event.doorsOpenTime || null,
        packet.event.ticketPlatform || 'OTHER',
        packet.event.venueName || '未知場館'
      ) as any;
    }

    // 3. 查找或建立 UserAttendance
    let attendance = db
      .prepare('SELECT id FROM user_attendances WHERE user_id = ? AND session_id = ?')
      .get(userId, session.id) as any;

    if (!attendance) {
      const insertAtt = db.prepare(`
        INSERT INTO user_attendances (
          user_id, session_id, status, notes, privacy_level
        ) VALUES (?, ?, 'ATTENDED', ?, 'PRIVATE')
        RETURNING id
      `);
      attendance = insertAtt.get(
        userId,
        session.id,
        packet.sharedNotes
          ? `[來自好友 ${packet.senderName} 快傳]\n${packet.sharedNotes}`
          : `[來自好友 ${packet.senderName} 快傳]`
      ) as any;
    }

    // 4. 匯入歌單 (若尚未存在)
    if (packet.setlist && packet.setlist.length > 0) {
      const existingSetlist = db
        .prepare('SELECT id FROM event_setlists WHERE session_id = ?')
        .get(session.id) as any;

      if (!existingSetlist) {
        const songsJson = JSON.stringify(
          packet.setlist.map((s) => ({
            name: s.songName,
            isEncore: s.isEncore,
            originalArtist: s.originalArtist,
          }))
        );

        db.prepare(
          `
          INSERT INTO event_setlists (session_id, user_id, artist_name, session_date, source, songs)
          VALUES (?, ?, ?, ?, 'COMMUNITY', ?)
        `
        ).run(session.id, userId, packet.event.artistName, packet.event.sessionDate, songsJson);
      }
    }

    // 5. 自動標記為同行夥伴
    if (markAsCompanion && packet.senderName) {
      // 檢查好友庫是否有同名好友
      const friend = db
        .prepare('SELECT id FROM user_friends WHERE friend_name = ?')
        .get(packet.senderName) as any;

      // 檢查是否已標記
      const existingComp = db
        .prepare(
          'SELECT id FROM attendance_companions WHERE attendance_id = ? AND companion_name = ?'
        )
        .get(attendance.id, packet.senderName) as any;

      if (!existingComp) {
        db.prepare(
          `
          INSERT INTO attendance_companions (
            attendance_id, friend_id, companion_name, companion_role, notes
          ) VALUES (?, ?, ?, 'BESTIE', '現場 P2P 票根近場快傳同步')
        `
        ).run(attendance.id, friend ? friend.id : null, packet.senderName);
      }
    }

    logger.info(`P2P 票根已成功入庫: ${packet.event.title} (${attendance.id})`, 'P2P_API');

    return NextResponse.json({
      success: true,
      eventId: event.id,
      sessionId: session.id,
      attendanceId: attendance.id,
      message: `成功接收 ${packet.senderName} 分享的《${packet.event.title}》參戰票根！`,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`接收 P2P 封包失敗: ${err.message}`, 'P2P_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
