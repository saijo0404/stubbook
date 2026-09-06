'use client';

import React, { useState } from 'react';
import {
  Search,
  Calendar,
  MapPin,
  Ticket,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';
import type { ScrapedEvent } from '@stubbook/scraper-core';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<ScrapedEvent | null>(null);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState<{ message: string; eventId: string } | null>(null);

  // 日誌抽屜狀態
  const [showLogs, setShowLogs] = useState(false);
  const [logSnippet, setLogSnippet] = useState<string>('');
  const [copiedLog, setCopiedLog] = useState(false);

  const handleScrape = async (targetUrl?: string) => {
    const inputUrl = (targetUrl || url).trim();
    if (!inputUrl) return;

    setLoading(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '解析失敗');
      }

      setEvent(data.event);
      setSelectedSessionIndex(0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!event) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '儲存失敗');
      }

      setSaveSuccess({
        message: data.message,
        eventId: data.eventId,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogSnippet(data.snippet || '無日誌紀錄');
      setShowLogs(true);
    } catch {
      setLogSnippet('無法讀取日誌');
      setShowLogs(true);
    }
  };

  const copyLogToClipboard = () => {
    navigator.clipboard.writeText(logSnippet);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* 標題與引言 */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">演唱會資訊與票根記錄</h1>
        <p className="text-gray-400 text-sm sm:text-base">
          貼上售票網址（KKTIX / 拓元售票），自動解析多場次時間、場館與票價階梯，一鍵結構化典藏入庫。
        </p>
      </div>

      {/* 網址輸入區塊 */}
      <div className="max-w-3xl mx-auto bg-gray-900/90 border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScrape();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="貼入 KKTIX 或 拓元售票活動網址 (https://...)"
              className="w-full bg-gray-950 border border-gray-700/80 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                解析中...
              </>
            ) : (
              '解析活動'
            )}
          </button>
        </form>

        {/* 快速示範體驗按鈕 */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-gray-400">
          <span className="font-semibold text-gray-400">快速填入範例：</span>
          <button
            type="button"
            onClick={() => {
              const u = 'https://kktix.cc/events/sample-accupass';
              setUrl(u);
              handleScrape(u);
            }}
            className="bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-indigo-300 border border-indigo-900/50 transition-colors"
          >
            🎫 [KKTIX] 2026 告五人巡迴
          </button>
          <button
            type="button"
            onClick={() => {
              const u = 'https://tixcraft.com/activity/detail/26_JAY';
              setUrl(u);
              handleScrape(u);
            }}
            className="bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-purple-300 border border-purple-900/50 transition-colors"
          >
            🏟️ [拓元] 2026 周杰倫大巨蛋 (3場次)
          </button>
        </div>
      </div>

      {/* 錯誤提示 */}
      {error && (
        <div className="max-w-3xl mx-auto bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex items-start space-x-3 text-rose-300 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">解析異常：</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 儲存成功提示 */}
      {saveSuccess && (
        <div className="max-w-3xl mx-auto bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 flex items-center justify-between text-emerald-300 text-sm">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-semibold">{saveSuccess.message}</p>
              <p className="text-xs text-emerald-400/80">系統識別碼 ID: {saveSuccess.eventId}</p>
            </div>
          </div>
        </div>
      )}

      {/* 活動卡片預覽區塊 */}
      {event && (
        <div className="max-w-3xl mx-auto bg-gray-900/95 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* 海報與主視覺頭部 */}
          <div className="relative bg-gradient-to-t from-gray-950 to-transparent p-6 pb-4 sm:p-8 sm:pb-6 flex flex-col sm:flex-row gap-6 items-start">
            {event.posterUrl && (
              <img
                src={event.posterUrl}
                alt={event.title}
                className="w-full sm:w-44 h-48 sm:h-56 object-cover rounded-xl shadow-lg border border-gray-700/50 flex-shrink-0"
              />
            )}
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                    event.platform === 'KKTIX'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                      : event.platform === 'TIXCRAFT'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                        : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {event.platform} 售票
                </span>
                {event.organizer && (
                  <span className="text-xs text-gray-400">主辦：{event.organizer}</span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                {event.title}
              </h2>

              {event.description && (
                <p className="text-xs sm:text-sm text-gray-300 line-clamp-2">{event.description}</p>
              )}

              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 hover:underline pt-1"
              >
                查看原始售票網頁
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </div>

          {/* 多場次選擇 Tabs */}
          <div className="border-t border-gray-800 bg-gray-950/50 px-6 py-3">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              <span className="text-xs font-semibold text-gray-400 mr-1 flex-shrink-0">
                場次 ({event.sessions.length})：
              </span>
              {event.sessions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSessionIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedSessionIndex === idx
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-800/60 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {s.sessionTitle || `場次 ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>

          {/* 當前選中場次詳情 */}
          {event.sessions[selectedSessionIndex] && (
            <div className="p-6 sm:p-8 space-y-6">
              {/* 日期與場館 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-950/70 p-4 rounded-xl border border-gray-800/80">
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-400 font-medium">演出時間</div>
                    <div className="text-sm font-semibold text-white">
                      {new Date(event.sessions[selectedSessionIndex].sessionDate).toLocaleString(
                        'zh-TW',
                        {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-400 font-medium">場地 / 場館</div>
                    <div className="text-sm font-semibold text-white">
                      {event.sessions[selectedSessionIndex].venueName}
                    </div>
                    {event.sessions[selectedSessionIndex].venueAddress && (
                      <div className="text-xs text-gray-400">
                        {event.sessions[selectedSessionIndex].venueAddress}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 票價分區列表 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
                  <span className="flex items-center">
                    <Ticket className="h-4 w-4 mr-1.5 text-indigo-400" />
                    各區票價 ({event.sessions[selectedSessionIndex].ticketTiers.length} 種)
                  </span>
                  <span className="text-gray-500">貨幣: TWD</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {event.sessions[selectedSessionIndex].ticketTiers.map((tier, tIdx) => (
                    <div
                      key={tIdx}
                      className="flex items-center justify-between bg-gray-950/50 border border-gray-800/80 px-4 py-2.5 rounded-lg text-sm"
                    >
                      <span className="text-gray-300 font-medium">{tier.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-indigo-300">
                          ${tier.price.toLocaleString()}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            tier.status === 'AVAILABLE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : tier.status === 'SOLD_OUT'
                                ? 'bg-gray-800 text-gray-400'
                                : 'bg-amber-950 text-amber-400'
                          }`}
                        >
                          {tier.status === 'AVAILABLE'
                            ? '熱賣中'
                            : tier.status === 'SOLD_OUT'
                              ? '已售完'
                              : '即將開賣'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 一鍵入庫按鈕 */}
              <div className="pt-4 border-t border-gray-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      儲存入庫中...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      確認入庫 (儲存至 Supabase)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 底部功能：即時除錯日誌與 Issue 回報小工具 */}
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center text-xs text-gray-400 hover:text-gray-200 border border-gray-800 hover:border-gray-700 bg-gray-900/60 px-3.5 py-1.5 rounded-full transition-colors"
        >
          <Terminal className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
          查看系統運行日誌 (Debug Logs)
        </button>
      </div>

      {/* 日誌檢視彈窗 */}
      {showLogs && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-200 flex items-center">
                <Terminal className="h-4 w-4 mr-2 text-indigo-400" />
                系統運行與錯誤日誌紀錄 (去敏保護)
              </span>
              <button
                onClick={() => setShowLogs(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                關閉
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs bg-gray-950 text-gray-300">
              <pre className="whitespace-pre-wrap">{logSnippet}</pre>
            </div>

            <div className="p-3 border-t border-gray-800 bg-gray-900 flex justify-between items-center text-xs">
              <span className="text-gray-500">可直接複製並貼入 GitHub Issue Bug Report</span>
              <button
                onClick={copyLogToClipboard}
                className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                {copiedLog ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    複製 Markdown
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
