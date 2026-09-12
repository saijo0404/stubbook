'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckSquare,
  Square,
  Copy,
  Check,
  FileText,
  HelpCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { haptics } from '../utils/haptics';

interface SafeTransferGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle?: string;
  sessionTitle?: string | null;
  sessionDate?: string | null;
  venueName?: string | null;
  transferNotes?: string | null;
  onSaveTransferNotes?: (notes: string) => Promise<void>;
}

export function SafeTransferGuideModal({
  isOpen,
  onClose,
  eventTitle = '演唱會活動',
  sessionTitle,
  sessionDate,
  venueName,
  transferNotes = '',
  onSaveTransferNotes,
}: SafeTransferGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'rules' | 'checklist' | 'memo'>('rules');
  const [memoText, setMemoText] = useState(transferNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // 互動式檢核清單狀態
  const [checks, setChecks] = useState<Record<string, boolean>>({
    realNameCheck: false,
    platformVerification: false,
    faceToFaceMeeting: false,
    noFullPrepayment: false,
    officialAppTransfer: false,
  });

  if (!isOpen) return null;

  const toggleCheck = (key: string) => {
    haptics.light();
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopySafetyTemplate = () => {
    haptics.medium();
    const template = `【StubBook 安全讓換票確認提醒】
你好！關於「${eventTitle}」讓換票事宜：
1. 雙方同意依原價/官方票面金額交易，嚴禁加價轉售或黃牛行為。
2. 實名制資訊確認：請確認官方轉讓與入場規範，以官方合法機制進行。
3. 交易方式：建議約定於捷運站或超商機台前當場面交取票，雙方安全有保障！
4. 預計面交時間/地點：${memoText || '（待填寫）'}
祝大家都能順利入場、快樂推活！`;

    navigator.clipboard.writeText(template).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveMemo = async () => {
    if (!onSaveTransferNotes) return;
    setIsSaving(true);
    haptics.selection();
    try {
      await onSaveTransferNotes(memoText);
      haptics.success();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center">
      <div className="bg-gray-900 border border-gray-700/80 rounded-3xl w-full max-w-2xl my-auto p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90dvh]">
        {/* 背景微光 */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 頂部標題與關閉 */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 sticky top-0 bg-gray-900/90 backdrop-blur z-20">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                讓換票安全手冊與防詐指南
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  Anti-Fraud Guide
                </span>
              </h3>
              <p className="text-xs text-gray-400">全面防堵演唱會票券詐騙，守護推活粉絲交易安全</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 頁籤切換 */}
        <div className="flex border-b border-gray-800 my-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('rules');
              haptics.selection();
            }}
            className={`pb-2.5 px-4 transition-colors relative ${
              activeTab === 'rules'
                ? 'text-indigo-400 border-b-2 border-indigo-500 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            防詐五不原則
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('checklist');
              haptics.selection();
            }}
            className={`pb-2.5 px-4 transition-colors relative ${
              activeTab === 'checklist'
                ? 'text-indigo-400 border-b-2 border-indigo-500 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            實名換票檢核清單
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('memo');
              haptics.selection();
            }}
            className={`pb-2.5 px-4 transition-colors relative ${
              activeTab === 'memo'
                ? 'text-indigo-400 border-b-2 border-indigo-500 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            換票資訊備忘錄
          </button>
        </div>

        {/* 內容區塊 */}
        <div className="overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: 防詐五不原則 */}
          {activeTab === 'rules' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/60 flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-rose-200 leading-relaxed">
                  <span className="font-bold">重要警示：</span>
                  演唱會熱門場次為網路詐騙高發期。詐騙集團常使用假帳號偽裝急讓、偽造超商取票序號截圖或要求先匯款留票，請務必嚴格遵守以下準則！
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    title: '1. 不預先全額匯款',
                    desc: '切勿在未取得有效取票序號或實體票券前先行匯款全額，嚴防收款後直接封鎖失聯。',
                    tag: '最常見手法',
                  },
                  {
                    title: '2. 不點擊不明取票連結或簡訊短網址',
                    desc: '釣魚網站常偽裝為拓元、KKTIX 或超商取票系統藉此盜取帳號密碼與驗證碼。',
                    tag: '防釣魚盜帳',
                  },
                  {
                    title: '3. 不貪便宜購買低於票面價之黃金席位',
                    desc: '詐騙常以「臨時有事低價急讓」為誘餌進行一票多賣或無票空手套白狼。',
                    tag: '低價陷阱',
                  },
                  {
                    title: '4. 不提供身分證正反面影本或存摺健保卡照',
                    desc: '避免個人敏感資料被詐團轉作人頭帳戶或三方詐騙人質。',
                    tag: '個資防護',
                  },
                  {
                    title: '5. 不脫離官方保障管道進行非實名流轉',
                    desc: '若活動具實名制查驗（核對證件正本），非原購票人若未依官方規定變更將無法入場。',
                    tag: '實名入場保障',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-gray-850 border border-gray-800 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-normal">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: 實名換票檢核清單 */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400">
                在與對方達成交易共識前，逐項確認以下防偽檢核點：
              </div>

              <div className="space-y-2">
                {[
                  {
                    key: 'realNameCheck',
                    title: '核對本場次官方實名制規範',
                    desc: '確認本活動是否強制查驗身分證件正本，是否開放官方讓換票或姓名更換作業。',
                  },
                  {
                    key: 'platformVerification',
                    title: '驗證原購票平台來源與官方訂單截圖',
                    desc: '要求對方錄製螢幕顯示官方購票 App/網頁中的訂單明細（包含訂單編號與日期），非單張靜態圖片。',
                  },
                  {
                    key: 'faceToFaceMeeting',
                    title: '約定超商機台或人潮眾多捷運站當場面交',
                    desc: '於 ibon、FamiPort 等機台現場輸入序號列印取票，或確認實體紙本雷射防偽標籤後再行付款。',
                  },
                  {
                    key: 'officialAppTransfer',
                    title: '若為電子票券，堅持使用官方 App 內轉贈功能',
                    desc: '例如 KKTIX 官方 App 票券轉贈、拓元官方手機憑證轉發，避免截圖進場被刷退。',
                  },
                  {
                    key: 'noFullPrepayment',
                    title: '恪守二手票券文化：嚴禁加價轉售 (原價讓票)',
                    desc: '遵守文化創意產業發展法，堅決抵制黃牛加價代購行為。',
                  },
                ].map((item) => {
                  const isChecked = checks[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleCheck(item.key)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 select-none ${
                        isChecked
                          ? 'bg-emerald-950/30 border-emerald-600/60'
                          : 'bg-gray-850/80 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-emerald-400 flex-shrink-0">
                        {isChecked ? (
                          <CheckSquare className="h-5 w-5" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div
                          className={`text-xs font-bold ${
                            isChecked ? 'text-emerald-300 line-through opacity-80' : 'text-white'
                          }`}
                        >
                          {item.title}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 leading-normal">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: 換票資訊備忘錄 */}
          {activeTab === 'memo' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">
                  個人換票交易備忘（儲存於本地手帳）:
                </span>
                <button
                  type="button"
                  onClick={handleCopySafetyTemplate}
                  className="text-xs px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-indigo-300 flex items-center gap-1 transition-colors border border-gray-700"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? '已複製安全文案' : '複製交易確認範本'}</span>
                </button>
              </div>

              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                placeholder="在此記錄：換票對象聯絡帳號 (Line/IG)、約定面交車站、座位互換序號、定金狀況等資訊..."
                rows={5}
                className="w-full bg-gray-950 border border-gray-700 rounded-2xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
              />

              {onSaveTransferNotes && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveMemo}
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? '儲存中...' : '儲存換票備忘'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
