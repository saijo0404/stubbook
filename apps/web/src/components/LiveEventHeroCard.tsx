'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Ticket,
  Camera,
  ShoppingBag,
  MapPin,
  Calendar,
  CheckSquare,
  Square,
  Compass,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Eye,
  ListMusic,
} from 'lucide-react';
import { haptics } from '../utils/haptics';

export interface SavedSession {
  id: string;
  sessionTitle: string | null;
  sessionDate: string;
  doorsOpenTime: string | null;
  ticketSaleTime: string | null;
  ticketPlatform: string;
  ticketTiers: Array<{ name: string; price: number; status?: string }>;
  bookingUrl: string | null;
  venueName: string | null;
  attendance: {
    id: string;
    status: string;
    seatInfo: string | null;
    ticketType: string;
    ticketPrice: number | null;
    currency: string;
    rating: number | null;
    notes: string | null;
    ticketStubUrl?: string | null;
    stubPrivacyMasked?: boolean;
    merchCount?: number;
    merchTotalCost?: number;
    mediaCount?: number;
  } | null;
}

export interface SavedEvent {
  id: string;
  title: string;
  tourName: string | null;
  platform: string;
  sourceUrl: string;
  posterUrl: string | null;
  description: string | null;
  organizer: string | null;
  createdAt: string;
  sessions: SavedSession[];
  sessionsCount: number;
}

interface LiveEventHeroCardProps {
  event: SavedEvent;
  session: SavedSession;
  onViewTicketStub: () => void;
  onOpenMediaGallery: () => void;
  onOpenMerchManager: () => void;
  onOpenSeatViews?: (venueName?: string, seatInfo?: string) => void;
  onOpenSetlist?: () => void;
}

interface CountdownState {
  status: 'COUNTDOWN' | 'IN_PROGRESS' | 'COMPLETED';
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const DEFAULT_CHECKLIST = [
  { id: 'ticket', label: '確認門票（實體票券或已遮罩電子截圖）' },
  { id: 'lightstick', label: '應援手燈更換全新電池與確認配對' },
  { id: 'venue_rule', label: '確認場館規則（禁帶外食、違禁品與大包包）' },
  { id: 'transit', label: '規劃往返交通與散場捷運疏散動線' },
];

export const LiveEventHeroCard: React.FC<LiveEventHeroCardProps> = ({
  event,
  session,
  onViewTicketStub,
  onOpenMediaGallery,
  onOpenMerchManager,
  onOpenSeatViews,
  onOpenSetlist,
}) => {
  const [countdown, setCountdown] = useState<CountdownState>({
    status: 'COUNTDOWN',
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  // 載入與保存檢查清單
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`stubbook_check_${session.id}`);
      if (stored) {
        setChecklist(JSON.parse(stored));
      }
    } catch {
      // 忽略讀取錯誤
    }
  }, [session.id]);

  const toggleCheck = (itemId: string) => {
    haptics.light();
    setChecklist((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      try {
        localStorage.setItem(`stubbook_check_${session.id}`, JSON.stringify(next));
      } catch {
        // 忽略寫入錯誤
      }
      return next;
    });
  };

  // 即時動態倒數計時器
  useEffect(() => {
    const updateCountdown = () => {
      const eventTime = new Date(session.sessionDate).getTime();
      const now = Date.now();
      const diff = eventTime - now;

      // 演出開始後 4 小時視為進行中
      if (diff <= 0 && diff > -4 * 60 * 60 * 1000) {
        setCountdown({ status: 'IN_PROGRESS', days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else if (diff <= -4 * 60 * 60 * 1000) {
        setCountdown({ status: 'COMPLETED', days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown({ status: 'COUNTDOWN', days, hours, minutes, seconds });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session.sessionDate]);

  // 場館類型與天氣建議
  const venueText = session.venueName || '';
  const isOutdoor =
    venueText.includes('體育場') ||
    venueText.includes('球場') ||
    venueText.includes('戶外') ||
    venueText.includes('公園');

  const venueTip = isOutdoor
    ? '☀️ 戶外開放式場地：現場注意補充水分與防曬，建議隨身攜帶輕便雨具與隨身風扇。'
    : '❄️ 室內場館：空調冷氣通常較為強烈，建議攜帶薄連帽外套或應援毛巾保暖。';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/90 via-purple-950/80 to-zinc-950 border-2 border-indigo-500/40 p-6 sm:p-8 shadow-2xl backdrop-blur-md animate-fadeIn">
      {/* 背景裝飾光暈 */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* 頂部徽章與場次抬頭 */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-indigo-500/20 pb-4 mb-6">
        <div className="flex items-center space-x-2.5">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 tracking-wide uppercase">
            LIVE EVENT MODE · 現場模式
          </span>
          {session.sessionTitle && (
            <span className="text-xs text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/60">
              {session.sessionTitle}
            </span>
          )}
        </div>

        {/* 倒數計時狀態標籤 */}
        <div>
          {countdown.status === 'IN_PROGRESS' ? (
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black animate-pulse">
              <Flame className="w-3.5 h-3.5 mr-1 text-rose-400" />
              演唱會熱血進行中！ENJOY THE SHOW
            </div>
          ) : countdown.status === 'COMPLETED' ? (
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              演出已圓滿結束
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 font-mono text-xs text-indigo-200 bg-indigo-900/50 px-3 py-1 rounded-full border border-indigo-700/60">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>開場倒數：</span>
              <span className="font-bold text-white text-sm">
                {countdown.days > 0 && `${countdown.days}天 `}
                {String(countdown.hours).padStart(2, '0')}:
                {String(countdown.minutes).padStart(2, '0')}:
                {String(countdown.seconds).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 左側與中間：活動核心資訊與大字號座位展示 */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              {event.title}
            </h2>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-zinc-300 mt-2">
              <div className="flex items-center text-indigo-300 font-medium">
                <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                {new Date(session.sessionDate).toLocaleString('zh-TW', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              {session.venueName && (
                <div className="flex items-center text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-rose-400 flex-shrink-0" />
                  <span className="truncate max-w-sm">{session.venueName}</span>
                </div>
              )}
            </div>
          </div>

          {/* 昏暗場館出示專用：大字號座位標章 */}
          <div className="bg-zinc-950/80 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="text-[11px] font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
                <span>💺 入場座位快速出示 (Show to Usher)</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-200 mt-1 tracking-tight">
                {session.attendance?.seatInfo ? (
                  session.attendance.seatInfo
                ) : (
                  <span className="text-sm font-normal text-zinc-500 italic">尚未填寫座位資訊（可於手帳中補充）</span>
                )}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
                <span>票種：{session.attendance?.ticketType || 'DIGITAL'}</span>
                {session.attendance?.ticketPrice && (
                  <span>· 票價：${session.attendance.ticketPrice.toLocaleString()} {session.attendance.currency}</span>
                )}
              </div>
            </div>

            {/* 操作按鈕組：出示票根與視角速查 */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {onOpenSeatViews && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    onOpenSeatViews(
                      session.venueName || undefined,
                      session.attendance?.seatInfo || undefined
                    );
                  }}
                  className="w-full sm:w-auto px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-indigo-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-indigo-500/30 transition-transform active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  查看此排視野
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  haptics.medium();
                  onViewTicketStub();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-zinc-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
              >
                <Ticket className="w-4 h-4 text-zinc-950" />
                出示擬真票根
              </button>
            </div>
          </div>

          {/* 場館天氣與環境智慧提醒 */}
          <div className="bg-zinc-900/60 border border-zinc-700/60 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-zinc-300">
            <Compass className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{venueTip}</div>
          </div>
        </div>

        {/* 右側：現場入場檢查清單與拍照/周邊捷徑 */}
        <div className="space-y-4">
          {/* 入場檢查備忘錄 */}
          <div className="bg-zinc-900/80 border border-indigo-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                入場行前備忘清單
              </span>
              <span className="text-[10px] text-zinc-500">
                {DEFAULT_CHECKLIST.filter((it) => checklist[it.id]).length} / {DEFAULT_CHECKLIST.length}
              </span>
            </div>

            <div className="space-y-2">
              {DEFAULT_CHECKLIST.map((item) => {
                const checked = Boolean(checklist[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleCheck(item.id)}
                    className={`w-full flex items-center space-x-2 text-left text-xs p-1.5 rounded-lg transition ${
                      checked
                        ? 'text-zinc-500 line-through bg-zinc-950/40'
                        : 'text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    )}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 現場快速動作捷徑 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => {
                haptics.medium();
                onOpenMediaGallery();
              }}
              className="p-3 bg-pink-950/40 hover:bg-pink-900/60 border border-pink-700/50 rounded-xl text-xs text-pink-300 font-semibold flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Camera className="w-4 h-4 text-pink-400" />
              <span>現場拍照</span>
              <span className="text-[10px] text-pink-400/80 font-normal">
                {session.attendance?.mediaCount ? `${session.attendance.mediaCount} 則紀錄` : '回憶牆'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                haptics.medium();
                onOpenMerchManager();
              }}
              className="p-3 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-700/50 rounded-xl text-xs text-purple-300 font-semibold flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 text-purple-400" />
              <span>周邊記帳</span>
              <span className="text-[10px] text-purple-400/80 font-normal">
                {session.attendance?.merchCount ? `${session.attendance.merchCount} 件戰利品` : '記帳'}
              </span>
            </button>

            {onOpenSetlist && (
              <button
                type="button"
                onClick={() => {
                  haptics.medium();
                  onOpenSetlist();
                }}
                className="col-span-2 sm:col-span-1 p-3 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-700/50 rounded-xl text-xs text-indigo-300 font-semibold flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
              >
                <ListMusic className="w-4 h-4 text-indigo-400" />
                <span>現場歌單</span>
                <span className="text-[10px] text-indigo-400/80 font-normal">曲目回顧</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
