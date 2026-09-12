'use client';

import React, { useState, useEffect } from 'react';
import { haptics } from '../utils/haptics';

interface MatchedEvent {
  id: string;
  title: string;
  poster_url: string | null;
  source_url: string;
  session_date: string;
  venue_name: string | null;
}

interface WishlistItem {
  id: string;
  target_type: 'ARTIST' | 'VENUE' | 'FESTIVAL';
  target_name: string;
  priority: number;
  reason: string | null;
  is_fulfilled: number;
  created_at: string;
  matchedEvents?: MatchedEvent[];
  hasMatch?: boolean;
}

interface WishlistStats {
  totalCount: number;
  fulfilledCount: number;
  pendingCount: number;
  matchedCount: number;
}

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent?: (eventId: string) => void;
}

export default function WishlistModal({ isOpen, onClose, onSelectEvent }: WishlistModalProps) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [stats, setStats] = useState<WishlistStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  // 新增表單狀態
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [targetType, setTargetType] = useState<'ARTIST' | 'VENUE' | 'FESTIVAL'>('ARTIST');
  const [targetName, setTargetName] = useState<string>('');
  const [priority, setPriority] = useState<number>(5);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/wishlist');
      const json = await res.json();
      if (json.success) {
        setItems(json.items || []);
        setStats(json.stats || null);
      }
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWishlist();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 新增心願
  const handleAddWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetName.trim()) return;

    haptics.medium();
    try {
      setSubmitting(true);
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_name: targetName.trim(),
          priority,
          reason: reason.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTargetName('');
        setReason('');
        setShowAddForm(false);
        fetchWishlist();
      }
    } catch (err) {
      console.error('Failed to add wishlist item:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // 切換圓夢狀態
  const handleToggleFulfilled = async (item: WishlistItem) => {
    haptics.success();
    const newStatus = item.is_fulfilled === 1 ? 0 : 1;

    // 本地樂觀更新
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_fulfilled: newStatus } : i)));

    try {
      await fetch('/api/wishlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_fulfilled: newStatus === 1 }),
      });
      fetchWishlist();
    } catch (err) {
      console.error('Failed to toggle fulfilled status:', err);
    }
  };

  // 刪除心願
  const handleDeleteWish = async (id: string) => {
    haptics.warning();
    if (!confirm('確定要自朝聖心願池移除此項目嗎？')) return;

    try {
      await fetch(`/api/wishlist?id=${id}`, { method: 'DELETE' });
      fetchWishlist();
    } catch (err) {
      console.error('Failed to delete wishlist item:', err);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'FULFILLED') return item.is_fulfilled === 1;
    if (filterType === 'MATCHED') return item.hasMatch && item.is_fulfilled === 0;
    return item.target_type === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center">
      <div className="bg-gray-900 border border-gray-700/80 rounded-3xl w-full max-w-4xl my-auto p-5 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh]">
        {/* 背景光暈裝飾 */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 頂部標頭與操作 */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-2xl p-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              ✨
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                朝聖心願池
                <span className="text-xs font-normal text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2.5 py-0.5 rounded-full">
                  Pilgrimage Bucket List
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                記錄有生之年必看的夢想歌手與朝聖指標場館，售票爬蟲將自動偵測並發送命中提示
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 數據統計總覽 */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3 shrink-0">
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 text-center">
              <span className="text-xs text-gray-400 block mb-1">心願總計</span>
              <span className="text-2xl font-bold text-white">{stats.totalCount}</span>
            </div>
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 text-center">
              <span className="text-xs text-gray-400 block mb-1">待實現</span>
              <span className="text-2xl font-bold text-amber-400">{stats.pendingCount}</span>
            </div>
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 text-center">
              <span className="text-xs text-gray-400 block mb-1">✨ 售票命中</span>
              <span className="text-2xl font-bold text-emerald-400">{stats.matchedCount}</span>
            </div>
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 text-center">
              <span className="text-xs text-gray-400 block mb-1">🎉 已圓夢</span>
              <span className="text-2xl font-bold text-purple-400">{stats.fulfilledCount}</span>
            </div>
          </div>
        )}

        {/* 篩選切換與新增按鈕 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 shrink-0">
          <div className="flex flex-wrap bg-gray-800/80 p-1 rounded-xl border border-gray-700/60 text-xs">
            {[
              { key: 'ALL', label: '全部' },
              { key: 'MATCHED', label: '✨ 售票命中' },
              { key: 'ARTIST', label: '🎤 夢想歌手' },
              { key: 'VENUE', label: '🏛️ 指標場館' },
              { key: 'FESTIVAL', label: '🎪 音樂祭' },
              { key: 'FULFILLED', label: '🎉 已圓夢' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  haptics.selection();
                  setFilterType(tab.key);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterType === tab.key
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              haptics.medium();
              setShowAddForm(!showAddForm);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1"
          >
            <span>{showAddForm ? '▲ 收合表單' : '+ 新增朝聖心願'}</span>
          </button>
        </div>

        {/* 新增心願輸入表單 */}
        {showAddForm && (
          <form
            onSubmit={handleAddWish}
            className="bg-gray-800/60 border border-amber-500/40 rounded-2xl p-4 mb-4 shrink-0 space-y-3 animate-fadeIn"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-300 block mb-1">心願類型</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="ARTIST">🎤 夢想歌手 / 樂團</option>
                  <option value="VENUE">🏛️ 指標朝聖場館</option>
                  <option value="FESTIVAL">🎪 大型音樂祭</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-300 block mb-1">目標名稱</label>
                <input
                  type="text"
                  placeholder="如：Coldplay / 日本武道館 / Summer Sonic"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 block mb-1">
                  心願期待度 ({priority} 星)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-300 block mb-1">朝聖心願備忘 / 期待理由</label>
              <input
                type="text"
                placeholder="如：有生之年一定要在體育場聽一次現場！"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-xl"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow"
              >
                {submitting ? '新增中...' : '確認許願'}
              </button>
            </div>
          </form>
        )}

        {/* 心願卡片主列表 */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">正在探索心願池與售票雷達匹配...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 text-gray-500 space-y-2">
              <span className="text-4xl block">✨</span>
              <p className="text-sm font-medium">此類別暫無心願項目</p>
              <p className="text-xs text-gray-600">點選上方「新增朝聖心願」許下你的夢想現場！</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isFulfilled = item.is_fulfilled === 1;

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col space-y-3 relative overflow-hidden ${
                    isFulfilled
                      ? 'bg-purple-950/20 border-purple-800/40 opacity-75'
                      : item.hasMatch
                        ? 'bg-amber-950/20 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'bg-gray-800/50 border-gray-700/60 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-gray-700/80 text-gray-200">
                          {item.target_type === 'ARTIST'
                            ? '🎤 夢想歌手'
                            : item.target_type === 'VENUE'
                              ? '🏛️ 指標場館'
                              : '🎪 音樂祭'}
                        </span>
                        <span className="text-xs text-amber-400 font-mono">
                          {'★'.repeat(item.priority)}
                        </span>
                        {isFulfilled && (
                          <span className="text-xs bg-purple-600/30 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                            🎉 圓夢成就達成
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-lg font-black text-white ${isFulfilled ? 'line-through text-gray-400' : ''}`}
                      >
                        {item.target_name}
                      </h3>

                      {item.reason && (
                        <p className="text-xs text-gray-300 italic">「{item.reason}」</p>
                      )}
                    </div>

                    {/* 操作功能按鈕 */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleFulfilled(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isFulfilled
                            ? 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow'
                        }`}
                      >
                        {isFulfilled ? '標記為未達成' : '🎉 標記圓夢'}
                      </button>
                      <button
                        onClick={() => handleDeleteWish(item.id)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg"
                        title="刪除心願"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* 售票雷達命中展示條 (Radar Match Card) */}
                  {item.hasMatch && item.matchedEvents && item.matchedEvents.length > 0 && (
                    <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-lg animate-pulse">⚡</span>
                        <div>
                          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <span>售票雷達已命中相符演出！</span>
                            <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded text-amber-200">
                              ON SALE / UPCOMING
                            </span>
                          </div>
                          <p className="text-xs text-white font-medium">
                            {item.matchedEvents[0].title}
                            {item.matchedEvents[0].venue_name &&
                              ` · ${item.matchedEvents[0].venue_name}`}
                          </p>
                        </div>
                      </div>

                      {onSelectEvent && (
                        <button
                          onClick={() => {
                            haptics.selection();
                            onSelectEvent(item.matchedEvents![0].id);
                            onClose();
                          }}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow"
                        >
                          查看活動詳情 →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 底部說明 */}
        <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span>只要輸入新售票網址，系統會自動在心願池比對藝人與場館並提醒您搶票</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
