'use client';

import React, { useState, useEffect } from 'react';
import { haptics } from '../utils/haptics';

interface FestivalStage {
  id: string;
  stage_name: string;
  stage_color: string;
  location_notes: string | null;
}

interface FestivalTimetableSlot {
  id: string;
  stage_id: string;
  stage_name: string;
  stage_color: string;
  session_date: string;
  artist_name: string;
  start_time: string;
  end_time: string;
  is_selected: number;
  notes: string | null;
  isClashing?: boolean;
}

interface ClashInfo {
  slot1: any;
  slot2: any;
  overlapMinutes: number;
  message: string;
}

interface FestivalTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
  festivalTitle?: string;
}

export default function FestivalTimetableModal({
  isOpen,
  onClose,
  eventId,
  festivalTitle = '大港開唱 Megaport Festival',
}: FestivalTimetableModalProps) {
  const [stages, setStages] = useState<FestivalStage[]>([]);
  const [timetables, setTimetables] = useState<FestivalTimetableSlot[]>([]);
  const [clashes, setClashes] = useState<ClashInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>('2026-03-28');
  const [viewMode, setViewMode] = useState<'GRID' | 'MY_SCHEDULE'>('GRID');
  const [copiedSchedule, setCopiedSchedule] = useState<boolean>(false);

  // 讀取音樂祭時程與舞台分區
  const fetchFestivalData = async () => {
    try {
      setLoading(true);
      const url = eventId ? `/api/festival?eventId=${eventId}` : '/api/festival';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setStages(json.stages || []);
        setTimetables(json.timetables || []);
        setClashes(json.clashes || []);
        if (json.timetables && json.timetables.length > 0) {
          setSelectedDate(json.timetables[0].session_date);
        }
      }
    } catch (err) {
      console.error('Failed to load festival timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFestivalData();
    }
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  // 切換演出選取 (必看)
  const toggleSlotSelection = async (slot: FestivalTimetableSlot) => {
    haptics.selection();
    const newSelected = slot.is_selected === 1 ? 0 : 1;

    // 本地樂觀更新
    setTimetables((prev) =>
      prev.map((t) => (t.id === slot.id ? { ...t, is_selected: newSelected } : t))
    );

    try {
      const res = await fetch('/api/festival', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timetableId: slot.id, isSelected: newSelected === 1 }),
      });
      const json = await res.json();
      if (json.success) {
        // 重新比對衝堂
        fetchFestivalData();
      }
    } catch (err) {
      console.error('Failed to update slot:', err);
    }
  };

  const currentDaySlots = timetables.filter((t) => t.session_date === selectedDate);
  const mySchedule = timetables
    .filter((t) => t.is_selected === 1)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // 一鍵複製個人參戰時程文字
  const handleCopySchedule = () => {
    haptics.success();
    const lines = [
      `🎸【${festivalTitle}】我的個人必看參戰排程`,
      `📅 日期：${selectedDate}`,
      '----------------------------------------',
      ...mySchedule.map(
        (s) => `⏰ ${s.start_time} - ${s.end_time} | 📍 ${s.stage_name} | 🎤 ${s.artist_name}`
      ),
      '----------------------------------------',
      clashes.length > 0
        ? `⚠️ 衝堂警示：${clashes.map((c) => c.message).join('\n')}`
        : '✨ 完美錯開，全場趕舞台達成！',
      '\n由 StubBook 票根手帳智慧排程生成',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSchedule(true);
    setTimeout(() => setCopiedSchedule(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center">
      <div className="bg-gray-900 border border-gray-700/80 rounded-3xl w-full max-w-5xl my-auto p-5 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh]">
        {/* 背景光暈裝飾 */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 頂部標頭 */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-2xl p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              🎪
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                音樂祭多舞台 Timetable 排程
                <span className="text-xs font-normal text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-0.5 rounded-full">
                  Multi-Stage Timetable
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                跨舞台演出時間表交叉比對，智慧標記衝堂衝突，規劃專屬看團跑場路線
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

        {/* 衝堂高亮警示 Banner (Clash Detection Alert) */}
        {clashes.length > 0 && (
          <div className="my-3 p-3.5 bg-rose-950/40 border border-rose-600/50 rounded-2xl shrink-0 flex items-start space-x-3 text-xs text-rose-200 animate-pulse">
            <span className="text-lg">⚠️</span>
            <div className="flex-1 space-y-1">
              <span className="font-bold block text-rose-300">
                偵測到 {clashes.length} 組演出時間衝堂衝突！
              </span>
              {clashes.map((c, i) => (
                <p key={i} className="text-[11px] text-rose-200/90 leading-relaxed">
                  {c.message}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 標籤導覽列 (日期切換 / 視圖模式) */}
        <div className="flex flex-wrap items-center justify-between gap-3 my-3 shrink-0">
          {/* 日期選擇 */}
          <div className="flex bg-gray-800/80 p-1 rounded-xl border border-gray-700/60 text-xs">
            {['2026-03-28', '2026-03-29'].map((date, idx) => (
              <button
                key={date}
                onClick={() => {
                  haptics.selection();
                  setSelectedDate(date);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  selectedDate === date
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Day {idx + 1} ({date.slice(5)})
              </button>
            ))}
          </div>

          {/* 視圖切換與排程匯出 */}
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex bg-gray-800/80 p-1 rounded-xl border border-gray-700/60">
              <button
                onClick={() => setViewMode('GRID')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'GRID' ? 'bg-gray-700 text-white' : 'text-gray-400'
                }`}
              >
                全舞台總覽表 ({currentDaySlots.length})
              </button>
              <button
                onClick={() => setViewMode('MY_SCHEDULE')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'MY_SCHEDULE' ? 'bg-gray-700 text-white' : 'text-gray-400'
                }`}
              >
                ⭐ 我的參戰清單 ({mySchedule.length})
              </button>
            </div>

            <button
              onClick={handleCopySchedule}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl border border-indigo-500 shadow flex items-center space-x-1"
            >
              <span>📋</span>
              <span>{copiedSchedule ? '已複製！' : '複製排程'}</span>
            </button>
          </div>
        </div>

        {/* 舞台與時間表主區域 */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">正在載入舞台配置與時間表...</p>
            </div>
          ) : viewMode === 'GRID' ? (
            /* 多舞台時間網格 (Multi-Stage Grid) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {stages.map((stage) => {
                const stageSlots = currentDaySlots
                  .filter((s) => s.stage_id === stage.id)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));

                return (
                  <div
                    key={stage.id}
                    className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-3 flex flex-col"
                  >
                    {/* 舞台名稱標頭 */}
                    <div
                      style={{ borderColor: stage.stage_color }}
                      className="pb-2 mb-3 border-b-2 flex items-center justify-between"
                    >
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: stage.stage_color }}
                        />
                        <span className="truncate">{stage.stage_name}</span>
                      </h4>
                      <span className="text-[10px] text-gray-500">{stageSlots.length} 組</span>
                    </div>

                    {/* 該舞台當日演出 Slot 列表 */}
                    <div className="space-y-2.5 flex-1">
                      {stageSlots.map((slot) => {
                        const isSelected = slot.is_selected === 1;
                        const isClashing = slot.isClashing;

                        return (
                          <div
                            key={slot.id}
                            onClick={() => toggleSlotSelection(slot)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                              isSelected
                                ? isClashing
                                  ? 'bg-rose-950/60 border-rose-500 ring-1 ring-rose-500'
                                  : 'bg-indigo-950/70 border-indigo-500 ring-1 ring-indigo-500/50'
                                : 'bg-gray-800/60 hover:bg-gray-800 border-gray-700/50'
                            }`}
                          >
                            {/* 衝堂微標記 */}
                            {isClashing && (
                              <span className="absolute top-1 right-1 text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded font-bold">
                                衝堂
                              </span>
                            )}

                            <div className="text-[11px] font-mono text-gray-400 mb-1 flex items-center justify-between">
                              <span>
                                ⏰ {slot.start_time} - {slot.end_time}
                              </span>
                              {isSelected && !isClashing && (
                                <span className="text-emerald-400 text-xs">✓ 必看</span>
                              )}
                            </div>

                            <h5 className="text-sm font-bold text-white leading-tight mb-1">
                              {slot.artist_name}
                            </h5>

                            {slot.notes && (
                              <p className="text-[11px] text-gray-400 line-clamp-1">{slot.notes}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 我的專屬參戰時間軸 (My Schedule) */
            <div className="max-w-2xl mx-auto py-2 space-y-3">
              {mySchedule.length === 0 ? (
                <div className="text-center py-16 text-gray-500 space-y-2">
                  <span className="text-4xl block">🎸</span>
                  <p className="text-sm font-medium">尚未選取任何必看演出！</p>
                  <p className="text-xs text-gray-600">
                    請點選「全舞台總覽表」標記您想看的歌手與樂團
                  </p>
                </div>
              ) : (
                mySchedule.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      slot.isClashing
                        ? 'bg-rose-950/40 border-rose-600/60'
                        : 'bg-gray-800/50 border-gray-700/60'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-center min-w-[50px]">
                        <span className="text-xs font-mono font-bold text-cyan-400 block">
                          {slot.start_time}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{slot.end_time}</span>
                      </div>

                      <div className="w-1 h-8 bg-gray-700 rounded-full" />

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white">{slot.artist_name}</h4>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white"
                            style={{ backgroundColor: slot.stage_color }}
                          >
                            {slot.stage_name}
                          </span>
                        </div>
                        {slot.notes && <p className="text-xs text-gray-400 mt-0.5">{slot.notes}</p>}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleSlotSelection(slot)}
                      className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg border border-gray-700"
                    >
                      移除
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 底部資訊列 */}
        <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <span>點擊任意時程卡片即可標記 / 取消必看；系統將自動檢測舞台重疊</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl"
          >
            完成排程
          </button>
        </div>
      </div>
    </div>
  );
}
