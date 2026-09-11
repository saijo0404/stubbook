'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  HardDrive,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Archive,
  RefreshCw,
  Layers,
  Sparkles,
  FileCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { haptics } from '../utils/haptics';
import type { BackupOverview, BackupInspectResult, RestoreMode } from '../utils/backupEngine';

interface BackupRestoreDashboardProps {
  onDataRestored?: () => void;
}

export const BackupRestoreDashboard: React.FC<BackupRestoreDashboardProps> = ({
  onDataRestored,
}) => {
  const [overview, setOverview] = useState<BackupOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // 匯出狀態
  const [exportingStubbook, setExportingStubbook] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);

  // 還原狀態
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [inspection, setInspection] = useState<BackupInspectResult | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('MERGE');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreErrorMsg, setRestoreErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 載入備份概況
  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch('/api/backup?overview=true', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setOverview(json.overview);
      }
    } catch (err) {
      console.error('載入資料庫概況失敗', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // 格式化容量
  const formatBytes = (bytes: number): string => {
    if (bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // 下載全量 .stubbook
  const handleExportStubbook = async () => {
    setExportingStubbook(true);
    haptics.medium();
    try {
      const res = await fetch('/api/backup?format=stubbook');
      if (!res.ok) throw new Error('匯出失敗');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `stubbook_full_backup_${dateStr}.stubbook`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      haptics.success();
    } catch (err) {
      alert(`匯出失敗: ${(err as Error).message}`);
    } finally {
      setExportingStubbook(false);
    }
  };

  // 下載純文字 JSON
  const handleExportJson = async () => {
    setExportingJson(true);
    haptics.medium();
    try {
      const res = await fetch('/api/backup?format=json');
      if (!res.ok) throw new Error('匯出失敗');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `stubbook_data_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      haptics.success();
    } catch (err) {
      alert(`匯出失敗: ${(err as Error).message}`);
    } finally {
      setExportingJson(false);
    }
  };

  // 處理選擇檔案進行 Dry Run
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setInspection(null);
    setInspectError(null);
    setRestoreSuccessMsg(null);
    setRestoreErrorMsg(null);
    setIsDryRunning(true);
    haptics.light();

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dryRun', 'true');

      const res = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '解析備份檔失敗');
      }

      setInspection(json.inspection);
      haptics.success();
    } catch (err) {
      setInspectError((err as Error).message);
      haptics.warning();
    } finally {
      setIsDryRunning(false);
    }
  };

  // 執行正式還原
  const handleConfirmRestore = async () => {
    if (!selectedFile) return;

    if (restoreMode === 'OVERWRITE') {
      const confirmFirst = window.confirm(
        '⚠️ 警告：您選擇了「全部覆蓋 (Overwrite)」！\n這將清空目前裝置上的所有演唱會手帳紀錄與媒體，完整替換為備份檔案的內容。\n\n確定要繼續執行嗎？'
      );
      if (!confirmFirst) return;
    }

    setIsRestoring(true);
    setRestoreSuccessMsg(null);
    setRestoreErrorMsg(null);
    haptics.medium();

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', restoreMode);

      const res = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '還原執行失敗');
      }

      setRestoreSuccessMsg(json.result?.message || '資料庫還原成功！');
      haptics.success();

      // 重新整理儀表板與觸發父層重繪
      await loadOverview();
      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err) {
      setRestoreErrorMsg((err as Error).message);
      haptics.warning();
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* 頁面標題 */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
          <span>純本地離線資料主權 · 零雲端依賴</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          資料安全、備份還原與手帳存檔
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-2xl mx-auto">
          StubBook 堅持 100% 本地儲存。您可以一鍵打包專屬{' '}
          <code className="text-indigo-300 font-mono">.stubbook</code>{' '}
          完整備份，或匯入還原至任何裝置。
        </p>
      </div>

      {/* ────────────────── 1. 本地手帳狀態概況 ────────────────── */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-4">
          <div className="flex items-center space-x-2.5">
            <Database className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">本機資料庫與多媒體概況</h2>
          </div>
          <button
            type="button"
            onClick={loadOverview}
            disabled={loadingOverview}
            className="text-xs text-gray-400 hover:text-indigo-300 flex items-center space-x-1 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingOverview ? 'animate-spin' : ''}`} />
            <span>重新整理</span>
          </button>
        </div>

        {overview ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-950/80 border border-gray-800/80 p-3.5 rounded-xl space-y-1">
              <span className="text-xs text-gray-400">已登錄活動 / 場次</span>
              <div className="text-xl font-extrabold text-white font-mono">
                {overview.totalEvents}{' '}
                <span className="text-xs font-normal text-gray-400">活動</span> /{' '}
                {overview.totalSessions}{' '}
                <span className="text-xs font-normal text-gray-400">場</span>
              </div>
            </div>

            <div className="bg-gray-950/80 border border-gray-800/80 p-3.5 rounded-xl space-y-1">
              <span className="text-xs text-gray-400">手帳出席 / 票根</span>
              <div className="text-xl font-extrabold text-indigo-300 font-mono">
                {overview.totalAttendances}{' '}
                <span className="text-xs font-normal text-gray-400">筆紀錄</span>
              </div>
            </div>

            <div className="bg-gray-950/80 border border-gray-800/80 p-3.5 rounded-xl space-y-1">
              <span className="text-xs text-gray-400">戰利品周邊 / 視角</span>
              <div className="text-xl font-extrabold text-purple-300 font-mono">
                {overview.totalMerchandise}{' '}
                <span className="text-xs font-normal text-gray-400">周邊</span> /{' '}
                {overview.totalSeatViews}{' '}
                <span className="text-xs font-normal text-gray-400">視角</span>
              </div>
            </div>

            <div className="bg-gray-950/80 border border-gray-800/80 p-3.5 rounded-xl space-y-1">
              <span className="text-xs text-gray-400">資料庫與媒體佔用</span>
              <div className="text-xl font-extrabold text-pink-300 font-mono">
                {formatBytes(overview.dbSizeBytes + overview.mediaSizeBytes)}
              </div>
              <div className="text-[10px] text-gray-400">
                SQLite {formatBytes(overview.dbSizeBytes)} · 媒體 {overview.mediaCount} 個
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-gray-500">載入中...</div>
        )}
      </div>

      {/* ────────────────── 2. 一鍵打包匯出卡片 ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 全量 .stubbook 封裝 */}
        <div className="bg-gradient-to-br from-gray-900 to-indigo-950/30 border border-indigo-900/40 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2.5 text-indigo-300">
              <Archive className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-base text-white">全量封裝備份 (.stubbook)</h3>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-2 py-0.5 rounded-full font-bold">
                推薦
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              打包包含<strong>完整 SQLite 資料庫快照</strong>、所有本地上傳
              <strong>票根原圖、現場相片、短影音與視角圖庫</strong>，內嵌 SHA-256 完整性校驗
              Manifest。
            </p>
            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/80 text-xs text-gray-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>包含檔案格式</span>
                <span className="text-white font-mono">.stubbook (標準 ZIP 容器)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>校驗機制</span>
                <span className="text-emerald-400 font-mono">SHA-256 數位簽章</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportStubbook}
            disabled={exportingStubbook}
            className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {exportingStubbook ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>全量打包壓縮中...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>匯出 .stubbook 全量備份檔</span>
              </>
            )}
          </button>
        </div>

        {/* 結構化 JSON 匯出 */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2.5 text-purple-300">
              <FileText className="h-5 w-5 text-purple-400" />
              <h3 className="font-bold text-base text-white">純文字 JSON 匯出</h3>
              <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-full font-bold">
                輕量
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              僅匯出結構化文字資料（活動、場次、歌單、周邊清單、出席手帳），檔案極小且完全透明開放，適合以程式分析或自備硬碟儲存。
            </p>
            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/80 text-xs text-gray-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>包含檔案格式</span>
                <span className="text-white font-mono">標準 JSON (.json)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>多媒體處理</span>
                <span className="text-amber-400">不包含實體圖片與影音</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={exportingJson}
            className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-purple-300 font-semibold text-xs sm:text-sm border border-purple-900/40 transition-all disabled:opacity-50"
          >
            {exportingJson ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>匯出中...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>匯出純文字 JSON 檔案</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ────────────────── 3. 手帳還原引導精靈 (Restore Wizard) ────────────────── */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6 backdrop-blur-sm">
        <div className="border-b border-gray-800/80 pb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Upload className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">手帳資料還原中心</h2>
          </div>
          <span className="text-xs text-gray-400">支援 .stubbook 或 .json 檔案</span>
        </div>

        {/* 拖曳 / 檔案上傳區域 */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all bg-gray-950/40 hover:bg-gray-950/70 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".stubbook,.json,application/json,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-indigo-950/60 group-hover:bg-indigo-900/60 rounded-xl border border-indigo-800/50 text-indigo-400 transition-colors">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                點擊或將備份檔案拖曳至此處
              </div>
              <div className="text-xs text-gray-500 mt-1">
                支援 <span className="text-indigo-400 font-mono">.stubbook</span> 全量備份檔或{' '}
                <span className="text-purple-400 font-mono">.json</span> 格式
              </div>
            </div>
            {selectedFile && (
              <div className="inline-flex items-center space-x-2 bg-gray-800 px-3 py-1.5 rounded-lg text-xs text-gray-200 border border-gray-700">
                <FileCheck className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold">{selectedFile.name}</span>
                <span className="text-gray-400">({formatBytes(selectedFile.size)})</span>
              </div>
            )}
          </div>
        </div>

        {/* 預檢中動畫 */}
        {isDryRunning && (
          <div className="p-4 bg-indigo-950/40 border border-indigo-800/50 rounded-xl flex items-center space-x-3 text-xs text-indigo-300">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
            <span>正在校驗備份完整性與進行 Dry Run 預檢分析...</span>
          </div>
        )}

        {/* 預檢失敗訊息 */}
        {inspectError && (
          <div className="p-4 bg-rose-950/60 border border-rose-800/60 rounded-xl flex items-start space-x-3 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white">檔案校驗失敗</div>
              <div className="mt-1">{inspectError}</div>
            </div>
          </div>
        )}

        {/* 預檢成功摘要比對面板 */}
        {inspection && (
          <div className="bg-gray-950/80 border border-indigo-900/50 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>備份檔案預檢通過 · 包含以下內容</span>
              </div>
              <span className="text-[11px] font-mono text-gray-400">
                格式: {inspection.format} (v{inspection.appVersion})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-gray-400">演出活動</span>
                <div className="text-base font-bold text-white font-mono mt-0.5">
                  {inspection.counts.events} 場
                </div>
              </div>

              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-gray-400">出席紀錄</span>
                <div className="text-base font-bold text-indigo-300 font-mono mt-0.5">
                  {inspection.counts.attendances} 筆
                </div>
              </div>

              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-gray-400">多媒體檔案</span>
                <div className="text-base font-bold text-purple-300 font-mono mt-0.5">
                  {inspection.mediaFileCount} 個
                </div>
              </div>

              <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                <span className="text-gray-400">周邊 / 視角</span>
                <div className="text-base font-bold text-pink-300 font-mono mt-0.5">
                  {inspection.counts.merchandise} / {inspection.counts.seatViews}
                </div>
              </div>
            </div>

            {inspection.warnings.length > 0 && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-lg text-xs text-amber-300 space-y-1">
                {inspection.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 衝突解決策略選擇器 */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>選擇還原衝突處理策略</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setRestoreMode('MERGE')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    restoreMode === 'MERGE'
                      ? 'bg-indigo-950/50 border-indigo-500 shadow-md'
                      : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">智慧合併 (Merge)</span>
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-700 font-bold">
                      安全推薦
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    保留本機既有活動手帳，僅將備份檔中缺少的演出與照片補齊入庫。
                  </p>
                </div>

                <div
                  onClick={() => setRestoreMode('OVERWRITE')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    restoreMode === 'OVERWRITE'
                      ? 'bg-rose-950/40 border-rose-500 shadow-md'
                      : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300">全部覆蓋 (Overwrite)</span>
                    <span className="text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded border border-rose-700 font-bold">
                      全新替換
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    清除本機所有資料，完整替換為此備份檔的歷史狀態。
                  </p>
                </div>
              </div>
            </div>

            {/* 執行還原按鈕 */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>還原處理中...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>開始執行還原 ({restoreMode === 'OVERWRITE' ? '覆蓋' : '合併'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 還原成功提示 */}
        {restoreSuccessMsg && (
          <div className="p-4 bg-emerald-950/50 border border-emerald-700/60 rounded-xl flex items-center space-x-3 text-xs text-emerald-200 animate-fadeIn">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-white">還原完成</div>
              <div className="mt-0.5">{restoreSuccessMsg}</div>
            </div>
          </div>
        )}

        {/* 還原失敗提示 */}
        {restoreErrorMsg && (
          <div className="p-4 bg-rose-950/60 border border-rose-800/60 rounded-xl flex items-center space-x-3 text-xs text-rose-300 animate-fadeIn">
            <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-white">還原失敗</div>
              <div className="mt-0.5">{restoreErrorMsg}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
