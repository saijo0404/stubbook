'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Sparkles,
  Receipt,
  Disc3,
  Layers,
  Palette,
  AtSign,
  Calendar,
  MapPin,
  Ticket,
  Check,
  Music,
} from 'lucide-react';
import { haptics } from '../utils/haptics';

export type SnsCardStyle = 'VINTAGE_RECEIPT' | 'JEWEL_CASE' | 'TRANSPARENT_STICKER';
export type SnsCardPalette =
  'DARK_OBSIDIAN' | 'POLAROID_WHITE' | 'CYBERPUNK_NEON' | 'VINTAGE_KRAFT';

interface EventOption {
  id: string;
  title: string;
  artist: string;
  venue: string;
  date: string;
  seat: string;
  price: number;
  posterUrl?: string;
  setlistCount?: number;
  totalSpend?: number;
}

interface AestheticCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  events?: EventOption[];
}

export const AestheticCardGeneratorModal: React.FC<AestheticCardGeneratorModalProps> = ({
  isOpen,
  onClose,
  events = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [style, setStyle] = useState<SnsCardStyle>('VINTAGE_RECEIPT');
  const [palette, setPalette] = useState<SnsCardPalette>('DARK_OBSIDIAN');
  const [watermark, setWatermark] = useState('@stubbook_fan');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);

  // 示範預設演出資料（若外部未傳入足夠資料）
  const fallbackEvents: EventOption[] = [
    {
      id: 'demo-1',
      title: 'ONE OK ROCK Luxury Disease Tour 2026',
      artist: 'ONE OK ROCK',
      venue: '台北小巨蛋 (Taipei Arena)',
      date: '2026-09-21',
      seat: '特A區 2排 18號',
      price: 4800,
      setlistCount: 21,
      totalSpend: 7580,
    },
    {
      id: 'demo-2',
      title: 'YOASOBI ASIA TOUR 2026',
      artist: 'YOASOBI',
      venue: '台北流行音樂中心 (TMC)',
      date: '2026-10-15',
      seat: '2樓 搖滾B區 4排 06號',
      price: 3800,
      setlistCount: 19,
      totalSpend: 5400,
    },
    {
      id: 'demo-3',
      title: '大港開唱 MEGAPORT Festival 2026',
      artist: '群星 / 滅火器 / 閃靈',
      venue: '高雄港蓬萊商港區 (Kaohsiung Port)',
      date: '2026-03-29',
      seat: '全區雙日暢遊手環',
      price: 3200,
      setlistCount: 35,
      totalSpend: 8900,
    },
  ];

  const currentEvents = events.length > 0 ? events : fallbackEvents;
  const activeEvent = currentEvents.find((e) => e.id === selectedEventId) || currentEvents[0];

  useEffect(() => {
    if (currentEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(currentEvents[0].id);
    }
  }, [currentEvents, selectedEventId]);

  // 調色盤背景與文字顏色設定
  const paletteConfig = {
    DARK_OBSIDIAN: {
      name: '黑曜暗黑',
      bg: '#0f172a',
      cardBg: '#1e293b',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      accent: '#38bdf8',
      border: '#334155',
    },
    POLAROID_WHITE: {
      name: '拍立得白',
      bg: '#f8fafc',
      cardBg: '#ffffff',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      accent: '#e11d48',
      border: '#e2e8f0',
    },
    CYBERPUNK_NEON: {
      name: '霓虹夜紫',
      bg: '#180828',
      cardBg: '#2a0e44',
      textPrimary: '#fdf4ff',
      textSecondary: '#d8b4fe',
      accent: '#f43f5e',
      border: '#6b21a8',
    },
    VINTAGE_KRAFT: {
      name: '復古牛皮紙',
      bg: '#d6c4a8',
      cardBg: '#e8dcbe',
      textPrimary: '#292524',
      textSecondary: '#57534e',
      accent: '#854d0e',
      border: '#b8a383',
    },
  };

  // 繪製分享卡至 Canvas (高解析度 2x 縮放)
  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeEvent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600;
    const height = style === 'VINTAGE_RECEIPT' ? 820 : style === 'JEWEL_CASE' ? 680 : 540;
    const scale = 2; // Retina 2x

    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    const p = paletteConfig[palette];

    // 清空背景
    if (style === 'TRANSPARENT_STICKER') {
      ctx.clearRect(0, 0, width, height);
    } else {
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, width, height);
    }

    if (style === 'VINTAGE_RECEIPT') {
      // ══════════════════════════════════════════════════════════════════
      // 1. 文青熱感應收據風格 (Vintage Receipt Card)
      // ══════════════════════════════════════════════════════════════════
      const cardX = 40;
      const cardY = 30;
      const cardW = width - 80;
      const cardH = height - 60;

      // 收據主紙張
      ctx.fillStyle = p.cardBg;
      ctx.fillRect(cardX, cardY, cardW, cardH);

      // 上下鋸齒切紙邊緣裝飾 (Zigzag cutouts)
      const toothSize = 10;
      const teethCount = Math.floor(cardW / toothSize);
      ctx.fillStyle = p.bg;

      // 頂部鋸齒
      for (let i = 0; i < teethCount; i++) {
        ctx.beginPath();
        ctx.moveTo(cardX + i * toothSize, cardY);
        ctx.lineTo(cardX + (i + 0.5) * toothSize, cardY + 6);
        ctx.lineTo(cardX + (i + 1) * toothSize, cardY);
        ctx.fill();
      }
      // 底部鋸齒
      for (let i = 0; i < teethCount; i++) {
        ctx.beginPath();
        ctx.moveTo(cardX + i * toothSize, cardY + cardH);
        ctx.lineTo(cardX + (i + 0.5) * toothSize, cardY + cardH - 6);
        ctx.lineTo(cardX + (i + 1) * toothSize, cardY + cardH);
        ctx.fill();
      }

      // 收據標題
      ctx.fillStyle = p.textPrimary;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('★ STUBBOOK EXPEDITION RECEIPT ★', width / 2, cardY + 50);

      ctx.font = '11px monospace';
      ctx.fillStyle = p.textSecondary;
      ctx.fillText('OFFICIAL LIVE JOURNAL RECORD', width / 2, cardY + 70);
      ctx.fillText(
        `ORDER #STUB-${activeEvent.id.slice(0, 8).toUpperCase()}`,
        width / 2,
        cardY + 86
      );

      // 虛線分隔線
      ctx.strokeStyle = p.border;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cardX + 20, cardY + 105);
      ctx.lineTo(cardX + cardW - 20, cardY + 105);
      ctx.stroke();
      ctx.setLineDash([]);

      // 演出明細資料
      ctx.textAlign = 'left';
      let curY = cardY + 135;

      const drawRow = (label: string, val: string, isBold = false) => {
        ctx.font = isBold ? 'bold 13px monospace' : '12px monospace';
        ctx.fillStyle = p.textSecondary;
        ctx.fillText(label, cardX + 24, curY);

        ctx.fillStyle = p.textPrimary;
        ctx.textAlign = 'right';
        ctx.fillText(val, cardX + cardW - 24, curY);
        ctx.textAlign = 'left';
        curY += 24;
      };

      drawRow('ARTIST', activeEvent.artist, true);
      drawRow('DATE', activeEvent.date);
      drawRow('VENUE', activeEvent.venue.split('(')[0].trim());
      drawRow('SEAT', activeEvent.seat);
      drawRow('SETLIST TRACKS', `${activeEvent.setlistCount || 20} 曲目完整演繹`);

      curY += 10;
      // 費用明細小標
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = p.accent;
      ctx.fillText('── EXPEDITION COST BREAKDOWN ──', cardX + 24, curY);
      curY += 20;

      drawRow('CONCERT TICKET', `$${activeEvent.price.toLocaleString()}`);
      drawRow(
        'TRAVEL & HOTEL',
        `$${Math.max(0, (activeEvent.totalSpend || activeEvent.price) - activeEvent.price).toLocaleString()}`
      );

      // 分隔實線
      curY += 10;
      ctx.strokeStyle = p.textPrimary;
      ctx.beginPath();
      ctx.moveTo(cardX + 20, curY);
      ctx.lineTo(cardX + cardW - 20, curY);
      ctx.stroke();
      curY += 26;

      // 總金額大字
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = p.textPrimary;
      ctx.fillText('TOTAL SPENT', cardX + 24, curY);
      ctx.textAlign = 'right';
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = p.accent;
      ctx.fillText(
        `$${(activeEvent.totalSpend || activeEvent.price).toLocaleString()} TWD`,
        cardX + cardW - 24,
        curY
      );
      ctx.textAlign = 'left';

      // 底部條碼模擬 (Barcode Simulation)
      curY += 45;
      const barX = cardX + 40;
      const barW = cardW - 80;
      const barH = 45;
      ctx.fillStyle = p.textPrimary;
      for (let i = 0; i < barW; i += 3) {
        if ((i * 7 + 13) % 5 !== 0) {
          ctx.fillRect(barX + i, curY, (i % 3) + 1, barH);
        }
      }

      curY += barH + 25;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.textSecondary;
      ctx.fillText('THANK YOU FOR SUPPORTING LIVE MUSIC!', width / 2, curY);
      curY += 16;
      ctx.fillStyle = p.accent;
      ctx.fillText(`${watermark} • StubBook Verified`, width / 2, curY);
    } else if (style === 'JEWEL_CASE') {
      // ══════════════════════════════════════════════════════════════════
      // 2. CD 壓克力寶石外殼風格 (Acrylic Jewel Case)
      // ══════════════════════════════════════════════════════════════════
      const caseX = 50;
      const caseY = 40;
      const caseW = width - 100;
      const caseH = height - 80;

      // CD 壓克力底盒與立體陰影
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 25;
      ctx.fillStyle = p.cardBg;
      ctx.fillRect(caseX, caseY, caseW, caseH);
      ctx.restore();

      // 左側書脊裝訂條 (Spine)
      const spineW = 36;
      ctx.fillStyle = p.border;
      ctx.fillRect(caseX, caseY, spineW, caseH);

      // 書脊直排文字
      ctx.save();
      ctx.translate(caseX + 22, caseY + caseH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = p.textSecondary;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`STUBBOOK ARCHIVES • ${activeEvent.artist.toUpperCase()}`, 0, 0);
      ctx.restore();

      // CD 碟片中環模擬 (Disc Tray Ring)
      const discCenterX = caseX + spineW + (caseW - spineW) / 2;
      const discCenterY = caseY + caseH / 2;

      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(discCenterX, discCenterY, 120, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(discCenterX, discCenterY, 35, 0, Math.PI * 2);
      ctx.stroke();

      // 正面專輯手冊排版 (Booklet)
      const bookX = caseX + spineW + 20;
      const bookY = caseY + 25;
      const bookW = caseW - spineW - 40;

      ctx.fillStyle = p.textPrimary;
      ctx.font = '900 24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(activeEvent.artist, bookX, bookY + 30);

      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = p.accent;
      ctx.fillText(activeEvent.title, bookX, bookY + 54);

      // 演出資訊小卡
      ctx.font = '12px sans-serif';
      ctx.fillStyle = p.textSecondary;
      ctx.fillText(`📅 ${activeEvent.date}`, bookX, bookY + 90);
      ctx.fillText(`📍 ${activeEvent.venue}`, bookX, bookY + 112);
      ctx.fillText(`💺 ${activeEvent.seat}`, bookX, bookY + 134);

      // 防偽雷射標籤模擬 (Hologram badge)
      ctx.save();
      ctx.translate(bookX + bookW - 90, bookY + 10);
      const holoGrad = ctx.createLinearGradient(0, 0, 80, 50);
      holoGrad.addColorStop(0, '#f43f5e');
      holoGrad.addColorStop(0.3, '#38bdf8');
      holoGrad.addColorStop(0.7, '#a855f7');
      holoGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = holoGrad;
      ctx.fillRect(0, 0, 80, 45);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OFFICIAL LIVE', 40, 20);
      ctx.fillText('VERIFIED STUB', 40, 32);
      ctx.restore();

      // 底部壓克力反光線 (Gloss Reflection)
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(caseX + spineW, caseY + 10);
      ctx.lineTo(caseX + caseW - 10, caseY + caseH - 30);
      ctx.stroke();
      ctx.restore();

      // 底部文字
      ctx.font = '11px monospace';
      ctx.fillStyle = p.textSecondary;
      ctx.textAlign = 'right';
      ctx.fillText(`${watermark} • #STUB-JEWEL-CASE`, caseX + caseW - 20, caseY + caseH - 20);
    } else {
      // ══════════════════════════════════════════════════════════════════
      // 3. IG Stories 拍立得與透明背景貼紙 (Transparent PNG Sticker)
      // ══════════════════════════════════════════════════════════════════
      const stX = 40;
      const stY = 30;
      const stW = width - 80;
      const stH = height - 60;

      // 貼紙本體 (圓角半透明/或純白拍立得卡片)
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = p.cardBg;
      ctx.roundRect(stX, stY, stW, stH, 24);
      ctx.fill();
      ctx.restore();

      // 貼紙白色外圈虛線 (Sticker Cutout Border)
      ctx.save();
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.roundRect(stX - 6, stY - 6, stW + 12, stH + 12, 28);
      ctx.stroke();
      ctx.restore();

      // 拍立得相框內容
      ctx.fillStyle = p.textPrimary;
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(activeEvent.artist, stX + 24, stY + 48);

      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = p.accent;
      ctx.fillText(activeEvent.title, stX + 24, stY + 74);

      // 分隔線
      ctx.strokeStyle = p.border;
      ctx.beginPath();
      ctx.moveTo(stX + 24, stY + 95);
      ctx.lineTo(stX + stW - 24, stY + 95);
      ctx.stroke();

      // 關鍵現場參戰標籤 (Pill Badges)
      const drawBadge = (txt: string, bx: number, by: number, bg: string, color: string) => {
        ctx.font = 'bold 11px sans-serif';
        const txtW = ctx.measureText(txt).width;
        ctx.fillStyle = bg;
        ctx.roundRect(bx, by, txtW + 20, 26, 13);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(txt, bx + 10, by + 17);
        return txtW + 28;
      };

      let badgeX = stX + 24;
      badgeX += drawBadge(
        `📅 ${activeEvent.date}`,
        badgeX,
        stY + 115,
        'rgba(56,189,248,0.2)',
        '#38bdf8'
      );
      drawBadge(
        `📍 ${activeEvent.venue.split('(')[0].trim()}`,
        badgeX,
        stY + 115,
        'rgba(244,63,94,0.2)',
        '#f43f5e'
      );

      // 座位與出費大標
      ctx.fillStyle = p.textSecondary;
      ctx.font = '12px sans-serif';
      ctx.fillText(`席位：${activeEvent.seat}`, stX + 24, stY + 185);
      ctx.fillText(`演出曲目：${activeEvent.setlistCount || 20} 首現場直擊`, stX + 24, stY + 210);

      // 拍立得手寫簽名感浮水印
      ctx.font = 'italic 16px cursive, sans-serif';
      ctx.fillStyle = p.accent;
      ctx.textAlign = 'right';
      ctx.fillText(watermark, stX + stW - 24, stY + stH - 24);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawCard, 50);
    }
  }, [isOpen, style, palette, watermark, selectedEventId]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    haptics.medium();

    const fileName =
      style === 'VINTAGE_RECEIPT'
        ? `receipt_${activeEvent?.artist || 'concert'}.png`
        : style === 'JEWEL_CASE'
          ? `jewel_case_${activeEvent?.artist || 'concert'}.png`
          : `sticker_${activeEvent?.artist || 'concert'}.png`;

    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();

    setTimeout(() => {
      setDownloading(false);
      haptics.success();
    }, 400);
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    haptics.light();

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'stubbook_card.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${activeEvent?.artist} 參戰分享卡`,
            text: `這是我在 StubBook 記錄的 ${activeEvent?.title} 參戰卡！`,
            files: [file],
          });
          setShared(true);
          setTimeout(() => setShared(false), 2000);
        } else {
          // 降級為下載
          handleDownload();
        }
      });
    } catch {
      handleDownload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700/80 rounded-3xl w-full max-w-4xl my-auto p-5 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh]">
        {/* 背景光暈裝飾 */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* 頂部 Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-pink-500/20 to-amber-500/20 rounded-2xl border border-pink-500/30 text-pink-400 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  潮流社群卡工廠
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Card Lab
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                文青熱感應收據、CD 壓克力寶石外殼與 IG 限動透明貼紙導出
              </p>
            </div>
          </div>

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

        {/* 主體兩欄排版 */}
        <div className="flex-1 overflow-y-auto pr-1 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左側：控制項面版 (5 欄) */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1. 選擇參戰活動 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
                <Ticket className="w-3.5 h-3.5 text-pink-400" />
                <span>選擇欲分享的參戰場次</span>
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  haptics.light();
                  setSelectedEventId(e.target.value);
                }}
                className="w-full bg-gray-850 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
              >
                {currentEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.artist} - {e.title.slice(0, 24)} ({e.date})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. 風格切換 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>卡片視覺風格</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setStyle('VINTAGE_RECEIPT');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    style === 'VINTAGE_RECEIPT'
                      ? 'bg-amber-500/20 border-amber-500/80 text-white shadow-md'
                      : 'bg-gray-850 border-gray-750 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Receipt className="w-4 h-4 mb-1 text-amber-400" />
                  <div className="text-xs font-bold">熱感應收據</div>
                  <div className="text-[10px] text-gray-400">打字機鋸齒</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setStyle('JEWEL_CASE');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    style === 'JEWEL_CASE'
                      ? 'bg-pink-500/20 border-pink-500/80 text-white shadow-md'
                      : 'bg-gray-850 border-gray-750 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Disc3 className="w-4 h-4 mb-1 text-pink-400" />
                  <div className="text-xs font-bold">CD 壓克力盒</div>
                  <div className="text-[10px] text-gray-400">光澤立體專輯</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setStyle('TRANSPARENT_STICKER');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    style === 'TRANSPARENT_STICKER'
                      ? 'bg-sky-500/20 border-sky-500/80 text-white shadow-md'
                      : 'bg-gray-850 border-gray-750 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 mb-1 text-sky-400" />
                  <div className="text-xs font-bold">透明背景貼紙</div>
                  <div className="text-[10px] text-gray-400">IG 限動拖貼</div>
                </button>
              </div>
            </div>

            {/* 3. 調色盤切換 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-400" />
                <span>社群外觀調色盤</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(paletteConfig) as SnsCardPalette[]).map((pKey) => {
                  const p = paletteConfig[pKey];
                  const isSelected = palette === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => {
                        haptics.light();
                        setPalette(pKey);
                      }}
                      className={`p-2 rounded-xl border flex items-center space-x-2 text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-500/20 border-indigo-500 text-white'
                          : 'bg-gray-850 border-gray-750 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: p.bg }}
                      />
                      <span className="text-xs font-medium">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. 社群浮水印與帳號 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
                <AtSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>個人社群帳號 / 浮水印</span>
              </label>
              <input
                type="text"
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                placeholder="@your_instagram_handle"
                className="w-full bg-gray-850 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 5. 導出按鈕 */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? '生成並下載中...' : '下載高品質 PNG (2x Retina)'}</span>
              </button>

              <button
                onClick={handleShare}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-750 border border-gray-700 text-gray-200 font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors active:scale-95"
              >
                {shared ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4 text-sky-400" />
                )}
                <span>{shared ? '已送出分享！' : '社群直接轉發分享'}</span>
              </button>
            </div>
          </div>

          {/* 右側：即時 Canvas 預覽畫布 (7 欄) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-gray-950/80 rounded-2xl border border-gray-800/80 shadow-inner overflow-hidden min-h-[420px]">
            <div className="w-full flex items-center justify-between pb-2 text-[11px] text-gray-500">
              <span>Canvas 2x 即時預覽</span>
              <span>
                {style === 'VINTAGE_RECEIPT'
                  ? '600 × 820 px'
                  : style === 'JEWEL_CASE'
                    ? '600 × 680 px'
                    : '600 × 540 px'}
              </span>
            </div>

            <div className="max-w-full overflow-hidden flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                className="max-h-[480px] w-auto h-auto max-w-full rounded-lg shadow-2xl border border-gray-800/60 transition-transform duration-300"
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
