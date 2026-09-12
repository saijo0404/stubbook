import { SyncResult, TrackMatchResult } from './types';
import { cleanSongTitle } from './spotify';

/**
 * 產生 YouTube Music 網頁搜尋直連深度連結
 */
export function getYoutubeMusicSearchUrl(artist: string, song: string): string {
  const query = `${artist.trim()} ${cleanSongTitle(song)}`.trim();
  return `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * 產生 YouTube Music 藝人現場演出搜尋深度連結
 */
export function getYoutubeMusicPlaylistDeepLink(artist: string, tour?: string | null): string {
  const query = `${artist.trim()} ${tour ? tour.trim() : 'Live'} full concert`.trim();
  return `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * 透過 YouTube Data API v3 檢索官方音樂或 MV 影片
 */
export async function searchYoutubeMusicVideo(options: {
  accessToken?: string;
  apiKey?: string;
  songName: string;
  artistName: string;
  fetchImpl?: typeof fetch;
}): Promise<TrackMatchResult> {
  const { accessToken, apiKey, songName, artistName, fetchImpl = fetch } = options;

  const cleanedTitle = cleanSongTitle(songName);
  const q = `${artistName.trim()} ${cleanedTitle} official audio`;

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const queryParams = new URLSearchParams({
    part: 'snippet',
    maxResults: '1',
    type: 'video',
    videoCategoryId: '10', // 10 代表 Music 音樂類別
    q,
  });
  if (apiKey && !accessToken) {
    queryParams.set('key', apiKey);
  }

  try {
    const res = await fetchImpl(
      `https://www.googleapis.com/youtube/v3/search?${queryParams.toString()}`,
      { headers }
    );

    if (res.ok) {
      const data = await res.json();
      const item = data.items?.[0];
      if (item && item.id?.videoId) {
        const videoId = item.id.videoId;
        return {
          originalSong: songName,
          status: 'MATCHED',
          matchedTitle: item.snippet?.title || cleanedTitle,
          matchedArtist: item.snippet?.channelTitle || artistName,
          uri: videoId,
          externalUrl: `https://music.youtube.com/watch?v=${videoId}`,
        };
      }
    }

    return {
      originalSong: songName,
      status: 'NOT_FOUND',
      externalUrl: getYoutubeMusicSearchUrl(artistName, songName),
      reason: 'YouTube Music 未檢索到合適音訊',
    };
  } catch (err) {
    return {
      originalSong: songName,
      status: 'NOT_FOUND',
      externalUrl: getYoutubeMusicSearchUrl(artistName, songName),
      reason: `檢索異常: ${(err as Error).message}`,
    };
  }
}

/**
 * 建立 YouTube 播放清單
 */
export async function createYoutubePlaylist(options: {
  accessToken: string;
  title: string;
  description: string;
  fetchImpl?: typeof fetch;
}): Promise<{ id: string; url: string }> {
  const { accessToken, title, description, fetchImpl = fetch } = options;

  const res = await fetchImpl(
    'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
        },
        status: {
          privacyStatus: 'private',
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || '建立 YouTube 播放清單失敗');
  }

  const data = await res.json();
  const playlistId = data.id;
  return {
    id: playlistId,
    url: `https://music.youtube.com/playlist?list=${playlistId}`,
  };
}

/**
 * 批次將曲目加入 YouTube 播放清單
 */
export async function addVideosToYoutubePlaylist(options: {
  accessToken: string;
  playlistId: string;
  videoIds: string[];
  fetchImpl?: typeof fetch;
}): Promise<boolean> {
  const { accessToken, playlistId, videoIds, fetchImpl = fetch } = options;

  for (const videoId of videoIds) {
    await fetchImpl('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      }),
    });
  }

  return true;
}

/**
 * 一鍵執行現場 Setlist 到 YouTube Music 的完整同步管線
 */
export async function syncToYoutubeMusic(options: {
  accessToken?: string;
  apiKey?: string;
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
    accessToken,
    apiKey,
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
  const playlistDesc = `由 StubBook 票根手帳自動生成之現場演出播放清單 · ${venueName || '現場'} · ${date || ''}`;

  // ── 1. 模擬模式 (Demo Mode)：當無 accessToken 或指定 isDemo 時 ──────
  if (isDemo || !accessToken) {
    const tracks: TrackMatchResult[] = songs.map((s, idx) => {
      const cleaned = cleanSongTitle(s.name);
      if (onProgress) onProgress(idx + 1, total, s.name);

      const isUnmatched = s.name.includes('(Intro)');
      if (isUnmatched) {
        return {
          originalSong: s.name,
          isEncore: s.isEncore,
          status: 'FUZZY',
          matchedTitle: `${cleaned} (Official Audio / Live)`,
          matchedArtist: artistName,
          uri: `yt_vid_${idx + 1}`,
          externalUrl: getYoutubeMusicSearchUrl(artistName, s.name),
          reason: 'YouTube Music 模糊比對成功',
        };
      }

      return {
        originalSong: s.name,
        isEncore: s.isEncore,
        status: 'MATCHED',
        matchedTitle: `${cleaned} (Official Audio)`,
        matchedArtist: artistName,
        uri: `yt_vid_${idx + 1}`,
        externalUrl: getYoutubeMusicSearchUrl(artistName, s.name),
      };
    });

    const demoPlaylistId = `demo_yt_${Date.now().toString(36)}`;
    return {
      provider: 'YOUTUBE_MUSIC',
      playlistName: playlistTitle,
      playlistId: demoPlaylistId,
      playlistUrl: `https://music.youtube.com/playlist?list=${demoPlaylistId}`,
      matchedCount: tracks.filter((t) => t.status !== 'NOT_FOUND').length,
      totalCount: total,
      tracks,
      isDemo: true,
    };
  }

  // ── 2. 真實 YouTube Data API 調用流程 ──────────────────────────────
  try {
    const matchedTracks: TrackMatchResult[] = [];
    const videoIdsToAdd: string[] = [];

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      if (onProgress) onProgress(i + 1, total, song.name);

      const match = await searchYoutubeMusicVideo({
        accessToken,
        apiKey,
        songName: song.name,
        artistName,
        fetchImpl,
      });

      match.isEncore = song.isEncore;
      matchedTracks.push(match);

      if (match.uri) {
        videoIdsToAdd.push(match.uri);
      }
    }

    const playlist = await createYoutubePlaylist({
      accessToken,
      title: playlistTitle,
      description: playlistDesc,
      fetchImpl,
    });

    if (videoIdsToAdd.length > 0) {
      await addVideosToYoutubePlaylist({
        accessToken,
        playlistId: playlist.id,
        videoIds: videoIdsToAdd,
        fetchImpl,
      });
    }

    return {
      provider: 'YOUTUBE_MUSIC',
      playlistName: playlistTitle,
      playlistId: playlist.id,
      playlistUrl: playlist.url,
      matchedCount: videoIdsToAdd.length,
      totalCount: total,
      tracks: matchedTracks,
      isDemo: false,
    };
  } catch (error) {
    const err = error as Error;
    throw new Error(`YouTube Music 同步失敗: ${err.message}`);
  }
}
