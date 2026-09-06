'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface MediaItem {
  id: string;
  attendanceId: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'PHOTO' | 'VIDEO' | 'AUDIO';
  capturedAt: string | null;
  caption: string | null;
  createdAt: string;
}

interface MediaGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceId: string;
  eventTitle: string;
  sessionDate?: string;
  onUpdated?: () => void;
}

export const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
  isOpen,
  onClose,
  attendanceId,
  eventTitle,
  sessionDate,
  onUpdated,
}) => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');

  // 上傳表單狀態
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [capturedAt, setCapturedAt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 燈箱大圖預覽
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && attendanceId) {
      loadMedia();
    }
  }, [isOpen, attendanceId]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/media?attendanceId=${encodeURIComponent(attendanceId)}`);
      if (res.ok) {
        const data = await res.json();
        setMediaList(data.media || []);
      }
    } catch (err) {
      console.error('載入現場多媒體失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // 預設擷取檔案最後修改時間作為 capturedAt
    if (file.lastModified) {
      const d = new Date(file.lastModified);
      const iso = d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
      setCapturedAt(iso);
    }
  };

  const handleUploadAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      // 1. 上傳檔案至 /api/upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', 'media');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || '檔案上傳失敗');
      }

      const uploadData = await uploadRes.json();
      const uploadedUrl = uploadData.url;
      const isVideo = selectedFile.type.toLowerCase().startsWith('video/');

      // 2. 寫入 attendance_media 資料庫
      const mediaRes = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId,
          mediaUrl: uploadedUrl,
          mediaType: isVideo ? 'VIDEO' : 'PHOTO',
          capturedAt: capturedAt ? new Date(capturedAt).toISOString() : null,
          caption: caption.trim() || null,
        }),
      });

      if (!mediaRes.ok) {
        const err = await mediaRes.json();
        throw new Error(err.error || '多媒體記錄失敗');
      }

      // 重設表單
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
      setCapturedAt('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      await loadMedia();
      onUpdated?.();
    } catch (err) {
      const error = err as Error;
      alert(`新增失敗: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!confirm('確定要自回憶牆中移除這則現場紀錄嗎？')) return;

    try {
      const res = await fetch(`/api/media?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '刪除失敗');
      }

      await loadMedia();
      onUpdated?.();
    } catch (err) {
      const error = err as Error;
      alert(`刪除失敗: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📸</span>
              <h3 className="text-lg font-bold text-zinc-100">現場時序回憶牆 (Live Memories)</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1 truncate max-w-xl">{eventTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex bg-zinc-800 p-1 rounded-lg border border-zinc-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded text-xs transition flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>🔲</span> 網格相簿
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-2.5 py-1 rounded text-xs transition flex items-center gap-1 ${
                  viewMode === 'timeline'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>⏱️</span> 時序軸
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload New Memory Section */}
          <form
            onSubmit={handleUploadAndSave}
            className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl p-4 space-y-4"
          >
            <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <span>✨</span> 上傳現場照片或短影音
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* File input / preview */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg, image/png, image/webp, image/gif, video/mp4"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {previewUrl ? (
                  <div className="relative group rounded-xl overflow-hidden border border-zinc-700 aspect-video bg-black flex items-center justify-center">
                    {selectedFile?.type.startsWith('video/') ? (
                      <video src={previewUrl} className="max-h-full max-w-full" controls />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="預覽"
                        className="max-h-full max-w-full object-contain"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-full text-xs transition"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video border-2 border-dashed border-zinc-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center p-4 text-center transition group bg-zinc-900/50"
                  >
                    <span className="text-2xl group-hover:scale-110 transition">📷</span>
                    <span className="text-xs text-zinc-300 font-medium mt-2">
                      點擊選擇照片 / 短片
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">
                      支援 JPG, PNG, WebP, MP4
                    </span>
                  </button>
                )}
              </div>

              {/* Caption & Captured At Inputs */}
              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    那刻的回憶註記 (Caption)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="例如：開場前的燈海震撼、安可曲全場大合唱！"
                    maxLength={200}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    記錄時間 (可留空或調整)
                  </label>
                  <input
                    type="datetime-local"
                    value={capturedAt}
                    onChange={(e) => setCapturedAt(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    {uploading ? '上傳儲存中...' : '確認發佈到回憶牆'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Media Items Wall */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <span>🎞️</span> 現場紀錄時序一覽
              </h4>
              <span className="text-xs text-zinc-500">{mediaList.length} 則現場紀錄</span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-zinc-500 text-sm">載入現場回憶中...</div>
            ) : mediaList.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
                <span className="text-4xl block mb-3">🌌</span>
                <p className="text-sm text-zinc-300 font-medium">現場回憶牆尚無任何紀錄</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  快將演唱會當天的舞台燈光、合照與手燈海洋照片存入這座時光膠囊吧！
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid Gallery View */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {mediaList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="group relative bg-zinc-800/80 rounded-xl overflow-hidden border border-zinc-700/60 aspect-square flex flex-col"
                  >
                    <div
                      className="flex-1 w-full h-full relative cursor-pointer overflow-hidden bg-black flex items-center justify-center"
                      onClick={() => setLightboxIndex(idx)}
                    >
                      {item.mediaType === 'VIDEO' ? (
                        <video src={item.mediaUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img
                          src={item.mediaUrl}
                          alt={item.caption || '現場相片'}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      )}
                      {item.mediaType === 'VIDEO' && (
                        <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] text-white">
                          ▶ 影片
                        </span>
                      )}
                    </div>

                    {/* Overlay Info */}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-end justify-between">
                      <div className="min-w-0 pr-2">
                        {item.caption && (
                          <p className="text-xs text-zinc-100 font-medium truncate">
                            {item.caption}
                          </p>
                        )}
                        <p className="text-[10px] text-zinc-400">
                          {item.capturedAt
                            ? new Date(item.capturedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMedia(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-400 rounded transition"
                        title="刪除紀錄"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Timeline View */
              <div className="relative pl-6 border-l-2 border-indigo-500/30 space-y-6 my-2">
                {mediaList.map((item) => {
                  const displayTime = item.capturedAt
                    ? new Date(item.capturedAt).toLocaleString()
                    : new Date(item.createdAt).toLocaleString();

                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-zinc-900 ring-2 ring-indigo-500/40" />

                      <div className="bg-zinc-800/50 hover:bg-zinc-800/80 border border-zinc-700/60 rounded-xl p-4 transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-indigo-400 flex items-center gap-1.5">
                            <span>⏱️</span> {displayTime}
                          </span>
                          <button
                            onClick={() => handleDeleteMedia(item.id)}
                            className="text-zinc-500 hover:text-rose-400 text-xs p-1 rounded transition"
                            title="刪除"
                          >
                            🗑️
                          </button>
                        </div>

                        {item.caption && (
                          <p className="text-sm font-medium text-zinc-100 mb-3">{item.caption}</p>
                        )}

                        <div className="rounded-lg overflow-hidden border border-zinc-700/80 max-w-md bg-black">
                          {item.mediaType === 'VIDEO' ? (
                            <video src={item.mediaUrl} controls className="w-full max-h-80" />
                          ) : (
                            <img
                              src={item.mediaUrl}
                              alt={item.caption || '現場相片'}
                              className="w-full max-h-80 object-cover cursor-pointer hover:opacity-95 transition"
                              onClick={() => {
                                const idx = mediaList.findIndex((m) => m.id === item.id);
                                if (idx !== -1) setLightboxIndex(idx);
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition"
          >
            完成並關閉
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && mediaList[lightboxIndex] && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white text-2xl hover:text-zinc-400 p-2"
          >
            ✕
          </button>

          <div
            className="max-w-4xl max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {mediaList[lightboxIndex].mediaType === 'VIDEO' ? (
              <video
                src={mediaList[lightboxIndex].mediaUrl}
                controls
                autoPlay
                className="max-h-[75vh] max-w-full rounded-lg"
              />
            ) : (
              <img
                src={mediaList[lightboxIndex].mediaUrl}
                alt={mediaList[lightboxIndex].caption || '相片'}
                className="max-h-[75vh] max-w-full object-contain rounded-lg"
              />
            )}
            {mediaList[lightboxIndex].caption && (
              <p className="text-white text-center mt-3 text-sm font-medium bg-black/60 px-4 py-1.5 rounded-full">
                {mediaList[lightboxIndex].caption}
              </p>
            )}
          </div>

          {/* Prev / Next controls */}
          {mediaList.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : mediaList.length - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl p-3 bg-zinc-800/40 hover:bg-zinc-800 rounded-full transition"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev! < mediaList.length - 1 ? prev! + 1 : 0));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl p-3 bg-zinc-800/40 hover:bg-zinc-800 rounded-full transition"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
