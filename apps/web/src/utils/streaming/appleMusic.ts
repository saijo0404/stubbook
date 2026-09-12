import { SyncResult, TrackMatchResult } from './types';
import { cleanSongTitle } from './spotify';

/**
 * 產生 Apple Music 網頁搜尋直連深度連結 (Deep Link)
 */
export function getAppleMusicSearchUrl(artist: string, song: string): string {
  const query = `${artist.trim()} ${cleanSongTitle(song)}`.trim();
  return `https://music.apple.com/search?term=${encodeURIComponent(query)}`;
}

/**
 * 產生 Apple Music 演出專輯或巡演搜尋深度連結
 */
export function getAppleMusicSearchPlaylistDeepLink(artist: string, tour?: string | null): string {
  const query = `${artist.trim()} ${tour ? tour.trim() : 'Live'}`.trim();
  return `https://music.apple.com/search?term=${encodeURIComponent(query)}`;
}

/**
 * 透過 Apple Music API (MusicKit) 檢索歌曲曲目
 */
export async function searchAppleMusicTrack(options: {
  developerToken: string;
  userToken?: string;
  storefront?: string;
  songName: string;
  artistName: string;
  fetchImpl?: typeof fetch;
}): Promise<TrackMatchResult> {
  const {
    developerToken,
    userToken,
    storefront = 'tw',
    songName,
    artistName,
    fetchImpl = fetch,
  } = options;

  const cleanedTitle = cleanSongTitle(songName);
  const term = `${artistName.trim()} ${cleanedTitle}`.trim();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${developerToken}`,
  };
  if (userToken) {
    headers['Music-User-Token'] = userToken;
  }

  try {
    const url = `https://api.music.apple.com/v1/catalog/${encodeURIComponent(
      storefront
    )}/search?types=songs&term=${encodeURIComponent(term)}&limit=1`;

    const res = await fetchImpl(url, { headers });
    if (res.ok) {
      const data = await res.json();
      const song = data.results?.songs?.data?.[0];
      if (song) {
        return {
          originalSong: songName,
          status: 'MATCHED',
          matchedTitle: song.attributes?.name || cleanedTitle,
          matchedArtist: song.attributes?.artistName || artistName,
          matchedAlbum: song.attributes?.albumName,
          uri: song.id,
          externalUrl: song.attributes?.url || getAppleMusicSearchUrl(artistName, songName),
          previewUrl: song.attributes?.previews?.[0]?.url || null,
        };
      }
    }

    return {
      originalSong: songName,
      status: 'NOT_FOUND',
      externalUrl: getAppleMusicSearchUrl(artistName, songName),
      reason: 'Apple Music Catalog 未檢索到完全相符曲目',
    };
  } catch (err) {
    return {
      originalSong: songName,
      status: 'NOT_FOUND',
      externalUrl: getAppleMusicSearchUrl(artistName, songName),
      reason: `檢索失敗: ${(err as Error).message}`,
    };
  }
}

/**
 * 建立使用者專屬 Apple Music 個人資料庫歌單 (Library Playlist)
 */
export async function createAppleMusicLibraryPlaylist(options: {
  developerToken: string;
  userToken: string;
  name: string;
  description?: string;
  trackIds: string[];
  fetchImpl?: typeof fetch;
}): Promise<{ id: string; url: string }> {
  const { developerToken, userToken, name, description, trackIds, fetchImpl = fetch } = options;

  const tracksData = trackIds.map((id) => ({
    id,
    type: 'songs',
  }));

  const payload = {
    attributes: {
      name,
      description: description || '由 StubBook 自動生成之現場 Setlist 播放清單',
    },
    relationships: {
      tracks: {
        data: tracksData,
      },
    },
  };

  const res = await fetchImpl('https://api.music.apple.com/v1/me/library/playlists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${developerToken}`,
      'Music-User-Token': userToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.errors?.[0]?.detail || '建立 Apple Music 歌單失敗');
  }

  const data = await res.json();
  const playlistId = data.data?.[0]?.id || `am_${Date.now()}`;
  return {
    id: playlistId,
    url: `https://music.apple.com/library/playlist/${playlistId}`,
  };
}

/**
 * 一鍵執行現場 Setlist 到 Apple Music 的完整同步管線
 */
export async function syncToAppleMusic(options: {
  developerToken?: string;
  userToken?: string;
  storefront?: string;
  songs: Array<{ name: string; isEncore?: boolean; info?: string }>;
  artistName: string;
  tourName?: string | null;
  venueName?: string | null;
  date?: string | null;
  isDemo?: boolean;
  onProgress?: (current: number, total: number, song: string) => void;
  fetchImpl?: typeof fetch;
}): Promise<SyncResult> {
  const {
    developerToken,
    userToken,
    storefront = 'tw',
    songs,
    artistName,
    tourName,
    venueName,
    date,
    isDemo = false,
    onProgress,
    fetchImpl = fetch,
  } = options;

  const total = songs.length;
  const playlistTitle = `${artistName} ${tourName || '現場演唱會'} 現場歌單`;
  const playlistDesc = `由 StubBook 票根手帳自動生成 · ${venueName || '現場'} · ${date || ''}`;

  // ── 1. 模擬 / 無 Token 快速建立模式 ────────────────────────────────
  if (isDemo || !developerToken || !userToken) {
    const tracks: TrackMatchResult[] = songs.map((s, idx) => {
      const cleaned = cleanSongTitle(s.name);
      if (onProgress) onProgress(idx + 1, total, s.name);

      const isUnmatched = s.name.includes('(Intro)');
      if (isUnmatched) {
        return {
          originalSong: s.name,
          isEncore: s.isEncore,
          status: 'FUZZY',
          matchedTitle: `${cleaned} (Live)`,
          matchedArtist: artistName,
          matchedAlbum: tourName || 'Live Concert Special',
          uri: `am_song_${idx + 1}`,
          externalUrl: getAppleMusicSearchUrl(artistName, s.name),
          reason: 'Apple Music 模糊比對成功',
        };
      }

      return {
        originalSong: s.name,
        isEncore: s.isEncore,
        status: 'MATCHED',
        matchedTitle: cleaned,
        matchedArtist: artistName,
        matchedAlbum: 'Studio Album',
        uri: `am_song_${idx + 1}`,
        externalUrl: getAppleMusicSearchUrl(artistName, s.name),
      };
    });

    const demoPlaylistId = `demo_am_${Date.now().toString(36)}`;
    return {
      provider: 'APPLE_MUSIC',
      playlistName: playlistTitle,
      playlistId: demoPlaylistId,
      playlistUrl: `https://music.apple.com/search?term=${encodeURIComponent(
        `${artistName} ${tourName || 'Setlist'}`
      )}`,
      matchedCount: tracks.filter((t) => t.status !== 'NOT_FOUND').length,
      totalCount: total,
      tracks,
      isDemo: true,
    };
  }

  // ── 2. 真實 Apple Music API 調用流程 ───────────────────────────────
  try {
    const matchedTracks: TrackMatchResult[] = [];
    const matchedTrackIds: string[] = [];

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      if (onProgress) onProgress(i + 1, total, song.name);

      const match = await searchAppleMusicTrack({
        developerToken,
        userToken,
        storefront,
        songName: song.name,
        artistName,
        fetchImpl,
      });

      match.isEncore = song.isEncore;
      matchedTracks.push(match);

      if (match.uri) {
        matchedTrackIds.push(match.uri);
      }
    }

    const playlist = await createAppleMusicLibraryPlaylist({
      developerToken,
      userToken,
      name: playlistTitle,
      description: playlistDesc,
      trackIds: matchedTrackIds,
      fetchImpl,
    });

    return {
      provider: 'APPLE_MUSIC',
      playlistName: playlistTitle,
      playlistId: playlist.id,
      playlistUrl: playlist.url,
      matchedCount: matchedTrackIds.length,
      totalCount: total,
      tracks: matchedTracks,
      isDemo: false,
    };
  } catch (error) {
    const err = error as Error;
    throw new Error(`Apple Music 同步失敗: ${err.message}`);
  }
}
