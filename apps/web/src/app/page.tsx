'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Star,
  BookOpen,
  Sparkles,
  Edit3,
  Trash2,
  DollarSign,
  X,
  Layers,
  Image as ImageIcon,
  ShieldCheck,
  ShoppingBag,
  Camera,
  WifiOff,
  Share2,
  Eye,
  ListMusic,
  BarChart3,
  Clock,
  Flame,
  HardDrive,
  ArrowRightLeft,
  ThumbsUp,
  Lightbulb,
} from 'lucide-react';
import type { ScrapedEvent } from '@stubbook/scraper-core';
import { TicketMaskModal } from '../components/TicketMaskModal';
import { TicketStubModal } from '../components/TicketStubModal';
import { MerchManagerModal } from '../components/MerchManagerModal';
import { MediaGalleryModal } from '../components/MediaGalleryModal';
import { LiveEventHeroCard } from '../components/LiveEventHeroCard';
import { LiveConcertModeModal } from '../components/LiveConcertModeModal';
import { SeatViewModal } from '../components/SeatViewModal';
import { SetlistModal } from '../components/SetlistModal';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { CalendarDashboard } from '../components/CalendarDashboard';
import { AddToCalendarMenu } from '../components/AddToCalendarMenu';
import { BackupRestoreDashboard } from '../components/BackupRestoreDashboard';
import TourFootprintMap from '../components/TourFootprintMap';
import LiveCountdownCard from '../components/LiveCountdownCard';
import FestivalTimetableModal from '../components/FestivalTimetableModal';
import WishlistModal from '../components/WishlistModal';
import { PassionHeatmapDashboard } from '../components/PassionHeatmapDashboard';
import { AestheticCardGeneratorModal } from '../components/AestheticCardGeneratorModal';
import { SocialConnectModal } from '../components/SocialConnectModal';
import { haptics } from '../utils/haptics';

type TabMode = 'scrape' | 'journal' | 'calendar' | 'seats' | 'analytics' | 'backup';

interface SessionAttendance {
  id: string;
  status:
    | 'WANT_TO_GO'
    | 'TICKETING'
    | 'CONFIRMED'
    | 'ATTENDED'
    | 'MISSED'
    | 'PURCHASED'
    | 'WAITING_TO_BUY'
    | 'LOTTERY_ENTERED'
    | 'TRANSFERRING'
    | 'ABANDONED';
  seatInfo: string | null;
  ticketType: 'PHYSICAL' | 'DIGITAL' | 'WRISTBAND' | 'OTHER';
  ticketPrice: number | null;
  currency: string;
  rating: number | null;
  ratingSound?: number | null;
  ratingSight?: number | null;
  ratingAtmosphere?: number | null;
  ratingPerformance?: number | null;
  pros?: string | null;
  cons?: string | null;
  tips?: string | null;
  queueTimeMinutes?: number | null;
  transferNotes?: string | null;
  notes: string | null;
  ticketStubUrl?: string | null;
  stubPrivacyMasked?: boolean;
  merchCount?: number;
  merchTotalCost?: number;
  mediaCount?: number;
}

interface SavedSession {
  id: string;
  sessionTitle: string | null;
  sessionDate: string;
  doorsOpenTime: string | null;
  ticketSaleTime: string | null;
  ticketPlatform: string;
  ticketTiers: Array<{ name: string; price: number; status?: string }>;
  bookingUrl: string | null;
  venueName: string | null;
  attendance: SessionAttendance | null;
}

interface SavedEvent {
  id: string;
  title: string;
  tourName: string | null;
  platform: string;
  sourceUrl: string;
  posterUrl: string | null;
  description: string | null;
  organizer: string | null;
  createdAt: string;
  sessions: SavedSession[];
  sessionsCount: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; badgeBg: string; border: string }
> = {
  WANT_TO_GO: {
    label: '想去 / 觀望中',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-950/70 text-amber-300',
    border: 'border-amber-800/60',
  },
  WAITING_TO_BUY: {
    label: '待搶票 / 備戰中',
    color: 'text-orange-400',
    badgeBg: 'bg-orange-950/70 text-orange-300',
    border: 'border-orange-800/60',
  },
  LOTTERY_ENTERED: {
    label: '抽選登記中',
    color: 'text-pink-400',
    badgeBg: 'bg-pink-950/70 text-pink-300',
    border: 'border-pink-800/60',
  },
  TICKETING: {
    label: '搶票中',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-950/70 text-blue-300',
    border: 'border-blue-800/60',
  },
  PURCHASED: {
    label: '已購票 / 已付款',
    color: 'text-teal-400',
    badgeBg: 'bg-teal-950/70 text-teal-300',
    border: 'border-teal-800/60',
  },
  CONFIRMED: {
    label: '確定參戰',
    color: 'text-indigo-400',
    badgeBg: 'bg-indigo-950/70 text-indigo-300',
    border: 'border-indigo-800/60',
  },
  TRANSFERRING: {
    label: '讓票 / 換票中',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-950/70 text-purple-300',
    border: 'border-purple-800/60',
  },
  ABANDONED: {
    label: '未中籤 / 已放棄',
    color: 'text-gray-400',
    badgeBg: 'bg-gray-850 text-gray-400',
    border: 'border-gray-700',
  },
  ATTENDED: {
    label: '已參戰',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/70 text-emerald-300',
    border: 'border-emerald-800/60',
  },
  MISSED: {
    label: '未前往',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-950/70 text-rose-300',
    border: 'border-rose-800/60',
  },
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabMode>('scrape');

  // 解析與入庫狀態
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<ScrapedEvent | null>(null);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState<{ message: string; eventId: string } | null>(null);

  // 手帳列表狀態
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<SavedEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [eventsVersion, setEventsVersion] = useState(0);

  // 參戰記錄彈窗狀態
  const [editingSession, setEditingSession] = useState<{
    event: SavedEvent;
    session: SavedSession;
  } | null>(null);
  const [attendanceForm, setAttendanceForm] = useState<{
    status:
      | 'WANT_TO_GO'
      | 'TICKETING'
      | 'CONFIRMED'
      | 'ATTENDED'
      | 'MISSED'
      | 'PURCHASED'
      | 'WAITING_TO_BUY'
      | 'LOTTERY_ENTERED'
      | 'TRANSFERRING'
      | 'ABANDONED';
    seatInfo: string;
    ticketType: 'PHYSICAL' | 'DIGITAL' | 'WRISTBAND' | 'OTHER';
    ticketPrice: string;
    rating: number;
    ratingSound: number;
    ratingSight: number;
    ratingAtmosphere: number;
    ratingPerformance: number;
    pros: string;
    cons: string;
    tips: string;
    queueTimeMinutes: string;
    transferNotes: string;
    notes: string;
    ticketStubUrl: string | null;
    stubPrivacyMasked: boolean;
  }>({
    status: 'CONFIRMED',
    seatInfo: '',
    ticketType: 'DIGITAL',
    ticketPrice: '',
    rating: 5,
    ratingSound: 5,
    ratingSight: 5,
    ratingAtmosphere: 5,
    ratingPerformance: 5,
    pros: '',
    cons: '',
    tips: '',
    queueTimeMinutes: '',
    transferNotes: '',
    notes: '',
    ticketStubUrl: null,
    stubPrivacyMasked: false,
  });
  const [savingAttendance, setSavingAttendance] = useState(false);

  // 票根遮罩與擬真票券狀態
  const [maskModalOpen, setMaskModalOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [uploadingStub, setUploadingStub] = useState(false);
  const [viewingStubSession, setViewingStubSession] = useState<{
    event: SavedEvent;
    session: SavedSession;
  } | null>(null);
  const [viewingMerchSession, setViewingMerchSession] = useState<{
    attendanceId: string;
    eventTitle: string;
  } | null>(null);
  const [viewingMediaSession, setViewingMediaSession] = useState<{
    attendanceId: string;
    eventTitle: string;
    sessionDate?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 視角資料庫 Modal 狀態
  const [seatViewModal, setSeatViewModal] = useState<{
    isOpen: boolean;
    venue?: string | null;
    section?: string | null;
    row?: string | null;
    eventTitle?: string | null;
    sessionId?: string | null;
    attendanceId?: string | null;
  }>({
    isOpen: false,
  });

  const handleOpenSeatViews = (
    venueName?: string,
    seatInfo?: string,
    eventTitle?: string,
    sessionId?: string,
    attendanceId?: string
  ) => {
    let parsedSection: string | null = null;
    let parsedRow: string | null = null;
    if (seatInfo) {
      const parts = seatInfo.trim().split(/\s+/);
      if (parts.length > 0) parsedSection = parts[0];
      if (parts.length > 1) parsedRow = parts.slice(1).join(' ');
    }
    setSeatViewModal({
      isOpen: true,
      venue: venueName || null,
      section: parsedSection,
      row: parsedRow,
      eventTitle: eventTitle || null,
      sessionId: sessionId || null,
      attendanceId: attendanceId || null,
    });
  };

  // 現場歌單 Modal 狀態
  const [viewingSetlistSession, setViewingSetlistSession] = useState<{
    sessionId: string;
    eventTitle: string;
    artistName?: string;
    venueName?: string | null;
    sessionDate?: string;
  } | null>(null);

  // 現場沉浸模式 Modal 狀態
  const [concertModeSession, setConcertModeSession] = useState<{
    event: SavedEvent;
    session: SavedSession;
  } | null>(null);

  // Phase 11 新增模組 Modal 狀態
  const [footprintModalOpen, setFootprintModalOpen] = useState(false);
  const [festivalModalOpen, setFestivalModalOpen] = useState(false);
  const [wishlistModalOpen, setWishlistModalOpen] = useState(false);

  // Phase 12 新增模組 Modal 狀態
  const [passionModalOpen, setPassionModalOpen] = useState(false);
  const [cardGeneratorModalOpen, setCardGeneratorModalOpen] = useState(false);

  // Phase 13 新增模組 Modal 狀態
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [socialModalTab, setSocialModalTab] = useState<
    'friends' | 'companions' | 'p2p' | 'exchanges' | 'antifraud'
  >('friends');

  // 日誌抽屜狀態
  const [showLogs, setShowLogs] = useState(false);
  const [logSnippet, setLogSnippet] = useState<string>('');
  const [copiedLog, setCopiedLog] = useState(false);

  // 載入已存活動
  const loadSavedEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch(`/api/events?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.events) {
        setSavedEvents(data.events);
        setEventsVersion((v) => v + 1);
      }
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // 離線票夾模式與 Web Share Target 接收提示狀態
  const [isOffline, setIsOffline] = useState(false);
  const [shareTargetNotice, setShareTargetNotice] = useState<string | null>(null);

  // 離線狀態偵測 (Offline Wallet Mode)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      haptics.warning();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Web Share Target API: 接收手機瀏覽器或原生分享送入之售票網址
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sharedParam = params.get('url') || params.get('text');

    if (sharedParam) {
      const match = sharedParam.match(/https?:\/\/[^\s]+/);
      const targetUrl = match ? match[0] : sharedParam;

      if (targetUrl.includes('kktix.cc') || targetUrl.includes('tixcraft.com')) {
        setUrl(targetUrl);
        setActiveTab('scrape');
        setShareTargetNotice(`已由系統分享接收售票網址: ${targetUrl}`);
        haptics.medium();
        window.history.replaceState({}, '', window.location.pathname);
        handleScrape(targetUrl);
      }
    }
  }, []);

  useEffect(() => {
    loadSavedEvents();
  }, []);

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

      // 重新載入已存活動
      loadSavedEvents();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/events?id=${deletingEvent.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '刪除活動失敗');
      }
      haptics.success();
      setDeletingEvent(null);
      await loadSavedEvents();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const openAttendanceModal = (ev: SavedEvent, session: SavedSession) => {
    setEditingSession({ event: ev, session });
    if (session.attendance) {
      setAttendanceForm({
        status: session.attendance.status,
        seatInfo: session.attendance.seatInfo || '',
        ticketType: session.attendance.ticketType || 'DIGITAL',
        ticketPrice:
          session.attendance.ticketPrice !== null ? String(session.attendance.ticketPrice) : '',
        rating: session.attendance.rating || 5,
        ratingSound: session.attendance.ratingSound || 5,
        ratingSight: session.attendance.ratingSight || 5,
        ratingAtmosphere: session.attendance.ratingAtmosphere || 5,
        ratingPerformance: session.attendance.ratingPerformance || 5,
        pros: session.attendance.pros || '',
        cons: session.attendance.cons || '',
        tips: session.attendance.tips || '',
        queueTimeMinutes:
          session.attendance.queueTimeMinutes !== null &&
          session.attendance.queueTimeMinutes !== undefined
            ? String(session.attendance.queueTimeMinutes)
            : '',
        transferNotes: session.attendance.transferNotes || '',
        notes: session.attendance.notes || '',
        ticketStubUrl: session.attendance.ticketStubUrl || null,
        stubPrivacyMasked: Boolean(session.attendance.stubPrivacyMasked),
      });
    } else {
      setAttendanceForm({
        status: 'CONFIRMED',
        seatInfo: '',
        ticketType: 'DIGITAL',
        ticketPrice: '',
        rating: 5,
        ratingSound: 5,
        ratingSight: 5,
        ratingAtmosphere: 5,
        ratingPerformance: 5,
        pros: '',
        cons: '',
        tips: '',
        queueTimeMinutes: '',
        transferNotes: '',
        notes: '',
        ticketStubUrl: null,
        stubPrivacyMasked: false,
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setTempImageSrc(reader.result as string);
      setMaskModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyMask = async (maskedBlob: Blob, isMasked: boolean) => {
    setUploadingStub(true);
    try {
      const formData = new FormData();
      formData.append('file', maskedBlob, 'ticket_stub.jpg');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '上傳失敗');
      }

      setAttendanceForm((prev) => ({
        ...prev,
        ticketStubUrl: data.url,
        stubPrivacyMasked: isMasked,
      }));
      haptics.success();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploadingStub(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!editingSession) return;

    setSavingAttendance(true);
    try {
      const res = await fetch('/api/attendances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: editingSession.session.id,
          status: attendanceForm.status,
          seatInfo: attendanceForm.seatInfo.trim() || null,
          ticketType: attendanceForm.ticketType,
          ticketPrice: attendanceForm.ticketPrice ? Number(attendanceForm.ticketPrice) : null,
          currency: 'TWD',
          rating: attendanceForm.rating,
          ratingSound: attendanceForm.ratingSound,
          ratingSight: attendanceForm.ratingSight,
          ratingAtmosphere: attendanceForm.ratingAtmosphere,
          ratingPerformance: attendanceForm.ratingPerformance,
          pros: attendanceForm.pros.trim() || null,
          cons: attendanceForm.cons.trim() || null,
          tips: attendanceForm.tips.trim() || null,
          queueTimeMinutes: attendanceForm.queueTimeMinutes
            ? Number(attendanceForm.queueTimeMinutes)
            : null,
          transferNotes: attendanceForm.transferNotes.trim() || null,
          notes: attendanceForm.notes.trim() || null,
          ticketStubUrl: attendanceForm.ticketStubUrl || null,
          stubPrivacyMasked: attendanceForm.stubPrivacyMasked ? 1 : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '儲存參戰記錄失敗');
      }

      setEditingSession(null);
      await loadSavedEvents();
      haptics.success();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleDeleteAttendance = async () => {
    if (!editingSession || !editingSession.session.attendance) return;
    if (!confirm('確定要刪除這筆參戰手帳記錄嗎？')) return;

    setSavingAttendance(true);
    try {
      const res = await fetch(`/api/attendances?id=${editingSession.session.attendance.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '刪除失敗');
      }

      setEditingSession(null);
      await loadSavedEvents();
      haptics.warning();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingAttendance(false);
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
    haptics.light();
    setTimeout(() => setCopiedLog(false), 2000);
  };

  // 統計數據計算
  const totalEventsCount = savedEvents.length;
  let attendedCount = 0;
  let confirmedCount = 0;
  let wantToGoCount = 0;
  let totalSpent = 0;

  for (const ev of savedEvents) {
    for (const s of ev.sessions) {
      if (s.attendance) {
        if (s.attendance.status === 'ATTENDED') attendedCount++;
        if (s.attendance.status === 'CONFIRMED') confirmedCount++;
        if (s.attendance.status === 'WANT_TO_GO') wantToGoCount++;
        if (s.attendance.ticketPrice) totalSpent += Number(s.attendance.ticketPrice);
      }
    }
  }

  // 找出即將舉行或今日舉行的「現場模式」場次 (Live Event Mode)
  const activeLiveSession = (() => {
    const list: Array<{ event: SavedEvent; session: SavedSession; diffMs: number }> = [];
    const now = Date.now();

    for (const ev of savedEvents) {
      for (const s of ev.sessions) {
        if (s.attendance && ['CONFIRMED', 'ATTENDED', 'TICKETING'].includes(s.attendance.status)) {
          const sessionTime = new Date(s.sessionDate).getTime();
          const diff = sessionTime - now;
          list.push({ event: ev, session: s, diffMs: diff });
        }
      }
    }

    if (list.length === 0) return null;

    list.sort((a, b) => {
      const aIsNear = a.diffMs > -14400000 && a.diffMs < 86400000;
      const bIsNear = b.diffMs > -14400000 && b.diffMs < 86400000;
      if (aIsNear && !bIsNear) return -1;
      if (!aIsNear && bIsNear) return 1;

      if (a.diffMs >= 0 && b.diffMs >= 0) return a.diffMs - b.diffMs;
      if (a.diffMs >= 0 && b.diffMs < 0) return -1;
      if (a.diffMs < 0 && b.diffMs >= 0) return 1;
      return b.diffMs - a.diffMs;
    });

    return list[0];
  })();

  return (
    <div className="space-y-8 pb-12">
      {/* 現場離線票夾模式 (Offline Wallet) 橫幅提示 */}
      {isOffline && (
        <div className="p-3.5 bg-amber-950/70 border border-amber-500/40 rounded-2xl flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center space-x-3">
            <WifiOff className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                <span>現場離線票夾模式已啟動</span>
                <span className="text-[10px] bg-amber-900 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                  OFFLINE
                </span>
              </div>
              <div className="text-[11px] text-amber-300/80 mt-0.5">
                現場 4G/5G 網路壅塞或無連線中。已由本機 Service Worker
                載入快取票夾，您依然能出示擬真票根、排號與座位資訊。
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('journal');
              haptics.light();
            }}
            className="text-xs font-bold px-3 py-1.5 bg-amber-900/60 hover:bg-amber-850 text-amber-200 border border-amber-600/50 rounded-lg transition"
          >
            開啟離線手帳
          </button>
        </div>
      )}

      {/* Web Share Target 系統分享網址提示 */}
      {shareTargetNotice && (
        <div className="p-3 bg-indigo-950/80 border border-indigo-500/50 rounded-2xl flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <Share2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />
            <span className="text-xs text-indigo-200">{shareTargetNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setShareTargetNotice(null)}
            className="text-xs text-indigo-400 hover:text-indigo-200 px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* 秒級精密動態倒數卡 (Tickemo 標竿 / Live Activities) */}
      <div className="max-w-5xl mx-auto px-2">
        <LiveCountdownCard
          onOpenLiveMode={() => {
            if (activeLiveSession) {
              setConcertModeSession({
                event: activeLiveSession.event,
                session: activeLiveSession.session,
              });
            } else if (savedEvents.length > 0 && savedEvents[0].sessions.length > 0) {
              setConcertModeSession({
                event: savedEvents[0],
                session: savedEvents[0].sessions[0],
              });
            }
          }}
          onOpenSeatView={(venueName) => handleOpenSeatViews(venueName)}
          onOpenWishlist={() => setWishlistModalOpen(true)}
        />
      </div>

      {/* 頂部功能頁籤導覽 */}
      <div className="w-full max-w-full overflow-x-auto scrollbar-none py-1 px-2 flex justify-start sm:justify-center">
        <div className="inline-flex bg-gray-900 border border-gray-800 p-1 rounded-2xl shadow-lg shrink-0 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('scrape');
              haptics.light();
            }}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'scrape'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>售票活動解析入庫</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('journal');
              loadSavedEvents();
              haptics.light();
            }}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'journal'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>我的參戰手帳</span>
            {totalEventsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700/60 rounded-full font-mono">
                {totalEventsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('calendar');
              setEventsVersion((v) => v + 1);
              haptics.light();
            }}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>手帳行事曆</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('seats');
              haptics.light();
            }}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'seats'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>視角資料庫</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('analytics');
              haptics.light();
            }}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>數據回顧 & Wrapped</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('backup');
              haptics.light();
            }}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'backup'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <HardDrive className="h-4 w-4" />
            <span>備份與還原</span>
          </button>
        </div>
      </div>

      {/* Phase 11 快捷工具入口列 (巡迴地圖 / 音樂祭排程 / 朝聖心願池) */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto px-2">
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setFootprintModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-950/80 to-purple-950/80 hover:from-indigo-900/80 hover:to-purple-900/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold shadow transition-all active:scale-95"
        >
          <span>🗺️</span>
          <span>巡迴足跡地圖</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setFestivalModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-950/80 to-teal-950/80 hover:from-cyan-900/80 hover:to-teal-900/80 border border-cyan-700/50 text-cyan-300 text-xs font-semibold shadow transition-all active:scale-95"
        >
          <span>🎪</span>
          <span>音樂祭 Timetable 排程</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setWishlistModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-950/80 to-orange-950/80 hover:from-amber-900/80 hover:to-orange-900/80 border border-amber-700/50 text-amber-300 text-xs font-semibold shadow transition-all active:scale-95"
        >
          <span>✨</span>
          <span>朝聖心願池</span>
        </button>

        {/* Phase 12: 熱量大數據 & 潮流社群卡 */}
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setPassionModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-950/80 to-orange-950/80 hover:from-rose-900/80 hover:to-orange-900/80 border border-rose-700/50 text-rose-300 text-xs font-semibold shadow transition-all active:scale-95"
        >
          <span>🔥</span>
          <span>推活熱量大數據</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setCardGeneratorModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-950/80 to-fuchsia-950/80 hover:from-pink-900/80 hover:to-fuchsia-900/80 border border-pink-700/50 text-pink-300 text-xs font-semibold shadow transition-all active:scale-95"
        >
          <span>🧾</span>
          <span>潮流社群卡工廠</span>
        </button>

        {/* Phase 13: 好友圈 & P2P 票根快傳 & 讓換票防偽 */}
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setSocialModalTab('friends');
            setSocialModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-950/80 to-purple-950/80 hover:from-indigo-900/80 hover:to-purple-900/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold shadow transition-all active:scale-95"
        >
          <span>🤝</span>
          <span>好友圈 & P2P 快傳</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setSocialModalTab('antifraud');
            setSocialModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-950/80 to-cyan-950/80 hover:from-blue-900/80 hover:to-cyan-900/80 border border-blue-700/50 text-cyan-300 text-xs font-semibold shadow transition-all active:scale-95"
        >
          <span>🛡️</span>
          <span>讓換票防偽核驗</span>
        </button>
      </div>

      {/* ─────────────────── TAB 1: 售票活動解析入庫 ─────────────────── */}
      {activeTab === 'scrape' && (
        <div className="space-y-8 animate-fadeIn">
          {/* 標題與引言 */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              演唱會資訊解析與典藏
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              貼上全台主流售票平台網址（KKTIX / 拓元售票 / ibon / 全網購票網 / 寬宏售票 /
              INDIEVOX），自動解析多場次時間、場館與票價階梯，一鍵存入本地 SQLite 資料庫。
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
                  placeholder="貼入售票活動網址 (KKTIX, 拓元, ibon, FamiTicket, 寬宏, INDIEVOX...)"
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
                className="bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-amber-300 border border-amber-900/50 transition-colors"
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
                className="bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-rose-300 border border-rose-900/50 transition-colors"
              >
                🏟️ [拓元] 2026 周杰倫大巨蛋 (3場)
              </button>
              <button
                type="button"
                onClick={() => {
                  const u = 'https://ticket.ibon.com.tw/ActivityInfo/Details.aspx?id=38120';
                  setUrl(u);
                  handleScrape(u);
                }}
                className="bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-emerald-300 border border-emerald-900/50 transition-colors"
              >
                🏪 [ibon] 2026 五月天世運 (2場)
              </button>
              <button
                type="button"
                onClick={() => {
                  const u = 'https://www.famiticket.com.tw/Home/Activity/Info/2026_JOLIN';
                  setUrl(u);
                  handleScrape(u);
                }}
                className="bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sky-300 border border-sky-900/50 transition-colors"
              >
                🏪 [全網] 2026 蔡依林小巨蛋 (2場)
              </button>
              <button
                type="button"
                onClick={() => {
                  const u =
                    'https://kham.com.tw/application/UTK02/UTK0201_00.aspx?PRODUCT_ID=M0KHAM26';
                  setUrl(u);
                  handleScrape(u);
                }}
                className="bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-purple-300 border border-purple-900/50 transition-colors"
              >
                🎭 [寬宏] 音樂劇《鐘樓怪人》 (3場)
              </button>
              <button
                type="button"
                onClick={() => {
                  const u = 'https://www.indievox.com/activity/detail/26_NO_PARTY';
                  setUrl(u);
                  handleScrape(u);
                }}
                className="bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-fuchsia-300 border border-fuchsia-900/50 transition-colors"
              >
                🎸 [INDIEVOX] 草東沒有派對 Legacy
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
                  <p className="text-xs text-emerald-400/80">
                    系統識別碼 ID: {saveSuccess.eventId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('journal')}
                className="inline-flex items-center text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg transition-colors shadow"
              >
                前往手帳查看
                <BookOpen className="h-3.5 w-3.5 ml-1.5" />
              </button>
            </div>
          )}

          {/* 活動卡片預覽區塊 */}
          {event && (
            <div className="max-w-3xl mx-auto bg-gray-900/95 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              {/* 海報與主視覺頭部 */}
              <div className="relative bg-gradient-to-t from-gray-950 to-transparent p-6 pb-4 sm:p-8 sm:pb-6 flex flex-col sm:flex-row gap-6 items-start">
                {event.posterUrl && (
                  <div className="w-full sm:w-48 h-56 sm:h-64 rounded-xl overflow-hidden shadow-lg border border-gray-700/60 flex-shrink-0 bg-gray-950 flex items-center justify-center relative group">
                    <img
                      src={event.posterUrl}
                      alt={event.title}
                      className="w-full h-full object-contain"
                    />
                    <a
                      href={event.posterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold gap-1 backdrop-blur-[2px]"
                      title="在新分頁檢視海報原圖"
                    >
                      <Eye className="w-5 h-5 text-indigo-300" />
                      <span>查看大圖</span>
                    </a>
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                        event.platform === 'KKTIX'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          : event.platform === 'TIXCRAFT'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                            : event.platform === 'IBON'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                              : event.platform === 'FAMITICKET'
                                ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                                : event.platform === 'KHAM'
                                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                                  : event.platform === 'INDIEVOX'
                                    ? 'bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-800/60'
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
                    <p className="text-xs sm:text-sm text-gray-300 line-clamp-2">
                      {event.description}
                    </p>
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
                  {/* 日期、開賣時程與場館 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-950/70 p-4 rounded-xl border border-gray-800/80">
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-400 font-medium">演出時間</div>
                        <div className="text-sm font-semibold text-white">
                          {new Date(
                            event.sessions[selectedSessionIndex].sessionDate
                          ).toLocaleString('zh-TW', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="mt-2">
                          <AddToCalendarMenu
                            item={{
                              id: `preview_${selectedSessionIndex}`,
                              title: event.title,
                              subTitle: event.sessions[selectedSessionIndex].sessionTitle,
                              itemType: 'SHOW',
                              startDate: event.sessions[selectedSessionIndex].sessionDate,
                              venueName: event.sessions[selectedSessionIndex].venueName,
                              bookingUrl:
                                event.sessions[selectedSessionIndex].bookingUrl || event.sourceUrl,
                              platform:
                                event.sessions[selectedSessionIndex].ticketPlatform ||
                                event.platform,
                            }}
                            compact
                            align="left"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-rose-300 font-medium flex items-center gap-1.5 flex-wrap">
                          <span>開賣時間</span>
                          {(event.salePhases?.[0]?.phaseName ||
                            event.sessions[selectedSessionIndex].ticketSaleTime) && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800 font-bold truncate max-w-[120px]">
                              {event.salePhases?.[0]?.phaseName || '公開啟售'}
                            </span>
                          )}
                        </div>
                        {event.salePhases?.[0]?.saleStart ||
                        event.sessions[selectedSessionIndex].ticketSaleTime ? (
                          <>
                            <div className="text-sm font-semibold text-white">
                              {new Date(
                                event.salePhases?.[0]?.saleStart ||
                                  event.sessions[selectedSessionIndex].ticketSaleTime!
                              ).toLocaleString('zh-TW', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="mt-2">
                              <AddToCalendarMenu
                                item={{
                                  id: `sale_preview_${selectedSessionIndex}`,
                                  title: `${event.title} - ${event.salePhases?.[0]?.phaseName || '開賣購票'}`,
                                  subTitle: event.salePhases?.[0]?.phaseName || '開賣搶票日程',
                                  itemType:
                                    event.salePhases?.[0]?.saleType === 'LOTTERY'
                                      ? 'LOTTERY'
                                      : event.salePhases?.[0]?.saleType === 'RERELEASE'
                                        ? 'RERELEASE'
                                        : 'SALE',
                                  startDate:
                                    event.salePhases?.[0]?.saleStart ||
                                    event.sessions[selectedSessionIndex].ticketSaleTime!,
                                  bookingUrl:
                                    event.salePhases?.[0]?.bookingUrl ||
                                    event.sessions[selectedSessionIndex].bookingUrl ||
                                    event.sourceUrl,
                                  platform:
                                    event.salePhases?.[0]?.ticketingPlatform ||
                                    event.sessions[selectedSessionIndex].ticketPlatform ||
                                    event.platform,
                                }}
                                compact
                                align="left"
                                buttonLabel="加入搶票提醒"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-500 italic mt-1">待售票平台公佈</div>
                        )}
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

                  {/* 多階段售票時程清單 */}
                  {event.salePhases && event.salePhases.length > 1 && (
                    <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3.5 space-y-2.5">
                      <div className="text-xs font-bold text-rose-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Flame className="h-3.5 w-3.5 text-rose-400" />
                          多階段售票時程 ({event.salePhases.length} 個階段)
                        </span>
                        <span className="text-[10px] text-gray-400">依時程先後排序</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {event.salePhases.map((phase, pIdx) => (
                          <div
                            key={pIdx}
                            className="bg-gray-900/90 border border-gray-800 p-2.5 rounded-lg flex items-center justify-between text-xs gap-2"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-semibold text-gray-200 truncate">
                                {phase.phaseName}
                              </div>
                              <div className="text-[11px] text-rose-300 font-mono">
                                {new Date(phase.saleStart).toLocaleString('zh-TW', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-semibold whitespace-nowrap">
                                {phase.saleType === 'PRESALE'
                                  ? '優先預購'
                                  : phase.saleType === 'LOTTERY'
                                    ? '抽選登記'
                                    : phase.saleType === 'RERELEASE'
                                      ? '釋票清票'
                                      : '全面開賣'}
                              </span>
                              <AddToCalendarMenu
                                item={{
                                  id: `phase_${pIdx}`,
                                  title: `${event.title} - ${phase.phaseName}`,
                                  subTitle: phase.phaseName,
                                  itemType:
                                    phase.saleType === 'LOTTERY'
                                      ? 'LOTTERY'
                                      : phase.saleType === 'RERELEASE'
                                        ? 'RERELEASE'
                                        : 'SALE',
                                  startDate: phase.saleStart,
                                  bookingUrl: phase.bookingUrl || event.sourceUrl,
                                  platform: phase.ticketingPlatform || event.platform,
                                }}
                                compact
                                align="right"
                                buttonLabel="加入日曆"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                          確認入庫 (儲存至本地資料庫)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────── TAB 2: 我的參戰手帳 (JOURNAL) ─────────────────── */}
      {activeTab === 'journal' && (
        <div className="space-y-8 animate-fadeIn">
          {/* 手帳頭部與統計卡片 */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-950/80 border border-indigo-800/60 rounded-full text-indigo-300 text-xs font-semibold mb-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Phase 2 個人回憶手帳模組</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">我的演唱會手帳</h1>
            <p className="text-gray-400 text-sm sm:text-base">
              典藏參戰過的每一場音樂盛宴，標記座位視野、票券資訊與現場感動。
            </p>
          </div>

          {/* 總結數據指標卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-w-4xl mx-auto">
            <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl text-center shadow-lg">
              <div className="text-xs text-gray-400 mb-1">典藏活動</div>
              <div className="text-2xl font-black text-white">{totalEventsCount}</div>
            </div>
            <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl text-center shadow-lg">
              <div className="text-xs text-emerald-400 mb-1">已參戰場次</div>
              <div className="text-2xl font-black text-emerald-400">{attendedCount}</div>
            </div>
            <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl text-center shadow-lg">
              <div className="text-xs text-indigo-400 mb-1">確定前往</div>
              <div className="text-2xl font-black text-indigo-400">{confirmedCount}</div>
            </div>
            <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl text-center shadow-lg">
              <div className="text-xs text-amber-400 mb-1">累計門票支出</div>
              <div className="text-2xl font-black text-amber-400">
                ${totalSpent.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 今日/近期演唱會 · 現場模式 Hero Card */}
          {activeLiveSession && (
            <div className="max-w-4xl mx-auto">
              <LiveEventHeroCard
                event={activeLiveSession.event}
                session={activeLiveSession.session}
                onViewTicketStub={() =>
                  setViewingStubSession({
                    event: activeLiveSession.event,
                    session: activeLiveSession.session,
                  })
                }
                onOpenMediaGallery={() => {
                  if (activeLiveSession.session.attendance) {
                    setViewingMediaSession({
                      attendanceId: activeLiveSession.session.attendance.id,
                      eventTitle: activeLiveSession.event.title,
                      sessionDate: activeLiveSession.session.sessionDate,
                    });
                  }
                }}
                onOpenMerchManager={() => {
                  if (activeLiveSession.session.attendance) {
                    setViewingMerchSession({
                      attendanceId: activeLiveSession.session.attendance.id,
                      eventTitle: activeLiveSession.event.title,
                    });
                  }
                }}
                onOpenSeatViews={(venueName, seatInfo) => {
                  handleOpenSeatViews(
                    venueName || activeLiveSession.session.venueName || undefined,
                    seatInfo || activeLiveSession.session.attendance?.seatInfo || undefined,
                    activeLiveSession.event.title,
                    activeLiveSession.session.id,
                    activeLiveSession.session.attendance?.id
                  );
                }}
                onOpenSetlist={() =>
                  setViewingSetlistSession({
                    sessionId: activeLiveSession.session.id,
                    eventTitle: activeLiveSession.event.title,
                    venueName: activeLiveSession.session.venueName,
                    sessionDate: activeLiveSession.session.sessionDate,
                  })
                }
                onOpenConcertMode={() => setConcertModeSession(activeLiveSession)}
              />
            </div>
          )}

          {/* 活動清單 */}
          <div className="max-w-4xl mx-auto space-y-6">
            {loadingEvents ? (
              <div className="text-center py-16 text-gray-400 flex flex-col items-center">
                <Loader2 className="animate-spin h-8 w-8 mb-3 text-indigo-500" />
                <span>載入活動手帳中...</span>
              </div>
            ) : savedEvents.length === 0 ? (
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-12 text-center space-y-4">
                <div className="h-16 w-16 bg-gray-800/80 rounded-full flex items-center justify-center mx-auto text-gray-400">
                  <BookOpen className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-200">目前尚無任何典藏記錄</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  切換至「售票活動解析入庫」標籤頁，貼入 KKTIX 或
                  拓元售票網址開始建立你的第一本演唱會手帳！
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('scrape')}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors"
                >
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  前往解析新活動
                </button>
              </div>
            ) : (
              savedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-gray-900/90 border border-gray-800 rounded-2xl overflow-hidden shadow-xl"
                >
                  {/* 活動標題橫條 */}
                  <div className="p-5 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      {ev.posterUrl ? (
                        <div className="w-14 h-20 bg-gray-950 rounded-lg border border-gray-700/60 flex items-center justify-center overflow-hidden flex-shrink-0 relative group p-0.5">
                          <img
                            src={ev.posterUrl}
                            alt={ev.title}
                            className="w-full h-full object-contain"
                          />
                          <a
                            href={ev.posterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            title="檢視原圖"
                          >
                            <Eye className="w-4 h-4 text-indigo-300" />
                          </a>
                        </div>
                      ) : (
                        <div className="w-14 h-20 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-500">
                          <Ticket className="h-6 w-6" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 font-bold rounded ${
                              ev.platform === 'KKTIX'
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                : ev.platform === 'TIXCRAFT'
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                                  : ev.platform === 'IBON'
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                    : ev.platform === 'FAMITICKET'
                                      ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                                      : ev.platform === 'KHAM'
                                        ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                                        : ev.platform === 'INDIEVOX'
                                          ? 'bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-800/60'
                                          : 'bg-gray-800 text-gray-300'
                            }`}
                          >
                            {ev.platform}
                          </span>
                          {ev.organizer && (
                            <span className="text-xs text-gray-400">主辦：{ev.organizer}</span>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white">{ev.title}</h3>
                        <a
                          href={ev.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-400 hover:underline inline-flex items-center"
                        >
                          原始售票網址
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 sm:text-right">
                      <span className="text-xs text-gray-400">包含 {ev.sessions.length} 場次</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingEvent(ev);
                          haptics.warning();
                        }}
                        className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-rose-950/80 text-gray-400 hover:text-rose-300 border border-gray-700/60 hover:border-rose-800 transition-colors"
                        title="刪除此活動"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 各場次手帳狀態列表 */}
                  <div className="divide-y divide-gray-800/60 p-2 sm:p-4 space-y-2">
                    {ev.sessions.map((session) => {
                      const att = session.attendance;
                      const statusConf = att
                        ? STATUS_CONFIG[att.status] || STATUS_CONFIG.CONFIRMED
                        : null;

                      return (
                        <div
                          key={session.id}
                          className="p-4 bg-gray-950/40 hover:bg-gray-950/80 rounded-xl transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          {/* 左側：場次基本資訊 */}
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-gray-200">
                                {session.sessionTitle || '預設場次'}
                              </span>
                              {statusConf ? (
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusConf.badgeBg} ${statusConf.border}`}
                                >
                                  {statusConf.label}
                                </span>
                              ) : (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                                  未登記
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                              <span className="inline-flex items-center">
                                <Calendar className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                                {new Date(session.sessionDate).toLocaleString('zh-TW', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  weekday: 'short',
                                })}
                              </span>
                              <span className="inline-flex items-center">
                                <MapPin className="h-3.5 w-3.5 mr-1 text-purple-400" />
                                {session.venueName || '未指定場館'}
                              </span>
                            </div>

                            {/* 參戰手帳內容（若已填寫） */}
                            {att && (
                              <div className="mt-2 pt-2 border-t border-gray-800/80 space-y-1 text-xs">
                                <div className="flex flex-wrap items-center gap-3">
                                  {att.seatInfo && (
                                    <span className="text-gray-300 font-medium">
                                      💺 座位：{att.seatInfo}
                                    </span>
                                  )}
                                  {att.ticketPrice && (
                                    <span className="text-amber-400 font-medium">
                                      💰 票價：${att.ticketPrice.toLocaleString()} {att.currency}
                                    </span>
                                  )}
                                  {Boolean(att.merchTotalCost && att.merchTotalCost > 0) && (
                                    <span className="text-purple-300 font-medium">
                                      🛍️ 周邊：${att.merchTotalCost!.toLocaleString()}{' '}
                                      {att.currency}
                                    </span>
                                  )}
                                  {Boolean(
                                    (att.ticketPrice || 0) + (att.merchTotalCost || 0) > 0
                                  ) && (
                                    <span className="text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                                      💳 累計總支出：$
                                      {(
                                        (att.ticketPrice || 0) + (att.merchTotalCost || 0)
                                      ).toLocaleString()}{' '}
                                      {att.currency}
                                    </span>
                                  )}
                                  {att.rating && (
                                    <div className="flex items-center text-amber-300">
                                      {Array.from({ length: 5 }).map((_, rIdx) => (
                                        <Star
                                          key={rIdx}
                                          className={`h-3 w-3 ${
                                            rIdx < att.rating!
                                              ? 'fill-amber-400 text-amber-400'
                                              : 'text-gray-700'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  {att.ticketStubUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setViewingStubSession({ event: ev, session })}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 transition-colors"
                                    >
                                      <Ticket className="h-3 w-3 mr-1 text-indigo-400" />
                                      擬真票根
                                      {att.stubPrivacyMasked && (
                                        <ShieldCheck className="h-3 w-3 ml-1 text-emerald-400" />
                                      )}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingMerchSession({
                                        attendanceId: att.id,
                                        eventTitle: ev.title,
                                      })
                                    }
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80 transition-colors"
                                  >
                                    <ShoppingBag className="h-3 w-3 mr-1 text-purple-400" />
                                    周邊戰利品 {att.merchCount ? `(${att.merchCount}件)` : ''}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingMediaSession({
                                        attendanceId: att.id,
                                        eventTitle: ev.title,
                                        sessionDate: session.sessionDate,
                                      })
                                    }
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-pink-950/80 hover:bg-pink-900 text-pink-300 border border-pink-800/80 transition-colors"
                                  >
                                    <Camera className="h-3 w-3 mr-1 text-pink-400" />
                                    現場回憶 {att.mediaCount ? `(${att.mediaCount}則)` : ''}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenSeatViews(
                                        session.venueName || undefined,
                                        att.seatInfo || undefined,
                                        ev.title,
                                        session.id,
                                        att.id
                                      )
                                    }
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 transition-colors"
                                  >
                                    <Eye className="h-3 w-3 mr-1 text-cyan-400" />
                                    視野圖庫
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingSetlistSession({
                                        sessionId: session.id,
                                        eventTitle: ev.title,
                                        venueName: session.venueName,
                                        sessionDate: session.sessionDate,
                                      })
                                    }
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/80 transition-colors"
                                  >
                                    <ListMusic className="h-3 w-3 mr-1 text-amber-400" />
                                    現場歌單
                                  </button>
                                </div>
                                {att.notes && (
                                  <p className="text-gray-400 italic bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                                    「{att.notes}」
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 右側：動作按鈕 */}
                          <div className="flex items-center justify-end gap-2">
                            <AddToCalendarMenu
                              item={{
                                id: session.id,
                                title: ev.title,
                                subTitle: session.sessionTitle,
                                itemType: 'SHOW',
                                startDate: session.sessionDate,
                                venueName: session.venueName,
                                bookingUrl: session.bookingUrl,
                                platform: session.ticketPlatform,
                                seatInfo: att?.seatInfo,
                                notes: att?.notes,
                              }}
                              compact
                            />
                            <button
                              type="button"
                              onClick={() => openAttendanceModal(ev, session)}
                              className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-indigo-600 text-gray-200 hover:text-white border border-gray-700 hover:border-indigo-500 transition-all shadow-sm"
                            >
                              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                              {att ? '編輯手帳' : '登記參戰'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────────────── TAB: 智慧手帳行事曆與搶票雷達 ─────────────────── */}
      {activeTab === 'calendar' && (
        <CalendarDashboard
          refreshTrigger={eventsVersion}
          onNavigateToJournal={(eventId) => {
            setActiveTab('journal');
            loadSavedEvents();
          }}
          onNavigateToScrape={() => {
            setActiveTab('scrape');
          }}
        />
      )}

      {/* ─────────────────── TAB 3: 視角資料庫 (VIEW FROM MY SEAT) ─────────────────── */}
      {activeTab === 'seats' && (
        <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
          {/* 標題與引言 */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-950/80 border border-indigo-800/60 rounded-full text-indigo-300 text-xs font-semibold mb-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Phase 3 視角資料庫</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              場館座位視野資料庫
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              現場樂迷真實視角照片與無遮蔽評鑑，快速檢視小巨蛋、北流、高巨等場館各排各區實際視野。
            </p>
          </div>

          {/* 視角圖庫特色引導卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl shadow-xl space-y-2">
              <div className="p-2.5 bg-indigo-950/70 border border-indigo-800/60 rounded-xl w-fit text-indigo-400">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">真實視角防雷</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                現場樂迷親拍上傳，明確標註是否有音響控台、攝影機搖臂或立柱擋住視線。
              </p>
            </div>

            <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl shadow-xl space-y-2">
              <div className="p-2.5 bg-purple-950/70 border border-purple-800/60 rounded-xl w-fit text-purple-400">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">分區排號精準查詢</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                支援特區、紅區、紫區、黃區及樓層排號過濾，買票選位不再憑空想像。
              </p>
            </div>

            <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl shadow-xl space-y-2">
              <div className="p-2.5 bg-emerald-950/70 border border-emerald-800/60 rounded-xl w-fit text-emerald-400">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">本地典藏與社群共享</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                結合 SQLite 與 Service Worker 離線快取，無網路時亦可一秒檢視視野照片。
              </p>
            </div>
          </div>

          {/* 快速動作面板 */}
          <div className="bg-gradient-to-br from-indigo-950/50 via-purple-950/30 to-zinc-950 border border-indigo-700/40 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
            <h2 className="text-lg sm:text-xl font-black text-white">
              準備好探索視野或貢獻你的座位了嗎？
            </h2>
            <p className="text-xs text-indigo-200 max-w-md mx-auto">
              立即開啟視角圖庫瀏覽已登錄的場館照片，或將你在演唱會現場拍下的視角上傳備份！
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  haptics.medium();
                  setSeatViewModal({ isOpen: true });
                }}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition active:scale-95"
              >
                <Eye className="w-4 h-4" />
                <span>瀏覽場館視野圖庫</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.medium();
                  setSeatViewModal({ isOpen: true });
                }}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-purple-700/60 text-xs sm:text-sm font-bold rounded-xl shadow-lg flex items-center space-x-2 transition active:scale-95"
              >
                <Camera className="w-4 h-4 text-purple-400" />
                <span>拍照上傳視野</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 4: 數據回顧 & WRAPPED ─────────────────── */}
      {activeTab === 'analytics' && <AnalyticsDashboard />}

      {/* ─────────────────── TAB 5: 資料安全與手帳備份還原 ─────────────────── */}
      {activeTab === 'backup' && (
        <BackupRestoreDashboard
          onDataRestored={() => {
            loadSavedEvents();
            setEventsVersion((v) => v + 1);
          }}
        />
      )}

      {/* ─────────────────── 參戰手帳記錄彈窗 (ATTENDANCE MODAL) ─────────────────── */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe flex min-h-full items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full my-auto max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/60">
              <div className="space-y-0.5">
                <span className="text-xs text-indigo-400 font-semibold">演唱會手帳記錄</span>
                <h3 className="font-bold text-base text-white line-clamp-1">
                  {editingSession.event.title}
                </h3>
              </div>
              <button
                onClick={() => setEditingSession(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
              {/* 場次資訊摘要 */}
              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 text-xs space-y-1 text-gray-300">
                <div className="font-semibold text-white">
                  {editingSession.session.sessionTitle || '預設場次'}
                </div>
                <div className="text-gray-400">
                  {new Date(editingSession.session.sessionDate).toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  @ {editingSession.session.venueName || '未指定場地'}
                </div>
              </div>

              {/* 參戰狀態選擇 (全生命週期 10 種狀態) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300">票券與參戰生命週期</label>
                  <span className="text-[10px] text-indigo-400 font-mono">
                    {STATUS_CONFIG[attendanceForm.status]?.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(
                    [
                      'WANT_TO_GO',
                      'WAITING_TO_BUY',
                      'LOTTERY_ENTERED',
                      'TICKETING',
                      'PURCHASED',
                      'CONFIRMED',
                      'TRANSFERRING',
                      'ABANDONED',
                      'ATTENDED',
                      'MISSED',
                    ] as const
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAttendanceForm({ ...attendanceForm, status: st })}
                      className={`py-1.5 px-1 text-[11px] font-bold rounded-lg border transition-all text-center truncate ${
                        attendanceForm.status === st
                          ? `${STATUS_CONFIG[st].badgeBg} ${STATUS_CONFIG[st].border} ring-2 ring-indigo-500`
                          : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                      title={STATUS_CONFIG[st].label}
                    >
                      {STATUS_CONFIG[st].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 座位與票券種類 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">座位號碼 / 區域</label>
                  <input
                    type="text"
                    value={attendanceForm.seatInfo}
                    onChange={(e) =>
                      setAttendanceForm({ ...attendanceForm, seatInfo: e.target.value })
                    }
                    placeholder="例：特A區 3排 12號"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">票券形式</label>
                  <select
                    value={attendanceForm.ticketType}
                    onChange={(e) =>
                      setAttendanceForm({
                        ...attendanceForm,
                        ticketType: e.target.value as any,
                      })
                    }
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 text-white"
                  >
                    <option value="DIGITAL">電子票券 (手機條碼)</option>
                    <option value="PHYSICAL">實體紙本票券</option>
                    <option value="WRISTBAND">入場手環</option>
                    <option value="OTHER">其他憑證</option>
                  </select>
                </div>
              </div>

              {/* 實付票價 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">實付票價 (TWD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    value={attendanceForm.ticketPrice}
                    onChange={(e) =>
                      setAttendanceForm({ ...attendanceForm, ticketPrice: e.target.value })
                    }
                    placeholder="例：4800"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {/* 五維現場體驗評鑑 */}
              <div className="bg-gray-950/70 border border-gray-800 p-3.5 rounded-2xl space-y-3">
                <div className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="h-4 w-4 fill-amber-400" />
                    五維現場演出手帳評鑑 · 觀演星等評價
                  </span>
                  <span className="text-[11px] text-amber-300 font-bold font-mono">
                    綜合評分: {attendanceForm.rating} / 5
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {/* 綜合評分 */}
                  <div className="flex items-center justify-between bg-gray-900/80 p-2 rounded-xl border border-gray-800">
                    <span className="text-gray-300">⭐ 綜合推薦度</span>
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setAttendanceForm({ ...attendanceForm, rating: s })}
                          className="p-0.5 text-gray-600 hover:text-amber-400 transition-colors"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              s <= attendanceForm.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 音響音質 */}
                  <div className="flex items-center justify-between bg-gray-900/80 p-2 rounded-xl border border-gray-800">
                    <span className="text-gray-300">🎵 音響音質</span>
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setAttendanceForm({ ...attendanceForm, ratingSound: s })}
                          className="p-0.5 text-gray-600 hover:text-amber-400 transition-colors"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              s <= attendanceForm.ratingSound
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 視野角度 */}
                  <div className="flex items-center justify-between bg-gray-900/80 p-2 rounded-xl border border-gray-800">
                    <span className="text-gray-300">👀 視野角度</span>
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setAttendanceForm({ ...attendanceForm, ratingSight: s })}
                          className="p-0.5 text-gray-600 hover:text-amber-400 transition-colors"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              s <= attendanceForm.ratingSight
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 現場氛圍 */}
                  <div className="flex items-center justify-between bg-gray-900/80 p-2 rounded-xl border border-gray-800">
                    <span className="text-gray-300">🔥 現場氛圍</span>
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setAttendanceForm({ ...attendanceForm, ratingAtmosphere: s })
                          }
                          className="p-0.5 text-gray-600 hover:text-amber-400 transition-colors"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              s <= attendanceForm.ratingAtmosphere
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 演出表現 */}
                  <div className="flex items-center justify-between bg-gray-900/80 p-2 rounded-xl border border-gray-800 sm:col-span-2">
                    <span className="text-gray-300">🎤 藝人演出表現</span>
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setAttendanceForm({ ...attendanceForm, ratingPerformance: s })
                          }
                          className="p-0.5 text-gray-600 hover:text-amber-400 transition-colors"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              s <= attendanceForm.ratingPerformance
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 結構化參戰手帳筆記範本 */}
              <div className="space-y-3 bg-gray-950/70 border border-gray-800 p-3.5 rounded-2xl">
                <div className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span>結構化手帳筆記範本</span>
                  <span className="text-[10px] text-gray-500">參戰回憶與避坑必備</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-indigo-400" />
                      入場 / 周邊排隊耗時 (分鐘)
                    </label>
                    <input
                      type="number"
                      value={attendanceForm.queueTimeMinutes}
                      onChange={(e) =>
                        setAttendanceForm({ ...attendanceForm, queueTimeMinutes: e.target.value })
                      }
                      placeholder="例：45"
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-purple-300 flex items-center gap-1">
                      <ArrowRightLeft className="h-3 w-3 text-purple-400" />
                      讓票 / 換票流轉備忘
                    </label>
                    <input
                      type="text"
                      value={attendanceForm.transferNotes}
                      onChange={(e) =>
                        setAttendanceForm({ ...attendanceForm, transferNotes: e.target.value })
                      }
                      placeholder="例：捷運站面交取票"
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-emerald-300 flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3 text-emerald-400" />
                    值得讚賞 / 亮點好評 (Pros)
                  </label>
                  <input
                    type="text"
                    value={attendanceForm.pros}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, pros: e.target.value })}
                    placeholder="例：音響層次分明、唱功與舞美滿分"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-rose-300 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-rose-400" />
                    美中不足 / 踩雷提醒 (Cons)
                  </label>
                  <input
                    type="text"
                    value={attendanceForm.cons}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, cons: e.target.value })}
                    placeholder="例：周邊排隊動線混亂、空調偏冷"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-amber-300 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3 text-amber-400" />
                    下次參戰貼士 / 避坑攻略 (Tips)
                  </label>
                  <input
                    type="text"
                    value={attendanceForm.tips}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, tips: e.target.value })}
                    placeholder="例：建議提早1.5小時到場領取手燈並自備外套"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 心得隨筆筆記 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  現場心得隨筆與回憶備忘
                </label>
                <textarea
                  rows={3}
                  value={attendanceForm.notes}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                  placeholder="記下安可曲、歌手Talking亮點、或是那一晚最難忘的瞬間..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
                />
              </div>

              {/* 票根相片典藏與條碼隱私遮罩 */}
              <div className="space-y-2 pt-2 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300 flex items-center">
                    <Ticket className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                    票根典藏與條碼隱私遮罩
                  </label>
                  {attendanceForm.stubPrivacyMasked && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      條碼遮罩已啟用
                    </span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {attendanceForm.ticketStubUrl ? (
                  <div className="flex items-center space-x-3 bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                    <img
                      src={attendanceForm.ticketStubUrl}
                      alt="Ticket stub preview"
                      className="w-16 h-12 object-contain bg-black/60 rounded-lg border border-gray-700/80 p-0.5"
                    />
                    <div className="flex-1 space-y-1 text-xs">
                      <div className="text-gray-300 font-medium line-clamp-1">已典藏票根相片</div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTempImageSrc(attendanceForm.ticketStubUrl);
                            setMaskModalOpen(true);
                          }}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          塗抹/調整遮罩
                        </button>
                        <span className="text-gray-600">·</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAttendanceForm((prev) => ({
                              ...prev,
                              ticketStubUrl: null,
                              stubPrivacyMasked: false,
                            }))
                          }
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          移除相片
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingStub}
                    className="w-full py-3 px-4 border border-dashed border-gray-700 hover:border-indigo-500 bg-gray-950/60 hover:bg-gray-950 rounded-xl text-center text-xs text-gray-300 transition-colors flex items-center justify-center space-x-2"
                  >
                    {uploadingStub ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-1 text-indigo-400" />
                        處理中...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 text-indigo-400" />
                        <span>上傳實體票照片或電子票截圖 (開啟條碼遮罩保護)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* 周邊戰利品與現場多媒體快捷入口 */}
              {editingSession?.session?.attendance?.id && (
                <div className="pt-2 border-t border-gray-800 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingSession && editingSession.session.attendance) {
                        setViewingMerchSession({
                          attendanceId: editingSession.session.attendance.id,
                          eventTitle: editingSession.event.title,
                        });
                      }
                    }}
                    className="py-2 px-3 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 rounded-xl text-xs text-purple-300 font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <ShoppingBag className="h-3.5 w-3.5 text-purple-400" />
                    <span>管理周邊戰利品</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingSession && editingSession.session.attendance) {
                        setViewingMediaSession({
                          attendanceId: editingSession.session.attendance.id,
                          eventTitle: editingSession.event.title,
                          sessionDate: editingSession.session.sessionDate,
                        });
                      }
                    }}
                    className="py-2 px-3 bg-pink-950/40 hover:bg-pink-900/60 border border-pink-800/60 rounded-xl text-xs text-pink-300 font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <Camera className="h-3.5 w-3.5 text-pink-400" />
                    <span>管理現場回憶牆</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-gray-800 bg-gray-950/80 flex items-center justify-between">
              {editingSession.session.attendance ? (
                <button
                  type="button"
                  onClick={handleDeleteAttendance}
                  disabled={savingAttendance}
                  className="inline-flex items-center text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  刪除手帳記錄
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white rounded-xl"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow transition-colors"
                >
                  {savingAttendance ? (
                    <>
                      <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />
                      儲存中...
                    </>
                  ) : (
                    '儲存手帳記錄'
                  )}
                </button>
              </div>
            </div>
          </div>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe flex min-h-full items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full my-auto max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden">
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

      {/* 條碼隱私遮罩畫布 Modal */}
      {maskModalOpen && tempImageSrc && (
        <TicketMaskModal
          isOpen={maskModalOpen}
          imageSrc={tempImageSrc}
          onClose={() => setMaskModalOpen(false)}
          onApplyMask={handleApplyMask}
        />
      )}

      {/* 擬真票根展示 Modal */}
      {viewingStubSession && (
        <TicketStubModal
          isOpen={Boolean(viewingStubSession)}
          eventTitle={viewingStubSession.event.title}
          organizer={viewingStubSession.event.organizer}
          platform={viewingStubSession.event.platform}
          sessionTitle={viewingStubSession.session.sessionTitle}
          sessionDate={viewingStubSession.session.sessionDate}
          venueName={viewingStubSession.session.venueName}
          seatInfo={viewingStubSession.session.attendance?.seatInfo}
          ticketPrice={viewingStubSession.session.attendance?.ticketPrice}
          currency={viewingStubSession.session.attendance?.currency}
          ticketType={viewingStubSession.session.attendance?.ticketType}
          ticketStubUrl={viewingStubSession.session.attendance?.ticketStubUrl}
          stubPrivacyMasked={viewingStubSession.session.attendance?.stubPrivacyMasked}
          status={viewingStubSession.session.attendance?.status}
          eventId={viewingStubSession.event.id}
          sessionId={viewingStubSession.session.id}
          posterUrl={viewingStubSession.event.posterUrl}
          rating={viewingStubSession.session.attendance?.rating}
          ratingSound={viewingStubSession.session.attendance?.ratingSound}
          ratingSight={viewingStubSession.session.attendance?.ratingSight}
          ratingAtmosphere={viewingStubSession.session.attendance?.ratingAtmosphere}
          ratingPerformance={viewingStubSession.session.attendance?.ratingPerformance}
          pros={viewingStubSession.session.attendance?.pros}
          cons={viewingStubSession.session.attendance?.cons}
          tips={viewingStubSession.session.attendance?.tips}
          queueTimeMinutes={viewingStubSession.session.attendance?.queueTimeMinutes}
          transferNotes={viewingStubSession.session.attendance?.transferNotes}
          onClose={() => setViewingStubSession(null)}
          onSaveTransferNotes={async (notes) => {
            if (!viewingStubSession?.session?.id) return;
            await fetch('/api/attendances', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: viewingStubSession.session.id,
                transferNotes: notes,
              }),
            });
            await loadSavedEvents();
          }}
        />
      )}

      {/* 演唱會周邊戰利品 Modal */}
      {viewingMerchSession && (
        <MerchManagerModal
          isOpen={Boolean(viewingMerchSession)}
          attendanceId={viewingMerchSession.attendanceId}
          eventTitle={viewingMerchSession.eventTitle}
          onClose={() => setViewingMerchSession(null)}
          onUpdated={loadSavedEvents}
        />
      )}

      {/* 現場時序回憶牆 Modal */}
      {viewingMediaSession && (
        <MediaGalleryModal
          isOpen={Boolean(viewingMediaSession)}
          attendanceId={viewingMediaSession.attendanceId}
          eventTitle={viewingMediaSession.eventTitle}
          sessionDate={viewingMediaSession.sessionDate}
          onClose={() => setViewingMediaSession(null)}
          onUpdated={loadSavedEvents}
        />
      )}

      {/* 視角資料庫 Modal */}
      {seatViewModal.isOpen && (
        <SeatViewModal
          isOpen={seatViewModal.isOpen}
          initialVenue={seatViewModal.venue}
          initialSection={seatViewModal.section}
          initialRow={seatViewModal.row}
          initialEventTitle={seatViewModal.eventTitle}
          initialSessionId={seatViewModal.sessionId}
          initialAttendanceId={seatViewModal.attendanceId}
          onClose={() => setSeatViewModal({ isOpen: false })}
          onViewAdded={() => {
            loadSavedEvents();
          }}
        />
      )}

      {/* 現場演出歌單 Modal */}
      {viewingSetlistSession && (
        <SetlistModal
          isOpen={Boolean(viewingSetlistSession)}
          sessionId={viewingSetlistSession.sessionId}
          eventTitle={viewingSetlistSession.eventTitle}
          artistName={viewingSetlistSession.artistName}
          venueName={viewingSetlistSession.venueName}
          sessionDate={viewingSetlistSession.sessionDate}
          onClose={() => setViewingSetlistSession(null)}
          onUpdated={loadSavedEvents}
        />
      )}

      {/* 現場沉浸模式 (Live Concert Mode) Modal */}
      {concertModeSession && (
        <LiveConcertModeModal
          isOpen={Boolean(concertModeSession)}
          event={concertModeSession.event}
          session={concertModeSession.session}
          onClose={() => setConcertModeSession(null)}
          onSaveNote={async (note) => {
            if (!concertModeSession.session) return;
            const currentAtt = concertModeSession.session.attendance;
            const res = await fetch('/api/attendances', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: concertModeSession.session.id,
                status: currentAtt?.status || 'ATTENDED',
                seatInfo: currentAtt?.seatInfo || null,
                ticketType: currentAtt?.ticketType || 'DIGITAL',
                ticketPrice: currentAtt?.ticketPrice || null,
                currency: 'TWD',
                rating: currentAtt?.rating || 5,
                notes: currentAtt?.notes ? `${currentAtt.notes}\n${note}` : note,
              }),
            });
            if (res.ok) {
              await loadSavedEvents();
            }
          }}
          onAddMediaSnapshot={async (dataUrl) => {
            if (!concertModeSession.session.attendance) return;
            const res = await fetch('/api/media', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                attendanceId: concertModeSession.session.attendance.id,
                mediaType: 'PHOTO',
                mediaUrl: dataUrl,
                caption: '現場視角快照 (Concert Mode)',
              }),
            });
            if (res.ok) {
              await loadSavedEvents();
            }
          }}
        />
      )}

      {/* 刪除活動確認 Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe flex min-h-full items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full my-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-950/80 rounded-xl border border-rose-800/80">
                <Trash2 className="h-6 w-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">確認刪除活動？</h3>
                <p className="text-xs text-gray-400">此動作將永久移除該活動紀錄</p>
              </div>
            </div>

            <div className="bg-gray-950/60 p-3.5 rounded-xl border border-gray-800 space-y-1.5 text-xs text-gray-300">
              <div className="font-semibold text-white truncate">{deletingEvent.title}</div>
              <p className="text-gray-400 leading-relaxed">
                將同時刪除此活動關聯的 {deletingEvent.sessions.length}{' '}
                個場次、搶票時程、現場手帳紀錄、照片回憶與周邊清單。此動作無法復原。
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingEvent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteEvent}
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    刪除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    確認刪除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 巡迴足跡地圖 Modal */}
      {footprintModalOpen && (
        <TourFootprintMap
          isOpen={footprintModalOpen}
          onClose={() => setFootprintModalOpen(false)}
        />
      )}

      {/* 音樂祭多舞台 Timetable Modal */}
      {festivalModalOpen && (
        <FestivalTimetableModal
          isOpen={festivalModalOpen}
          onClose={() => setFestivalModalOpen(false)}
        />
      )}

      {/* 朝聖心願池 Modal */}
      {wishlistModalOpen && (
        <WishlistModal
          isOpen={wishlistModalOpen}
          onClose={() => setWishlistModalOpen(false)}
          onSelectEvent={() => {
            setActiveTab('journal');
            loadSavedEvents();
          }}
        />
      )}

      {/* Phase 12: 推活熱量大數據 Modal */}
      {passionModalOpen && (
        <PassionHeatmapDashboard
          isOpen={passionModalOpen}
          onClose={() => setPassionModalOpen(false)}
          onOpenCardGenerator={() => {
            setPassionModalOpen(false);
            setCardGeneratorModalOpen(true);
          }}
        />
      )}

      {/* Phase 12: 潮流社群卡工廠 Modal */}
      {cardGeneratorModalOpen && (
        <AestheticCardGeneratorModal
          isOpen={cardGeneratorModalOpen}
          onClose={() => setCardGeneratorModalOpen(false)}
          events={savedEvents.flatMap((e) =>
            e.sessions.map((s) => ({
              id: s.id,
              title: e.title,
              artist: e.organizer || e.title.split(' ')[0] || '演出藝人',
              venue: s.venueName || '演出場館',
              date: s.sessionDate,
              seat: s.attendance?.seatInfo || '自由入場',
              price: s.attendance?.ticketPrice || 0,
              setlistCount: 20,
              totalSpend: (s.attendance?.ticketPrice || 0) + (s.attendance?.merchTotalCost || 0),
            }))
          )}
        />
      )}

      {/* Phase 13: 社群好友圈、P2P 票根快傳與讓換票核驗 Modal */}
      {socialModalOpen && (
        <SocialConnectModal
          isOpen={socialModalOpen}
          onClose={() => setSocialModalOpen(false)}
          defaultTab={socialModalTab}
          savedEvents={savedEvents.flatMap((e) =>
            e.sessions.map((s) => ({
              id: s.id,
              title: e.title,
              artist: e.organizer || e.title.split(' ')[0] || '演出藝人',
              venue: s.venueName || '演出場館',
              date: s.sessionDate,
              seat: s.attendance?.seatInfo || undefined,
              attendanceId: s.attendance?.id,
            }))
          )}
        />
      )}
    </div>
  );
}
