'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Sparkles,
  Trophy,
  MapPin,
  Music2,
  DollarSign,
  Ticket,
  ShoppingBag,
  Calendar,
  Flame,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { ConcertWrappedModal } from './ConcertWrappedModal';
import { haptics } from '../utils/haptics';

export interface AnalyticsData {
  selectedYear: string;
  availableYears: string[];
  summary: {
    totalEvents: number;
    totalSessions: number;
    totalAttended: number;
    completedCount: number;
    confirmedCount: number;
    wantToGoCount: number;
    totalVenues: number;
    totalMedia: number;
    fanTitle: string;
  };
  spending: {
    ticketSpending: number;
    merchSpending: number;
    grandTotal: number;
    totalMerchCount: number;
    merchBreakdown: Array<{ category: string; count: number; totalCost: number }>;
  };
  topArtists: Array<{
    artistName: string;
    sessionsCount: number;
    attendedCount: number;
    spending: number;
  }>;
  topVenues: Array<{ venueName: string; visitsCount: number }>;
  monthlyStats: Array<{ month: string; eventsCount: number; ticketSpend: number }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  LIGHTSTICK: '應援手燈',
  APPAREL: '服飾衣帽',
  TOWEL: '毛巾應援',
  PAMPHLET: '場刊紀念冊',
  BADGE: '徽章別針',
  ACCESSORY: '飾品配件',
  OTHER: '其他周邊',
};

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [wrappedOpen, setWrappedOpen] = useState(false);

  useEffect(() => {
    loadAnalytics(selectedYear);
  }, [selectedYear]);

  const loadAnalytics = async (year: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?year=${encodeURIComponent(year)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('載入統計資料失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-xs text-zinc-500">正在統計演唱會足跡與回憶數據...</div>
    );
  }

  if (!data) return null;

  const maxArtistCount = Math.max(...data.topArtists.map((a) => a.attendedCount), 1);
  const maxVenueCount = Math.max(...data.topVenues.map((v) => v.visitsCount), 1);

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* 頁籤頭部與年份切換 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-950/80 border border-indigo-800/60 rounded-full text-indigo-300 text-xs font-semibold mb-2">
            <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Phase 4 統計儀表板與 Wrapped</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            演唱會年度統計與回顧
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            記錄每一場音樂現場的足跡、開銷投資與歌手偏好
          </p>
        </div>

        {/* 年份切換 Pills */}
        <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setSelectedYear('ALL');
              haptics.light();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              selectedYear === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            全部歷年
          </button>
          {data.availableYears.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => {
                setSelectedYear(yr);
                haptics.light();
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                selectedYear === yr
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {yr}年
            </button>
          ))}
        </div>
      </div>

      {/* 炫目 Wrapped Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-pink-950/50 border border-indigo-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>STUBBOOK WRAPPED</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              生成你的專屬年度演唱會足跡卡
            </h2>
            <p className="text-xs text-indigo-200/90 leading-relaxed">
              依據你的參戰場次、投資花費與現場記錄，自動繪製高顏值 9:16 Instagram Story
              回顧海報，一鍵下載與社群分享！
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              haptics.medium();
              setWrappedOpen(true);
            }}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex-shrink-0"
          >
            <Sparkles className="w-4 h-4 text-zinc-950" />
            <span>生成 Wrapped 足跡卡</span>
          </button>
        </div>
      </div>

      {/* 四大核心指標卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 參戰場次 */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>累計參戰</span>
            <Ticket className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {data.summary.totalAttended}{' '}
            <span className="text-xs font-normal text-zinc-500">場</span>
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center space-x-2 pt-1 border-t border-zinc-800/80">
            <span>已參加 {data.summary.completedCount}</span>
            <span>· 確定前往 {data.summary.confirmedCount}</span>
          </div>
        </div>

        {/* 踩點場館 */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>踩點場館</span>
            <MapPin className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-300">
            {data.summary.totalVenues} <span className="text-xs font-normal text-zinc-500">座</span>
          </div>
          <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/80 truncate">
            最常造訪：{data.topVenues[0]?.venueName || '無'}
          </div>
        </div>

        {/* 總花費 */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>總花費投資</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            ${data.spending.grandTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/80 flex items-center justify-between">
            <span>門票 ${data.spending.ticketSpending.toLocaleString()}</span>
            <span>周邊 ${data.spending.merchSpending.toLocaleString()}</span>
          </div>
        </div>

        {/* 樂迷封號 */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>樂迷專屬封號</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm sm:text-base font-black text-amber-300 truncate">
            {data.summary.fanTitle}
          </div>
          <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/80">
            典藏 {data.summary.totalMedia} 則現場多媒體
          </div>
        </div>
      </div>

      {/* 歌手排行榜與場館足跡兩欄版面 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP 歌手排行榜 */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-2">
              <Music2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">最常參戰歌手排行榜</h3>
            </div>
            <span className="text-[11px] text-zinc-500">前 5 名</span>
          </div>

          {data.topArtists.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">尚無參戰紀錄</div>
          ) : (
            <div className="space-y-3">
              {data.topArtists.map((artist, idx) => {
                const percent = Math.round((artist.attendedCount / maxArtistCount) * 100);
                return (
                  <div key={artist.artistName} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 truncate max-w-[240px]">
                        <span
                          className={`font-mono font-bold w-4 text-center ${
                            idx === 0
                              ? 'text-amber-400'
                              : idx === 1
                                ? 'text-zinc-300'
                                : idx === 2
                                  ? 'text-amber-600'
                                  : 'text-zinc-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-zinc-200 font-semibold truncate">
                          {artist.artistName}
                        </span>
                      </div>
                      <div className="text-zinc-400 font-mono text-[11px] space-x-2">
                        <span className="text-indigo-300 font-bold">{artist.attendedCount} 場</span>
                        {artist.spending > 0 && (
                          <span className="text-zinc-500">
                            (${artist.spending.toLocaleString()})
                          </span>
                        )}
                      </div>
                    </div>
                    {/* 進度條 */}
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          idx === 0
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                        style={{ width: `${Math.max(percent, 8)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 場館踩點足跡 */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">踩點場館足跡</h3>
            </div>
            <span className="text-[11px] text-zinc-500">共 {data.topVenues.length} 座</span>
          </div>

          {data.topVenues.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">尚無場館踩點記錄</div>
          ) : (
            <div className="space-y-2.5">
              {data.topVenues.map((venue, idx) => (
                <div
                  key={venue.venueName}
                  className="flex items-center justify-between p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/80"
                >
                  <div className="flex items-center space-x-2.5 truncate max-w-[250px]">
                    <div className="p-1.5 bg-rose-950/60 rounded-lg text-rose-400 border border-rose-800/40">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-zinc-200 font-medium truncate">
                      {venue.venueName}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 text-[11px] font-bold bg-zinc-800 text-zinc-300 rounded-full">
                    {venue.visitsCount} 次參戰
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 周邊戰利品分類支出分析 */}
      {data.spending.merchBreakdown.length > 0 && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">周邊戰利品分類投資</h3>
            </div>
            <span className="text-[11px] text-purple-400 font-bold">
              共 {data.spending.totalMerchCount} 件 · $
              {data.spending.merchSpending.toLocaleString()} TWD
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.spending.merchBreakdown.map((item) => (
              <div
                key={item.category}
                className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-zinc-200">
                    {CATEGORY_LABELS[item.category] || item.category}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">數量：{item.count} 件</div>
                </div>
                <div className="text-xs font-bold text-purple-300 font-mono">
                  ${item.totalCost.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 年度回顧 Modal */}
      {wrappedOpen && (
        <ConcertWrappedModal
          isOpen={wrappedOpen}
          onClose={() => setWrappedOpen(false)}
          data={data}
        />
      )}
    </div>
  );
};
