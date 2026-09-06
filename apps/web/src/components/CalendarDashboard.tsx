'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Flame,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Filter,
  CheckCircle2,
  MapPin,
  Layers,
  Zap,
  Tag,
  RefreshCw,
  Eye,
  Radio,
  CalendarDays,
  CalendarRange,
  Download,
} from 'lucide-react';
import { CalendarItem, CalendarRadarItem } from '../app/api/calendar/route';
import { haptics } from '../utils/haptics';
import { AddToCalendarMenu } from './AddToCalendarMenu';
import { generateICalendar, downloadICS } from '../utils/calendarSync';

interface CalendarDashboardProps {
  onNavigateToJournal?: (eventId: string, sessionId?: string) => void;
  onNavigateToScrape?: () => void;
  refreshTrigger?: number;
}

const WEEKDAYS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

export const CalendarDashboard: React.FC<CalendarDashboardProps> = ({
  onNavigateToJournal,
  onNavigateToScrape,
  refreshTrigger,
}) => {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0 - 11
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'radar'>('month');
  const [typeFilter, setTypeFilter] = useState<'all' | 'show' | 'sale' | 'rerelease' | 'lottery'>(
    'all'
  );
  const [attendanceOnly, setAttendanceOnly] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [eventsByDate, setEventsByDate] = useState<Record<string, CalendarItem[]>>({});
  const [upcomingRadar, setUpcomingRadar] = useState<CalendarRadarItem[]>([]);
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalShows: 0,
    totalSales: 0,
    radarCount: 0,
  });

  // 實時倒數計時器 (每秒刷新)
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 載入日曆資料
  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (attendanceOnly) params.append('attendanceOnly', 'true');
      params.append('_t', Date.now().toString());

      const res = await fetch(`/api/calendar?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success) {
        setCalendarItems(data.items || []);
        setEventsByDate(data.eventsByDate || {});
        setUpcomingRadar(data.upcomingRadar || []);
        setSummary(data.summary || { totalItems: 0, totalShows: 0, totalSales: 0, radarCount: 0 });
      } else {
        throw new Error(data.error || '載入失敗');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [typeFilter, attendanceOnly, refreshTrigger]);

  // 月曆切換按鈕
  const handlePrevMonth = () => {
    haptics.selection();
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    haptics.selection();
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    haptics.medium();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDateKey(`${y}-${m}-${d}`);
  };

  // 生成月曆格陣列 (包含上個月尾數與下個月前數補滿)
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    // 週一為第 0 天 (0 = Mon, 6 = Sun)
    const firstDayIndex = (firstDay.getDay() + 6) % 7;
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // 上個月
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 12 : currentMonth;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const key = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // 當月
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = currentYear === todayY && currentMonth === todayM && d === todayD;
      cells.push({
        dateKey: key,
        dayNumber: d,
        isCurrentMonth: true,
        isToday,
      });
    }

    // 下個月補滿至 35 或 42 格 (7 的倍數)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonth === 11 ? 1 : currentMonth + 2;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const key = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateKey: key,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return cells;
  }, [currentYear, currentMonth, today]);

  // 週曆視圖計算 (以 selectedDateKey 所在週為基準)
  const currentWeekDays = useMemo(() => {
    const selDate = new Date(selectedDateKey);
    const dayOfWeek = (selDate.getDay() + 6) % 7; // 0 = Mon
    const monday = new Date(selDate);
    monday.setDate(selDate.getDate() - dayOfWeek);

    const weekDays: Array<{ dateKey: string; dateObj: Date; isToday: boolean }> = [];
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      weekDays.push({
        dateKey: key,
        dateObj: d,
        isToday: key === todayKey,
      });
    }
    return weekDays;
  }, [selectedDateKey, today]);

  // 當前選取日期的所有行程
  const selectedDateItems = useMemo(() => {
    return eventsByDate[selectedDateKey] || [];
  }, [eventsByDate, selectedDateKey]);

  // 格式化倒數時間
  const formatCountdown = (targetDateStr: string) => {
    const targetMs = new Date(targetDateStr.replace(' ', 'T')).getTime();
    const diff = targetMs - nowTimestamp;

    if (isNaN(diff)) return '時程待定';
    if (diff <= 0 && diff >= -1800000) return '🔥 熱烈開賣中！';
    if (diff < -1800000) return '已開賣';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}天 ${hours}小時 ${minutes}分 ${seconds}秒`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 匯出當前月份全行程為 .ics
  const handleExportCurrentMonthICS = () => {
    haptics.success();
    const monthPadded = String(currentMonth + 1).padStart(2, '0');
    const prefix = `${currentYear}-${monthPadded}`;
    const monthItems = calendarItems.filter((i) => i.dateKey.startsWith(prefix));

    if (monthItems.length === 0) {
      alert(`${currentYear} 年 ${currentMonth + 1} 月暫無已入庫之行程！`);
      return;
    }

    const exportItems = monthItems.map((item) => ({
      id: item.id,
      title: item.eventTitle,
      subTitle: item.subTitle,
      itemType: item.itemType,
      startDate: item.date,
      endDate: item.endDate,
      venueName: item.venueName,
      bookingUrl: item.bookingUrl,
      platform: item.platform,
      seatInfo: item.attendance?.seatInfo,
      notes: item.attendance?.notes,
    }));

    const ics = generateICalendar(
      exportItems,
      `票根手帳_${currentYear}年${currentMonth + 1}月演唱會行事曆`
    );
    downloadICS(`StubBook_${currentYear}_${monthPadded}_Calendar.ics`, ics);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ─────────────────── 頂部標題與狀態雷達摘要 ─────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950/30 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl text-indigo-400 shadow-inner">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                手帳智慧行事曆
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 font-mono">
                  Smart Calendar
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                自動聚合已入庫演出的「購票開賣」與「現場演出」時程，手帳視角一覽無遺
              </p>
            </div>
          </div>
        </div>

        {/* 快捷視圖切換與按鈕 */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <div className="inline-flex bg-gray-850 p-1 rounded-2xl border border-gray-800 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setViewMode('month');
                haptics.light();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'month'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>月曆</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('week');
                haptics.light();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'week'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              <span>週曆</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('radar');
                haptics.light();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                viewMode === 'radar'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-rose-300" />
              <span>搶票雷達</span>
              {upcomingRadar.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-rose-950 text-rose-300 border border-rose-600 rounded-full font-mono animate-pulse">
                  {upcomingRadar.length}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCurrentMonthICS}
            className="flex items-center space-x-1.5 px-3 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-700/60 rounded-xl text-indigo-300 transition-colors text-xs font-semibold"
            title="匯出當前月份全行程為 .ics 行事曆檔"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">匯出月行程 (.ics)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchCalendarData();
              haptics.light();
            }}
            className="p-2 bg-gray-850 hover:bg-gray-800 border border-gray-700/60 rounded-xl text-gray-300 transition-colors"
            title="重新整理"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─────────────────── 搶票倒數雷達卡片 (Sale Countdown Radar) ─────────────────── */}
      {upcomingRadar.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/40 via-amber-950/20 to-gray-900 border border-rose-900/50 rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                搶票倒數雷達
                <span className="text-xs font-normal text-rose-300/80">
                  (即將開賣活動共 {upcomingRadar.length} 場)
                </span>
              </h3>
            </div>
            <span className="text-xs text-rose-400/90 font-mono flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              即時秒數同步中
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingRadar.slice(0, 3).map((radar) => {
              const isUrgent10m = radar.urgencyLevel === 'CRITICAL_10M';
              const isUrgent1h = radar.urgencyLevel === 'HIGH_1H';

              return (
                <div
                  key={radar.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${
                    isUrgent10m
                      ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-950/50 ring-1 ring-rose-500/50'
                      : isUrgent1h
                        ? 'bg-amber-950/50 border-amber-600/70 shadow-md shadow-amber-950/40'
                        : 'bg-gray-850/80 border-gray-750 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            isUrgent10m
                              ? 'bg-rose-900 text-rose-200 border border-rose-500 animate-pulse'
                              : isUrgent1h
                                ? 'bg-amber-900 text-amber-200 border border-amber-500'
                                : 'bg-purple-950 text-purple-300 border border-purple-800'
                          }`}
                        >
                          {radar.typeLabel}
                        </span>
                        {radar.platform && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
                            {radar.platform}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {radar.eventTitle}
                      </h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {radar.subTitle || '全面開賣'}
                      </p>
                    </div>

                    {radar.posterUrl ? (
                      <img
                        src={radar.posterUrl}
                        alt={radar.eventTitle}
                        className="w-12 h-12 object-contain bg-gray-950/80 rounded-xl border border-gray-700/80 shrink-0 p-0.5"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 text-gray-500">
                        <Ticket className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* 倒數計時大數字 */}
                  <div className="mt-3 pt-3 border-t border-gray-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-rose-300 font-mono text-sm font-bold">
                      <Clock className="h-3.5 w-3.5 animate-spin-slow" />
                      <span>{formatCountdown(radar.date)}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <AddToCalendarMenu
                        item={{
                          id: radar.id,
                          title: radar.eventTitle,
                          subTitle: radar.subTitle,
                          itemType: radar.itemType,
                          startDate: radar.date,
                          endDate: radar.endDate,
                          venueName: radar.venueName,
                          bookingUrl: radar.bookingUrl,
                          platform: radar.platform,
                          notes: radar.eligibilityNotes,
                        }}
                        compact
                      />
                      {radar.bookingUrl && (
                        <a
                          href={radar.bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => haptics.medium()}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-sm"
                        >
                          <span>搶票去</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────── 過濾條件欄 ─────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/60 p-4 rounded-2xl border border-gray-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-400 flex items-center gap-1 font-semibold">
            <Filter className="h-3.5 w-3.5" />
            分類篩選:
          </span>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('all');
              haptics.selection();
            }}
            className={`px-3 py-1 rounded-xl transition-all ${
              typeFilter === 'all'
                ? 'bg-gray-700 text-white font-bold'
                : 'bg-gray-850 text-gray-400 hover:text-gray-200'
            }`}
          >
            全部 ({summary.totalItems})
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('show');
              haptics.selection();
            }}
            className={`px-3 py-1 rounded-xl transition-all ${
              typeFilter === 'show'
                ? 'bg-cyan-600 text-white font-bold'
                : 'bg-gray-850 text-gray-400 hover:text-gray-200'
            }`}
          >
            🎫 演出日 ({summary.totalShows})
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('sale');
              haptics.selection();
            }}
            className={`px-3 py-1 rounded-xl transition-all ${
              typeFilter === 'sale'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-gray-850 text-gray-400 hover:text-gray-200'
            }`}
          >
            🏷️ 購票開賣 ({summary.totalSales})
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('rerelease');
              haptics.selection();
            }}
            className={`px-3 py-1 rounded-xl transition-all ${
              typeFilter === 'rerelease'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-gray-850 text-gray-400 hover:text-gray-200'
            }`}
          >
            🎟️ 釋票/抽選
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 cursor-pointer select-none text-gray-300">
            <input
              type="checkbox"
              checked={attendanceOnly}
              onChange={(e) => {
                setAttendanceOnly(e.target.checked);
                haptics.light();
              }}
              className="rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <span>僅顯示我已登記手帳之活動</span>
          </label>
        </div>
      </div>

      {/* ─────────────────── 主視圖切換區 ─────────────────── */}
      {viewMode === 'month' && (
        <div className="space-y-6">
          {/* 月曆導覽控制器 */}
          <div className="flex items-center justify-between bg-gray-900 p-4 rounded-2xl border border-gray-800">
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                {currentYear} 年 {currentMonth + 1} 月
              </h3>
              <button
                type="button"
                onClick={handleGoToday}
                className="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-indigo-400 font-semibold rounded-lg border border-indigo-900/50 transition-colors"
              >
                回到今天
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-gray-850 hover:bg-gray-800 text-gray-300 transition-colors"
                title="上個月"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-gray-850 hover:bg-gray-800 text-gray-300 transition-colors"
                title="下個月"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 月曆 7 欄表格 */}
          <div className="bg-gray-900/90 rounded-3xl border border-gray-800 p-4 shadow-2xl overflow-hidden">
            {/* 星期標題 */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-gray-400">
              {WEEKDAYS.map((w, idx) => (
                <div
                  key={w}
                  className={`py-2 rounded-lg ${idx >= 5 ? 'text-rose-400/80' : 'text-gray-400'}`}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* 日期網格 */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarGrid.map((cell) => {
                const isSelected = cell.dateKey === selectedDateKey;
                const itemsOnDate = eventsByDate[cell.dateKey] || [];
                const hasShows = itemsOnDate.some((i) => i.itemType === 'SHOW');
                const hasSales = itemsOnDate.some((i) => i.itemType !== 'SHOW');

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => {
                      setSelectedDateKey(cell.dateKey);
                      haptics.selection();
                    }}
                    className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      cell.isCurrentMonth ? 'bg-gray-850/70' : 'bg-gray-900/40 opacity-40'
                    } ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-950/30'
                        : 'border-gray-800/80 hover:border-gray-700'
                    } ${cell.isToday ? 'border-indigo-400/80 shadow-md shadow-indigo-950/40' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-bold rounded-md px-1.5 py-0.5 ${
                          cell.isToday
                            ? 'bg-indigo-600 text-white'
                            : isSelected
                              ? 'text-indigo-400 font-extrabold'
                              : 'text-gray-300'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {/* 項目數量徽章 */}
                      {itemsOnDate.length > 0 && (
                        <span className="flex space-x-1">
                          {hasShows && (
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                          {hasSales && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                        </span>
                      )}
                    </div>

                    {/* 當日活動條目清單 */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {itemsOnDate.slice(0, 2).map((it) => (
                        <div
                          key={it.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium border ${
                            it.itemType === 'SHOW'
                              ? 'bg-cyan-950/80 border-cyan-800/80 text-cyan-300'
                              : it.itemType === 'LOTTERY'
                                ? 'bg-purple-950/80 border-purple-800/80 text-purple-300'
                                : 'bg-amber-950/80 border-amber-800/80 text-amber-300'
                          }`}
                          title={`${it.timeString} ${it.eventTitle}`}
                        >
                          <span className="font-mono opacity-80 mr-1">{it.timeString}</span>
                          <span>{it.eventTitle}</span>
                        </div>
                      ))}

                      {itemsOnDate.length > 2 && (
                        <div className="text-[9px] text-gray-400 text-right px-1 font-mono">
                          +{itemsOnDate.length - 2} 項
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── 週曆視圖 (Week Mode) ─────────────────── */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-900 p-4 rounded-2xl border border-gray-800">
            <h3 className="text-lg font-bold text-white">
              本週行程動態 ({currentWeekDays[0]?.dateKey} ~ {currentWeekDays[6]?.dateKey})
            </h3>
            <button
              type="button"
              onClick={handleGoToday}
              className="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-indigo-400 font-semibold rounded-lg border border-indigo-900/50"
            >
              本週
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {currentWeekDays.map(({ dateKey, dateObj, isToday }, idx) => {
              const dayItems = eventsByDate[dateKey] || [];
              const isSelected = dateKey === selectedDateKey;

              return (
                <div
                  key={dateKey}
                  onClick={() => {
                    setSelectedDateKey(dateKey);
                    haptics.selection();
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[160px] ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50'
                      : isToday
                        ? 'bg-gray-850 border-indigo-400'
                        : 'bg-gray-850/60 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
                    <span className="text-xs font-semibold text-gray-400">{WEEKDAYS[idx]}</span>
                    <span
                      className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                        isToday ? 'bg-indigo-600 text-white' : 'text-gray-200'
                      }`}
                    >
                      {dateObj.getMonth() + 1}/{dateObj.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    {dayItems.length === 0 ? (
                      <p className="text-[11px] text-gray-600 italic text-center py-4">無安排</p>
                    ) : (
                      dayItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-1.5 rounded-xl border text-[11px] ${
                            item.itemType === 'SHOW'
                              ? 'bg-cyan-950/70 border-cyan-800 text-cyan-200'
                              : 'bg-amber-950/70 border-amber-800 text-amber-200'
                          }`}
                        >
                          <div className="font-mono text-[10px] opacity-80">{item.timeString}</div>
                          <div className="font-bold truncate">{item.eventTitle}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────── 全螢幕搶票雷達專注視圖 (Radar Mode) ─────────────────── */}
      {viewMode === 'radar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-900 p-4 rounded-2xl border border-gray-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="h-5 w-5 text-rose-500" />
                全開賣搶票雷達儀表板
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                依照開賣時間倒數先後排列，支援外部售票平台一鍵直達
              </p>
            </div>
          </div>

          {upcomingRadar.length === 0 ? (
            <div className="p-12 text-center bg-gray-900/50 rounded-3xl border border-gray-800 space-y-3">
              <Sparkles className="h-10 w-10 text-gray-600 mx-auto" />
              <h4 className="text-base font-semibold text-gray-300">目前沒有即將開賣的售票日程</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                可以貼上售票平台 (KKTIX / 拓元) 網址解析新活動，系統將自動擷取售票時程並納入此雷達！
              </p>
              {onNavigateToScrape && (
                <button
                  type="button"
                  onClick={onNavigateToScrape}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  前往解析售票活動
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingRadar.map((radar) => (
                <div
                  key={radar.id}
                  className="bg-gray-850 p-5 rounded-3xl border border-gray-750 hover:border-indigo-600/60 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {radar.posterUrl ? (
                      <img
                        src={radar.posterUrl}
                        alt={radar.eventTitle}
                        className="w-16 h-16 object-contain bg-gray-950/80 rounded-2xl border border-gray-700 shrink-0 p-0.5"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 text-gray-500">
                        <Ticket className="h-6 w-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 font-semibold">
                          {radar.typeLabel}
                        </span>
                        {radar.platform && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-mono">
                            {radar.platform}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-white truncate">
                        {radar.eventTitle}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        時程名稱: {radar.subTitle || '全面開賣'}
                      </p>
                      {radar.eligibilityNotes && (
                        <p className="text-xs text-amber-400/90 mt-1 bg-amber-950/40 p-1.5 rounded-lg border border-amber-900/40">
                          備註: {radar.eligibilityNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-900/80 p-3 rounded-2xl border border-gray-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
                        開賣倒數
                      </span>
                      <span className="text-base font-bold font-mono text-rose-400 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 animate-spin-slow" />
                        {formatCountdown(radar.date)}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono block mt-0.5">
                        預計開賣時間: {radar.date}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <AddToCalendarMenu
                        item={{
                          id: radar.id,
                          title: radar.eventTitle,
                          subTitle: radar.subTitle,
                          itemType: radar.itemType,
                          startDate: radar.date,
                          endDate: radar.endDate,
                          venueName: radar.venueName,
                          bookingUrl: radar.bookingUrl,
                          platform: radar.platform,
                          notes: radar.eligibilityNotes,
                        }}
                      />
                      {radar.bookingUrl && (
                        <a
                          href={radar.bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => haptics.medium()}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                        >
                          <span>搶票專區</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────── 選定日期活動清單 (Selected Date Detail Panel) ─────────────────── */}
      <div className="bg-gray-900/90 rounded-3xl border border-gray-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl border border-indigo-800/60">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{selectedDateKey} 日程明細</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono">
                  共 {selectedDateItems.length} 項
                </span>
              </h4>
              <p className="text-xs text-gray-400">當日演出、購票與抽選重要事項</p>
            </div>
          </div>
        </div>

        {selectedDateItems.length === 0 ? (
          <div className="text-center py-10 text-gray-500 space-y-2">
            <CalendarDays className="h-8 w-8 mx-auto opacity-40" />
            <p className="text-sm">當天暫無已記錄之演出或開賣時程</p>
            <p className="text-xs text-gray-600">點擊月曆上的其他日期即可查看當日詳情</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedDateItems.map((item) => (
              <div
                key={item.id}
                className="bg-gray-850 p-4 rounded-2xl border border-gray-750 flex flex-col justify-between gap-3 hover:border-gray-650 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.eventTitle}
                      className="w-16 h-16 object-contain bg-gray-950/80 rounded-xl border border-gray-700 shrink-0 p-0.5"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 text-gray-500">
                      <Ticket className="h-6 w-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          item.itemType === 'SHOW'
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                            : item.itemType === 'LOTTERY'
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {item.typeLabel}
                      </span>
                      {item.platform && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
                          {item.platform}
                        </span>
                      )}
                    </div>

                    <h5 className="text-sm font-bold text-white truncate">{item.eventTitle}</h5>
                    {item.subTitle && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{item.subTitle}</p>
                    )}

                    {item.venueName && (
                      <div className="flex items-center space-x-1 text-xs text-gray-400 mt-1">
                        <MapPin className="h-3 w-3 text-gray-500 shrink-0" />
                        <span className="truncate">{item.venueName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 底部時間與操作按鈕 */}
                <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1 text-indigo-400 font-mono font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{item.timeString}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <AddToCalendarMenu
                      item={{
                        id: item.id,
                        title: item.eventTitle,
                        subTitle: item.subTitle,
                        itemType: item.itemType,
                        startDate: item.date,
                        endDate: item.endDate,
                        venueName: item.venueName,
                        bookingUrl: item.bookingUrl,
                        platform: item.platform,
                        seatInfo: item.attendance?.seatInfo,
                        notes: item.attendance?.notes,
                      }}
                      compact
                    />

                    {item.bookingUrl && (
                      <a
                        href={item.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                      >
                        <span>{item.itemType === 'SHOW' ? '活動網址' : '前往購票'}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}

                    {onNavigateToJournal && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateToJournal(item.eventId, item.sessionId || undefined);
                          haptics.light();
                        }}
                        className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-700/60 rounded-lg transition-colors font-semibold"
                      >
                        檢視手帳
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
