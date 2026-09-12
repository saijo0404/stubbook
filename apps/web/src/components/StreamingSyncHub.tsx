'use client';

import React, { useState, useEffect } from 'react';
import {
  Music,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Settings,
  HelpCircle,
  Play,
  RotateCw,
  LogOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { haptics } from '../utils/haptics';
import {
  StreamingProvider,
  SyncResult,
  TrackMatchResult,
  STREAMING_STORAGE_KEYS,
  getLocalStreamingConfig,
} from '../utils/streaming/types';
import {
  syncToSpotify,
  buildSpotifyAuthUrl,
  exchangeSpotifyToken,
} from '../utils/streaming/spotify';
import {
  syncToAppleMusic,
  getAppleMusicSearchUrl,
  getAppleMusicSearchPlaylistDeepLink,
} from '../utils/streaming/appleMusic';
import {
  syncToYoutubeMusic,
  getYoutubeMusicSearchUrl,
  getYoutubeMusicPlaylistDeepLink,
} from '../utils/streaming/youtubeMusic';

interface StreamingSyncHubProps {
  songs: Array<{ name: string; isEncore?: boolean; info?: string }>;
  artistName: string;
  tourName?: string | null;
  venueName?: string | null;
  sessionDate?: string | null;
  spotifyPlaylistUrl?: string | null;
  appleMusicUrl?: string | null;
  youtubeMusicUrl?: string | null;
  onUpdateUrls: (urls: {
    spotifyPlaylistUrl?: string;
    appleMusicUrl?: string;
    youtubeMusicUrl?: string;
  }) => void;
}

export const StreamingSyncHub: React.FC<StreamingSyncHubProps> = ({
  songs,
  artistName,
  tourName,
  venueName,
  sessionDate,
  spotifyPlaylistUrl = '',
  appleMusicUrl = '',
  youtubeMusicUrl = '',
  onUpdateUrls,
}) => {
  const [activeTab, setActiveTab] = useState<StreamingProvider>('SPOTIFY');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    song: string;
  } | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // 本地設定狀態
  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [spotifyToken, setSpotifyToken] = useState('');
  const [appleMusicDevToken, setAppleMusicDevToken] = useState('');
  const [appleMusicUserToken, setAppleMusicUserToken] = useState('');
  const [youtubeToken, setYoutubeToken] = useState('');

  // 載入本地憑證
  useEffect(() => {
    const config = getLocalStreamingConfig();
    setSpotifyClientId(config.spotifyClientId);
    setSpotifyToken(config.spotifyAccessToken);
    setAppleMusicDevToken(config.appleMusicDevToken);
    setAppleMusicUserToken(config.appleMusicUserToken);
    setYoutubeToken(config.youtubeAccessToken);

    // 檢查 URL 是否有 Spotify PKCE callback 回傳的 code
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const savedState = localStorage.getItem(STREAMING_STORAGE_KEYS.SPOTIFY_AUTH_STATE);
      const codeVerifier = localStorage.getItem(STREAMING_STORAGE_KEYS.SPOTIFY_CODE_VERIFIER);
      const savedClientId = localStorage.getItem(STREAMING_STORAGE_KEYS.SPOTIFY_CLIENT_ID);

      if (code && codeVerifier && savedClientId && state === savedState) {
        handleSpotifyPkceExchange(code, codeVerifier, savedClientId);
      }
    }
  }, []);

  const handleSpotifyPkceExchange = async (
    code: string,
    codeVerifier: string,
    clientId: string
  ) => {
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const res = await exchangeSpotifyToken({
        clientId,
        code,
        codeVerifier,
        redirectUri,
      });

      setSpotifyToken(res.accessToken);
      localStorage.setItem(STREAMING_STORAGE_KEYS.SPOTIFY_ACCESS_TOKEN, res.accessToken);
      if (res.refreshToken) {
        localStorage.setItem(STREAMING_STORAGE_KEYS.SPOTIFY_REFRESH_TOKEN, res.refreshToken);
      }

      // 清理 URL 參數
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      haptics.success();
    } catch (err) {
      console.error('Spotify PKCE 授權交換失敗:', err);
      setErrorNotice((err as Error).message);
    }
  };

  // 啟動 Spotify PKCE 授權
  const handleStartSpotifyAuth = async () => {
    if (!spotifyClientId.trim()) {
      setErrorNotice('請先填寫您的 Spotify Client ID (可至 Spotify Developer Dashboard 建立)');
      setShowSettings(true);
      return;
    }

    try {
      localStorage.setItem(STREAMING_STORAGE_KEYS.SPOTIFY_CLIENT_ID, spotifyClientId.trim());
      const redirectUri = window.location.origin + window.location.pathname;
      const { url, codeVerifier, state } = await buildSpotifyAuthUrl({
        clientId: spotifyClientId.trim(),
        redirectUri,
      });

      localStorage.setItem(STREAMING_STORAGE_KEYS.SPOTIFY_CODE_VERIFIER, codeVerifier);
      localStorage.setItem(STREAMING_STORAGE_KEYS.SPOTIFY_AUTH_STATE, state);

      window.location.href = url;
    } catch (err) {
      setErrorNotice((err as Error).message);
    }
  };

  const handleSaveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STREAMING_STORAGE_KEYS.SPOTIFY_CLIENT_ID, spotifyClientId.trim());
      localStorage.setItem(STREAMING_STORAGE_KEYS.SPOTIFY_ACCESS_TOKEN, spotifyToken.trim());
      localStorage.setItem(STREAMING_STORAGE_KEYS.APPLE_MUSIC_DEV_TOKEN, appleMusicDevToken.trim());
      localStorage.setItem(
        STREAMING_STORAGE_KEYS.APPLE_MUSIC_USER_TOKEN,
        appleMusicUserToken.trim()
      );
      localStorage.setItem(STREAMING_STORAGE_KEYS.YOUTUBE_ACCESS_TOKEN, youtubeToken.trim());
    }
    setShowSettings(false);
    haptics.success();
  };

  // 執行一鍵同步
  const handleSync = async (forceDemo = false) => {
    if (songs.length === 0) {
      setErrorNotice('請先新增或匯入曲目，再執行同步');
      return;
    }

    setSyncing(true);
    setErrorNotice(null);
    setSyncResult(null);
    setSyncProgress({ current: 0, total: songs.length, song: '準備曲目資料...' });
    haptics.medium();

    try {
      if (activeTab === 'SPOTIFY') {
        const res = await syncToSpotify({
          token: forceDemo ? undefined : spotifyToken || undefined,
          songs,
          artistName,
          tourName,
          venueName,
          date: sessionDate,
          isDemo: forceDemo || !spotifyToken,
          onProgress: (cur, tot, sName) => {
            setSyncProgress({ current: cur, total: tot, song: sName });
          },
        });

        setSyncResult(res);
        onUpdateUrls({ spotifyPlaylistUrl: res.playlistUrl });
        setShowInspector(true);
        haptics.success();
      } else if (activeTab === 'APPLE_MUSIC') {
        const res = await syncToAppleMusic({
          developerToken: forceDemo ? undefined : appleMusicDevToken || undefined,
          userToken: forceDemo ? undefined : appleMusicUserToken || undefined,
          songs,
          artistName,
          tourName,
          venueName,
          date: sessionDate,
          isDemo: forceDemo || !appleMusicDevToken,
          onProgress: (cur, tot, sName) => {
            setSyncProgress({ current: cur, total: tot, song: sName });
          },
        });

        setSyncResult(res);
        onUpdateUrls({ appleMusicUrl: res.playlistUrl });
        setShowInspector(true);
        haptics.success();
      } else if (activeTab === 'YOUTUBE_MUSIC') {
        const res = await syncToYoutubeMusic({
          accessToken: forceDemo ? undefined : youtubeToken || undefined,
          songs,
          artistName,
          tourName,
          venueName,
          date: sessionDate,
          isDemo: forceDemo || !youtubeToken,
          onProgress: (cur, tot, sName) => {
            setSyncProgress({ current: cur, total: tot, song: sName });
          },
        });

        setSyncResult(res);
        onUpdateUrls({ youtubeMusicUrl: res.playlistUrl });
        setShowInspector(true);
        haptics.success();
      }
    } catch (err) {
      const error = err as Error;
      setErrorNotice(error.message || '同步過程發生異常');
      haptics.warning();
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  return (
    <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 space-y-4 shadow-xl">
      {/* 標題與設定按鈕 */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
              <span>串流音樂深度聯動中心</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded font-normal">
                v1.4.0 Hub
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              跨平台現場 Setlist 帳號授權與一鍵智慧建立播放清單
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            setShowSettings(!showSettings);
          }}
          className={`p-1.5 rounded-lg border transition ${
            showSettings
              ? 'bg-zinc-700 text-white border-zinc-600'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
          title="憑證與金鑰設定"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 憑證金鑰設定面板 (Collapsible) */}
      {showSettings && (
        <div className="p-3 bg-zinc-900/90 border border-zinc-700/80 rounded-xl space-y-3 text-xs animate-in fade-in">
          <div className="flex items-center justify-between font-semibold text-zinc-200">
            <span>本地串流憑證管理 (完全保存在本機瀏覽器)</span>
            <span className="text-[10px] text-emerald-400">零伺服器金鑰外洩風險</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-0.5">
                Spotify Client ID (PKCE)
              </label>
              <input
                type="text"
                value={spotifyClientId}
                onChange={(e) => setSpotifyClientId(e.target.value)}
                placeholder="輸入 Spotify App Client ID"
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-0.5">
                Apple Music Developer Token (選填)
              </label>
              <input
                type="text"
                value={appleMusicDevToken}
                onChange={(e) => setAppleMusicDevToken(e.target.value)}
                placeholder="輸入 Apple Music Developer JWT"
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-0.5">
                YouTube Music Access Token / API Key (選填)
              </label>
              <input
                type="text"
                value={youtubeToken}
                onChange={(e) => setYoutubeToken(e.target.value)}
                placeholder="輸入 Google OAuth Token"
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs transition"
            >
              儲存設定
            </button>
          </div>
        </div>
      )}

      {/* 平台分頁選單 */}
      <div className="grid grid-cols-3 gap-2">
        {/* Spotify */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setActiveTab('SPOTIFY');
          }}
          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
            activeTab === 'SPOTIFY'
              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-950/50'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Spotify</span>
        </button>

        {/* Apple Music */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setActiveTab('APPLE_MUSIC');
          }}
          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
            activeTab === 'APPLE_MUSIC'
              ? 'bg-rose-950/70 border-rose-500 text-rose-400 shadow-lg shadow-rose-950/50'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          <span>Apple Music</span>
        </button>

        {/* YouTube Music */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setActiveTab('YOUTUBE_MUSIC');
          }}
          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
            activeTab === 'YOUTUBE_MUSIC'
              ? 'bg-red-950/70 border-red-500 text-red-400 shadow-lg shadow-red-950/50'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-400"></span>
          <span>YT Music</span>
        </button>
      </div>

      {/* 錯誤提醒 */}
      {errorNotice && (
        <div className="p-2.5 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{errorNotice}</span>
        </div>
      )}

      {/* 目前選取平台的主控卡片 */}
      <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
        {/* 狀態列 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400">授權狀態:</span>
            {activeTab === 'SPOTIFY' && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  spotifyToken
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {spotifyToken ? '已授權帳號' : '未授權 (支援示範模擬)'}
              </span>
            )}
            {activeTab === 'APPLE_MUSIC' && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  appleMusicDevToken
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {appleMusicDevToken ? 'MusicKit 就緒' : '深層檢索模式'}
              </span>
            )}
            {activeTab === 'YOUTUBE_MUSIC' && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  youtubeToken
                    ? 'bg-red-950 text-red-300 border-red-800'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {youtubeToken ? 'Google Token 就緒' : '官方音訊檢索'}
              </span>
            )}
          </div>

          {activeTab === 'SPOTIFY' && !spotifyToken && (
            <button
              type="button"
              onClick={handleStartSpotifyAuth}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
            >
              以 PKCE 登入帳號
            </button>
          )}
        </div>

        {/* 既有播放清單連結展示與直達按鈕 */}
        {((activeTab === 'SPOTIFY' && spotifyPlaylistUrl) ||
          (activeTab === 'APPLE_MUSIC' && appleMusicUrl) ||
          (activeTab === 'YOUTUBE_MUSIC' && youtubeMusicUrl)) && (
          <div className="flex items-center justify-between p-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs">
            <div className="truncate mr-2">
              <span className="text-zinc-500 mr-1.5">已綁定清單:</span>
              <span className="text-zinc-300 underline truncate">
                {activeTab === 'SPOTIFY' && spotifyPlaylistUrl}
                {activeTab === 'APPLE_MUSIC' && appleMusicUrl}
                {activeTab === 'YOUTUBE_MUSIC' && youtubeMusicUrl}
              </span>
            </div>
            <a
              href={
                (activeTab === 'SPOTIFY'
                  ? spotifyPlaylistUrl
                  : activeTab === 'APPLE_MUSIC'
                    ? appleMusicUrl
                    : youtubeMusicUrl) || undefined
              }
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md text-[11px] font-semibold flex items-center space-x-1 flex-shrink-0"
            >
              <span>立即播放</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* 同步中即時進度條 */}
        {syncing && syncProgress && (
          <div className="space-y-1.5 py-1">
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span className="truncate max-w-[200px]">{syncProgress.song}</span>
              <span>
                {syncProgress.current} / {syncProgress.total}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 transition-all duration-150"
                style={{
                  width: `${(syncProgress.current / syncProgress.total) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* 操作按鈕群 */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={syncing}
            onClick={() => handleSync(false)}
            className={`py-2 px-3 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center space-x-1.5 transition active:scale-95 disabled:opacity-50 ${
              activeTab === 'SPOTIFY'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                : activeTab === 'APPLE_MUSIC'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                  : 'bg-red-600 hover:bg-red-500 shadow-red-950/50'
            }`}
          >
            {syncing ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>比對同步中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {activeTab === 'SPOTIFY'
                    ? '一鍵建立 Spotify 歌單'
                    : activeTab === 'APPLE_MUSIC'
                      ? '一鍵建立 Apple Music 歌單'
                      : '一鍵建立 YT Music 歌單'}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={syncing}
            onClick={() => handleSync(true)}
            className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
            title="免憑證體驗全流程"
          >
            <Play className="w-3.5 h-3.5 text-indigo-400" />
            <span>以示範模式模擬同步</span>
          </button>
        </div>
      </div>

      {/* 匹配結果檢視器 (Track Match Inspector) */}
      {syncResult && (
        <div className="border border-zinc-800 bg-zinc-900/80 rounded-xl p-3 space-y-2.5 text-xs animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white">同步完成！</span>
              <span className="text-[11px] text-zinc-400">
                成功配對 {syncResult.matchedCount} / {syncResult.totalCount} 首曲目
              </span>
              {syncResult.isDemo && (
                <span className="px-1.5 py-0.2 text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 rounded">
                  展示模擬
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInspector(!showInspector)}
              className="text-[11px] text-zinc-400 hover:text-white flex items-center space-x-0.5"
            >
              <span>{showInspector ? '收合清單' : '檢視曲目細節'}</span>
              {showInspector ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {showInspector && (
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border-t border-zinc-800/80 pt-2">
              {syncResult.tracks.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-950/60 border border-zinc-850 text-[11px]"
                >
                  <div className="flex items-center space-x-2 truncate mr-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        t.status === 'MATCHED'
                          ? 'bg-emerald-400'
                          : t.status === 'FUZZY'
                            ? 'bg-amber-400'
                            : 'bg-zinc-600'
                      }`}
                    ></span>
                    <span className="text-white truncate">{t.originalSong}</span>
                    {t.isEncore && (
                      <span className="px-1 py-0.2 bg-purple-950 text-purple-300 text-[9px] rounded flex-shrink-0">
                        Encore
                      </span>
                    )}
                    {t.matchedTitle && t.matchedTitle !== t.originalSong && (
                      <span className="text-zinc-500 text-[10px] truncate">→ {t.matchedTitle}</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span
                      className={`text-[10px] font-medium ${
                        t.status === 'MATCHED'
                          ? 'text-emerald-400'
                          : t.status === 'FUZZY'
                            ? 'text-amber-400'
                            : 'text-zinc-500'
                      }`}
                    >
                      {t.status === 'MATCHED'
                        ? '完全相符'
                        : t.status === 'FUZZY'
                          ? '模糊比對'
                          : '未檢索到'}
                    </span>
                    {t.externalUrl && (
                      <a
                        href={t.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-400 hover:text-white"
                        title="開啟搜尋/試聽"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
