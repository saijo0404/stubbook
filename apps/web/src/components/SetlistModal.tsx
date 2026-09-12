'use client';

import React, { useState, useEffect } from 'react';
import {
  ListMusic,
  Music2,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  X,
  RotateCw,
  Share2,
  Calendar,
  MapPin,
  Flame,
  Search,
} from 'lucide-react';
import { haptics } from '../utils/haptics';
import { StreamingSyncHub } from './StreamingSyncHub';

export interface SetlistSongItem {
  name: string;
  isEncore?: boolean;
  encoreNumber?: number;
  coverOf?: string;
  info?: string;
}

export interface SetlistData {
  id?: string;
  sessionId: string;
  artistName: string;
  tourName?: string | null;
  venueName?: string | null;
  sessionDate?: string | null;
  source: 'SETLIST_FM' | 'MANUAL' | 'COMMUNITY';
  sourceUrl?: string | null;
  songs: SetlistSongItem[];
  spotifyPlaylistUrl?: string | null;
  appleMusicUrl?: string | null;
  youtubeMusicUrl?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface SetlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  eventTitle: string;
  artistName?: string;
  venueName?: string | null;
  sessionDate?: string;
  onUpdated?: () => void;
}

export const SetlistModal: React.FC<SetlistModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  eventTitle,
  artistName = '',
  venueName,
  sessionDate,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [songs, setSongs] = useState<SetlistSongItem[]>([]);
  const [source, setSource] = useState<'SETLIST_FM' | 'MANUAL' | 'COMMUNITY'>('MANUAL');
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [spotifyUrl, setSpotifyUrl] = useState<string>('');
  const [appleMusicUrl, setAppleMusicUrl] = useState<string>('');
  const [youtubeMusicUrl, setYoutubeMusicUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [importingFm, setImportingFm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 新增歌曲暫存
  const [newSongName, setNewSongName] = useState('');
  const [newIsEncore, setNewIsEncore] = useState(false);
  const [newEncoreNumber, setNewEncoreNumber] = useState(1);
  const [newCoverOf, setNewCoverOf] = useState('');
  const [newInfo, setNewInfo] = useState('');

  // 抓取現有歌單
  useEffect(() => {
    if (isOpen && sessionId) {
      loadSetlist();
    }
  }, [isOpen, sessionId]);

  const loadSetlist = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/setlists?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.setlist) {
          setSongs(data.setlist.songs || []);
          setSource(data.setlist.source || 'MANUAL');
          setSourceUrl(data.setlist.sourceUrl || null);
          setSpotifyUrl(data.setlist.spotifyPlaylistUrl || '');
          setAppleMusicUrl(data.setlist.appleMusicUrl || '');
          setYoutubeMusicUrl(data.setlist.youtubeMusicUrl || '');
          setNotes(data.setlist.notes || '');
        } else {
          setSongs([]);
          setSource('MANUAL');
        }
      }
    } catch (err) {
      console.error('載入現場歌單失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  // 從 Setlist.fm 外部檢索或智慧生成
  const handleImportSetlistFm = async () => {
    setImportingFm(true);
    setNotice(null);
    haptics.medium();

    try {
      const targetArtist = artistName.trim() || eventTitle.split(' ')[0] || 'AIMI';
      const params = new URLSearchParams({
        action: 'search_setlist_fm',
        artist: targetArtist,
        venue: venueName || '',
        date: sessionDate || '',
      });

      const res = await fetch(`/api/setlists?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          setSongs(first.songs || []);
          setSource('SETLIST_FM');
          setSourceUrl(first.sourceUrl || 'https://www.setlist.fm');
          setNotice(
            data.isFallback
              ? '已套用該巡迴智慧曲目範本（可隨時手動微調）'
              : '成功自 Setlist.fm 匯入現場曲目！'
          );
          haptics.success();
        }
      }
    } catch (err) {
      console.error('檢索 Setlist.fm 失敗:', err);
      setNotice('檢索失敗，請手動添加曲目');
      haptics.warning();
    } finally {
      setImportingFm(false);
    }
  };

  // 新增曲目
  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongName.trim()) return;

    const newSong: SetlistSongItem = {
      name: newSongName.trim(),
      isEncore: newIsEncore,
      encoreNumber: newIsEncore ? newEncoreNumber : undefined,
      coverOf: newCoverOf.trim() ? newCoverOf.trim() : undefined,
      info: newInfo.trim() ? newInfo.trim() : undefined,
    };

    setSongs((prev) => [...prev, newSong]);
    setNewSongName('');
    setNewCoverOf('');
    setNewInfo('');
    haptics.light();
  };

  // 刪除曲目
  const handleRemoveSong = (index: number) => {
    haptics.light();
    setSongs((prev) => prev.filter((_, i) => i !== index));
  };

  // 儲存歌單
  const handleSaveSetlist = async () => {
    setSaving(true);
    setNotice(null);
    haptics.medium();

    try {
      const payload = {
        sessionId,
        artistName: artistName.trim() || eventTitle.split(' ')[0] || '演出者',
        tourName: eventTitle,
        venueName,
        sessionDate,
        source,
        sourceUrl,
        songs,
        spotifyPlaylistUrl: spotifyUrl.trim() || null,
        appleMusicUrl: appleMusicUrl.trim() || null,
        youtubeMusicUrl: youtubeMusicUrl.trim() || null,
        notes: notes.trim() || null,
      };

      const res = await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '儲存現場歌單失敗');
      }

      haptics.success();
      setNotice('現場演出歌單已成功儲存！');
      if (onUpdated) onUpdated();
    } catch (err) {
      const error = err as Error;
      setNotice(error.message);
      haptics.warning();
    } finally {
      setSaving(false);
    }
  };

  // 複製純文字歌單
  const handleCopySetlist = () => {
    if (songs.length === 0) return;

    let text = `🎵 ${eventTitle} · 現場歌單 (Setlist)\n`;
    if (sessionDate) text += `📅 日期：${new Date(sessionDate).toLocaleDateString('zh-TW')}\n`;
    if (venueName) text += `📍 地點：${venueName}\n\n`;

    const mainSet = songs.filter((s) => !s.isEncore);
    const encoreSongs = songs.filter((s) => s.isEncore);

    text += `【Main Set / 正篇曲目】\n`;
    mainSet.forEach((s, idx) => {
      let line = `${idx + 1}. ${s.name}`;
      if (s.coverOf) line += ` (Cover: ${s.coverOf})`;
      if (s.info) line += ` [${s.info}]`;
      text += `${line}\n`;
    });

    if (encoreSongs.length > 0) {
      text += `\n【Encore / 安可曲】\n`;
      encoreSongs.forEach((s, idx) => {
        let line = `E${idx + 1}. ${s.name}`;
        if (s.coverOf) line += ` (Cover: ${s.coverOf})`;
        if (s.info) line += ` [${s.info}]`;
        text += `${line}\n`;
      });
    }

    text += `\n記錄於 StubBook 演唱會回憶手帳`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    haptics.success();
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const mainSongs = songs.filter((s) => !s.isEncore);
  const encoreSongs = songs.filter((s) => s.isEncore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal 頂部 Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-pink-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  現場演出歌單 (Setlist)
                </h2>
                <span
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                    source === 'SETLIST_FM'
                      ? 'bg-blue-950 text-blue-300 border-blue-800'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}
                >
                  {source === 'SETLIST_FM' ? 'Setlist.fm 串接' : '手動編輯典藏'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate max-w-sm sm:max-w-md">{eventTitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                haptics.light();
                onClose();
              }}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              title="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal 內容區 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* 通知橫幅 */}
          {notice && (
            <div className="p-3 bg-indigo-950/60 border border-indigo-800/80 rounded-xl text-xs text-indigo-200 flex items-center justify-between">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-zinc-400 hover:text-white ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* 歌單快捷動作列 */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
              {/* Setlist.fm 匯入按鈕 */}
              <button
                type="button"
                disabled={importingFm}
                onClick={handleImportSetlistFm}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{importingFm ? '檢索中...' : '匯入 Setlist.fm'}</span>
              </button>

              {/* 複製純文字 */}
              <button
                type="button"
                onClick={handleCopySetlist}
                disabled={songs.length === 0}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">已複製歌單</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>複製歌單文字</span>
                  </>
                )}
              </button>
            </div>

            {/* Spotify 快速搜尋連結 */}
            <div className="flex items-center space-x-2 text-xs">
              <a
                href={`https://open.spotify.com/search/${encodeURIComponent(
                  artistName || eventTitle
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 transition"
              >
                <Music2 className="w-3.5 h-3.5" />
                <span>在 Spotify 搜尋歌手</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左側：擬真紙質/手帳風曲目列表 */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-inner space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <Music2 className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      演出曲目列表 ({songs.length} 首)
                    </h3>
                  </div>
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-400 hover:underline flex items-center space-x-1"
                    >
                      <span>來源出處</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {loading ? (
                  <div className="py-12 text-center text-xs text-zinc-500">正在載入歌單...</div>
                ) : songs.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <ListMusic className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-xs text-zinc-400">目前尚無現場歌單記錄</p>
                    <p className="text-[11px] text-zinc-500">
                      點擊上方「匯入 Setlist.fm」或由右側手動新增曲目！
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 正篇 Main Set */}
                    {mainSongs.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                          ── Main Set (正篇) ──
                        </div>
                        {mainSongs.map((song, idx) => (
                          <div
                            key={idx}
                            className="group flex items-center justify-between p-2.5 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-xl border border-zinc-800 transition"
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <span className="text-xs font-mono font-bold text-indigo-400 w-5 text-right">
                                {idx + 1}
                              </span>
                              <div className="overflow-hidden">
                                <span className="text-xs font-bold text-white tracking-wide truncate block">
                                  {song.name}
                                </span>
                                {(song.coverOf || song.info) && (
                                  <div className="flex flex-wrap gap-1 text-[10px] text-zinc-400 mt-0.5">
                                    {song.coverOf && (
                                      <span className="text-purple-300">
                                        Cover of {song.coverOf}
                                      </span>
                                    )}
                                    {song.info && (
                                      <span className="text-zinc-500 italic">[{song.info}]</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSong(songs.indexOf(song))}
                              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition"
                              title="移除此曲"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 安可曲 Encore */}
                    {encoreSongs.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider px-1 flex items-center space-x-1">
                          <Flame className="w-3.5 h-3.5" />
                          <span>── Encore (安可曲) ──</span>
                        </div>
                        {encoreSongs.map((song, idx) => (
                          <div
                            key={idx}
                            className="group flex items-center justify-between p-2.5 bg-amber-950/20 hover:bg-amber-900/30 rounded-xl border border-amber-800/40 transition"
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <span className="text-xs font-mono font-bold text-amber-400 w-5 text-right">
                                E{idx + 1}
                              </span>
                              <div className="overflow-hidden">
                                <span className="text-xs font-bold text-amber-200 tracking-wide truncate block">
                                  {song.name}
                                </span>
                                {(song.coverOf || song.info) && (
                                  <div className="flex flex-wrap gap-1 text-[10px] text-zinc-400 mt-0.5">
                                    {song.coverOf && (
                                      <span className="text-purple-300">
                                        Cover of {song.coverOf}
                                      </span>
                                    )}
                                    {song.info && (
                                      <span className="text-zinc-500 italic">[{song.info}]</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSong(songs.indexOf(song))}
                              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition"
                              title="移除此曲"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 右側：手動新增曲目與播放清單連結 */}
            <div className="space-y-5">
              {/* 新增曲目表單 */}
              <form
                onSubmit={handleAddSong}
                className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 space-y-3.5"
              >
                <div className="flex items-center space-x-2 text-xs font-bold text-zinc-200 border-b border-zinc-800 pb-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>手動添加演出曲目</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    歌曲名稱 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSongName}
                    onChange={(e) => setNewSongName(e.target.value)}
                    placeholder="例：STAR RISING"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="encoreCheck"
                    checked={newIsEncore}
                    onChange={(e) => setNewIsEncore(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <label
                    htmlFor="encoreCheck"
                    className="text-xs text-zinc-300 font-medium cursor-pointer"
                  >
                    此為安可曲 (Encore)
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    原唱歌手 (翻唱歌曲選填)
                  </label>
                  <input
                    type="text"
                    value={newCoverOf}
                    onChange={(e) => setNewCoverOf(e.target.value)}
                    placeholder="例：宇多田光"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    演出備註 (選填)
                  </label>
                  <input
                    type="text"
                    value={newInfo}
                    onChange={(e) => setNewInfo(e.target.value)}
                    placeholder="例：不插電版本、嘉賓合唱"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-indigo-300 hover:text-white font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>加入曲目</span>
                </button>
              </form>

              {/* 串流音樂全生態深度聯動中心 (Spotify / Apple Music / YouTube Music) */}
              <StreamingSyncHub
                songs={songs}
                artistName={artistName.trim() || eventTitle.split(' ')[0] || '演出藝人'}
                tourName={eventTitle}
                venueName={venueName}
                sessionDate={sessionDate}
                spotifyPlaylistUrl={spotifyUrl}
                appleMusicUrl={appleMusicUrl}
                youtubeMusicUrl={youtubeMusicUrl}
                onUpdateUrls={(urls) => {
                  if (urls.spotifyPlaylistUrl !== undefined) setSpotifyUrl(urls.spotifyPlaylistUrl);
                  if (urls.appleMusicUrl !== undefined) setAppleMusicUrl(urls.appleMusicUrl);
                  if (urls.youtubeMusicUrl !== undefined) setYoutubeMusicUrl(urls.youtubeMusicUrl);
                }}
              />

              {/* 心得與隨筆筆記 */}
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 space-y-2">
                <label className="block text-[11px] font-medium text-zinc-300">
                  現場隨筆與觀演筆記
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="記錄這場演出的特別曲目回憶、嘉賓或安可驚喜..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal 底部按鈕 */}
        <div className="px-5 py-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            <span>共 {songs.length} 首現場曲目</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                haptics.light();
                onClose();
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition"
            >
              取消
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSetlist}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition"
            >
              {saving ? '儲存中...' : '儲存歌單記錄'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
