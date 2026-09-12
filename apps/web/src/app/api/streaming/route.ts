import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@stubbook/logger';
import {
  syncToSpotify,
  syncToAppleMusic,
  syncToYoutubeMusic,
  exchangeSpotifyToken,
  cleanSongTitle,
  StreamingProvider,
} from '../../../utils/streaming';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'config';

    if (action === 'config') {
      return NextResponse.json({
        success: true,
        features: {
          spotify: {
            configured: Boolean(process.env.SPOTIFY_CLIENT_ID),
            clientId: process.env.SPOTIFY_CLIENT_ID || null,
          },
          appleMusic: {
            configured: Boolean(process.env.APPLE_MUSIC_DEVELOPER_TOKEN),
          },
          youtubeMusic: {
            configured: Boolean(process.env.YOUTUBE_API_KEY || process.env.GOOGLE_CLIENT_ID),
          },
        },
      });
    }

    return NextResponse.json({ error: '未知請求動作' }, { status: 400 });
  } catch (error) {
    const err = error as Error;
    logger.error(`串流服務查詢異常: ${err.message}`, 'STREAMING_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── 1. Spotify PKCE 授權碼交換 ───────────────────────────────────────
    if (action === 'exchange_spotify_token') {
      const { clientId, code, codeVerifier, redirectUri } = body;
      const effectiveClientId = clientId || process.env.SPOTIFY_CLIENT_ID;

      if (!effectiveClientId || !code || !codeVerifier || !redirectUri) {
        return NextResponse.json(
          { error: '缺少 PKCE 交換必要參數 (clientId, code, codeVerifier, redirectUri)' },
          { status: 400 }
        );
      }

      const tokenRes = await exchangeSpotifyToken({
        clientId: effectiveClientId,
        code,
        codeVerifier,
        redirectUri,
      });

      return NextResponse.json({ success: true, ...tokenRes });
    }

    // ── 2. 串流歌單同步服務 ──────────────────────────────────────────────
    if (action === 'sync') {
      const {
        provider,
        songs,
        artistName,
        tourName,
        venueName,
        date,
        token,
        isDemo,
      }: {
        provider: StreamingProvider;
        songs: Array<{ name: string; isEncore?: boolean; info?: string }>;
        artistName: string;
        tourName?: string;
        venueName?: string;
        date?: string;
        token?: string;
        isDemo?: boolean;
      } = body;

      if (!provider || !artistName || !Array.isArray(songs)) {
        return NextResponse.json(
          { error: '缺少必要同步參數 (provider, artistName, songs)' },
          { status: 400 }
        );
      }

      if (provider === 'SPOTIFY') {
        const result = await syncToSpotify({
          token,
          songs,
          artistName,
          tourName,
          venueName,
          date,
          isDemo,
        });
        return NextResponse.json({ success: true, result });
      }

      if (provider === 'APPLE_MUSIC') {
        const result = await syncToAppleMusic({
          developerToken: token || process.env.APPLE_MUSIC_DEVELOPER_TOKEN,
          songs,
          artistName,
          tourName,
          venueName,
          date,
          isDemo,
        });
        return NextResponse.json({ success: true, result });
      }

      if (provider === 'YOUTUBE_MUSIC') {
        const result = await syncToYoutubeMusic({
          accessToken: token,
          apiKey: process.env.YOUTUBE_API_KEY,
          songs,
          artistName,
          tourName,
          venueName,
          date,
          isDemo,
        });
        return NextResponse.json({ success: true, result });
      }

      return NextResponse.json({ error: `不支援的串流平台: ${provider}` }, { status: 400 });
    }

    // ── 3. 曲目比對預檢 ──────────────────────────────────────────────────
    if (action === 'clean_titles') {
      const { titles }: { titles: string[] } = body;
      const cleaned = (titles || []).map((t) => ({
        original: t,
        cleaned: cleanSongTitle(t),
      }));
      return NextResponse.json({ success: true, cleaned });
    }

    return NextResponse.json({ error: '未知請求動作' }, { status: 400 });
  } catch (error) {
    const err = error as Error;
    logger.error(`串流 API 操作失敗: ${err.message}`, 'STREAMING_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
