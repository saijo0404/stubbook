'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UserFriend,
  AttendanceCompanion,
  TicketExchange,
  TicketExchangeType,
  TicketExchangeStatus,
  ExchangePlatform,
  CompanionRole,
  FriendRelationshipTier,
  P2PStubPacket,
} from '@stubbook/database';
import { haptics } from '../utils/haptics';

interface SavedEventItem {
  id: string;
  title: string;
  artist: string;
  venue: string;
  date: string;
  seat?: string;
  attendanceId?: string;
}

interface SocialConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedEvents?: SavedEventItem[];
  defaultTab?: 'friends' | 'companions' | 'p2p' | 'exchanges' | 'antifraud';
}

type TabType = 'friends' | 'companions' | 'p2p' | 'exchanges' | 'antifraud';

// 四大售票平台官方防偽特徵庫
const OFFICIAL_ANTI_FRAUD_DATA = {
  TIXCRAFT: {
    name: '拓元售票 (tixCraft)',
    badge: '拓元官方防偽規約',
    accentColor: 'from-blue-600 to-indigo-700',
    features: [
      {
        title: '實體票：高折射立體全像燙銀防偽線',
        desc: '正面邊緣具備金屬全像防偽雷射燙銀線，傾斜票券時會呈現彩虹折射與「tixCraft」微縮幾何防偽字樣，非普通彩色影印可仿製。',
      },
      {
        title: '實體票：紫光燈下雙色螢光防偽纖維',
        desc: '票紙內部混有隨機分佈的紫外線防偽纖維，使用 365nm 紫光筆照射會顯現紅/綠雙色發光細絲。',
      },
      {
        title: '電子票：官方 App 動態高頻動態 QR 碼',
        desc: '拓元官方 App 內電子票具備秒級動態刷新光環與防截圖浮水印，現場驗票禁止使用靜態螢幕截圖。',
      },
      {
        title: '序號印字：點陣高壓防偽流水碼',
        desc: '票券正面下方具有專屬流水號，油墨具微凸觸感，且連號票券流水號末幾碼具有確定間距。',
      },
    ],
  },
  KKTIX: {
    name: 'KKTIX',
    badge: 'KKTIX 官方防偽規約',
    accentColor: 'from-emerald-600 to-teal-700',
    features: [
      {
        title: '電子票：動態驗票呼吸光環與變色時間軸',
        desc: 'KKTIX App 電子票 QR Code 外圍有連續旋轉之彩色呼吸光環，並標示當前伺服器微秒時間戳，截圖或錄影均無法通過閘門刷驗。',
      },
      {
        title: '實體超商票：指溫溫感變色油墨',
        desc: '全家超商列印之 KKTIX 票券，特定文字與標誌區域以手指按壓加溫後會由深色短暫變為淡色，離開後迅速復原。',
      },
      {
        title: '透光水印：紙質專屬迎光透光徽記',
        desc: '迎向光源透光檢視時，票紙內部可隱約看見清晰原廠防偽水印浮雕紋路，影印紙背光呈現灰黑渾濁。',
      },
      {
        title: '實名制登記：身份證字號雙向查驗',
        desc: '實名制場次票面印有購票者證件後四碼或姓名，入場時須配合出示正自身分證/護照原件。',
      },
    ],
  },
  IBON: {
    name: '7-ELEVEN ibon',
    badge: 'ibon 官方防偽規約',
    accentColor: 'from-orange-600 to-amber-700',
    features: [
      {
        title: '專屬熱感彩印防撕紙質',
        desc: 'ibon 機台專用熱感應厚磅票紙，正面印有 7-ELEVEN 漸層網底，撕裂斷面呈現純白纖維非回收灰紙。',
      },
      {
        title: '背面 ibon 官方微縮防偽網底',
        desc: '票券背面整面覆蓋 ibon 多重複雜幾何防偽底紋，放大鏡下可辨識清晰微縮英文字母。',
      },
      {
        title: '取票條碼與二維碼唯一性',
        desc: '票券底部印有 16 碼條碼與 QR Code，對應全台 7-ELEVEN 系統唯一取票序號，無重複可能。',
      },
    ],
  },
  FAMITICKET: {
    name: '全家 FamiTicket',
    badge: '全家 官方防偽規約',
    accentColor: 'from-cyan-600 to-blue-700',
    features: [
      {
        title: 'FamiPort 雙色防偽熱感票紙',
        desc: '全家機台列印票券上方具備藍綠專屬漸層標章，熱感文字邊緣銳利，無噴墨列印的毛邊墨暈。',
      },
      {
        title: '票根撕聯防偽裁切線',
        desc: '票券右側或下方設有齒孔撕除聯，驗票撕下時邊緣整齊均勻，防偽暗記貫穿撕聯與主票。',
      },
      {
        title: '訂單取票交易序號對照',
        desc: '主票印有 FamiTicket 專屬取票交易代碼與門市店號，可即時透過訂單查詢真偽狀態。',
      },
    ],
  },
};

export function SocialConnectModal({
  isOpen,
  onClose,
  savedEvents = [],
  defaultTab = 'friends',
}: SocialConnectModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  // 好友圈狀態
  const [friends, setFriends] = useState<UserFriend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendAvatar, setNewFriendAvatar] = useState('🐱');
  const [newFriendTier, setNewFriendTier] = useState<FriendRelationshipTier>('FRIEND');
  const [newFriendHandle, setNewFriendHandle] = useState('');
  const [newFriendNotes, setNewFriendNotes] = useState('');
  const [showAddFriendForm, setShowAddFriendForm] = useState(false);

  // 同行夥伴狀態
  const [selectedEventId, setSelectedEventId] = useState<string>(savedEvents[0]?.id || '');
  const [companions, setCompanions] = useState<AttendanceCompanion[]>([]);
  const [loadingCompanions, setLoadingCompanions] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompRole, setNewCompRole] = useState<CompanionRole>('BESTIE');
  const [newCompSeat, setNewCompSeat] = useState('');
  const [newCompNotes, setNewCompNotes] = useState('');
  const [selectedFriendIdForComp, setSelectedFriendIdForComp] = useState<string>('');

  // P2P 快傳狀態
  const [p2pAttendanceId, setP2pAttendanceId] = useState<string>('');
  const [p2pSenderName, setP2pSenderName] = useState('推友');
  const [generatedPayload, setGeneratedPayload] = useState<string>('');
  const [generatedPacket, setGeneratedPacket] = useState<P2PStubPacket | null>(null);
  const [copiedP2p, setCopiedP2p] = useState(false);
  const [receiveInput, setReceiveInput] = useState('');
  const [parsedPreviewPacket, setParsedPreviewPacket] = useState<P2PStubPacket | null>(null);
  const [autoMarkCompanion, setAutoMarkCompanion] = useState(true);
  const [p2pImporting, setP2pImporting] = useState(false);
  const [p2pSuccessMessage, setP2pSuccessMessage] = useState('');

  // 讓換票進度狀態
  const [exchanges, setExchanges] = useState<TicketExchange[]>([]);
  const [loadingExchanges, setLoadingExchanges] = useState(false);
  const [showAddExchangeForm, setShowAddExchangeForm] = useState(false);
  const [exType, setExType] = useState<TicketExchangeType>('TRANSFER_OUT');
  const [exTargetName, setExTargetName] = useState('');
  const [exContactInfo, setExContactInfo] = useState('');
  const [exPlatform, setExPlatform] = useState<ExchangePlatform>('THREADS');
  const [exMySeat, setExMySeat] = useState('');
  const [exTargetSeat, setExTargetSeat] = useState('');
  const [exPriceDiff, setExPriceDiff] = useState('0');
  const [exMeetupLoc, setExMeetupLoc] = useState('');
  const [exMeetupTime, setExMeetupTime] = useState('');
  const [exSerial, setExSerial] = useState('');
  const [exNotes, setExNotes] = useState('');

  // 防偽助手狀態
  const [selectedPlatformKey, setSelectedPlatformKey] =
    useState<keyof typeof OFFICIAL_ANTI_FRAUD_DATA>('TIXCRAFT');
  const [antiFraudChecklist, setAntiFraudChecklist] = useState<Record<string, boolean>>({
    id_match: false,
    print_clear: false,
    hologram_valid: false,
    app_live_qr: false,
    no_advance_deposit: false,
  });
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  // 載入好友圈
  const fetchFriends = async () => {
    try {
      setLoadingFriends(true);
      const res = await fetch('/api/friends');
      const data = await res.json();
      if (data.friends) {
        setFriends(data.friends);
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  // 載入指定場次的同行夥伴
  const fetchCompanions = async (attId: string) => {
    if (!attId) {
      setCompanions([]);
      return;
    }
    try {
      setLoadingCompanions(true);
      const res = await fetch(`/api/companions?attendanceId=${attId}`);
      const data = await res.json();
      if (data.companions) {
        setCompanions(data.companions);
      }
    } catch (err) {
      console.error('Failed to fetch companions:', err);
    } finally {
      setLoadingCompanions(false);
    }
  };

  // 載入讓換票記錄
  const fetchExchanges = async () => {
    try {
      setLoadingExchanges(true);
      const res = await fetch('/api/exchanges');
      const data = await res.json();
      if (data.exchanges) {
        setExchanges(data.exchanges);
      }
    } catch (err) {
      console.error('Failed to fetch exchanges:', err);
    } finally {
      setLoadingExchanges(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      fetchExchanges();
      if (savedEvents.length > 0) {
        const firstWithAtt = savedEvents.find((e) => e.attendanceId) || savedEvents[0];
        setSelectedEventId(firstWithAtt.id);
        if (firstWithAtt.attendanceId) {
          setP2pAttendanceId(firstWithAtt.attendanceId);
          fetchCompanions(firstWithAtt.attendanceId);
        }
      }
    }
  }, [isOpen]);

  // 當同行夥伴選取演出變更時
  const handleEventChangeForCompanions = (eventId: string) => {
    setSelectedEventId(eventId);
    const ev = savedEvents.find((e) => e.id === eventId);
    if (ev?.attendanceId) {
      fetchCompanions(ev.attendanceId);
    } else {
      setCompanions([]);
    }
  };

  // 新增好友
  const handleCreateFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    try {
      haptics.medium();
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendName: newFriendName,
          friendAvatar: newFriendAvatar,
          relationshipTier: newFriendTier,
          contactHandle: newFriendHandle,
          notes: newFriendNotes,
        }),
      });
      if (res.ok) {
        haptics.success();
        setNewFriendName('');
        setNewFriendHandle('');
        setNewFriendNotes('');
        setShowAddFriendForm(false);
        fetchFriends();
      }
    } catch (err) {
      console.error('Failed to create friend:', err);
    }
  };

  // 刪除好友
  const handleDeleteFriend = async (id: string) => {
    if (!confirm('確定要從好友名冊中移除此好友嗎？')) return;
    try {
      haptics.warning();
      const res = await fetch(`/api/friends?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFriends();
      }
    } catch (err) {
      console.error('Failed to delete friend:', err);
    }
  };

  // 新增同行夥伴
  const handleCreateCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentEv = savedEvents.find((e) => e.id === selectedEventId);
    if (!currentEv?.attendanceId || !newCompName.trim()) return;

    try {
      haptics.medium();
      const res = await fetch('/api/companions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: currentEv.attendanceId,
          friendId: selectedFriendIdForComp || null,
          companionName: newCompName,
          companionRole: newCompRole,
          seatNearby: newCompSeat,
          notes: newCompNotes,
        }),
      });
      if (res.ok) {
        haptics.success();
        setNewCompName('');
        setNewCompSeat('');
        setNewCompNotes('');
        setSelectedFriendIdForComp('');
        fetchCompanions(currentEv.attendanceId);
        fetchFriends(); // 更新好友同行次數
      }
    } catch (err) {
      console.error('Failed to create companion:', err);
    }
  };

  // 移除同行夥伴
  const handleDeleteCompanion = async (id: string) => {
    try {
      haptics.warning();
      const res = await fetch(`/api/companions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        const currentEv = savedEvents.find((e) => e.id === selectedEventId);
        if (currentEv?.attendanceId) {
          fetchCompanions(currentEv.attendanceId);
          fetchFriends();
        }
      }
    } catch (err) {
      console.error('Failed to delete companion:', err);
    }
  };

  // 生成 P2P 快傳封包
  const handleGenerateP2p = async () => {
    if (!p2pAttendanceId) return;
    try {
      haptics.medium();
      const res = await fetch(
        `/api/p2p?attendanceId=${p2pAttendanceId}&senderName=${encodeURIComponent(p2pSenderName)}`
      );
      const data = await res.json();
      if (data.encoded) {
        haptics.success();
        setGeneratedPayload(data.encoded);
        setGeneratedPacket(data.packet);
      }
    } catch (err) {
      console.error('Failed to generate P2P packet:', err);
    }
  };

  // 解析待接收的 P2P 封包字串
  const handleParseReceiveInput = (text: string) => {
    setReceiveInput(text);
    setP2pSuccessMessage('');
    try {
      let raw = text.trim();
      if (raw.startsWith('stubbook-p2p://')) {
        raw = raw.replace('stubbook-p2p://', '');
      }
      const json = atob(raw);
      const parsed = JSON.parse(json);
      if (parsed.event && parsed.event.title) {
        setParsedPreviewPacket(parsed);
      } else {
        setParsedPreviewPacket(null);
      }
    } catch {
      setParsedPreviewPacket(null);
    }
  };

  // 匯入 P2P 票根
  const handleImportP2p = async () => {
    if (!parsedPreviewPacket && !receiveInput.trim()) return;
    try {
      setP2pImporting(true);
      haptics.heavy();
      const res = await fetch('/api/p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packet: parsedPreviewPacket,
          encodedPayload: receiveInput,
          markAsCompanion: autoMarkCompanion,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        haptics.success();
        setP2pSuccessMessage(data.message || '參戰手帳已成功同步入庫！');
        setReceiveInput('');
        setParsedPreviewPacket(null);
      } else {
        alert(data.error || '匯入失敗');
      }
    } catch (err: any) {
      alert('匯入失敗: ' + err.message);
    } finally {
      setP2pImporting(false);
    }
  };

  // 建立讓換票記錄
  const handleCreateExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exTargetName.trim()) return;
    try {
      haptics.medium();
      const currentEv = savedEvents.find((e) => e.id === selectedEventId);
      const res = await fetch('/api/exchanges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchangeType: exType,
          targetName: exTargetName,
          contactInfo: exContactInfo,
          platform: exPlatform,
          mySeat: exMySeat,
          targetSeat: exTargetSeat,
          priceDifference: Number(exPriceDiff) || 0,
          meetupLocation: exMeetupLoc,
          meetupTime: exMeetupTime,
          serialNumber: exSerial,
          notes: exNotes,
          attendanceId: currentEv?.attendanceId || null,
          sessionId: currentEv?.id || null,
        }),
      });
      if (res.ok) {
        haptics.success();
        setShowAddExchangeForm(false);
        setExTargetName('');
        setExContactInfo('');
        setExMySeat('');
        setExTargetSeat('');
        setExPriceDiff('0');
        setExMeetupLoc('');
        setExMeetupTime('');
        setExSerial('');
        setExNotes('');
        fetchExchanges();
      }
    } catch (err) {
      console.error('Failed to create exchange:', err);
    }
  };

  // 推進讓換票狀態
  const handleUpdateExchangeStatus = async (id: string, newStatus: TicketExchangeStatus) => {
    try {
      haptics.light();
      const res = await fetch('/api/exchanges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        fetchExchanges();
      }
    } catch (err) {
      console.error('Failed to update exchange status:', err);
    }
  };

  // 切換防偽勾選
  const handleToggleAntiFraudOnExchange = async (id: string, currentVal: number) => {
    try {
      haptics.selection();
      const res = await fetch('/api/exchanges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, antiFraudChecked: currentVal ? 0 : 1 }),
      });
      if (res.ok) {
        fetchExchanges();
      }
    } catch (err) {
      console.error('Failed to update anti fraud check:', err);
    }
  };

  // 刪除讓換票記錄
  const handleDeleteExchange = async (id: string) => {
    if (!confirm('確定刪除此筆交易進度嗎？')) return;
    try {
      haptics.warning();
      const res = await fetch(`/api/exchanges?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExchanges();
      }
    } catch (err) {
      console.error('Failed to delete exchange:', err);
    }
  };

  // 複製防詐對話範本
  const handleCopyAntiFraudTemplate = (title: string, text: string) => {
    haptics.light();
    navigator.clipboard.writeText(text);
    setCopiedTemplate(title);
    setTimeout(() => setCopiedTemplate(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700/80 rounded-3xl w-full max-w-4xl my-auto p-5 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh]">
        {/* 頂部 Header */}
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl p-2 rounded-2xl bg-indigo-950/70 border border-indigo-700/50 shadow-inner">
              🤝
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>社群好友圈與票根快傳</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Phase 13
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                本地資料主權 × 四級隱私好友圈 × P2P 現場近場快傳 × 讓換票防偽核驗
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-gray-800/80 hover:bg-gray-700 border border-gray-600/50 text-gray-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* 分頁 Tab 切換列 */}
        <div className="flex space-x-1.5 p-1 bg-gray-950/70 rounded-2xl border border-gray-800 mb-4 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setActiveTab('friends');
            }}
            className={`flex-1 min-w-[95px] py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'friends'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>👥</span>
            <span>好友名冊</span>
            {friends.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {friends.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setActiveTab('companions');
            }}
            className={`flex-1 min-w-[95px] py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'companions'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>👯</span>
            <span>同行夥伴</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setActiveTab('p2p');
            }}
            className={`flex-1 min-w-[105px] py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'p2p'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>📡</span>
            <span>P2P 票根快傳</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setActiveTab('exchanges');
            }}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'exchanges'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>🔄</span>
            <span>讓換票進度</span>
            {exchanges.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {exchanges.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setActiveTab('antifraud');
            }}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'antifraud'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>🛡️</span>
            <span>官方防偽核驗</span>
          </button>
        </div>

        {/* 內容區域：支援垂直平滑捲動 */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* ─────────────────── TAB 1: 好友圈名冊 ─────────────────── */}
          {activeTab === 'friends' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-800/50 p-3.5 rounded-2xl border border-gray-700/50">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>🌟 本地好友圈與摯友名冊</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    支援四級隱私權限過濾（公開、好友、摯友、僅自己），資料完全保存在單機。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setShowAddFriendForm(!showAddFriendForm);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all active:scale-95 flex items-center space-x-1"
                >
                  <span>{showAddFriendForm ? '收合表單' : '＋ 新增好友'}</span>
                </button>
              </div>

              {/* 新增好友表單 */}
              {showAddFriendForm && (
                <form
                  onSubmit={handleCreateFriend}
                  className="bg-gray-800/80 p-4 rounded-2xl border border-indigo-500/40 space-y-3 animate-in fade-in"
                >
                  <h4 className="text-xs font-bold text-indigo-300">新增好友資料</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        好友暱稱 / 本名 *
                      </label>
                      <input
                        type="text"
                        required
                        value={newFriendName}
                        onChange={(e) => setNewFriendName(e.target.value)}
                        placeholder="例如：小美、高中同好阿凱"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        頭像 Emoji 標籤
                      </label>
                      <div className="flex space-x-1.5">
                        {['🐱', '🐶', '🦊', '🌸', '🎸', '🌟', '🎧', '⚡'].map((emoji) => (
                          <button
                            type="button"
                            key={emoji}
                            onClick={() => setNewFriendAvatar(emoji)}
                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition-all ${
                              newFriendAvatar === emoji
                                ? 'bg-indigo-600/40 border-indigo-400 scale-110'
                                : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        關係層級 (隱私權限對照)
                      </label>
                      <select
                        value={newFriendTier}
                        onChange={(e) => setNewFriendTier(e.target.value as FriendRelationshipTier)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="FRIEND">一般好友 (可見「好友可見」手帳)</option>
                        <option value="CLOSE_FRIEND">
                          摯友 Close Friends (可見「摯友專屬」手帳)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        社群帳號 / 通訊方式
                      </label>
                      <input
                        type="text"
                        value={newFriendHandle}
                        onChange={(e) => setNewFriendHandle(e.target.value)}
                        placeholder="例如：@instagram_id 或 LINE"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">推活備忘筆記</label>
                    <input
                      type="text"
                      value={newFriendNotes}
                      onChange={(e) => setNewFriendNotes(e.target.value)}
                      placeholder="例如：本命是主唱、常一起衝高雄巨蛋"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddFriendForm(false)}
                      className="px-3 py-1 rounded-xl bg-gray-700 text-xs text-gray-300 hover:bg-gray-600"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow"
                    >
                      確認儲存
                    </button>
                  </div>
                </form>
              )}

              {/* 好友清單 */}
              {loadingFriends ? (
                <div className="py-12 text-center text-xs text-gray-400">載入好友名冊中...</div>
              ) : friends.length === 0 ? (
                <div className="py-12 text-center bg-gray-950/40 rounded-2xl border border-dashed border-gray-800 p-6">
                  <span className="text-3xl block mb-2">👥</span>
                  <p className="text-xs text-gray-400">尚未建立好友名冊</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    點擊右上角「新增好友」記錄一起看演唱會的推友與死黨！
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {friends.map((f) => (
                    <div
                      key={f.id}
                      className="bg-gray-800/60 p-3.5 rounded-2xl border border-gray-700/60 flex items-start justify-between space-x-3 hover:border-gray-600 transition-all"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <span className="text-2xl p-2 rounded-xl bg-gray-900 border border-gray-700 shrink-0">
                          {f.friend_avatar || '👤'}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-sm font-bold text-white truncate">
                              {f.friend_name}
                            </span>
                            {f.relationship_tier === 'CLOSE_FRIEND' ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                摯友 ⭐
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                好友
                              </span>
                            )}
                          </div>

                          {f.contact_handle && (
                            <p className="text-[11px] text-indigo-400 font-mono mt-0.5 truncate">
                              {f.contact_handle}
                            </p>
                          )}

                          {f.notes && (
                            <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{f.notes}</p>
                          )}

                          <div className="mt-2 flex items-center space-x-2">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-800/50">
                              共參戰 {f.attendedCount || 0} 場
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteFriend(f.id)}
                        className="text-gray-500 hover:text-rose-400 p-1 rounded-lg hover:bg-gray-700/50 transition-colors"
                        title="移除好友"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────── TAB 2: 同行夥伴標記 ─────────────────── */}
          {activeTab === 'companions' && (
            <div className="space-y-4">
              {/* 演出場次選取列 */}
              <div className="bg-gray-800/50 p-3 rounded-2xl border border-gray-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-300">選擇演出場次：</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => handleEventChangeForCompanions(e.target.value)}
                  className="w-full sm:w-80 bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  {savedEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.date} | {ev.title} ({ev.venue})
                    </option>
                  ))}
                </select>
              </div>

              {/* 新增同行夥伴表單 */}
              <form
                onSubmit={handleCreateCompanion}
                className="bg-gray-800/60 p-4 rounded-2xl border border-pink-500/30 space-y-3"
              >
                <h4 className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  <span>＋ 標記本場次同行參戰夥伴</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {friends.length > 0 && (
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        從好友名冊快速套用
                      </label>
                      <select
                        value={selectedFriendIdForComp}
                        onChange={(e) => {
                          const fid = e.target.value;
                          setSelectedFriendIdForComp(fid);
                          const matched = friends.find((f) => f.id === fid);
                          if (matched) {
                            setNewCompName(matched.friend_name);
                          }
                        }}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500"
                      >
                        <option value="">-- 手動填寫 / 選擇好友 --</option>
                        {friends.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.friend_avatar} {f.friend_name} (
                            {f.relationship_tier === 'CLOSE_FRIEND' ? '摯友' : '好友'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">夥伴姓名 *</label>
                    <input
                      type="text"
                      required
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      placeholder="例如：阿凱、推友阿珍"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">夥伴角色類型</label>
                    <select
                      value={newCompRole}
                      onChange={(e) => setNewCompRole(e.target.value as CompanionRole)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500"
                    >
                      <option value="BESTIE">死黨 / 閨蜜 👯</option>
                      <option value="COUPLE">情侶 / 伴侶 💖</option>
                      <option value="FAN_CLUB">推友 / 同好會 🎸</option>
                      <option value="FAMILY">家人 / 親戚 👨‍👩‍👧</option>
                      <option value="OTHER">其他夥伴 👥</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      夥伴相鄰座位號 (選填)
                    </label>
                    <input
                      type="text"
                      value={newCompSeat}
                      onChange={(e) => setNewCompSeat(e.target.value)}
                      placeholder="例如：特A區 2排 13號 (隔壁)"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">同行備忘 (選填)</label>
                    <input
                      type="text"
                      value={newCompNotes}
                      onChange={(e) => setNewCompNotes(e.target.value)}
                      placeholder="例如：一起排週邊、搭同班高鐵回程"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white shadow transition-all active:scale-95"
                  >
                    標記此同行夥伴
                  </button>
                </div>
              </form>

              {/* 同行夥伴清單 */}
              {loadingCompanions ? (
                <div className="py-8 text-center text-xs text-gray-400">載入同行夥伴中...</div>
              ) : companions.length === 0 ? (
                <div className="py-8 text-center bg-gray-950/40 rounded-2xl border border-dashed border-gray-800 p-5">
                  <p className="text-xs text-gray-400">本場次尚未標記同行夥伴</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    一人參戰很熱血，與推友同行回憶更加倍！在上方新增夥伴吧！
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-300">
                    本場同行夥伴 ({companions.length} 人)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {companions.map((c) => (
                      <div
                        key={c.id}
                        className="bg-gray-800/70 p-3 rounded-2xl border border-gray-700 flex items-center justify-between space-x-2"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="text-xl p-1.5 rounded-xl bg-gray-900 border border-gray-700">
                            {c.friendAvatar || '👤'}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {c.companion_name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                {c.companion_role === 'BESTIE' && '死黨 👯'}
                                {c.companion_role === 'COUPLE' && '情侶 💖'}
                                {c.companion_role === 'FAN_CLUB' && '推友 🎸'}
                                {c.companion_role === 'FAMILY' && '家人 👨‍👩‍👧'}
                                {c.companion_role === 'OTHER' && '夥伴 👥'}
                              </span>
                            </div>
                            {c.seat_nearby && (
                              <p className="text-[11px] text-emerald-400 mt-0.5">
                                座位：{c.seat_nearby}
                              </p>
                            )}
                            {c.notes && (
                              <p className="text-[10px] text-gray-400 truncate">{c.notes}</p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCompanion(c.id)}
                          className="text-gray-500 hover:text-rose-400 p-1 rounded-lg hover:bg-gray-700/50"
                          title="移除標記"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────── TAB 3: P2P 現場近場快傳 ─────────────────── */}
          {activeTab === 'p2p' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-emerald-950/60 to-teal-950/60 p-4 rounded-2xl border border-emerald-700/40">
                <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>📡 去中心化 P2P 現場近場快傳 (P2P AirDrop Share)</span>
                </h3>
                <p className="text-xs text-emerald-200/80 mt-1">
                  散場網路塞爆也不怕！免經雲端伺服器，直接生成端對端去識別化快傳封包（自動剔除票券條碼、付款金額等隱私個資），好友掃碼即可一秒複製整筆手帳與
                  Setlist 歌單！
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 發送端 */}
                <div className="bg-gray-800/60 p-4 rounded-2xl border border-gray-700/70 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>📤 我要分享票根手帳給現場好友</span>
                  </h4>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">選擇要快傳的手帳</label>
                    <select
                      value={p2pAttendanceId}
                      onChange={(e) => {
                        setP2pAttendanceId(e.target.value);
                        setGeneratedPayload('');
                        setGeneratedPacket(null);
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- 請選擇一場手帳 --</option>
                      {savedEvents
                        .filter((e) => e.attendanceId)
                        .map((ev) => (
                          <option key={ev.attendanceId} value={ev.attendanceId}>
                            {ev.date} | {ev.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">我的暱稱</label>
                    <input
                      type="text"
                      value={p2pSenderName}
                      onChange={(e) => setP2pSenderName(e.target.value)}
                      placeholder="您的稱呼，供對方記錄為同行夥伴"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!p2pAttendanceId}
                    onClick={handleGenerateP2p}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white shadow transition-all active:scale-95"
                  >
                    ⚡ 生成現場快傳碼與密鑰
                  </button>

                  {generatedPayload && (
                    <div className="p-3 bg-gray-950/80 rounded-xl border border-emerald-500/40 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-400">
                          快傳代碼已就緒：
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            haptics.light();
                            navigator.clipboard.writeText(generatedPayload);
                            setCopiedP2p(true);
                            setTimeout(() => setCopiedP2p(false), 2000);
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-700/60 hover:bg-emerald-600 text-white font-medium transition-all"
                        >
                          {copiedP2p ? '✓ 已複製' : '📋 一鍵複製'}
                        </button>
                      </div>

                      {/* 封包資訊摘要 */}
                      {generatedPacket && (
                        <div className="text-[11px] text-gray-300 bg-gray-900/90 p-2.5 rounded-lg space-y-1">
                          <p className="font-bold text-white">{generatedPacket.event.title}</p>
                          <p className="text-gray-400">
                            📅 {generatedPacket.event.sessionDate} 📍{' '}
                            {generatedPacket.event.venueName}
                          </p>
                          {generatedPacket.setlist && (
                            <p className="text-emerald-400">
                              🎵 內含 {generatedPacket.setlist.length} 首現場曲目歌單
                            </p>
                          )}
                          <p className="text-[10px] text-gray-500">
                            🛡️ 敏感票價與付款條碼已自動剔除
                          </p>
                        </div>
                      )}

                      <textarea
                        readOnly
                        value={generatedPayload}
                        rows={3}
                        className="w-full bg-black/60 border border-gray-800 rounded-lg p-2 text-[10px] font-mono text-gray-400 select-all"
                      />
                    </div>
                  )}
                </div>

                {/* 接收端 */}
                <div className="bg-gray-800/60 p-4 rounded-2xl border border-gray-700/70 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>📥 我要接收現場好友快傳</span>
                  </h4>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      貼上好友的 P2P 快傳密鑰字串
                    </label>
                    <textarea
                      rows={4}
                      value={receiveInput}
                      onChange={(e) => handleParseReceiveInput(e.target.value)}
                      placeholder="在此貼上以 stubbook-p2p:// 開頭的代碼..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {parsedPreviewPacket && (
                    <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/50 space-y-2 animate-in fade-in">
                      <div className="flex items-center space-x-2">
                        <span className="text-base">🎉</span>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate">
                            {parsedPreviewPacket.event.title}
                          </h5>
                          <p className="text-[11px] text-emerald-300">
                            來自好友：{parsedPreviewPacket.senderName}
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-300 space-y-0.5 border-t border-emerald-900/60 pt-2">
                        <p>📅 日期：{parsedPreviewPacket.event.sessionDate}</p>
                        <p>📍 場館：{parsedPreviewPacket.event.venueName}</p>
                        {parsedPreviewPacket.setlist && (
                          <p className="text-emerald-400">
                            🎵 包含 {parsedPreviewPacket.setlist.length} 首現場曲目
                          </p>
                        )}
                        {parsedPreviewPacket.sharedNotes && (
                          <p className="text-gray-400 italic">
                            「{parsedPreviewPacket.sharedNotes}」
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="checkbox"
                          id="autoMark"
                          checked={autoMarkCompanion}
                          onChange={(e) => setAutoMarkCompanion(e.target.checked)}
                          className="rounded border-gray-700 text-emerald-600 focus:ring-emerald-500"
                        />
                        <label htmlFor="autoMark" className="text-[11px] text-gray-300">
                          自動將 {parsedPreviewPacket.senderName} 標記為此場次同行夥伴
                        </label>
                      </div>

                      <button
                        type="button"
                        disabled={p2pImporting}
                        onClick={handleImportP2p}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow transition-all active:scale-95 disabled:opacity-50"
                      >
                        {p2pImporting ? '同步入庫中...' : '📥 立即複製手帳並加入同行回憶'}
                      </button>
                    </div>
                  )}

                  {p2pSuccessMessage && (
                    <div className="p-3 bg-emerald-900/40 border border-emerald-500 text-emerald-200 text-xs rounded-xl flex items-center space-x-2">
                      <span>✓</span>
                      <span>{p2pSuccessMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────── TAB 4: 讓換票進度追蹤 ─────────────────── */}
          {activeTab === 'exchanges' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-800/50 p-3.5 rounded-2xl border border-gray-700/50">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>🔄 讓換票流轉進度與安全面交追蹤</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    記錄讓換票對象、面交時間地點、票面序號與交易節點，防止黃牛與詐騙。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setShowAddExchangeForm(!showAddExchangeForm);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition-all active:scale-95"
                >
                  <span>{showAddExchangeForm ? '收合表單' : '＋ 新增讓換票記錄'}</span>
                </button>
              </div>

              {/* 新增讓換票表記表單 */}
              {showAddExchangeForm && (
                <form
                  onSubmit={handleCreateExchange}
                  className="bg-gray-800/80 p-4 rounded-2xl border border-amber-500/40 space-y-3 animate-in fade-in"
                >
                  <h4 className="text-xs font-bold text-amber-300">新增讓換票交易流程</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">交易類型</label>
                      <select
                        value={exType}
                        onChange={(e) => setExType(e.target.value as TicketExchangeType)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="TRANSFER_OUT">轉讓票券 (讓票) 🎟️</option>
                        <option value="EXCHANGE">雙向換票 (換票) 🔄</option>
                        <option value="SEEK_TICKET">向他人求票 (求票) 🔍</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">交易對象稱呼 *</label>
                      <input
                        type="text"
                        required
                        value={exTargetName}
                        onChange={(e) => setExTargetName(e.target.value)}
                        placeholder="例如：陳小姐、推友 Leo"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">來源平台</label>
                      <select
                        value={exPlatform}
                        onChange={(e) => setExPlatform(e.target.value as ExchangePlatform)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="THREADS">Threads</option>
                        <option value="FACEBOOK">Facebook 讓票社團</option>
                        <option value="PTT">PTT Drama-Ticket</option>
                        <option value="DCARD">Dcard 票券板</option>
                        <option value="OFFICIAL">官方換票系統</option>
                        <option value="OTHER">其他平台</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">聯絡方式</label>
                      <input
                        type="text"
                        value={exContactInfo}
                        onChange={(e) => setExContactInfo(e.target.value)}
                        placeholder="例如：LINE ID 或 IG"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">我方持票座位</label>
                      <input
                        type="text"
                        value={exMySeat}
                        onChange={(e) => setExMySeat(e.target.value)}
                        placeholder="例如：12/31 特A區 5排 12號"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">對方持票座位</label>
                      <input
                        type="text"
                        value={exTargetSeat}
                        onChange={(e) => setExTargetSeat(e.target.value)}
                        placeholder="例如：01/01 特B區 3排 15號"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        票價補差額 (TWD)
                      </label>
                      <input
                        type="number"
                        value={exPriceDiff}
                        onChange={(e) => setExPriceDiff(e.target.value)}
                        placeholder="例如：500 (正數表示對方補我)"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">面交地點</label>
                      <input
                        type="text"
                        value={exMeetupLoc}
                        onChange={(e) => setExMeetupLoc(e.target.value)}
                        placeholder="例如：小巨蛋 1 號出口閘門旁"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">面交時間</label>
                      <input
                        type="text"
                        value={exMeetupTime}
                        onChange={(e) => setExMeetupTime(e.target.value)}
                        placeholder="例如：12/31 16:30"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddExchangeForm(false)}
                      className="px-3 py-1 rounded-xl bg-gray-700 text-xs text-gray-300 hover:bg-gray-600"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow"
                    >
                      建立記錄
                    </button>
                  </div>
                </form>
              )}

              {/* 讓換票列表 */}
              {loadingExchanges ? (
                <div className="py-8 text-center text-xs text-gray-400">載入交易記錄中...</div>
              ) : exchanges.length === 0 ? (
                <div className="py-8 text-center bg-gray-950/40 rounded-2xl border border-dashed border-gray-800 p-5">
                  <span className="text-3xl block mb-2">🔄</span>
                  <p className="text-xs text-gray-400">目前無進行中的讓換票記錄</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    點擊右上角新增讓換票流程，追蹤面交節點與防偽檢核！
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exchanges.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-800/60 p-4 rounded-2xl border border-gray-700/80 space-y-3 hover:border-gray-600 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {item.exchange_type === 'TRANSFER_OUT' && '轉讓票券 (讓票)'}
                              {item.exchange_type === 'EXCHANGE' && '雙向換票'}
                              {item.exchange_type === 'SEEK_TICKET' && '向他人求票'}
                            </span>
                            <span className="text-sm font-bold text-white">{item.target_name}</span>
                            <span className="text-[11px] text-gray-400 bg-gray-900 px-2 py-0.5 rounded-md border border-gray-800">
                              來自 {item.platform}
                            </span>
                          </div>

                          {item.contact_info && (
                            <p className="text-xs text-amber-400 font-mono">
                              聯絡方式：{item.contact_info}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteExchange(item.id)}
                          className="text-gray-500 hover:text-rose-400 text-xs px-2 py-1 rounded-lg hover:bg-gray-700"
                        >
                          ✕ 刪除
                        </button>
                      </div>

                      {/* 座位與金額資訊 */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-900/70 p-2.5 rounded-xl text-xs">
                        <div>
                          <span className="text-gray-400 block text-[10px]">我方持票：</span>
                          <span className="text-white font-medium">{item.my_seat || '未提供'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">對方持票：</span>
                          <span className="text-white font-medium">
                            {item.target_seat || '未提供'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">差額：</span>
                          <span className="text-emerald-400 font-bold">
                            {item.price_difference > 0
                              ? `+ $${item.price_difference}`
                              : item.price_difference < 0
                                ? `- $${Math.abs(item.price_difference)}`
                                : '$0 (平轉/原價換)'}
                          </span>
                        </div>
                      </div>

                      {/* 面交資訊與防偽核驗 */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="text-gray-400 space-x-3">
                          {item.meetup_location && <span>📍 面交：{item.meetup_location}</span>}
                          {item.meetup_time && <span>🕒 時間：{item.meetup_time}</span>}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleAntiFraudOnExchange(item.id, item.anti_fraud_checked)
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center space-x-1 ${
                            item.anti_fraud_checked
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500'
                              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
                          }`}
                        >
                          <span>
                            {item.anti_fraud_checked ? '✓ 已完成防偽檢核' : '○ 尚未進行防偽檢核'}
                          </span>
                        </button>
                      </div>

                      {/* 交易狀態進度流轉按鈕 */}
                      <div className="border-t border-gray-800 pt-2.5 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">當前交易節點：</span>
                        <div className="flex space-x-1 overflow-x-auto">
                          {[
                            { key: 'INITIATED', label: '洽談中' },
                            { key: 'PAID_DEPOSIT', label: '已付訂金' },
                            { key: 'IN_PERSON_MEETUP', label: '面交驗票' },
                            { key: 'TICKET_RECEIVED', label: '已取票' },
                            { key: 'COMPLETED', label: '已完成' },
                          ].map((st) => (
                            <button
                              type="button"
                              key={st.key}
                              onClick={() =>
                                handleUpdateExchangeStatus(item.id, st.key as TicketExchangeStatus)
                              }
                              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                                item.status === st.key
                                  ? 'bg-amber-500 text-black font-bold shadow'
                                  : 'bg-gray-900 text-gray-400 hover:text-gray-200'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────── TAB 5: 官方真偽防偽核驗助手 ─────────────────── */}
          {activeTab === 'antifraud' && (
            <div className="space-y-4">
              <div className="bg-blue-950/40 p-4 rounded-2xl border border-blue-700/40">
                <h3 className="text-sm font-bold text-blue-300 flex items-center gap-1.5">
                  <span>🛡️ 售票系統官方防偽特徵對照與現場檢驗指南</span>
                </h3>
                <p className="text-xs text-blue-200/80 mt-1">
                  現場面交驗票是防詐最後防線！切勿輕信靜態截圖，請務必透過官方 App
                  或實體防偽線逐項比對。
                </p>
              </div>

              {/* 售票平台選取列 */}
              <div className="flex space-x-2 overflow-x-auto no-scrollbar">
                {(
                  Object.keys(OFFICIAL_ANTI_FRAUD_DATA) as Array<
                    keyof typeof OFFICIAL_ANTI_FRAUD_DATA
                  >
                ).map((key) => {
                  const plat = OFFICIAL_ANTI_FRAUD_DATA[key];
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => {
                        haptics.selection();
                        setSelectedPlatformKey(key);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        selectedPlatformKey === key
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow'
                          : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {plat.name}
                    </button>
                  );
                })}
              </div>

              {/* 特徵說明卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OFFICIAL_ANTI_FRAUD_DATA[selectedPlatformKey].features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-800/60 p-3.5 rounded-2xl border border-gray-700 space-y-1.5"
                  >
                    <h5 className="text-xs font-bold text-white flex items-center gap-1">
                      <span className="text-cyan-400 font-mono">0{idx + 1}.</span>
                      <span>{feat.title}</span>
                    </h5>
                    <p className="text-xs text-gray-300 leading-relaxed">{feat.desc}</p>
                  </div>
                ))}
              </div>

              {/* 面交防偽 Checklist */}
              <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>✅ 現場面交防偽檢核清單 (Checklist)</span>
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                    已核驗 {Object.values(antiFraudChecklist).filter(Boolean).length} / 5
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      key: 'id_match',
                      label: '核對身分證／健保卡：購票姓名與持票人證件完全相符 (實名制場次必查)',
                    },
                    {
                      key: 'print_clear',
                      label: '票面印刷品質：字體清晰銳利、油墨無重影抹黑、無塗改痕跡',
                    },
                    {
                      key: 'hologram_valid',
                      label: '官方防偽線折射：立體燙銀線呈現全像彩虹折射光，非一般貼紙',
                    },
                    {
                      key: 'app_live_qr',
                      label: '電子票驗證：要求對方現場開啟官方 App 出示動態旋轉光環（拒絕截圖）',
                    },
                    {
                      key: 'no_advance_deposit',
                      label: '堅持現場票券核驗無誤後再行轉帳付款，切勿事前預付全額訂金',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className={`flex items-start space-x-2.5 p-2 rounded-xl cursor-pointer transition-all border ${
                        antiFraudChecklist[item.key]
                          ? 'bg-emerald-950/30 border-emerald-600/50 text-emerald-200'
                          : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:border-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={antiFraudChecklist[item.key]}
                        onChange={(e) => {
                          haptics.selection();
                          setAntiFraudChecklist((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked,
                          }));
                        }}
                        className="mt-0.5 rounded border-gray-700 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs leading-tight">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 防詐對話範本一鍵複製 */}
              <div className="bg-gray-800/60 p-4 rounded-2xl border border-gray-700 space-y-3">
                <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <span>💬 安全讓換票對話範本 (一鍵複製防詐切結)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">買方確認與面交約定</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyAntiFraudTemplate(
                            '買方確認',
                            '您好，我有意收購/交換您的票券。為保障雙方權益並防範票務糾紛，我希望能約在捷運站閘門或人潮充足之公共場所面交，現場核對票面防偽特徵並出示官方 App 動態畫面後，再行現場轉帳或交付現金，請問方便配合嗎？感謝！'
                          )
                        }
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                      >
                        {copiedTemplate === '買方確認' ? '✓ 已複製' : '複製文案'}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-3">
                      「您好，我有意收購/交換您的票券。為保障雙方權益並防範票務糾紛，我希望能約在捷運站閘門或人潮充足之公共場所面交...」
                    </p>
                  </div>

                  <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">賣方原價讓票與防黃牛切結</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyAntiFraudTemplate(
                            '賣方切結',
                            '您好，本票券為官方原價讓售，絕無加價販售，可配合面交現場查驗官方購買證明與票面序號。請勿將取票序號轉傳第三人，面交當日現場驗收無誤後再付款即可，謝謝！'
                          )
                        }
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                      >
                        {copiedTemplate === '賣方切結' ? '✓ 已複製' : '複製文案'}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-3">
                      「您好，本票券為官方原價讓售，絕無加價販售，可配合面交現場查驗官方購買證明與票面序號...」
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部關閉按鈕 */}
        <div className="border-t border-gray-800/80 pt-3 mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className="px-5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 shadow transition-all active:scale-95"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
}
