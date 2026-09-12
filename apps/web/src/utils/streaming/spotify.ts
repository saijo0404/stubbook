import { SyncResult, TrackMatchResult } from './types';

/**
 * 智慧曲目名稱去雜訊演算法
 *
 * 排除現場演出常見之備註標籤，例如：
 * - (Live), [Live in Tokyo 2026]
 * - (Acoustic Version), [Acoustic]
 * - (Intro), (Outro), (Encore)
 * - (Remastered 2024)
 * - (feat. XYZ), ft. XYZ
 * - - Live at Taipei Arena
 */
export function cleanSongTitle(title: string): string {
  if (!title) return '';

  return (
    title
      // 去除 (Live...), [Live...] 等現場後綴標籤
      .replace(
        /\s*[\(\[](?:Live|現場|現場版|Acoustic|不插電|Intro|Outro|Encore|安可|Remaster(?:ed)?|Studio Version|Bonus Track|Cover)[^\)\]]*[\)\]]/gi,
        ''
      )
      // 去除結尾的 " - Live..." 或 " ~ Live..."
      .replace(/\s*[-~–—]\s*(?:Live|現場|Acoustic|Intro|Outro|Encore).*$/gi, '')
      // 去除合作藝人 (feat. xxx / ft. xxx) 以利主要曲目檢索
      .replace(/\s*[\(\[](?:feat\.|ft\.|featuring)\s+[^\)\]]+[\)\]]/gi, '')
      .replace(/\s+(?:feat\.|ft\.|featuring)\s+.+$/gi, '')
      // 去除重複空白並 Trim
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

/**
 * RFC 7636 PKCE: 產生隨機 code_verifier (43-128 字元)
 */
export function generateCodeVerifier(length = 64): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let verifier = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      verifier += possible[values[i] % possible.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      verifier += possible.charAt(Math.floor(Math.random() * possible.length));
    }
  }
  return verifier;
}

/**
 * RFC 7636 PKCE: 根據 code_verifier 產生 base64url-encoded SHA-256 code_challenge
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  // Node.js 環境 fallback
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(verifier).digest('base64url');
  } catch {
    return verifier;
  }
}

/**
 * 建立 Spotify PKCE 授權跳轉網址
 */
export async function buildSpotifyAuthUrl(options: {
  clientId: string;
  redirectUri: string;
  state?: string;
  scopes?: string[];
}): Promise<{ url: string; codeVerifier: string; state: string }> {
  const codeVerifier = generateCodeVerifier(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = options.state || generateCodeVerifier(16);
  const scopes = options.scopes || [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
  ];

  const params = new URLSearchParams({
    client_id: options.clientId,
    response_type: 'code',
    redirect_uri: options.redirectUri,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
    scope: scopes.join(' '),
  });

  return {
    url: `https://accounts.spotify.com/authorize?${params.toString()}`,
    codeVerifier,
    state,
  };
}

/**
 * 以 PKCE Code 向 Spotify Token 端點交換 Access Token
 */
export async function exchangeSpotifyToken(options: {
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
}> {
  const body = new URLSearchParams({
    client_id: options.clientId,
    grant_type: 'authorization_code',
    code: options.code,
    redirect_uri: options.redirectUri,
    code_verifier: options.codeVerifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.error || 'Spotify 權杖交換失敗');
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

/**
 * 智慧檢索 Spotify 單一曲目 (精準比對 -> 模糊回退)
 */
export async function searchSpotifyTrack(
  token: string,
  songName: string,
  artistName: string,
  fetchImpl: typeof fetch = fetch
): Promise<TrackMatchResult> {
  const cleanedTitle = cleanSongTitle(songName);
  const cleanedArtist = artistName.trim();

  try {
    // 策略 1: track + artist 精確搜尋
    const query1 = `track:"${cleanedTitle}" artist:"${cleanedArtist}"`;
    let res = await fetchImpl(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query1)}&type=track&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const track = data.tracks?.items?.[0];
      if (track) {
        return {
          originalSong: songName,
          status: 'MATCHED',
          matchedTitle: track.name,
          matchedArtist: track.artists?.map((a: any) => a.name).join(', '),
          matchedAlbum: track.album?.name,
          uri: track.uri,
          externalUrl: track.external_urls?.spotify,
          previewUrl: track.preview_url,
        };
      }
    }

    // 策略 2: 寬鬆關鍵字組合搜尋
    const query2 = `${cleanedTitle} ${cleanedArtist}`;
    res = await fetchImpl(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query2)}&type=track&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const track = data.tracks?.items?.[0];
      if (track) {
        return {
          originalSong: songName,
          status: 'FUZZY',
          matchedTitle: track.name,
          matchedArtist: track.artists?.map((a: any) => a.name).join(', '),
          matchedAlbum: track.album?.name,
          uri: track.uri,
          externalUrl: track.external_urls?.spotify,
          previewUrl: track.preview_url,
          reason: '模糊搜尋比對成功',
        };
      }
    }

    // 策略 3: 單曲名獨立搜尋
    const query3 = `track:"${cleanedTitle}"`;
    res = await fetchImpl(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query3)}&type=track&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const track = data.tracks?.items?.[0];
      if (track) {
        return {
          originalSong: songName,
          status: 'FUZZY',
          matchedTitle: track.name,
          matchedArtist: track.artists?.map((a: any) => a.name).join(', '),
          matchedAlbum: track.album?.name,
          uri: track.uri,
          externalUrl: track.external_urls?.spotify,
          previewUrl: track.preview_url,
          reason: '依曲名匹配到同名曲目',
        };
      }
    }

    return {
      originalSong: songName,
      status: 'NOT_FOUND',
      reason: 'Spotify 未檢索到相關曲目',
    };
  } catch (err) {
    return {
      originalSong: songName,
      status: 'NOT_FOUND',
      reason: `檢索異常: ${(err as Error).message}`,
    };
  }
}

/**
 * 建立使用者專屬 Spotify 播放清單
 */
export async function createSpotifyPlaylist(
  token: string,
  userId: string,
  name: string,
  description: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ id: string; url: string }> {
  const res = await fetchImpl(
    `https://api.spotify.com/v1/users/${encodeURIComponent(userId)}/playlists`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        public: false,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || '建立 Spotify 播放清單失敗');
  }

  const data = await res.json();
  return {
    id: data.id,
    url: data.external_urls?.spotify || `https://open.spotify.com/playlist/${data.id}`,
  };
}

/**
 * 批次將曲目 URIs 加入 Spotify 播放清單
 */
export async function addTracksToSpotifyPlaylist(
  token: string,
  playlistId: string,
  trackUris: string[],
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  if (trackUris.length === 0) return true;

  // Spotify API 限制單次至多 100 首
  const chunks: string[][] = [];
  for (let i = 0; i < trackUris.length; i += 100) {
    chunks.push(trackUris.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const res = await fetchImpl(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: chunk }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || '加入曲目至 Spotify 播放清單失敗');
    }
  }

  return true;
}

/**
 * 一鍵執行現場 Setlist 到 Spotify 的完整同步管線
 */
export async function syncToSpotify(options: {
  token?: string;
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
    token,
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
  const playlistDesc = `由 StubBook 票根手帳自動生成之現場演出歌單 · ${venueName || '現場'} · ${date || ''}`;

  // ── 1. 模擬模式 (Demo Mode)：當無 token 或指定 isDemo 時 ───────────
  if (isDemo || !token) {
    const tracks: TrackMatchResult[] = songs.map((s, idx) => {
      const cleaned = cleanSongTitle(s.name);
      if (onProgress) onProgress(idx + 1, total, s.name);

      // 模擬配對：少數特殊曲目標記為模糊或未找到以展示完整 UI 反饋
      const isUnmatched = s.name.includes('(Intro)') || s.name.includes('Fan Choir');
      if (isUnmatched) {
        return {
          originalSong: s.name,
          isEncore: s.isEncore,
          status: 'FUZZY',
          matchedTitle: `${cleaned} (Live Edition)`,
          matchedArtist: artistName,
          matchedAlbum: tourName || 'Special Concert Live',
          uri: `spotify:track:demo_${idx + 1}`,
          externalUrl: `https://open.spotify.com/search/${encodeURIComponent(`${artistName} ${cleaned}`)}`,
          reason: '現場限定演出版比對',
        };
      }

      return {
        originalSong: s.name,
        isEncore: s.isEncore,
        status: 'MATCHED',
        matchedTitle: cleaned,
        matchedArtist: artistName,
        matchedAlbum: 'Original Album Release',
        uri: `spotify:track:demo_${idx + 1}`,
        externalUrl: `https://open.spotify.com/search/${encodeURIComponent(`${artistName} ${cleaned}`)}`,
      };
    });

    const demoPlaylistId = `demo_sp_${Date.now().toString(36)}`;
    return {
      provider: 'SPOTIFY',
      playlistName: playlistTitle,
      playlistId: demoPlaylistId,
      playlistUrl: `https://open.spotify.com/playlist/${demoPlaylistId}`,
      matchedCount: tracks.filter((t) => t.status !== 'NOT_FOUND').length,
      totalCount: total,
      tracks,
      isDemo: true,
    };
  }

  // ── 2. 真實 Spotify API 調用流程 ──────────────────────────────────
  try {
    // 取得當前使用者 ID
    const meRes = await fetchImpl('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!meRes.ok) {
      throw new Error('無法取得 Spotify 使用者個人資料，請檢查授權有效性');
    }
    const me = await meRes.json();
    const userId = me.id;

    // 比對所有曲目
    const matchedTracks: TrackMatchResult[] = [];
    const trackUrisToAdd: string[] = [];

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      if (onProgress) onProgress(i + 1, total, song.name);

      const match = await searchSpotifyTrack(token, song.name, artistName, fetchImpl);
      match.isEncore = song.isEncore;
      matchedTracks.push(match);

      if (match.uri) {
        trackUrisToAdd.push(match.uri);
      }
    }

    // 建立新播放清單
    const playlist = await createSpotifyPlaylist(
      token,
      userId,
      playlistTitle,
      playlistDesc,
      fetchImpl
    );

    // 加入曲目
    if (trackUrisToAdd.length > 0) {
      await addTracksToSpotifyPlaylist(token, playlist.id, trackUrisToAdd, fetchImpl);
    }

    return {
      provider: 'SPOTIFY',
      playlistName: playlistTitle,
      playlistId: playlist.id,
      playlistUrl: playlist.url,
      matchedCount: trackUrisToAdd.length,
      totalCount: total,
      tracks: matchedTracks,
      isDemo: false,
    };
  } catch (error) {
    const err = error as Error;
    throw new Error(`Spotify 同步失敗: ${err.message}`);
  }
}
