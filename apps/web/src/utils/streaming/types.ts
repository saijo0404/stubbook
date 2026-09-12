export type StreamingProvider = 'SPOTIFY' | 'APPLE_MUSIC' | 'YOUTUBE_MUSIC';

export type TrackMatchStatus = 'MATCHED' | 'FUZZY' | 'NOT_FOUND';

export interface TrackMatchResult {
  originalSong: string;
  isEncore?: boolean;
  status: TrackMatchStatus;
  matchedTitle?: string;
  matchedArtist?: string;
  matchedAlbum?: string;
  uri?: string; // Spotify URI (spotify:track:xxx) 或 Apple Music ID 或 YouTube VideoId
  externalUrl?: string;
  previewUrl?: string | null;
  reason?: string;
}

export interface SyncResult {
  provider: StreamingProvider;
  playlistUrl: string;
  playlistId?: string;
  playlistName: string;
  matchedCount: number;
  totalCount: number;
  tracks: TrackMatchResult[];
  error?: string;
  isDemo?: boolean;
}

export interface SpotifyAuthConfig {
  clientId: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AppleMusicConfig {
  developerToken?: string;
  userToken?: string;
  storefront?: string;
}

export interface YouTubeMusicConfig {
  accessToken?: string;
  apiKey?: string;
  clientId?: string;
}

// ── 本地 LocalStorage 憑證管理金鑰常數 ──────────────────────────────────
export const STREAMING_STORAGE_KEYS = {
  SPOTIFY_CLIENT_ID: 'stubbook_spotify_client_id',
  SPOTIFY_ACCESS_TOKEN: 'stubbook_spotify_access_token',
  SPOTIFY_REFRESH_TOKEN: 'stubbook_spotify_refresh_token',
  SPOTIFY_TOKEN_EXPIRES_AT: 'stubbook_spotify_token_expires_at',
  SPOTIFY_CODE_VERIFIER: 'stubbook_spotify_code_verifier',
  SPOTIFY_AUTH_STATE: 'stubbook_spotify_auth_state',

  APPLE_MUSIC_DEV_TOKEN: 'stubbook_apple_music_dev_token',
  APPLE_MUSIC_USER_TOKEN: 'stubbook_apple_music_user_token',
  APPLE_MUSIC_STOREFRONT: 'stubbook_apple_music_storefront',

  YOUTUBE_ACCESS_TOKEN: 'stubbook_yt_access_token',
  YOUTUBE_API_KEY: 'stubbook_yt_api_key',
  YOUTUBE_CLIENT_ID: 'stubbook_yt_client_id',
} as const;

/**
 * 安全存取用戶本地設定的串流憑證
 */
export function getLocalStreamingConfig() {
  if (typeof window === 'undefined') {
    return {
      spotifyClientId: '',
      spotifyAccessToken: '',
      appleMusicDevToken: '',
      appleMusicUserToken: '',
      youtubeAccessToken: '',
    };
  }

  return {
    spotifyClientId: localStorage.getItem(STREAMING_STORAGE_KEYS.SPOTIFY_CLIENT_ID) || '',
    spotifyAccessToken: localStorage.getItem(STREAMING_STORAGE_KEYS.SPOTIFY_ACCESS_TOKEN) || '',
    appleMusicDevToken: localStorage.getItem(STREAMING_STORAGE_KEYS.APPLE_MUSIC_DEV_TOKEN) || '',
    appleMusicUserToken: localStorage.getItem(STREAMING_STORAGE_KEYS.APPLE_MUSIC_USER_TOKEN) || '',
    youtubeAccessToken: localStorage.getItem(STREAMING_STORAGE_KEYS.YOUTUBE_ACCESS_TOKEN) || '',
  };
}
