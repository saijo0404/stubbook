'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Camera,
  Sun,
  Moon,
  Sparkles,
  Wifi,
  WifiOff,
  Radio,
  Clock,
  Ticket,
  MapPin,
  CheckCircle2,
  Save,
  Flame,
} from 'lucide-react';
import {
  nativeBridge,
  nativeCamera,
  nativeHaptics,
  nativeNetwork,
  nativeStatusBar,
  AppNetworkStatus,
} from '../utils/native';
import { SavedEvent, SavedSession } from './LiveEventHeroCard';

interface LiveConcertModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: SavedEvent;
  session: SavedSession;
  onSaveNote?: (note: string) => Promise<void>;
  onAddMediaSnapshot?: (dataUrl: string) => Promise<void>;
}

export const LiveConcertModeModal: React.FC<LiveConcertModeModalProps> = ({
  isOpen,
  onClose,
  event,
  session,
  onSaveNote,
  onAddMediaSnapshot,
}) => {
  const [networkStatus, setNetworkStatus] = useState<AppNetworkStatus>({
    connected: true,
    connectionType: 'wifi',
    isCellular: false,
    isOffline: false,
  });

  const [maxBrightnessMode, setMaxBrightnessMode] = useState(false);
  const [lightstickColor, setLightstickColor] = useState<string | null>(null);
  const [quickNote, setQuickNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<'seat' | 'barcode' | 'memo' | 'lightstick'>('seat');

  // Activate immersive status bar on open
  useEffect(() => {
    if (!isOpen) return;

    nativeStatusBar.setConcertMode(true);
    nativeHaptics.heavy();

    // Fetch initial network status
    nativeNetwork.getStatus().then(setNetworkStatus);

    // Listen to network changes
    const cleanupNetwork = nativeNetwork.addListener(setNetworkStatus);

    return () => {
      cleanupNetwork();
      nativeStatusBar.setConcertMode(false);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const attendance = session.attendance;
  const seatDisplay = attendance?.seatInfo || '自由入座 / 搖滾站席';
  const venueDisplay = session.venueName || '指定演出場館';

  const handleClose = () => {
    nativeHaptics.medium();
    onClose();
  };

  const handleToggleBrightness = () => {
    nativeHaptics.heavy();
    setMaxBrightnessMode((prev) => !prev);
  };

  const handleSnapPhoto = async () => {
    nativeHaptics.medium();
    try {
      const result = await nativeCamera.takePhoto({ quality: 85 });
      setCapturedPhotoUrl(result.dataUrl);
      nativeHaptics.success();
    } catch (err: any) {
      if (!err.message?.includes('cancelled')) {
        console.warn('Camera snap failed:', err);
      }
    }
  };

  const handleConfirmSavePhoto = async () => {
    if (!capturedPhotoUrl) return;
    setIsSavingPhoto(true);
    nativeHaptics.medium();
    try {
      if (onAddMediaSnapshot) {
        await onAddMediaSnapshot(capturedPhotoUrl);
      }
      nativeHaptics.success();
      setCapturedPhotoUrl(null);
    } catch (err) {
      console.error(err);
      nativeHaptics.warning();
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleSaveMemo = async () => {
    if (!quickNote.trim()) return;
    setIsSavingNote(true);
    nativeHaptics.medium();
    try {
      if (onSaveNote) {
        await onSaveNote(quickNote.trim());
      }
      nativeHaptics.success();
      setQuickNote('');
      setActiveTab('seat');
    } catch (err) {
      console.error(err);
      nativeHaptics.warning();
    } finally {
      setIsSavingNote(false);
    }
  };

  // Lightstick cheering colors
  const LIGHTSTICK_PALETTES = [
    { name: '螢光粉 (Pink)', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.7)' },
    { name: '激光紫 (Purple)', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.7)' },
    { name: '暖心金 (Gold)', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.7)' },
    { name: '薄荷綠 (Mint)', color: '#10b981', glow: 'rgba(16, 185, 129, 0.7)' },
    { name: '純澈白 (Pure White)', color: '#ffffff', glow: 'rgba(255, 255, 255, 0.8)' },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-300 ${
        maxBrightnessMode
          ? 'bg-white text-black'
          : lightstickColor
            ? 'text-white'
            : 'bg-black text-gray-100'
      }`}
      style={
        lightstickColor && !maxBrightnessMode
          ? {
              backgroundColor: lightstickColor,
              boxShadow: `inset 0 0 100px rgba(0,0,0,0.5)`,
            }
          : undefined
      }
    >
      {/* Dynamic Island & Notch Safe Top Bar */}
      <header className="pt-safe px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🏟️</span>
          <div>
            <h2 className="text-sm font-bold truncate max-w-[200px] sm:max-w-md text-white">
              {event.title}
            </h2>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span className="flex items-center">
                <MapPin className="w-3 h-3 mr-1 text-purple-400" />
                {venueDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Network & Offline Radar Badge */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-xs px-2.5 py-1 rounded-full border border-white/15 bg-white/5">
            {networkStatus.isOffline ? (
              <span className="flex items-center text-rose-400 font-medium">
                <WifiOff className="w-3.5 h-3.5 mr-1" />
                離線防護已就緒
              </span>
            ) : networkStatus.isCellular ? (
              <span className="flex items-center text-amber-400 font-medium">
                <Radio className="w-3.5 h-3.5 mr-1 animate-pulse" />
                基地台人潮壅塞 (離線快取就緒)
              </span>
            ) : (
              <span className="flex items-center text-emerald-400 font-medium">
                <Wifi className="w-3.5 h-3.5 mr-1" />
                網路連線良好
              </span>
            )}
          </div>

          <button
            onClick={handleClose}
            aria-label="關閉現場沉浸模式"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main High-Contrast Concert Stage Screen */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full overflow-y-auto">
        {/* Active Tab 1: High-Contrast Giant Seat Card */}
        {activeTab === 'seat' && (
          <div className="w-full space-y-6">
            <div className="bg-gradient-to-b from-gray-900/90 to-black border-2 border-indigo-500/60 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(99,102,241,0.25)]">
              <div className="text-xs uppercase tracking-widest text-indigo-400 font-bold mb-2 flex items-center justify-center">
                <Ticket className="w-4 h-4 mr-1.5" /> 現場座位指示牌 (Seat View)
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight my-4 py-2 px-3 bg-indigo-950/40 rounded-2xl border border-indigo-500/30">
                {seatDisplay}
              </div>

              <div className="grid grid-cols-2 gap-3 text-left pt-2 border-t border-gray-800/80">
                <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800">
                  <span className="text-[11px] text-gray-400 block">入場時間</span>
                  <span className="text-base font-semibold text-white">
                    {session.doorsOpenTime || '18:00'} 開放
                  </span>
                </div>
                <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800">
                  <span className="text-[11px] text-gray-400 block">票種 / 票價</span>
                  <span className="text-base font-semibold text-emerald-400">
                    {attendance?.ticketType || '全票'} · NT${' '}
                    {attendance?.ticketPrice?.toLocaleString() || '3,800'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Deck */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => {
                  nativeHaptics.light();
                  setActiveTab('barcode');
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 transition-colors"
              >
                <Ticket className="w-5 h-5 mb-1 text-indigo-400" />
                <span>驗票條碼</span>
              </button>

              <button
                onClick={handleSnapPhoto}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 transition-colors"
              >
                <Camera className="w-5 h-5 mb-1 text-pink-400" />
                <span>視角速拍</span>
              </button>

              <button
                onClick={() => {
                  nativeHaptics.light();
                  setActiveTab('memo');
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 transition-colors"
              >
                <Save className="w-5 h-5 mb-1 text-emerald-400" />
                <span>現場速記</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Tab 2: Turnstile Fast Scan Barcode / QR with Max Brightness */}
        {activeTab === 'barcode' && (
          <div className="w-full space-y-4">
            <div
              className={`p-6 rounded-3xl text-center border-2 transition-all ${
                maxBrightnessMode
                  ? 'bg-white text-black border-black shadow-[0_0_60px_rgba(255,255,255,0.9)]'
                  : 'bg-gray-950 text-white border-gray-700'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                驗票速刷視圖 (Turnstile Scanner)
              </div>
              <p className="text-xs mb-4 opacity-70">
                向驗票閘門人員出示此畫面，可一鍵切換純白最大對比防反光
              </p>

              {/* Simulated High-Density Barcode */}
              <div className="bg-white p-4 rounded-xl inline-block border-2 border-dashed border-gray-400">
                <div className="flex justify-center items-end space-x-1 h-16 w-64 px-2">
                  {[4, 2, 6, 1, 3, 5, 2, 7, 3, 1, 4, 6, 2, 5, 3, 1, 6, 2, 4, 3, 5, 1, 6].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="bg-black"
                        style={{
                          width: `${(i % 3) + 2}px`,
                          height: `${h * 9}px`,
                        }}
                      />
                    )
                  )}
                </div>
                <span className="font-mono text-black text-xs font-bold tracking-widest block mt-2">
                  STUB-{session.id.slice(0, 8).toUpperCase()}-2026
                </span>
              </div>

              <div className="mt-6 flex justify-center space-x-3">
                <button
                  onClick={handleToggleBrightness}
                  className={`px-4 py-2.5 rounded-full font-bold text-xs flex items-center transition-all ${
                    maxBrightnessMode
                      ? 'bg-black text-white hover:bg-gray-800'
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  {maxBrightnessMode ? (
                    <>
                      <Moon className="w-4 h-4 mr-1.5" /> 恢復暗黑模式
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4 mr-1.5" /> 螢幕最大亮度 (防反光)
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                nativeHaptics.light();
                setActiveTab('seat');
              }}
              className="w-full py-3 rounded-2xl bg-gray-900 border border-gray-800 text-xs font-semibold text-gray-400 hover:text-white"
            >
              返回座位指示
            </button>
          </div>
        )}

        {/* Active Tab 3: Live Quick Memo */}
        {activeTab === 'memo' && (
          <div className="w-full space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center">
                <Sparkles className="w-4 h-4 text-emerald-400 mr-1.5" />
                現場速記 (Live Memo)
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                在演出空檔快速記錄驚喜、Talking、特別嘉賓或安可感動：
              </p>
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="例如：吉他手 solo 太炸！第二段副歌全場大合唱哭了..."
                rows={4}
                className="w-full bg-black/60 border border-gray-700 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="mt-3 flex justify-end space-x-2">
                <button
                  onClick={() => setActiveTab('seat')}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveMemo}
                  disabled={!quickNote.trim() || isSavingNote}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 flex items-center"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {isSavingNote ? '儲存中...' : '儲存到今日手帳'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Tab 4: Virtual Lightstick Cheering Glow */}
        {activeTab === 'lightstick' && (
          <div className="w-full space-y-4 text-center">
            <div className="p-6 rounded-3xl bg-black/60 border border-white/20 backdrop-blur-md">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center justify-center">
                <Flame className="w-4 h-4 text-pink-400 mr-1.5" />
                虛擬應援螢光棒 (Live Cheering Glow)
              </h3>
              <p className="text-xs text-gray-300 mb-4">
                忘記帶手燈也不怕！點擊下方色塊即可切換螢幕全彩應援：
              </p>

              <div className="grid grid-cols-5 gap-2 mb-4">
                {LIGHTSTICK_PALETTES.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      nativeHaptics.medium();
                      setLightstickColor((prev) => (prev === p.color ? null : p.color));
                    }}
                    style={{ backgroundColor: p.color }}
                    className={`h-12 rounded-xl border-2 transition-transform transform active:scale-95 ${
                      lightstickColor === p.color
                        ? 'border-white scale-105 shadow-[0_0_15px_white]'
                        : 'border-transparent'
                    }`}
                  />
                ))}
              </div>

              {lightstickColor && (
                <button
                  onClick={() => {
                    nativeHaptics.light();
                    setLightstickColor(null);
                  }}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  關閉螢光燈效
                </button>
              )}
            </div>

            <button
              onClick={() => setActiveTab('seat')}
              className="w-full py-3 rounded-2xl bg-gray-900 border border-gray-800 text-xs font-semibold text-gray-400 hover:text-white"
            >
              返回座位指示
            </button>
          </div>
        )}

        {/* Captured Photo Snapshot Modal Dialog */}
        {capturedPhotoUrl && (
          <div className="fixed inset-0 z-60 bg-black/90 p-4 flex flex-col items-center justify-center">
            <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-3xl p-4 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-1.5" />
                視角照片已捕捉
              </h4>
              <div className="rounded-2xl overflow-hidden border border-gray-800 max-h-72 flex justify-center bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedPhotoUrl}
                  alt="Live Stage View"
                  className="object-contain max-h-72 w-auto"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setCapturedPhotoUrl(null)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  捨棄
                </button>
                <button
                  onClick={handleConfirmSavePhoto}
                  disabled={isSavingPhoto}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                >
                  {isSavingPhoto ? '加入中...' : '儲存至視角手帳'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Bar */}
      <footer className="pb-safe px-4 py-3 border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-around text-xs">
        <button
          onClick={() => {
            nativeHaptics.selection();
            setActiveTab('seat');
          }}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'seat' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          💺 我的座位
        </button>

        <button
          onClick={() => {
            nativeHaptics.selection();
            setActiveTab('barcode');
          }}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'barcode' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          🎟️ 驗票條碼
        </button>

        <button
          onClick={() => {
            nativeHaptics.selection();
            setActiveTab('lightstick');
          }}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'lightstick' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          🪄 應援手燈
        </button>
      </footer>
    </div>
  );
};
