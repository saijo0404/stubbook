'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  X,
  Sparkles,
  TrendingUp,
  DollarSign,
  Music2,
  Calendar,
  Compass,
  Plus,
  Trash2,
  Share2,
  Award,
  ChevronRight,
  Plane,
  Home,
  ShoppingBag,
  Utensils,
  Ticket as TicketIcon,
  HelpCircle,
} from 'lucide-react';
import { haptics } from '../utils/haptics';

interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  sessions: Array<{
    id: string;
    eventTitle: string;
    artistName: string;
    venueName: string;
  }>;
}

interface PassionData {
  totalAttendances: number;
  completedCount: number;
  activeDays: number;
  activeRate: number;
  passionScore: number;
  passionRankTitle: string;
  passionRankBadge: string;
  heatmapDays: ContributionDay[];
  weekdayDistribution: Record<string, number>;
  mostFrequentWeekday: string;
  monthlyDistribution: Record<string, number>;
  totalUniqueSongsHeard: number;
  topSongs: Array<{ songName: string; artistName: string; playCount: number }>;
  totalExpeditionSpend: number;
  spendByCategory: Record<string, number>;
  averageSpendPerConcert: number;
  farExpeditionRate: number;
}

interface ExpenseItem {
  id: string;
  attendance_id: string;
  category: string;
  item_name: string;
  amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
  event_title?: string;
  session_date?: string;
}

interface PassionHeatmapDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCardGenerator?: () => void;
}

export const PassionHeatmapDashboard: React.FC<PassionHeatmapDashboardProps> = ({
  isOpen,
  onClose,
  onOpenCardGenerator,
}) => {
  const [data, setData] = useState<PassionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseList, setExpenseList] = useState<ExpenseItem[]>([]);
  const [newCategory, setNewCategory] = useState('TRANSPORT');
  const [newItemName, setNewItemName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  const fetchPassionData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/passion');
      const json = await res.json();
      if (json.success) {
        setData(json.analytics);
      }
    } catch (e) {
      console.error('Failed to load passion data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      const json = await res.json();
      if (json.success) {
        setExpenseList(json.expenses || []);
      }
    } catch (e) {
      console.error('Failed to load expenses:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPassionData();
      fetchExpenses();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newAmount) return;

    try {
      setSavingExpense(true);
      // 若無特定的 attendance_id，找最近的一筆或使用全域第一筆
      const firstAttId = expenseList[0]?.attendance_id || 'general';
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_id: firstAttId,
          category: newCategory,
          item_name: newItemName.trim(),
          amount: parseFloat(newAmount),
          notes: newNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        haptics.success();
        setNewItemName('');
        setNewAmount('');
        setNewNotes('');
        fetchExpenses();
        fetchPassionData();
      }
    } catch (err) {
      console.error('Add expense error:', err);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        haptics.light();
        fetchExpenses();
        fetchPassionData();
      }
    } catch (err) {
      console.error('Delete expense error:', err);
    }
  };

  // 顏色映射 helper
  const getHeatmapColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-emerald-900 border border-emerald-700/50 hover:bg-emerald-700';
      case 2:
        return 'bg-emerald-600 border border-emerald-400/60 hover:bg-emerald-500';
      case 3:
        return 'bg-emerald-400 border border-emerald-300 hover:bg-emerald-300';
      case 4:
        return 'bg-rose-500 border border-rose-300 shadow-sm shadow-rose-500/50 hover:bg-rose-400';
      default:
        return 'bg-gray-800/80 border border-gray-750 hover:bg-gray-700';
    }
  };

  // 出費分類中文與圖示
  const categoryMeta: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    TICKET: {
      label: '門票演出',
      icon: TicketIcon,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/20',
    },
    TRANSPORT: { label: '遠征交通', icon: Plane, color: 'text-sky-400', bg: 'bg-sky-500/20' },
    ACCOMMODATION: {
      label: '遠征住宿',
      icon: Home,
      color: 'text-amber-400',
      bg: 'bg-amber-500/20',
    },
    MERCHANDISE: {
      label: '官方周邊',
      icon: ShoppingBag,
      color: 'text-pink-400',
      bg: 'bg-pink-500/20',
    },
    FOOD_DINING: {
      label: '應援餐飲',
      icon: Utensils,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
    },
    OTHER: {
      label: '雜項出費',
      icon: HelpCircle,
      color: 'text-purple-400',
      bg: 'bg-purple-500/20',
    },
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700/80 rounded-3xl w-full max-w-5xl my-auto p-5 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh]">
        {/* 背景裝飾光暈 */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* 頂部 Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-rose-500/20 to-orange-500/20 rounded-2xl border border-rose-500/30 text-rose-400 shadow-inner">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  推活熱量大數據
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Passion Hub
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                365 日參戰熱力圖、全旅程出費結構與現場神曲解鎖排行
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenCardGenerator && (
              <button
                onClick={() => {
                  haptics.light();
                  onOpenCardGenerator();
                }}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs font-medium shadow-md transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>潮流社群卡工廠</span>
              </button>
            )}
            <button
              onClick={() => {
                haptics.light();
                onClose();
              }}
              className="p-2 text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 主體滾動內容 */}
        <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-gray-400 space-y-3">
              <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm">正在聚合 365 日推活熱量大數據...</p>
            </div>
          ) : !data ? (
            <div className="py-20 text-center text-gray-400">無法載入推活數據</div>
          ) : (
            <>
              {/* 1. 狂熱熱量稱號 Hero Banner */}
              <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-gray-850 via-gray-800 to-gray-850 border border-gray-750 shadow-xl overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 text-xs font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg">
                        {data.passionRankBadge}
                      </span>
                      <span className="text-xs text-gray-400">推活等級稱號</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-300 to-pink-400">
                      {data.passionRankTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-300 flex items-center space-x-2">
                      <span>狂粉熱量積分：</span>
                      <strong className="text-rose-400 text-base">
                        {data.passionScore.toLocaleString()}
                      </strong>
                      <span>pts (累計參戰、解鎖歌曲、踩點場館與遠征出費)</span>
                    </p>
                  </div>

                  {/* 核心數字指標 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full sm:w-auto">
                    <div className="bg-gray-900/80 border border-gray-700/60 p-3 rounded-xl text-center">
                      <div className="text-xs text-gray-400">參戰活躍天數</div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        {data.activeDays} 天
                      </div>
                      <div className="text-[10px] text-emerald-400">年佔比 {data.activeRate}%</div>
                    </div>
                    <div className="bg-gray-900/80 border border-gray-700/60 p-3 rounded-xl text-center">
                      <div className="text-xs text-gray-400">現場解鎖曲目</div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        {data.totalUniqueSongsHeard} 首
                      </div>
                      <div className="text-[10px] text-indigo-400">真音源不重複</div>
                    </div>
                    <div className="bg-gray-900/80 border border-gray-700/60 p-3 rounded-xl text-center">
                      <div className="text-xs text-gray-400">遠征總出費</div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        ${data.totalExpeditionSpend.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-amber-400">全旅程開銷</div>
                    </div>
                    <div className="bg-gray-900/80 border border-gray-700/60 p-3 rounded-xl text-center">
                      <div className="text-xs text-gray-400">平均場均花費</div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        ${data.averageSpendPerConcert.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-rose-400">每場次出費</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 365 日參戰熱力圖 (Contribution Heatmap) */}
              <div className="p-5 rounded-2xl bg-gray-850/80 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">
                      365 日參戰熱力矩陣 (Contribution Heatmap)
                    </h4>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-gray-400">
                    <span>少</span>
                    <div className="w-2.5 h-2.5 rounded-sm bg-gray-800 border border-gray-750" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-900 border border-emerald-700/50" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600 border border-emerald-400/60" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 border border-emerald-300" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-rose-500 border border-rose-300" />
                    <span>多 (燃燒中)</span>
                  </div>
                </div>

                {/* 熱力網格 (橫向捲動以容納 52 週) */}
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[700px] flex flex-col gap-1.5">
                    {/* 7 列 × 52 行的方塊排版 */}
                    <div className="grid grid-flow-col grid-rows-7 gap-1">
                      {data.heatmapDays.map((day) => (
                        <div
                          key={day.date}
                          onMouseEnter={() => setHoveredDay(day)}
                          className={`w-3 h-3 rounded-[3px] transition-all cursor-pointer ${getHeatmapColor(day.level)}`}
                          title={`${day.date}: ${day.count} 場演出`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 懸浮預覽資訊 */}
                <div className="h-9 flex items-center justify-between px-3 py-1.5 bg-gray-900/90 rounded-xl border border-gray-750 text-xs">
                  {hoveredDay ? (
                    <div className="flex items-center space-x-2 text-gray-200">
                      <span className="font-semibold text-emerald-400">{hoveredDay.date}</span>
                      <span>•</span>
                      {hoveredDay.count > 0 ? (
                        <span>
                          參戰 <strong>{hoveredDay.count}</strong> 場：
                          {hoveredDay.sessions
                            .map((s) => `${s.artistName} @ ${s.venueName}`)
                            .join('、')}
                        </span>
                      ) : (
                        <span className="text-gray-400">當日沒有排定演出</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">滑鼠懸浮或點擊方塊可檢視當日詳細參戰回憶</span>
                  )}
                  <span className="text-[11px] text-gray-400 hidden sm:inline">過去 365 日</span>
                </div>
              </div>

              {/* 3. 出費結構圓餅圖與趨勢 (Full Expedition Cost Breakdown) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 支出類別分配 */}
                <div className="p-5 rounded-2xl bg-gray-850/80 border border-gray-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-bold text-white">推活遠征全出費分佈</h4>
                    </div>
                    <button
                      onClick={() => {
                        haptics.light();
                        setShowExpenseModal(true);
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-amber-300 border border-amber-500/30 rounded-lg flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>記錄遠征花費</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {Object.entries(data.spendByCategory).map(([catKey, amount]) => {
                      const meta = categoryMeta[catKey] || {
                        label: catKey,
                        icon: HelpCircle,
                        color: 'text-gray-400',
                        bg: 'bg-gray-700',
                      };
                      const Icon = meta.icon;
                      const percentage =
                        data.totalExpeditionSpend > 0
                          ? Math.round((amount / data.totalExpeditionSpend) * 100)
                          : 0;

                      return (
                        <div key={catKey} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <div className={`p-1 rounded-md ${meta.bg}`}>
                                <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                              </div>
                              <span className="text-gray-300">{meta.label}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white">
                                ${amount.toLocaleString()}
                              </span>
                              <span className="text-gray-400 w-10 text-right">{percentage}%</span>
                            </div>
                          </div>
                          {/* 進度條 */}
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${meta.bg.replace('/20', '')}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 遠征指標小卡 */}
                  <div className="pt-2 border-t border-gray-750/60 flex items-center justify-between text-xs text-gray-300">
                    <span>遠征佔比 (交通 + 住宿)：</span>
                    <span className="font-bold text-sky-400">{data.farExpeditionRate}%</span>
                  </div>
                </div>

                {/* 4. 深度熱度指標 (週幾狂熱 & 現場解鎖神曲排行) */}
                <div className="p-5 rounded-2xl bg-gray-850/80 border border-gray-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-rose-400" />
                      <h4 className="text-sm font-bold text-white">參戰星期規律與神曲解鎖榜</h4>
                    </div>

                    {/* 星期熱度柱狀 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">星期參戰頻率：</span>
                        <span className="text-xs font-bold text-rose-400">
                          狂熱主力：{data.mostFrequentWeekday}
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5 pt-1">
                        {Object.entries(data.weekdayDistribution).map(([day, count]) => {
                          const isMax = day === data.mostFrequentWeekday && count > 0;
                          return (
                            <div key={day} className="flex flex-col items-center space-y-1">
                              <span className="text-[10px] text-gray-400">
                                {day.replace('週', '')}
                              </span>
                              <div className="w-full bg-gray-800 h-14 rounded-md flex items-end p-0.5 overflow-hidden">
                                <div
                                  className={`w-full rounded-sm transition-all ${
                                    isMax
                                      ? 'bg-rose-500'
                                      : count > 0
                                        ? 'bg-indigo-500'
                                        : 'bg-transparent'
                                  }`}
                                  style={{
                                    height: `${Math.min(100, Math.max(15, (count / (data.totalAttendances || 1)) * 100))}%`,
                                  }}
                                  title={`${day}: ${count} 次`}
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-gray-300">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 現場神曲解鎖排行 */}
                    <div className="space-y-2 pt-2 border-t border-gray-750/60">
                      <div className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                        <span>現場解鎖次數最高神曲 (Top 5)：</span>
                        <span className="text-xs text-indigo-400">
                          {data.totalUniqueSongsHeard} 首解鎖
                        </span>
                      </div>
                      {data.topSongs.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">
                          尚無歌單記錄，可在手帳中添加 Setlist
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {data.topSongs.map((song, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-gray-900/60 border border-gray-800 text-xs"
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <span className="text-rose-400 font-bold w-4">#{idx + 1}</span>
                                <span className="text-white font-medium truncate">
                                  {song.songName}
                                </span>
                                <span className="text-gray-400 text-[11px] truncate">
                                  ({song.artistName})
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold shrink-0">
                                {song.playCount} 次
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 底部按鈕 */}
                  {onOpenCardGenerator && (
                    <button
                      onClick={() => {
                        haptics.light();
                        onOpenCardGenerator();
                      }}
                      className="w-full mt-3 py-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>產出潮流收據與 CD 壓克力分享卡</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 遠征出費記帳 Modal 子視窗 */}
        {showExpenseModal && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-6 flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <span>遠征開銷記帳明細</span>
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1.5 text-gray-400 hover:text-white bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* 新增開銷 Form */}
              <form
                onSubmit={handleAddExpense}
                className="p-4 rounded-xl bg-gray-850 border border-gray-750 space-y-3"
              >
                <div className="text-xs font-semibold text-gray-300">新增遠征支出項目</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="TRANSPORT">🚄 遠征交通 (高鐵/機票/車費)</option>
                    <option value="ACCOMMODATION">🏨 遠征住宿 (飯店/商旅/民宿)</option>
                    <option value="MERCHANDISE">🛍️ 官方周邊 (手燈/場刊/毛巾)</option>
                    <option value="FOOD_DINING">🍻 應援餐飲 (慶功宴/咖啡食宿)</option>
                    <option value="TICKET">🎫 門票票價</option>
                    <option value="OTHER">📦 其他開銷</option>
                  </select>

                  <input
                    type="text"
                    placeholder="項目名稱 (例如：高鐵早鳥票、商旅單人房)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500"
                    required
                  />

                  <input
                    type="number"
                    placeholder="金額 (TWD)"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="備註說明 (選填，如：特早優惠 8 折)"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500"
                  />
                  <button
                    type="submit"
                    disabled={savingExpense}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-xs transition-colors shrink-0"
                  >
                    {savingExpense ? '儲存中...' : '儲存開銷'}
                  </button>
                </div>
              </form>

              {/* 開銷列表清單 */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-400">
                  已記錄的明細支出 ({expenseList.length} 筆)
                </div>
                {expenseList.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-8">尚無手動登錄之額外出費</p>
                ) : (
                  expenseList.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-850/60 border border-gray-750 text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-[11px] text-amber-300 font-semibold">
                          {categoryMeta[exp.category]?.label || exp.category}
                        </span>
                        <div>
                          <div className="font-bold text-white">{exp.item_name}</div>
                          {exp.notes && (
                            <div className="text-gray-400 text-[11px]">{exp.notes}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          ${exp.amount.toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 text-gray-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
