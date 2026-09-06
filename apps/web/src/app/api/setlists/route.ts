import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export const dynamic = 'force-dynamic';

export interface SetlistSongInput {
  name: string;
  isEncore?: boolean;
  encoreNumber?: number;
  coverOf?: string;
  info?: string;
}

/**
 * 格式化 ISO 日期字串為 Setlist.fm 所需之 dd-MM-yyyy 格式
 */
function formatSetlistFmDate(isoDateStr: string): string | null {
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action');

    // ── 支援檢索 Setlist.fm 外部 API ──────────────────────────────────────
    if (action === 'search_setlist_fm') {
      const artist = searchParams.get('artist') || '';
      const date = searchParams.get('date') || '';
      const venue = searchParams.get('venue') || '';

      const apiKey = process.env.SETLIST_FM_API_KEY;

      if (apiKey && artist.trim()) {
        try {
          const fmParams = new URLSearchParams();
          fmParams.set('artistName', artist.trim());
          if (date) {
            const formattedDate = formatSetlistFmDate(date);
            if (formattedDate) fmParams.set('date', formattedDate);
          }

          const fmRes = await fetch(
            `https://api.setlist.fm/rest/1.0/search/setlists?${fmParams.toString()}`,
            {
              headers: {
                'x-api-key': apiKey,
                Accept: 'application/json',
              },
            }
          );

          if (fmRes.ok) {
            const data = await fmRes.json();
            const setlists = (data.setlist || []).map((item: any) => {
              const songs: SetlistSongInput[] = [];

              // 解析一般曲目與安可曲
              (item.sets?.set || []).forEach((s: any) => {
                const isEncore = Boolean(s.encore);
                const encoreNum = s.encore ? Number(s.encore) : undefined;
                (s.song || []).forEach((song: any) => {
                  songs.push({
                    name: song.name,
                    isEncore,
                    encoreNumber: encoreNum,
                    coverOf: song.cover?.name || undefined,
                    info: song.info || undefined,
                  });
                });
              });

              return {
                id: item.id,
                artistName: item.artist?.name || artist,
                tourName: item.tour?.name || null,
                venueName: item.venue?.name || venue,
                sessionDate: item.eventDate || date,
                sourceUrl: item.url || null,
                songs,
              };
            });

            return NextResponse.json({ success: true, results: setlists });
          }
        } catch (fmErr) {
          logger.warn(
            `Setlist.fm API 檢索失敗，啟動智慧降級: ${(fmErr as Error).message}`,
            'SETLIST_API'
          );
        }
      }

      // 當無 API 金鑰或網路不通時之智慧範例曲目生成
      const demoSongs: SetlistSongInput[] = [
        { name: 'STAR RISING (Intro)', isEncore: false },
        { name: 'Re:START', isEncore: false },
        { name: 'Over the Horizon', isEncore: false },
        { name: 'Light of Dawn', isEncore: false },
        { name: 'Starlight Odyssey', isEncore: false, info: 'Acoustic Version' },
        { name: 'Echoes in the Night', isEncore: false },
        { name: 'Meteor Shower', isEncore: false },
        { name: 'Brand New World', isEncore: false },
        { name: 'Brave Heart', isEncore: true, encoreNumber: 1, coverOf: 'Miyazaki Ayumi' },
        { name: 'Memories of Eternity', isEncore: true, encoreNumber: 1, info: 'With Fan Choir' },
      ];

      return NextResponse.json({
        success: true,
        isFallback: true,
        results: [
          {
            id: `fm_demo_${Date.now()}`,
            artistName: artist || '演出藝人',
            tourName: 'ASIA TOUR 2026',
            venueName: venue || '台北流行音樂中心',
            sessionDate: date || new Date().toISOString().slice(0, 10),
            sourceUrl: 'https://www.setlist.fm',
            songs: demoSongs,
          },
        ],
      });
    }

    // ── 查詢場次儲存之現場歌單 ──────────────────────────────────────────
    if (!sessionId) {
      return NextResponse.json({ error: '缺少 sessionId 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    const row = db
      .prepare(
        `
      SELECT 
        id,
        session_id as sessionId,
        user_id as userId,
        artist_name as artistName,
        tour_name as tourName,
        venue_name as venueName,
        session_date as sessionDate,
        source,
        source_url as sourceUrl,
        songs,
        spotify_playlist_url as spotifyPlaylistUrl,
        apple_music_url as appleMusicUrl,
        notes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM event_setlists
      WHERE session_id = ?
    `
      )
      .get(sessionId.trim()) as any;

    if (!row) {
      return NextResponse.json({ setlist: null });
    }

    let parsedSongs: SetlistSongInput[] = [];
    try {
      parsedSongs = JSON.parse(row.songs || '[]');
    } catch {
      parsedSongs = [];
    }

    return NextResponse.json({
      setlist: {
        ...row,
        songs: parsedSongs,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`查詢現場歌單失敗: ${err.message}`, 'SETLIST_API', err);
    return NextResponse.json({ error: err.message, setlist: null }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      artistName,
      tourName = null,
      venueName = null,
      sessionDate = null,
      source = 'MANUAL',
      sourceUrl = null,
      songs = [],
      spotifyPlaylistUrl = null,
      appleMusicUrl = null,
      notes = null,
    } = body;

    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      return NextResponse.json({ error: '缺少有效的 sessionId 參數' }, { status: 400 });
    }

    if (!artistName || typeof artistName !== 'string' || !artistName.trim()) {
      return NextResponse.json({ error: '演出者名稱不得為空' }, { status: 400 });
    }

    if (!Array.isArray(songs)) {
      return NextResponse.json({ error: 'songs 必須為曲目陣列' }, { status: 400 });
    }

    // 格式化驗證各曲目
    const formattedSongs: SetlistSongInput[] = songs
      .filter((s) => s && typeof s.name === 'string' && s.name.trim().length > 0)
      .map((s) => ({
        name: s.name.trim(),
        isEncore: Boolean(s.isEncore),
        encoreNumber: s.isEncore ? Number(s.encoreNumber) || 1 : undefined,
        coverOf: s.coverOf ? String(s.coverOf).trim() : undefined,
        info: s.info ? String(s.info).trim() : undefined,
      }));

    const songsJson = JSON.stringify(formattedSongs);
    const db = getDefaultDatabase();

    const sql = `
      INSERT INTO event_setlists (
        session_id, user_id, artist_name, tour_name, venue_name, session_date,
        source, source_url, songs, spotify_playlist_url, apple_music_url, notes
      )
      VALUES (?, 'local', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id, user_id) DO UPDATE SET
        artist_name = excluded.artist_name,
        tour_name = excluded.tour_name,
        venue_name = excluded.venue_name,
        session_date = excluded.session_date,
        source = excluded.source,
        source_url = excluded.source_url,
        songs = excluded.songs,
        spotify_playlist_url = excluded.spotify_playlist_url,
        apple_music_url = excluded.apple_music_url,
        notes = excluded.notes,
        updated_at = datetime('now')
      RETURNING 
        id, session_id as sessionId, user_id as userId, artist_name as artistName,
        tour_name as tourName, venue_name as venueName, session_date as sessionDate,
        source, source_url as sourceUrl, songs,
        spotify_playlist_url as spotifyPlaylistUrl, apple_music_url as appleMusicUrl,
        notes, created_at as createdAt, updated_at as updatedAt
    `;

    const saved = db
      .prepare(sql)
      .get(
        sessionId.trim(),
        artistName.trim(),
        tourName ? String(tourName).trim() : null,
        venueName ? String(venueName).trim() : null,
        sessionDate ? String(sessionDate).trim() : null,
        source,
        sourceUrl ? String(sourceUrl).trim() : null,
        songsJson,
        spotifyPlaylistUrl ? String(spotifyPlaylistUrl).trim() : null,
        appleMusicUrl ? String(appleMusicUrl).trim() : null,
        notes ? String(notes).trim() : null
      ) as any;

    logger.info(
      `現場歌單儲存成功: ${artistName} (${formattedSongs.length} 首曲目)`,
      'SETLIST_API',
      {
        sessionId,
        songsCount: formattedSongs.length,
      }
    );

    return NextResponse.json({
      success: true,
      setlist: {
        ...saved,
        songs: formattedSongs,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`儲存現場歌單失敗: ${err.message}`, 'SETLIST_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: '缺少 sessionId 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    const result = db.prepare('DELETE FROM event_setlists WHERE session_id = ?').run(sessionId);

    if (result.changes === 0) {
      return NextResponse.json({ error: '找不到指定的現場歌單' }, { status: 404 });
    }

    logger.info(`現場歌單已刪除 (Session ID: ${sessionId})`, 'SETLIST_API');
    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    const err = error as Error;
    logger.error(`刪除現場歌單失敗: ${err.message}`, 'SETLIST_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
