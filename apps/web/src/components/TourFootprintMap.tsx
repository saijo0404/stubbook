'use client';

import React, { useState, useEffect } from 'react';
import { haptics } from '../utils/haptics';

interface VenueSession {
  attendance_id: string;
  status: string;
  seat_info: string | null;
  ticket_price: number | null;
  currency: string;
  rating: number | null;
  pros: string | null;
  cons: string | null;
  tips: string | null;
  notes: string | null;
  ticket_stub_url: string | null;
  session_id: string;
  session_date: string;
  hall_name: string | null;
  event_id: string;
  event_title: string;
  poster_url: string | null;
  artist_name: string | null;
}

interface VenueSeatView {
  id: string;
  section: string;
  row_number: string | null;
  seat_number: string | null;
  photo_url: string;
  view_rating: number | null;
  visibility: string;
  notes: string | null;
}

interface FootprintVenue {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  country: string;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  region: 'NORTH' | 'CENTRAL' | 'SOUTH' | 'EAST' | 'OVERSEAS';
  sub_halls: string[];
  photo_url: string | null;
  attendanceCount: number;
  totalExpense: number;
  sessions: VenueSession[];
  seatViews: VenueSeatView[];
  firstAttended: string | null;
  lastAttended: string | null;
}

interface FootprintStats {
  totalVenues: number;
  allVenuesCount: number;
  totalAttendances: number;
  domesticCount: number;
  overseasCount: number;
  totalSpent: number;
  regionBreakdown: Record<string, number>;
}

interface TourFootprintMapProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TourFootprintMap({ isOpen, onClose }: TourFootprintMapProps) {
  const [venues, setVenues] = useState<FootprintVenue[]>([]);
  const [stats, setStats] = useState<FootprintStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'TAIWAN' | 'OVERSEAS' | 'LIST'>('TAIWAN');
  const [selectedVenue, setSelectedVenue] = useState<FootprintVenue | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;

    const fetchFootprint = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/footprint');
        const json = await res.json();
        if (json.success) {
          setVenues(json.venues || []);
          setStats(json.stats || null);
        }
      } catch (err) {
        console.error('Failed to load footprint data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFootprint();
  }, [isOpen]);

  if (!isOpen) return null;

  // 台灣地理經緯度轉換為 SVG 畫布座標 (Mercator 投影簡化版)
  // 台灣範圍約：Lat 21.8 ~ 25.4, Lng 119.9 ~ 122.1
  const mapCoordinates = (lat: number, lng: number) => {
    const minLng = 119.8;
    const maxLng = 122.2;
    const minLat = 21.8;
    const maxLat = 25.4;

    const svgWidth = 460;
    const svgHeight = 600;

    const x = ((lng - minLng) / (maxLng - minLng)) * svgWidth;
    const y = svgHeight - ((lat - minLat) / (maxLat - minLat)) * svgHeight;

    return {
      x: Math.max(30, Math.min(svgWidth - 30, x)),
      y: Math.max(30, Math.min(svgHeight - 30, y)),
    };
  };

  const taiwanVenues = venues.filter((v) => v.country === 'TW');
  const overseasVenues = venues.filter((v) => v.country !== 'TW');

  const filteredVenues = venues.filter((v) => {
    if (regionFilter === 'ALL') return true;
    if (regionFilter === 'ATTENDED') return v.attendanceCount > 0;
    return v.region === regionFilter;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center">
      <div className="bg-gray-900 border border-gray-700/80 rounded-3xl w-full max-w-5xl my-auto p-5 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh]">
        {/* 背景裝飾光暈 */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 頂部標頭與關閉按鈕 */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800/80 relative z-10 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-2xl p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              🗺️
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                巡迴足跡互動地圖
                <span className="text-xs font-normal text-indigo-300 bg-indigo-950/60 border border-indigo-700/50 px-2 py-0.5 rounded-full">
                  Tour Footprint
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                點亮全台指標展演場館與海外朝聖地標，回顧每一場狂歡的現場坐標
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

        {/* 統計大數據指標面板 */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 shrink-0">
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 text-center">
              <span className="text-xs text-gray-400 block mb-1">打卡場館</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                {stats.totalVenues}
              </span>
              <span className="text-xs text-gray-500 ml-1">座</span>
            </div>
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 text-center">
              <span className="text-xs text-gray-400 block mb-1">累積參戰</span>
              <span className="text-2xl font-bold text-emerald-400">{stats.totalAttendances}</span>
              <span className="text-xs text-gray-500 ml-1">場</span>
            </div>
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 text-center">
              <span className="text-xs text-gray-400 block mb-1">全台 / 海外</span>
              <span className="text-xl font-bold text-purple-400">
                {stats.domesticCount} <span className="text-xs text-gray-500 font-normal">/</span>{' '}
                {stats.overseasCount}
              </span>
            </div>
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-3 text-center">
              <span className="text-xs text-gray-400 block mb-1">現場累積消費</span>
              <span className="text-xl font-bold text-amber-400">
                NT$ {stats.totalSpent.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* 視圖切換與區域篩選 */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 shrink-0">
          <div className="flex bg-gray-800/70 p-1 rounded-xl border border-gray-700/50 text-xs">
            <button
              onClick={() => {
                haptics.selection();
                setActiveTab('TAIWAN');
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'TAIWAN'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              🇹🇼 全台巡迴地圖 ({taiwanVenues.length})
            </button>
            <button
              onClick={() => {
                haptics.selection();
                setActiveTab('OVERSEAS');
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'OVERSEAS'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              ✈️ 海外朝聖 ({overseasVenues.length})
            </button>
            <button
              onClick={() => {
                haptics.selection();
                setActiveTab('LIST');
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'LIST'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              📋 場館清單 ({venues.length})
            </button>
          </div>

          <div className="flex items-center space-x-1 text-xs">
            <span className="text-gray-400 hidden sm:inline">篩選：</span>
            {['ALL', 'ATTENDED', 'NORTH', 'CENTRAL', 'SOUTH'].map((reg) => (
              <button
                key={reg}
                onClick={() => {
                  haptics.selection();
                  setRegionFilter(reg);
                }}
                className={`px-2.5 py-1 rounded-lg border transition-colors ${
                  regionFilter === reg
                    ? 'bg-gray-700 text-white border-gray-500'
                    : 'text-gray-400 border-gray-800 hover:border-gray-700'
                }`}
              >
                {reg === 'ALL'
                  ? '全部'
                  : reg === 'ATTENDED'
                    ? '⭐ 僅已參戰'
                    : reg === 'NORTH'
                      ? '北部'
                      : reg === 'CENTRAL'
                        ? '中部'
                        : '南部'}
              </button>
            ))}
          </div>
        </div>

        {/* 主內容展示區 */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">正在繪製足跡地圖與場館打卡點位...</p>
            </div>
          ) : activeTab === 'TAIWAN' ? (
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-center min-h-[460px] bg-gray-950/60 rounded-2xl p-4 border border-gray-800/80 relative">
              {/* 向量地圖區塊 */}
              <div className="relative w-full max-w-[460px] aspect-[460/600] flex items-center justify-center">
                {/* 台灣幾何輪廓 SVG */}
                <svg
                  viewBox="0 0 460 600"
                  className="w-full h-full drop-shadow-[0_0_25px_rgba(99,102,241,0.15)] select-none"
                >
                  {/* 背景經緯網格 */}
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path
                        d="M 30 0 L 0 0 0 30"
                        fill="none"
                        stroke="rgba(255,255,255,0.03)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="460" height="600" fill="url(#grid)" />

                  {/* 台灣島外觀輪廓 (平滑手繪風格向量) */}
                  <path
                    d="M 280 40 
                       C 320 60, 360 100, 345 150
                       C 330 200, 320 280, 290 380
                       C 270 440, 240 520, 200 580
                       C 180 560, 160 520, 165 470
                       C 170 420, 150 360, 140 300
                       C 130 240, 140 180, 170 120
                       C 200 70, 250 30, 280 40 Z"
                    fill="rgba(30, 41, 59, 0.7)"
                    stroke="rgba(99, 102, 241, 0.4)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />

                  {/* 澎湖群島示意 */}
                  <circle
                    cx="80"
                    cy="330"
                    r="14"
                    fill="rgba(30, 41, 59, 0.5)"
                    stroke="rgba(99, 102, 241, 0.3)"
                  />
                  <circle
                    cx="95"
                    cy="345"
                    r="8"
                    fill="rgba(30, 41, 59, 0.5)"
                    stroke="rgba(99, 102, 241, 0.3)"
                  />

                  {/* 海域文字 */}
                  <text
                    x="50"
                    y="240"
                    fill="rgba(148, 163, 184, 0.2)"
                    fontSize="12"
                    fontFamily="monospace"
                  >
                    TAIWAN STRAIT (台灣海峽)
                  </text>
                  <text
                    x="290"
                    y="270"
                    fill="rgba(148, 163, 184, 0.2)"
                    fontSize="12"
                    fontFamily="monospace"
                  >
                    PACIFIC OCEAN (太平洋)
                  </text>
                </svg>

                {/* 場館打卡 Pin 標記 */}
                {taiwanVenues
                  .filter((v) => {
                    if (regionFilter === 'ATTENDED') return v.attendanceCount > 0;
                    if (regionFilter !== 'ALL') return v.region === regionFilter;
                    return true;
                  })
                  .map((venue) => {
                    if (!venue.latitude || !venue.longitude) return null;
                    const { x, y } = mapCoordinates(venue.latitude, venue.longitude);
                    const hasAttended = venue.attendanceCount > 0;

                    return (
                      <div
                        key={venue.id}
                        style={{ left: `${(x / 460) * 100}%`, top: `${(y / 600) * 100}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
                        onClick={() => {
                          haptics.medium();
                          setSelectedVenue(venue);
                        }}
                      >
                        {/* 點位光環 */}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform group-hover:scale-125 ${
                            hasAttended
                              ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse'
                              : 'bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>

                        {/* 標籤浮動預覽 (Tooltip) */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                          <div className="bg-gray-900 border border-gray-700 text-white text-xs px-2.5 py-1.5 rounded-xl shadow-xl whitespace-nowrap">
                            <span className="font-bold">{venue.name}</span>
                            {hasAttended ? (
                              <span className="ml-1.5 text-rose-400 font-semibold">
                                ★ {venue.attendanceCount} 場
                              </span>
                            ) : (
                              <span className="ml-1.5 text-gray-400">未參戰</span>
                            )}
                          </div>
                          <div className="w-2 h-2 bg-gray-900 border-r border-b border-gray-700 rotate-45 -mt-1" />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* 右側快速點選名錄 */}
              <div className="flex-1 w-full flex flex-col space-y-2 max-h-[480px] overflow-y-auto">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  全台場館點位 ({taiwanVenues.length})
                </h3>
                {taiwanVenues.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => {
                      haptics.selection();
                      setSelectedVenue(v);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      v.attendanceCount > 0
                        ? 'bg-gray-800/60 hover:bg-gray-800 border-rose-900/40 hover:border-rose-500/50'
                        : 'bg-gray-900/40 hover:bg-gray-800/40 border-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{v.attendanceCount > 0 ? '📍' : '🏛️'}</span>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          {v.name}
                          {v.sub_halls.length > 0 && (
                            <span className="text-[10px] text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded">
                              {v.sub_halls.length} 廳
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {v.city} · 容量 {v.capacity?.toLocaleString() || '未載'} 人
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {v.attendanceCount > 0 ? (
                        <div>
                          <span className="inline-block bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-2 py-0.5 rounded-full font-bold">
                            参戰 {v.attendanceCount} 次
                          </span>
                          <span className="block text-[11px] text-gray-400 mt-0.5">
                            NT$ {v.totalExpense.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">尚未打卡</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'OVERSEAS' ? (
            /* 海外朝聖點位 */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              {overseasVenues.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    haptics.selection();
                    setSelectedVenue(v);
                  }}
                  className="bg-gray-800/50 hover:bg-gray-800 border border-gray-700/60 hover:border-purple-500/50 rounded-3xl p-5 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">
                        {v.country === 'JP' ? '🇯🇵' : v.country === 'UK' ? '🇬🇧' : '✈️'}
                      </span>
                      {v.attendanceCount > 0 ? (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-1 rounded-full font-bold">
                          已朝聖 {v.attendanceCount} 場
                        </span>
                      ) : (
                        <span className="text-xs text-purple-300 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-full">
                          朝聖心願池
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-white mb-1">{v.name}</h4>
                    <p className="text-xs text-gray-400 mb-2">
                      {v.city}, {v.country}
                    </p>
                    <p className="text-xs text-gray-500">{v.address || '著名跨國音樂巡迴聖地'}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-700/40 flex items-center justify-between text-xs text-gray-400">
                    <span>場館總花費</span>
                    <span className="text-sm font-bold text-amber-400">
                      NT$ {v.totalExpense.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 全部場館清單 */
            <div className="space-y-2 py-2">
              {filteredVenues.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    haptics.selection();
                    setSelectedVenue(v);
                  }}
                  className="bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 rounded-2xl p-3.5 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{v.country === 'TW' ? '🇹🇼' : '✈️'}</span>
                    <div>
                      <div className="text-sm font-bold text-white">{v.name}</div>
                      <div className="text-xs text-gray-400">
                        {v.city} · {v.region} · 容量 {v.capacity?.toLocaleString() || '未載'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {v.attendanceCount > 0 ? (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-1 rounded-full font-bold">
                        ★ 參戰 {v.attendanceCount} 場
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">未打卡</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 場館參戰詳情探索彈窗 (Issue #72 Anti-clipping pattern) */}
        {selectedVenue && (
          <div className="fixed inset-0 z-60 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe bg-black/90 backdrop-blur flex min-h-full items-center justify-center">
            <div className="bg-gray-900 border border-indigo-500/50 rounded-3xl w-full max-w-2xl my-auto p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90dvh]">
              {/* 頂部標題 */}
              <div className="flex items-start justify-between pb-4 border-b border-gray-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏛️</span>
                    <h3 className="text-xl font-bold text-white">{selectedVenue.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedVenue.city} · {selectedVenue.address || '場館位置待完善'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    haptics.light();
                    setSelectedVenue(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-800"
                >
                  ✕
                </button>
              </div>

              {/* 滾動內容 */}
              <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
                {/* 場館子展館/廳別標籤 */}
                {selectedVenue.sub_halls.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-400 block mb-2">
                      廳別子分區 (Sub-Halls)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedVenue.sub_halls.map((hall, idx) => (
                        <span
                          key={idx}
                          className="bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 text-xs px-2.5 py-1 rounded-xl"
                        >
                          {hall}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 參戰統計速覽 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-800/60 rounded-2xl p-2.5 border border-gray-700/40">
                    <span className="text-[11px] text-gray-400 block">打卡次數</span>
                    <span className="text-lg font-bold text-rose-400">
                      {selectedVenue.attendanceCount} 場
                    </span>
                  </div>
                  <div className="bg-gray-800/60 rounded-2xl p-2.5 border border-gray-700/40">
                    <span className="text-[11px] text-gray-400 block">累積花費</span>
                    <span className="text-lg font-bold text-amber-400">
                      NT$ {selectedVenue.totalExpense.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-gray-800/60 rounded-2xl p-2.5 border border-gray-700/40 col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-gray-400 block">最近參戰</span>
                    <span className="text-xs font-semibold text-gray-300">
                      {selectedVenue.lastAttended?.slice(0, 10) || '無紀錄'}
                    </span>
                  </div>
                </div>

                {/* 參戰歷史時間軸 */}
                <div>
                  <span className="text-xs font-semibold text-gray-400 block mb-2">
                    參戰歷史時間軸 ({selectedVenue.sessions.length})
                  </span>
                  {selectedVenue.sessions.length === 0 ? (
                    <div className="bg-gray-800/30 rounded-2xl p-6 text-center text-gray-500 text-xs">
                      尚無此場館的參戰紀錄。快輸入售票網址開始記錄吧！
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedVenue.sessions.map((s) => (
                        <div
                          key={s.attendance_id}
                          className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-3 flex flex-col space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs font-mono text-indigo-400 block">
                                {s.session_date.slice(0, 10)}{' '}
                                {s.hall_name ? `· ${s.hall_name}` : ''}
                              </span>
                              <h4 className="text-sm font-bold text-white">{s.event_title}</h4>
                              <p className="text-xs text-gray-400">{s.artist_name || '現場歌手'}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs bg-gray-700/80 px-2 py-0.5 rounded-full text-gray-200">
                                {s.seat_info || '自由入座'}
                              </span>
                              {s.rating && (
                                <span className="block text-xs text-amber-400 mt-1">
                                  {'★'.repeat(s.rating)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 結構化點評 */}
                          {(s.pros || s.tips) && (
                            <div className="bg-gray-900/60 rounded-xl p-2 text-xs text-gray-300 space-y-1">
                              {s.pros && (
                                <div>
                                  <span className="text-emerald-400 font-bold">亮點：</span>
                                  {s.pros}
                                </div>
                              )}
                              {s.tips && (
                                <div>
                                  <span className="text-amber-400 font-bold">避坑：</span>
                                  {s.tips}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 座位視野回顧 */}
                {selectedVenue.seatViews.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-400 block mb-2">
                      真實座位視野庫 ({selectedVenue.seatViews.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedVenue.seatViews.map((sv) => (
                        <div
                          key={sv.id}
                          className="rounded-xl overflow-hidden border border-gray-700/80 bg-gray-800/60 relative group"
                        >
                          <img
                            src={sv.photo_url}
                            alt={sv.section}
                            className="w-full h-24 object-cover"
                          />
                          <div className="p-1.5 text-[10px] text-gray-300">
                            <span className="font-bold block truncate">{sv.section}</span>
                            <span className="text-amber-400">★ {sv.view_rating || 5}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 底部導航與關閉 */}
              <div className="pt-3 border-t border-gray-800 flex items-center justify-between shrink-0">
                <button
                  onClick={() => {
                    const query = encodeURIComponent(selectedVenue.address || selectedVenue.name);
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${query}`,
                      '_blank'
                    );
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5"
                >
                  <span>🧭</span>
                  <span>Google 地圖導航前往</span>
                </button>
                <button
                  onClick={() => setSelectedVenue(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-xl"
                >
                  返回足跡地圖
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
