'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  Camera,
  MapPin,
  Star,
  Search,
  Filter,
  X,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { haptics } from '../utils/haptics';

export interface SeatViewItem {
  id: string;
  userId: string;
  venueName: string;
  venueId?: string | null;
  sessionId?: string | null;
  attendanceId?: string | null;
  eventTitle?: string | null;
  section: string;
  rowNumber?: string | null;
  seatNumber?: string | null;
  photoUrl: string;
  viewRating?: number | null;
  visibility: 'CLEAR' | 'GOOD' | 'PARTIAL' | 'OBSTRUCTED' | 'DISTANCE';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SeatViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVenue?: string | null;
  initialSection?: string | null;
  initialRow?: string | null;
  initialEventTitle?: string | null;
  initialSessionId?: string | null;
  initialAttendanceId?: string | null;
  onViewAdded?: () => void;
}

const VISIBILITY_CONFIG: Record<
  string,
  { label: string; badgeBg: string; color: string; border: string }
> = {
  CLEAR: {
    label: '視野極佳 / 無遮擋',
    badgeBg: 'bg-emerald-950/70',
    color: 'text-emerald-300',
    border: 'border-emerald-700/60',
  },
  GOOD: {
    label: '視野良好',
    badgeBg: 'bg-blue-950/70',
    color: 'text-blue-300',
    border: 'border-blue-700/60',
  },
  PARTIAL: {
    label: '部分微遮擋',
    badgeBg: 'bg-amber-950/70',
    color: 'text-amber-300',
    border: 'border-amber-700/60',
  },
  OBSTRUCTED: {
    label: '視線遮蔽 / 控台擋住',
    badgeBg: 'bg-rose-950/70',
    color: 'text-rose-300',
    border: 'border-rose-700/60',
  },
  DISTANCE: {
    label: '距離偏遠 / 建議望遠鏡',
    badgeBg: 'bg-purple-950/70',
    color: 'text-purple-300',
    border: 'border-purple-700/60',
  },
};

export const SeatViewModal: React.FC<SeatViewModalProps> = ({
  isOpen,
  onClose,
  initialVenue,
  initialSection,
  initialRow,
  initialEventTitle,
  initialSessionId,
  initialAttendanceId,
  onViewAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'add'>('browse');
  const [views, setViews] = useState<SeatViewItem[]>([]);
  const [venues, setVenues] = useState<Array<{ venueName: string; count: number }>>([]);
  const [loading, setLoading] = useState(false);

  // 篩選狀態
  const [selectedVenue, setSelectedVenue] = useState<string>(initialVenue || '');
  const [selectedSection, setSelectedSection] = useState<string>(initialSection || '');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 新增視野狀態
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newVenueName, setNewVenueName] = useState<string>(initialVenue || '');
  const [newSection, setNewSection] = useState<string>(initialSection || '');
  const [newRow, setNewRow] = useState<string>(initialRow || '');
  const [newSeat, setNewSeat] = useState<string>('');
  const [newEventTitle, setNewEventTitle] = useState<string>(initialEventTitle || '');
  const [newVisibility, setNewVisibility] = useState<
    'CLEAR' | 'GOOD' | 'PARTIAL' | 'OBSTRUCTED' | 'DISTANCE'
  >('CLEAR');
  const [newRating, setNewRating] = useState<number>(5);
  const [newNotes, setNewNotes] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 燈箱大圖
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // 當打開視窗或 initial 參數變化時更新表單與查詢
  useEffect(() => {
    if (isOpen) {
      if (initialVenue) {
        setSelectedVenue(initialVenue);
        setNewVenueName(initialVenue);
      }
      if (initialSection) {
        setSelectedSection(initialSection);
        setNewSection(initialSection);
      }
      if (initialRow) {
        setNewRow(initialRow);
      }
      if (initialEventTitle) {
        setNewEventTitle(initialEventTitle);
      }
      loadSeatViews();
    }
  }, [isOpen, initialVenue, initialSection, initialRow, initialEventTitle]);

  const loadSeatViews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedVenue) params.set('venue', selectedVenue);
      if (selectedSection) params.set('section', selectedSection);
      if (searchQuery) params.set('query', searchQuery);

      const res = await fetch(`/api/seat-views?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setViews(data.views || []);
        if (data.venues) {
          setVenues(data.venues);
        }
      }
    } catch (err) {
      console.error('載入視野照片失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  // 當篩選器變更時重查
  useEffect(() => {
    if (isOpen && activeTab === 'browse') {
      loadSeatViews();
    }
  }, [selectedVenue, selectedSection, searchQuery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploadError(null);
    haptics.light();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
      haptics.light();
    }
  };

  const handleSaveView = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('請選擇或拍攝一張座位視野照片');
      return;
    }
    if (!newVenueName.trim()) {
      setUploadError('請填寫演唱會場館名稱');
      return;
    }
    if (!newSection.trim()) {
      setUploadError('請填寫座位區域 (例如：特A區、黃2C區)');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 1. 上傳檔案至 /api/upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', 'seat-views');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || '照片上傳失敗');
      }

      const uploadData = await uploadRes.json();
      const photoUrl = uploadData.url;

      // 2. 存入視角資料庫
      const payload = {
        venueName: newVenueName.trim(),
        section: newSection.trim(),
        rowNumber: newRow.trim() || null,
        seatNumber: newSeat.trim() || null,
        photoUrl,
        eventTitle: newEventTitle.trim() || null,
        sessionId: initialSessionId || null,
        attendanceId: initialAttendanceId || null,
        visibility: newVisibility,
        viewRating: newRating,
        notes: newNotes.trim() || null,
      };

      const res = await fetch('/api/seat-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '儲存視野記錄失敗');
      }

      haptics.success();

      // 重置表單並切換至瀏覽頁
      setSelectedFile(null);
      setPreviewUrl(null);
      setNewNotes('');
      setSelectedVenue(newVenueName.trim());
      setSelectedSection(newSection.trim());
      setActiveTab('browse');
      await loadSeatViews();
      if (onViewAdded) onViewAdded();
    } catch (err) {
      const error = err as Error;
      setUploadError(error.message);
      haptics.warning();
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteView = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('確定要刪除這張視野照片嗎？')) return;

    try {
      const res = await fetch(`/api/seat-views?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        haptics.medium();
        setViews((prev) => prev.filter((v) => v.id !== id));
      }
    } catch (err) {
      console.error('刪除視野照片失敗:', err);
    }
  };

  if (!isOpen) return null;

  // 取得目前所有出現的分區選項供快速過濾
  const uniqueSections = Array.from(new Set(views.map((v) => v.section))).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal 頂部 Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  視角資料庫 (View From My Seat)
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/80 rounded-full">
                  社群視角圖庫
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {selectedVenue ? `現正瀏覽：${selectedVenue}` : '查詢真實場館座位視野與無遮擋照片'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Tab 切換器 */}
            <div className="flex p-1 bg-zinc-800/80 rounded-xl border border-zinc-700/60">
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setActiveTab('browse');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'browse'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                視野圖庫 ({views.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setActiveTab('add');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                  activeTab === 'add'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>貢獻視野照片</span>
              </button>
            </div>

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
          {activeTab === 'browse' ? (
            <div className="space-y-5">
              {/* 篩選與搜尋列 */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-zinc-950/50 p-3.5 rounded-xl border border-zinc-800">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {/* 場館選擇器 */}
                  <div className="flex items-center space-x-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-700/80 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <select
                      value={selectedVenue}
                      onChange={(e) => setSelectedVenue(e.target.value)}
                      className="bg-transparent text-white focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-zinc-900 text-zinc-300">
                        所有場館 ({venues.reduce((acc, v) => acc + v.count, 0)})
                      </option>
                      {venues.map((v) => (
                        <option
                          key={v.venueName}
                          value={v.venueName}
                          className="bg-zinc-900 text-white"
                        >
                          {v.venueName} ({v.count})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 分區快速過濾 */}
                  {uniqueSections.length > 0 && (
                    <div className="flex items-center space-x-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-700/80 text-xs">
                      <Filter className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <select
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="bg-transparent text-white focus:outline-none cursor-pointer"
                      >
                        <option value="" className="bg-zinc-900 text-zinc-300">
                          全部分區
                        </option>
                        {uniqueSections.map((sec) => (
                          <option key={sec} value={sec} className="bg-zinc-900 text-white">
                            {sec}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 清除篩選 */}
                  {(selectedVenue || selectedSection) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVenue('');
                        setSelectedSection('');
                      }}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                    >
                      重置篩選
                    </button>
                  )}
                </div>

                {/* 關鍵字搜尋 */}
                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋座位、排號或心得..."
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-700/80 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 照片卡片網格 */}
              {loading ? (
                <div className="py-16 text-center text-zinc-500 text-xs">正在載入座位視野...</div>
              ) : views.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-zinc-800 rounded-2xl p-8 bg-zinc-950/30">
                  <div className="p-4 bg-zinc-900/90 rounded-full border border-zinc-700">
                    <Compass className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">尚無視野照片記錄</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                      {selectedVenue || selectedSection
                        ? '此場館或分區目前還沒有視野照片，快來上傳分享！'
                        : '還沒有人上傳過視野照片，點擊上方「貢獻視野照片」成為第一人！'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      setActiveTab('add');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-indigo-500/20"
                  >
                    <Camera className="w-4 h-4" />
                    <span>立即上傳視野照片</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {views.map((item, index) => {
                    const visConfig = VISIBILITY_CONFIG[item.visibility] || VISIBILITY_CONFIG.CLEAR;
                    return (
                      <div
                        key={item.id}
                        className="group bg-zinc-950/70 border border-zinc-800 hover:border-zinc-600 rounded-xl overflow-hidden shadow-lg transition duration-200 flex flex-col"
                      >
                        {/* 照片主圖 */}
                        <div
                          className="relative aspect-video w-full bg-zinc-900 cursor-pointer overflow-hidden"
                          onClick={() => setLightboxIndex(index)}
                        >
                          <img
                            src={item.photoUrl}
                            alt={`${item.venueName} - ${item.section}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-90 group-hover:opacity-100 transition-opacity" />

                          {/* 能見度標籤 */}
                          <div className="absolute top-2.5 left-2.5">
                            <span
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${visConfig.badgeBg} ${visConfig.color} ${visConfig.border} backdrop-blur-md`}
                            >
                              {visConfig.label}
                            </span>
                          </div>

                          {/* 刪除按鈕 */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteView(item.id, e)}
                            className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 hover:bg-rose-900/80 text-zinc-400 hover:text-rose-200 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition"
                            title="刪除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* 底部座位概要 */}
                          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-baseline justify-between text-white">
                            <div>
                              <span className="text-sm font-black tracking-wide text-amber-300">
                                {item.section}
                              </span>
                              {item.rowNumber && (
                                <span className="ml-1.5 text-xs text-zinc-200 font-bold">
                                  {item.rowNumber}
                                </span>
                              )}
                              {item.seatNumber && (
                                <span className="ml-1 text-[11px] text-zinc-400">
                                  ({item.seatNumber})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center text-amber-400">
                              <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                              <span className="text-xs font-bold">{item.viewRating || 5}</span>
                            </div>
                          </div>
                        </div>

                        {/* 下半部資訊 */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                          <div className="space-y-1.5">
                            <div className="flex items-center text-xs text-zinc-300">
                              <MapPin className="w-3.5 h-3.5 text-rose-400 mr-1 flex-shrink-0" />
                              <span className="font-semibold truncate">{item.venueName}</span>
                            </div>

                            {item.eventTitle && (
                              <div className="text-[11px] text-indigo-300 truncate">
                                🎵 {item.eventTitle}
                              </div>
                            )}

                            {item.notes && (
                              <p className="text-xs text-zinc-400 line-clamp-2 italic leading-relaxed bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/80">
                                “{item.notes}”
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                            <span>
                              記錄時間：{new Date(item.createdAt).toLocaleDateString('zh-TW')}
                            </span>
                            <button
                              type="button"
                              onClick={() => setLightboxIndex(index)}
                              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
                            >
                              <Maximize2 className="w-3 h-3" />
                              <span>放大全圖</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* 貢獻視野表單 */
            <form onSubmit={handleSaveView} className="max-w-2xl mx-auto space-y-5">
              <div className="bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-700/40 rounded-xl p-4 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-200 leading-relaxed">
                  <strong className="text-white block mb-0.5">
                    共享真實視野，幫助更多樂迷選位
                  </strong>
                  上傳你在現場拍下的舞台視角照片，並標註具體分區與排號。所有資料皆保存在本地資料庫中，離線也能快速檢視！
                </div>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/70 rounded-xl flex items-center space-x-2 text-xs text-rose-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* 照片上傳區域 */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  視野相片 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-700 group bg-zinc-950">
                    <img src={previewUrl} alt="預覽" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium border border-zinc-600"
                      >
                        更換照片
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-200 rounded-lg text-xs font-medium border border-rose-700"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-zinc-700 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-zinc-950/50 hover:bg-zinc-900/40"
                  >
                    <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                    <p className="text-xs font-bold text-zinc-200">點擊選擇照片，或拖曳至此處</p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      支援 JPEG, PNG, WebP（上限 5MB）
                    </p>
                  </div>
                )}
              </div>

              {/* 場館與分區資訊 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    場館名稱 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                    placeholder="例如：臺北小巨蛋、高雄巨蛋"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    分區名稱 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    placeholder="例如：特A區、黃2C區、二樓看台"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 排號與座位號 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">排號 (Row)</label>
                  <input
                    type="text"
                    value={newRow}
                    onChange={(e) => setNewRow(e.target.value)}
                    placeholder="例如：5排、第12排"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    座位號 (Seat)
                  </label>
                  <input
                    type="text"
                    value={newSeat}
                    onChange={(e) => setNewSeat(e.target.value)}
                    placeholder="例如：18號 (可選填)"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 視線清晰度與星等評分 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">視線狀態</label>
                  <select
                    value={newVisibility}
                    onChange={(e) =>
                      setNewVisibility(
                        e.target.value as 'CLEAR' | 'GOOD' | 'PARTIAL' | 'OBSTRUCTED' | 'DISTANCE'
                      )
                    }
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="CLEAR">CLEAR - 視野極佳 / 無遮擋</option>
                    <option value="GOOD">GOOD - 視野良好</option>
                    <option value="PARTIAL">PARTIAL - 部分微受阻</option>
                    <option value="OBSTRUCTED">OBSTRUCTED - 視線遮蔽 / 控台遮擋</option>
                    <option value="DISTANCE">DISTANCE - 距離偏遠 / 需望遠鏡</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">視野滿意度</label>
                  <div className="flex items-center space-x-1.5 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          haptics.light();
                          setNewRating(star);
                        }}
                        className="p-1 text-zinc-600 hover:text-amber-400 transition"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= newRating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-400 ml-2">{newRating} 星</span>
                  </div>
                </div>
              </div>

              {/* 演出名稱 (選填) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  拍攝時的演唱會或活動 (選填)
                </label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="例如：AIMI ASIA TOUR 2026 Taipei"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* 心得備註 */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  視野體驗心得與備註
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  placeholder="分享此座位的具體感受（例如：看主舞台很清楚但延伸舞台微受阻、低音喇叭直吹、椅子間距等）..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* 按鈕組 */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setActiveTab('browse');
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition"
                >
                  {uploading ? (
                    <span>儲存上傳中...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>確認貢獻視野</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 燈箱全圖預覽 Modal */}
      {lightboxIndex !== null && views[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-5xl max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={views[lightboxIndex].photoUrl}
              alt="全螢幕預覽"
              className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
            />
            <div className="mt-3 text-center">
              <div className="text-white font-bold text-sm">
                {views[lightboxIndex].venueName} · {views[lightboxIndex].section}{' '}
                {views[lightboxIndex].rowNumber || ''}
              </div>
              {views[lightboxIndex].notes && (
                <div className="text-zinc-400 text-xs mt-1 max-w-md">
                  {views[lightboxIndex].notes}
                </div>
              )}
            </div>

            {/* 左右切換 */}
            {views.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev !== null ? (prev - 1 + views.length) % views.length : 0
                    )
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full border border-white/20"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % views.length : 0))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full border border-white/20"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute -top-10 right-0 p-1.5 text-zinc-400 hover:text-white rounded-full bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
