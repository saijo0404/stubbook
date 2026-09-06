'use client';

import React from 'react';
import { X, ShieldCheck, Ticket, Calendar, MapPin, DollarSign, Sparkles } from 'lucide-react';

interface TicketStubModalProps {
  isOpen: boolean;
  eventTitle: string;
  organizer?: string | null;
  platform?: string;
  sessionTitle?: string | null;
  sessionDate: string;
  venueName?: string | null;
  seatInfo?: string | null;
  ticketPrice?: number | null;
  currency?: string;
  ticketType?: string;
  ticketStubUrl?: string | null;
  stubPrivacyMasked?: boolean;
  onClose: () => void;
}

export function TicketStubModal({
  isOpen,
  eventTitle,
  organizer,
  platform = 'KKTIX',
  sessionTitle,
  sessionDate,
  venueName,
  seatInfo,
  ticketPrice,
  currency = 'TWD',
  ticketType = 'DIGITAL',
  ticketStubUrl,
  stubPrivacyMasked,
  onClose,
}: TicketStubModalProps) {
  if (!isOpen) return null;

  const dateObj = new Date(sessionDate);
  const formattedDate = dateObj.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const formattedTime = dateObj.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-transparent max-w-4xl w-full flex flex-col items-center animate-scaleIn">
        {/* 頂部關閉按鈕 */}
        <div className="w-full flex justify-end pb-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-850 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors shadow-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 擬真票根本體 (Skeuomorphic Ticket) */}
        <div className="w-full bg-gray-900 border border-gray-700/80 rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] flex flex-col md:flex-row relative">
          {/* 左側：存根聯 (Stub) */}
          <div className="w-full md:w-64 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-dashed border-gray-700/80 relative">
            {/* 圓形齒孔缺口 (Notches) */}
            <div className="hidden md:block absolute -right-3 -top-3 w-6 h-6 bg-black/85 rounded-full border border-gray-700/80" />
            <div className="hidden md:block absolute -right-3 -bottom-3 w-6 h-6 bg-black/85 rounded-full border border-gray-700/80" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
                  STUB · 存根聯
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 font-mono rounded">
                  {platform}
                </span>
              </div>

              <div>
                <div className="text-xs text-gray-400 font-medium">演出日期</div>
                <div className="text-base font-black text-white font-mono">{formattedDate}</div>
                <div className="text-xs text-indigo-300 font-mono">{formattedTime}</div>
              </div>

              <div>
                <div className="text-xs text-gray-400 font-medium">入場座位</div>
                <div className="text-sm font-bold text-amber-300">
                  {seatInfo || '自由入座 / 未劃位'}
                </div>
              </div>

              {ticketPrice && (
                <div>
                  <div className="text-xs text-gray-400 font-medium">票價</div>
                  <div className="text-sm font-bold text-white font-mono">
                    ${ticketPrice.toLocaleString()} {currency}
                  </div>
                </div>
              )}
            </div>

            {/* 偽條碼與序號 */}
            <div className="pt-6 space-y-1">
              <div className="h-8 bg-gray-950 flex items-center justify-center border border-gray-800 rounded px-2">
                <div className="w-full flex justify-between tracking-widest text-[8px] font-mono text-gray-400">
                  <span>|||||</span>
                  <span>|||||||</span>
                  <span>|||||</span>
                  <span>||||||||</span>
                  <span>|||||</span>
                </div>
              </div>
              <div className="text-[9px] font-mono text-center text-gray-400 tracking-wider">
                NO. {Math.abs(eventTitle.split('').reduce((a, b) => a + b.charCodeAt(0), 0) * 1024)}
              </div>
            </div>
          </div>

          {/* 右側：主聯 (Main Ticket) */}
          <div className="flex-1 bg-gradient-to-br from-gray-900 via-indigo-950/30 to-gray-900 p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
            {/* 雷射全息防偽微光效果 */}
            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-5">
              {/* 活動主辦與票券類型 */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg">
                    <Ticket className="h-4 w-4" />
                  </div>
                  <span className="text-xs text-gray-400">
                    {organizer ? `主辦：${organizer}` : '官方售票正規入場憑證'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                    {ticketType === 'DIGITAL'
                      ? '📱 電子票券'
                      : ticketType === 'PHYSICAL'
                        ? '🎫 實體紙本票'
                        : ticketType === 'WRISTBAND'
                          ? '🎗️ 入場手環'
                          : '📄 其他憑證'}
                  </span>

                  {stubPrivacyMasked && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      個資條碼已遮罩保護
                    </span>
                  )}
                </div>
              </div>

              {/* 活動標題與場次 */}
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-snug">
                  {eventTitle}
                </h2>
                {sessionTitle && (
                  <div className="text-xs md:text-sm font-bold text-indigo-400">
                    {sessionTitle}
                  </div>
                )}
              </div>

              {/* 時間、場館與大座位號牌 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-950/80 p-4 rounded-2xl border border-gray-800">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                  <div>
                    <div className="text-[11px] text-gray-400">演出時間</div>
                    <div className="text-xs font-bold text-white font-mono">
                      {formattedDate} {formattedTime}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-purple-400 flex-shrink-0" />
                  <div>
                    <div className="text-[11px] text-gray-400">場地 / 場館</div>
                    <div className="text-xs font-bold text-white line-clamp-1">
                      {venueName || '未指定場館'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 sm:border-l sm:border-gray-800 sm:pl-3">
                  <DollarSign className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="text-[11px] text-gray-400">入場座位</div>
                    <div className="text-sm font-black text-amber-300">
                      {seatInfo || '自由入場'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 上傳之票根實體照 / 截圖預覽 */}
              {ticketStubUrl && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-gray-400 flex items-center">
                    <Sparkles className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                    典藏票根照片
                  </div>
                  <div className="relative group overflow-hidden rounded-xl border border-gray-800 max-h-56 bg-black flex items-center justify-center">
                    <img
                      src={ticketStubUrl}
                      alt="Ticket Stub"
                      className="w-full max-h-56 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 票根防偽標誌與手帳認證戳印 */}
            <div className="pt-6 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-1.5 font-mono">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>STUBBOOK · OFFICIAL MEMORY CERTIFIED</span>
              </div>
              <div className="font-mono text-[10px]">AUTH-VERIFIED</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
