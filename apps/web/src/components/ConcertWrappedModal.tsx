'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Share2,
  X,
  Trophy,
  Calendar,
  MapPin,
  Music2,
  DollarSign,
  Ticket,
  Flame,
  Check,
} from 'lucide-react';
import { haptics } from '../utils/haptics';

interface AnalyticsData {
  selectedYear: string;
  availableYears: string[];
  summary: {
    totalEvents: number;
    totalSessions: number;
    totalAttended: number;
    completedCount: number;
    confirmedCount: number;
    wantToGoCount: number;
    totalVenues: number;
    totalMedia: number;
    fanTitle: string;
  };
  spending: {
    ticketSpending: number;
    merchSpending: number;
    grandTotal: number;
    totalMerchCount: number;
    merchBreakdown: Array<{ category: string; count: number; totalCost: number }>;
  };
  topArtists: Array<{
    artistName: string;
    sessionsCount: number;
    attendedCount: number;
    spending: number;
  }>;
  topVenues: Array<{ venueName: string; visitsCount: number }>;
  monthlyStats: Array<{ month: string; eventsCount: number; ticketSpend: number }>;
}

interface ConcertWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AnalyticsData;
}

export const ConcertWrappedModal: React.FC<ConcertWrappedModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);

  const yearLabel =
    data.selectedYear === 'ALL'
      ? `${new Date().getFullYear()} 歷年全紀錄`
      : `${data.selectedYear} 年度`;

  const topArtist = data.topArtists[0]?.artistName || '眾多音樂人';
  const topVenue = data.topVenues[0]?.venueName || '各大音樂場館';

  // 繪製 9:16 高解析度 Canvas 海報 (1080 x 1920)
  const drawPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    // 1. 深邃暗黑霓虹漸層背景
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#09090b');
    bgGrad.addColorStop(0.3, '#180e29');
    bgGrad.addColorStop(0.7, '#0f172a');
    bgGrad.addColorStop(1, '#030712');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. 裝飾光暈
    const radial = ctx.createRadialGradient(W / 2, 400, 50, W / 2, 400, 600);
    radial.addColorStop(0, 'rgba(129, 140, 248, 0.25)');
    radial.addColorStop(0.5, 'rgba(192, 132, 252, 0.1)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);

    // 3. 頂部標題與年份
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STUBBOOK · CONCERT WRAPPED', W / 2, 140);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 76px sans-serif';
    ctx.fillText(`${yearLabel} 觀演回顧`, W / 2, 230);

    // 4. 樂迷封號 Badge
    ctx.fillStyle = 'rgba(79, 70, 229, 0.4)';
    const badgeW = 600;
    const badgeH = 70;
    const badgeX = (W - badgeW) / 2;
    const badgeY = 280;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 35);
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#e0e7ff';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(`✨ ${data.summary.fanTitle}`, W / 2, 327);

    // 5. 核心指標四宮格卡片
    const cards = [
      { label: '參戰總場次', value: `${data.summary.totalAttended} 場`, icon: '🎟️' },
      { label: '踩點場館數', value: `${data.summary.totalVenues} 座`, icon: '📍' },
      {
        label: '全旅程花費',
        value: `$${data.spending.grandTotal.toLocaleString()}`,
        icon: '💳',
      },
      { label: '典藏現場回憶', value: `${data.summary.totalMedia} 則`, icon: '📸' },
    ];

    const startY = 410;
    const cardW = 440;
    const cardH = 180;
    const gapX = 40;
    const gapY = 30;

    cards.forEach((c, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = (W - (cardW * 2 + gapX)) / 2 + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      // 卡片底色
      ctx.fillStyle = 'rgba(24, 24, 27, 0.7)';
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 卡片標籤與值
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${c.icon} ${c.label}`, x + 35, y + 60);

      ctx.fillStyle = '#f4f4f5';
      ctx.font = '900 48px sans-serif';
      ctx.fillText(c.value, x + 35, y + 130);
    });

    // 6. TOP 1 藝人 Spotlight
    const spotlightY = 880;
    const spotW = 920;
    const spotH = 260;
    const spotX = (W - spotW) / 2;

    const spotGrad = ctx.createLinearGradient(spotX, spotlightY, spotX + spotW, spotlightY + spotH);
    spotGrad.addColorStop(0, 'rgba(67, 56, 202, 0.5)');
    spotGrad.addColorStop(1, 'rgba(168, 85, 247, 0.3)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.roundRect(spotX, spotlightY, spotW, spotH, 32);
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('👑 年度最愛歌手 · TOP 1 ARTIST', spotX + 50, spotlightY + 65);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 56px sans-serif';
    ctx.fillText(topArtist, spotX + 50, spotlightY + 140);

    ctx.fillStyle = '#e9d5ff';
    ctx.font = '28px sans-serif';
    ctx.fillText(`陪伴度過無數震撼現場與音符感動`, spotX + 50, spotlightY + 205);

    // 7. 最常造訪場館 & 周邊戰利品概況
    const venueY = 1180;
    const subW = 440;
    const subH = 240;

    // 場館卡
    const vX = (W - (subW * 2 + gapX)) / 2;
    ctx.fillStyle = 'rgba(24, 24, 27, 0.7)';
    ctx.beginPath();
    ctx.roundRect(vX, venueY, subW, subH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('🏟️ 最常踩點場館', vX + 35, venueY + 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(topVenue, vX + 35, venueY + 120);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '24px sans-serif';
    ctx.fillText(
      `造訪共 ${data.topVenues[0]?.visitsCount || 1} 次演出`,
      vX + 35,
      venueY + 180
    );

    // 周邊開銷卡
    const mX = vX + subW + gapX;
    ctx.fillStyle = 'rgba(24, 24, 27, 0.7)';
    ctx.beginPath();
    ctx.roundRect(mX, venueY, subW, subH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('🛍️ 周邊戰利品投資', mX + 35, venueY + 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(`$${data.spending.merchSpending.toLocaleString()}`, mX + 35, venueY + 120);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '24px sans-serif';
    ctx.fillText(`典藏 ${data.spending.totalMerchCount} 件應援物`, mX + 35, venueY + 180);

    // 8. 復古撕票虛線與防偽浮水印
    const dashY = 1500;
    ctx.setLineDash([16, 16]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(60, dashY);
    ctx.lineTo(W - 60, dashY);
    ctx.stroke();
    ctx.setLineDash([]); // 重置虛線

    // 左右兩側半圓撕票缺口
    ctx.fillStyle = '#030712';
    ctx.beginPath();
    ctx.arc(0, dashY, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W, dashY, 36, 0, Math.PI * 2);
    ctx.fill();

    // 9. 底部 StubBook 品牌與簽名
    ctx.fillStyle = '#818cf8';
    ctx.font = '900 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STUBBOOK · 演唱會回憶手帳', W / 2, 1620);

    ctx.fillStyle = '#71717a';
    ctx.font = '24px sans-serif';
    ctx.fillText(
      '私人本地 SQLite 驅動 · 票根典藏 · 視野圖庫 · 現場歌單',
      W / 2,
      1680
    );

    ctx.fillStyle = '#52525b';
    ctx.font = '22px sans-serif';
    ctx.fillText(
      `產出時間：${new Date().toLocaleDateString('zh-TW')} · https://github.com/saijo0404/stubbook`,
      W / 2,
      1730
    );
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        drawPoster();
      }, 100);
    }
  }, [isOpen, data]);

  // 下載 PNG 圖片
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    haptics.success();
    setDownloading(true);

    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `StubBook_Concert_Wrapped_${data.selectedYear}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('下載圖片失敗:', err);
    } finally {
      setDownloading(false);
    }
  };

  // 原生系統分享 (Web Share API)
  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    haptics.medium();

    try {
      if (navigator.share) {
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File(
              [blob],
              `StubBook_Wrapped_${data.selectedYear}.png`,
              {
                type: 'image/png',
              }
            );

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `${yearLabel} 演唱會回憶回顧`,
                text: `我在 ${yearLabel} 參戰了 ${data.summary.totalAttended} 場演唱會！封號：${data.summary.fanTitle} 🎶`,
                files: [file],
              });
              setShared(true);
              setTimeout(() => setShared(false), 2000);
              return;
            }
          }

          // 降級純文字分享
          await navigator.share({
            title: `${yearLabel} 演唱會回憶回顧`,
            text: `我在 ${yearLabel} 參戰了 ${data.summary.totalAttended} 場演唱會！最常看的歌手是 ${topArtist}，封號：${data.summary.fanTitle} 🎶`,
            url: window.location.href,
          });
          setShared(true);
          setTimeout(() => setShared(false), 2000);
        });
      } else {
        handleDownload();
      }
    } catch (err) {
      console.warn('分享取消或不支援:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[95vh] flex flex-col bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              StubBook Wrapped 年度足跡卡
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 預覽海報 Canvas 區塊 */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center bg-zinc-950/50">
          <div className="relative w-full max-w-[340px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain block"
            />
          </div>
        </div>

        {/* 底部操作按鈕 */}
        <div className="px-5 py-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 py-2.5 px-4 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 border border-zinc-700 transition active:scale-95"
          >
            {shared ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>已分享</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-indigo-400" />
                <span>分享至社群</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? '儲存中...' : '下載 9:16 海報'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
