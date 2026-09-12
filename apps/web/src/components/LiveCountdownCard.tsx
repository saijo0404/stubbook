'use client';

import React, { useState, useEffect } from 'react';
import { haptics } from '../utils/haptics';

interface LiveActivityData {
  sessionId: string;
  eventId: string;
  eventTitle: string;
  artistName: string;
  posterUrl: string | null;
  venueName: string;
  hallName: string | null;
  venueCity: string | null;
  seatInfo: string | null;
  status: string;
  sessionDate: string;
  doorsOpenTime: string | null;
  isToday: boolean;
  phase: 'UPCOMING' | 'QUEUEING' | 'DOORS_OPEN' | 'COUNTDOWN' | 'LIVE' | 'EXIT';
  phaseTitle: string;
  phaseDescription: string;
  targetTime: string;
  remainingSeconds: number;
}

interface LiveCountdownCardProps {
  onOpenLiveMode?: () => void;
  onOpenSeatView?: (venueName: string) => void;
  onOpenWishlist?: () => void;
}

export default function LiveCountdownCard({
  onOpenLiveMode,
  onOpenSeatView,
  onOpenWishlist,
}: LiveCountdownCardProps) {
  const [data, setData] = useState<LiveActivityData | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [simulatedToast, setSimulatedToast] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 讀取 Live Activity 狀態
  const fetchLiveActivity = async () => {
    try {
      const res = await fetch('/api/live-activity');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setRemainingSec(json.data.remainingSeconds || 0);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Failed to fetch live activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveActivity();
    const interval = setInterval(fetchLiveActivity, 60000); // 每一分鐘重新校準一次伺服器狀態
    return () => clearInterval(interval);
  }, []);

  // 秒級精密本地遞減計時器
  useEffect(() => {
    if (remainingSec <= 0) return;

    const ticker = setInterval(() => {
      setRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(ticker);
  }, [remainingSec]);

  if (loading) {
    return (
      <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-6 animate-pulse flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-gray-800 rounded w-48"></div>
          <div className="h-6 bg-gray-800 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-800 rounded w-32"></div>
      </div>
    );
  }

  if (!data) return null;

  // 計算天、時、分、秒
  const days = Math.floor(remainingSec / 86400);
  const hours = Math.floor((remainingSec % 86400) / 3600);
  const minutes = Math.floor((remainingSec % 3600) / 60);
  const seconds = remainingSec % 60;

  // 模擬靈動島 / 鎖定畫面通知推播
  const handleSimulateDynamicIsland = async (testPhase?: string) => {
    haptics.success();
    const targetPhase = testPhase || data.phase;
    try {
      const res = await fetch('/api/live-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.sessionId, phase: targetPhase }),
      });
      const json = await res.json();
      setSimulatedToast(json.message || '靈動島即時動態推播已模擬送達！');
      setTimeout(() => setSimulatedToast(null), 4000);
    } catch {
      setSimulatedToast('推播模擬完成');
      setTimeout(() => setSimulatedToast(null), 3000);
    }
  };

  const getPhaseColor = () => {
    switch (data.phase) {
      case 'LIVE':
        return 'from-rose-500 via-pink-500 to-amber-500';
      case 'COUNTDOWN':
        return 'from-amber-400 via-rose-500 to-indigo-500';
      case 'DOORS_OPEN':
        return 'from-emerald-400 to-cyan-500';
      case 'QUEUEING':
        return 'from-indigo-400 to-purple-500';
      case 'EXIT':
        return 'from-gray-400 to-slate-500';
      default:
        return 'from-indigo-500 via-purple-500 to-pink-500';
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/90 via-gray-900/70 to-gray-950/90 border border-indigo-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      {/* 背景動態微粒光暈 */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 頂部標頭與即時狀態膠囊 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
          <span className="text-xs font-bold text-gray-300 tracking-wider uppercase">
            LIVE ACTIVITIES · 現場即時心跳
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border bg-gradient-to-r text-white shadow-lg ${
              data.phase === 'LIVE'
                ? 'from-rose-600 to-pink-600 border-rose-400 animate-pulse'
                : data.phase === 'COUNTDOWN'
                  ? 'from-amber-600 to-rose-600 border-amber-400 animate-bounce'
                  : data.phase === 'DOORS_OPEN'
                    ? 'from-emerald-600 to-teal-600 border-emerald-400'
                    : 'from-indigo-600 to-purple-600 border-indigo-400'
            }`}
          >
            {data.phaseTitle}
          </span>
        </div>
      </div>

      {/* 活動主體資訊 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 flex-1">
          <div className="text-xs font-medium text-indigo-300 flex items-center gap-1.5">
            <span>📅 {data.sessionDate.slice(0, 10)}</span>
            <span>·</span>
            <span>
              📍 {data.venueName} {data.hallName ? `(${data.hallName})` : ''}
            </span>
            {data.seatInfo && (
              <>
                <span>·</span>
                <span className="text-amber-300">🎫 {data.seatInfo}</span>
              </>
            )}
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {data.artistName}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-1">{data.eventTitle}</p>
          <p className="text-xs text-indigo-200/80 pt-1">{data.phaseDescription}</p>
        </div>

        {/* 秒級精密數位倒數時鐘 */}
        <div className="flex items-center space-x-2 sm:space-x-3 bg-gray-950/70 border border-gray-800/80 rounded-2xl px-4 py-3 shadow-inner">
          {days > 0 && (
            <>
              <div className="text-center min-w-[44px]">
                <span className="text-2xl sm:text-3xl font-black font-mono bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                  {String(days).padStart(2, '0')}
                </span>
                <span className="block text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                  DAYS
                </span>
              </div>
              <span className="text-xl text-gray-600 font-mono">:</span>
            </>
          )}

          <div className="text-center min-w-[44px]">
            <span className="text-2xl sm:text-3xl font-black font-mono bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              {String(hours).padStart(2, '0')}
            </span>
            <span className="block text-[10px] text-gray-500 font-bold uppercase mt-0.5">
              HOURS
            </span>
          </div>
          <span className="text-xl text-gray-600 font-mono">:</span>

          <div className="text-center min-w-[44px]">
            <span className="text-2xl sm:text-3xl font-black font-mono bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              {String(minutes).padStart(2, '0')}
            </span>
            <span className="block text-[10px] text-gray-500 font-bold uppercase mt-0.5">MINS</span>
          </div>
          <span className="text-xl text-gray-600 font-mono">:</span>

          <div className="text-center min-w-[44px]">
            <span className="text-2xl sm:text-3xl font-black font-mono text-rose-400 animate-pulse">
              {String(seconds).padStart(2, '0')}
            </span>
            <span className="block text-[10px] text-rose-500/80 font-bold uppercase mt-0.5">
              SECS
            </span>
          </div>
        </div>
      </div>

      {/* 5 階段現場生命週期進度條 */}
      <div className="mt-6 pt-5 border-t border-gray-800/70">
        <div className="grid grid-cols-5 text-center text-[10px] sm:text-xs font-semibold text-gray-400 relative">
          {/* 連接進度背景線 */}
          <div className="absolute top-2.5 left-[10%] right-[10%] h-0.5 bg-gray-800 -z-0" />

          {[
            { label: '購票確定', key: 'UPCOMING', icon: '🎫' },
            { label: '整隊領物', key: 'QUEUEING', icon: '⛺' },
            { label: '驗票入場', key: 'DOORS_OPEN', icon: '🚪' },
            { label: '開演狂歡', key: 'LIVE', icon: '🔥' },
            { label: '散場手帳', key: 'EXIT', icon: '📖' },
          ].map((step, idx) => {
            const isCurrent = data.phase === step.key;
            return (
              <div key={step.key} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] mb-1.5 transition-all ${
                    isCurrent
                      ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.8)] scale-110 ring-2 ring-white/40'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {step.icon}
                </div>
                <span className={isCurrent ? 'text-white font-bold' : 'text-gray-500'}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 快捷操作列 */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-800/50">
        <div className="flex flex-wrap gap-2">
          {onOpenLiveMode && (
            <button
              onClick={() => {
                haptics.medium();
                onOpenLiveMode();
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 transition-transform active:scale-95"
            >
              <span>🔦</span>
              <span>現場沉浸模式</span>
            </button>
          )}

          {onOpenSeatView && (
            <button
              onClick={() => {
                haptics.selection();
                onOpenSeatView(data.venueName);
              }}
              className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-xl border border-gray-700/60 flex items-center space-x-1.5"
            >
              <span>👀</span>
              <span>場館視野探索</span>
            </button>
          )}

          <button
            onClick={() => handleSimulateDynamicIsland()}
            className="px-3.5 py-1.5 bg-gray-800/80 hover:bg-gray-700 text-indigo-300 text-xs font-medium rounded-xl border border-indigo-700/40 flex items-center space-x-1.5"
          >
            <span>📱</span>
            <span>模擬靈動島通知</span>
          </button>
        </div>

        {/* 狀態切換模擬測試器 */}
        <div className="flex items-center space-x-1 text-[11px] text-gray-500">
          <span>切換情境：</span>
          {['QUEUEING', 'DOORS_OPEN', 'COUNTDOWN', 'LIVE', 'EXIT'].map((p) => (
            <button
              key={p}
              onClick={() => handleSimulateDynamicIsland(p)}
              className="px-1.5 py-0.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
            >
              {p === 'QUEUEING'
                ? '整隊'
                : p === 'DOORS_OPEN'
                  ? '入場'
                  : p === 'COUNTDOWN'
                    ? '開演'
                    : p === 'LIVE'
                      ? '演唱'
                      : '散場'}
            </button>
          ))}
        </div>
      </div>

      {/* 靈動島模擬氣泡提示 (Dynamic Island Banner Toast) */}
      {simulatedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/90 text-white border border-gray-700 px-5 py-2.5 rounded-full shadow-2xl text-xs flex items-center space-x-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{simulatedToast}</span>
        </div>
      )}
    </div>
  );
}
