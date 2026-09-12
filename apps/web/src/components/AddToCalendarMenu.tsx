'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CalendarPlus,
  Calendar,
  Download,
  ExternalLink,
  Check,
  Copy,
  ChevronDown,
  BellRing,
} from 'lucide-react';
import {
  CalendarExportItem,
  generateICalendar,
  downloadICS,
  generateGoogleCalendarUrl,
} from '../utils/calendarSync';
import { haptics } from '../utils/haptics';

interface AddToCalendarMenuProps {
  item: CalendarExportItem;
  className?: string;
  buttonLabel?: string;
  compact?: boolean;
  align?: 'left' | 'right';
}

export const AddToCalendarMenu: React.FC<AddToCalendarMenuProps> = ({
  item,
  className = '',
  buttonLabel = '加入行事曆',
  compact = false,
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExportICS = () => {
    haptics.success();
    const icsContent = generateICalendar([item], `${item.title}`);
    const safeTitle = item.title.replace(/[\/\\:*?"<>|]/g, '_').slice(0, 30);
    const suffix = item.itemType !== 'SHOW' ? '搶票時程' : '演出行程';
    downloadICS(`${safeTitle}_${suffix}.ics`, icsContent);
    setIsOpen(false);
  };

  const handleGoogleCalendar = () => {
    haptics.medium();
    const url = generateGoogleCalendarUrl(item);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleCopySchedule = async () => {
    haptics.light();
    const text = `【${item.itemType === 'SHOW' ? '演出日程' : '購票開賣'}】${item.title}${item.subTitle ? ` - ${item.subTitle}` : ''}\n時間：${item.startDate}\n${item.venueName ? `場館：${item.venueName}\n` : ''}${item.bookingUrl ? `網址：${item.bookingUrl}\n` : ''}── 由 票根手帳 StubBook 匯出`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 靜默降級
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          haptics.light();
        }}
        className={`inline-flex items-center gap-1.5 rounded-xl font-semibold transition-all select-none ${
          compact
            ? 'p-1.5 bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-gray-700 text-xs'
            : 'px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-750/70 rounded-xl text-xs hover:border-indigo-600 shadow-sm'
        }`}
        title="同步至外部行事曆"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        {!compact && <span>{buttonLabel}</span>}
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-64 sm:w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-gray-900/95 backdrop-blur-md border border-gray-750 shadow-2xl z-50 overflow-hidden animate-scaleIn text-xs`}
        >
          <div className="px-3.5 py-2.5 border-b border-gray-800 bg-gray-950/70 flex items-center justify-between">
            <span className="font-bold text-gray-200 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              同步至日曆應用
            </span>
            <span className="text-[10px] text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60 font-mono flex items-center gap-0.5">
              <BellRing className="h-2.5 w-2.5" />
              含鬧鐘推播
            </span>
          </div>

          <div className="p-1.5 space-y-1">
            {/* Apple Calendar / .ics */}
            <button
              type="button"
              onClick={handleExportICS}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-gray-200 hover:bg-indigo-600 hover:text-white transition-colors group text-left"
            >
              <Download className="h-4 w-4 text-indigo-400 group-hover:text-white shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-100 group-hover:text-white">
                  Apple / iCalendar 檔
                </div>
                <div className="text-[10px] text-gray-400 group-hover:text-indigo-100 leading-normal mt-0.5">
                  下載 .ics 檔案（內建搶票 / 演出推播鬧鐘）
                </div>
              </div>
            </button>

            {/* Google Calendar */}
            <button
              type="button"
              onClick={handleGoogleCalendar}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-gray-200 hover:bg-indigo-600 hover:text-white transition-colors group text-left"
            >
              <ExternalLink className="h-4 w-4 text-cyan-400 group-hover:text-white shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-100 group-hover:text-white">
                  Google 行事曆
                </div>
                <div className="text-[10px] text-gray-400 group-hover:text-indigo-100 leading-normal mt-0.5">
                  直接於瀏覽器分頁開啟並新增至日曆
                </div>
              </div>
            </button>

            {/* 複製純文字日程 */}
            <button
              type="button"
              onClick={handleCopySchedule}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-200 hover:bg-gray-800 transition-colors text-left"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400 shrink-0" />
              )}
              <span className="font-medium text-xs">
                {copied ? '已複製行程資訊！' : '複製行程純文字'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
