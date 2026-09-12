'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Download,
  Share2,
  CheckCircle,
  Flame,
  Award,
  Calendar,
  MapPin,
  RefreshCw,
  Heart,
  Zap,
} from 'lucide-react';
import { haptics } from '../utils/haptics';

interface TicketPrayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  posterUrl?: string | null;
  sessionDate?: string | null;
  sessionId?: string | null;
  venueName?: string | null;
}

interface Particle {
  id: number;
  text: string;
  x: number;
  y: number;
}

const BLESSING_TAGS = [
  '#搶票必中第一志願',
  '#神席第一排預定',
  '#本命親自眼神對視',
  '#候補奇蹟釋票',
  '#網速光速上岸',
  '#盲盒全抽出隱藏',
];

export function TicketPrayerModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  posterUrl,
  sessionDate,
  sessionId,
  venueName,
}: TicketPrayerModalProps) {
  const [prayerCount, setPrayerCount] = useState<number>(0);
  const [totalPrayers, setTotalPrayers] = useState<number>(0);
  const [luckyOmikuji, setLuckyOmikuji] = useState<string | null>(null);
  const [blessingTag, setBlessingTag] = useState<string>(BLESSING_TAGS[0]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isWoodFishBouncing, setIsWoodFishBouncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [omikujiDrawing, setOmikujiDrawing] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 初始化音效 (Web Audio API 模擬清脆木魚敲擊聲)
  const playWoodFishSound = () => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      const ctx = audioContextRef.current;
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      // 靜默降級，不影響操作
    }
  };

  // 載入該活動的祈願狀態
  useEffect(() => {
    if (!isOpen || !eventId) return;

    const fetchPrayerStatus = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ eventId });
        if (sessionId) params.append('sessionId', sessionId);

        const res = await fetch(`/api/prayers?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTotalPrayers(data.totalPrayers || 0);
          if (data.userPrayer) {
            setPrayerCount(data.userPrayer.prayer_count || 0);
            if (data.userPrayer.lucky_omikuji) {
              setLuckyOmikuji(data.userPrayer.lucky_omikuji);
            }
            if (data.userPrayer.blessing_tag) {
              setBlessingTag(data.userPrayer.blessing_tag);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load prayer status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrayerStatus();
  }, [isOpen, eventId, sessionId]);

  if (!isOpen) return null;

  // 敲木魚集氣互動
  const handleWoodFishClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    haptics.medium();
    playWoodFishSound();

    // 觸發縮放跳動
    setIsWoodFishBouncing(true);
    setTimeout(() => setIsWoodFishBouncing(false), 150);

    // 飄浮動畫粒子
    const rect = e.currentTarget.getBoundingClientRect();
    const newParticle: Particle = {
      id: Date.now() + Math.random(),
      text: Math.random() > 0.4 ? '功德 +1 📿' : '幸運值 +1 ✨',
      x: e.clientX - rect.left + (Math.random() * 40 - 20),
      y: e.clientY - rect.top,
    };
    setParticles((prev) => [...prev.slice(-6), newParticle]);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, 900);

    // 本地即時更新
    setPrayerCount((c) => c + 1);
    setTotalPrayers((t) => t + 1);

    // 異步儲存至後端
    try {
      await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          sessionId: sessionId || null,
          increment: 1,
          blessingTag,
        }),
      });
    } catch (err) {
      console.error('Failed to submit prayer:', err);
    }
  };

  // 抽取幸運籤詩 / 開運御守
  const handleDrawOmikuji = async () => {
    haptics.selection();
    setOmikujiDrawing(true);
    try {
      const res = await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          sessionId: sessionId || null,
          increment: 1,
          blessingTag,
          drawOmikuji: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLuckyOmikuji(data.omikuji);
        setPrayerCount(data.prayer.prayer_count);
        setTotalPrayers(data.totalPrayers);
        haptics.success();
      }
    } catch (err) {
      console.error('Failed to draw omikuji:', err);
    } finally {
      setTimeout(() => setOmikujiDrawing(false), 400);
    }
  };

  // 生成並下載開運御守圖卡
  const handleDownloadOmikujiCard = async () => {
    setGeneratingCard(true);
    haptics.medium();

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // 1. 背景漸層 (Deep Burgundy to Mystic Indigo)
      const bgGradient = ctx.createLinearGradient(0, 0, 800, 1200);
      bgGradient.addColorStop(0, '#1c0f24');
      bgGradient.addColorStop(0.5, '#2b1038');
      bgGradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, 800, 1200);

      // 2. 御守雙重金框與花邊
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.strokeRect(30, 30, 740, 1140);

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(42, 42, 716, 1116);

      // 角落飾角
      const drawCorner = (x: number, y: number) => {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 6, y - 6, 12, 12);
      };
      drawCorner(30, 30);
      drawCorner(770, 30);
      drawCorner(30, 1170);
      drawCorner(770, 1170);

      // 3. 頂部標題與推活御守標章
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 36px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STUBBOOK 推活祈願御守', 400, 110);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '18px monospace';
      ctx.fillText('CONCERT BLESSING & LUCKY TALISMAN', 400, 145);

      // 4. 活動標題區塊
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 38px "Noto Sans TC", sans-serif';

      // 標題換行處理
      const maxTitleWidth = 660;
      const words = eventTitle.split('');
      let currentLine = '';
      const lines: string[] = [];
      for (const char of words) {
        if (ctx.measureText(currentLine + char).width < maxTitleWidth) {
          currentLine += char;
        } else {
          lines.push(currentLine);
          currentLine = char;
        }
      }
      lines.push(currentLine);

      let titleY = 230;
      for (const line of lines.slice(0, 2)) {
        ctx.fillText(line, 400, titleY);
        titleY += 48;
      }

      // 5. 場次與場館
      if (sessionDate || venueName) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '22px "Noto Sans TC", sans-serif';
        const infoText = [
          sessionDate ? new Date(sessionDate).toLocaleDateString('zh-TW') : null,
          venueName || null,
        ]
          .filter(Boolean)
          .join(' · ');
        ctx.fillText(infoText, 400, titleY + 10);
      }

      // 6. 籤詩御守主體卡牌 (中央金框紅底御守牌)
      const omikujiBoxY = 430;
      const omikujiBoxH = 430;
      const cardGrad = ctx.createLinearGradient(120, omikujiBoxY, 680, omikujiBoxY + omikujiBoxH);
      cardGrad.addColorStop(0, '#881337');
      cardGrad.addColorStop(1, '#4c0519');
      ctx.fillStyle = cardGrad;
      ctx.roundRect
        ? ctx.roundRect(120, omikujiBoxY, 560, omikujiBoxH, 24)
        : ctx.fillRect(120, omikujiBoxY, 560, omikujiBoxH);
      ctx.fill();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 籤詩大字提取 (例如: 超大吉 / 大吉)
      const fortuneMatch = luckyOmikuji?.match(/【(.*?)】/);
      const fortuneTitle = fortuneMatch ? fortuneMatch[1] : '大吉';
      const fortuneDetail = luckyOmikuji
        ? luckyOmikuji.replace(/【.*?】/, '').trim()
        : '秒殺搶票必中第一志願！';

      ctx.fillStyle = '#fde047';
      ctx.font = '900 84px "Noto Serif TC", serif';
      ctx.fillText(fortuneTitle, 400, omikujiBoxY + 120);

      // 祝福小字
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 28px "Noto Sans TC", sans-serif';
      ctx.fillText(blessingTag, 400, omikujiBoxY + 190);

      // 籤詩詳細描述
      ctx.fillStyle = '#f8fafc';
      ctx.font = '24px "Noto Sans TC", sans-serif';

      const detailWords = fortuneDetail.split('');
      let dLine = '';
      const dLines: string[] = [];
      for (const c of detailWords) {
        if (ctx.measureText(dLine + c).width < 460) {
          dLine += c;
        } else {
          dLines.push(dLine);
          dLine = c;
        }
      }
      dLines.push(dLine);

      let dy = omikujiBoxY + 260;
      for (const l of dLines) {
        ctx.fillText(l, 400, dy);
        dy += 36;
      }

      // 7. 功德與集氣數據
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(`個人敲木魚: ${prayerCount} 次 · 全場共鳴: ${totalPrayers} 次`, 400, 940);

      // 8. 底部認證印章與防偽字樣
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '18px monospace';
      ctx.fillText('STUBBOOK LUCKY CHARM · 推活神明保佑 · 願望成真', 400, 1070);

      ctx.fillStyle = '#64748b';
      ctx.font = '14px monospace';
      ctx.fillText(`STAMP: ${new Date().toISOString().slice(0, 10)} #FAN-RITUAL-PRAYER`, 400, 1105);

      // 匯出下載
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `StubBook_Lucky_Talisman_${eventId.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate talisman card:', err);
      alert('御守圖卡生成失敗，請稍後再試');
    } finally {
      setGeneratingCard(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center">
      <div className="bg-gray-900 border border-gray-700/80 rounded-3xl w-full max-w-xl my-auto p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90dvh]">
        {/* 頂部光暈裝飾 */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 標題與關閉按鈕 */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 sticky top-0 bg-gray-900/90 backdrop-blur z-20">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                推活祈願集氣室
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                  Fan Ritual
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                敲木魚集功德、抽幸運御守籤詩，為搶票與神席祈福！
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 滾動內容本體 */}
        <div className="overflow-y-auto space-y-6 pt-4 pr-1">
          {/* 活動資訊卡片 */}
          <div className="bg-gray-850/90 border border-gray-700/80 rounded-2xl p-3.5 flex items-center space-x-3.5">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={eventTitle}
                className="w-14 h-18 object-cover rounded-xl border border-gray-700 flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-18 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center text-gray-500 flex-shrink-0">
                <Calendar className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{eventTitle}</h4>
              <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                {sessionDate && (
                  <span className="font-mono text-indigo-300">
                    {new Date(sessionDate).toLocaleDateString('zh-TW')}
                  </span>
                )}
                {venueName && <span className="text-gray-300">@{venueName}</span>}
              </div>
              <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1 font-mono">
                <Flame className="h-3 w-3" />
                全場集氣次數: <span className="font-bold text-amber-300">{totalPrayers}</span> 次
              </div>
            </div>
          </div>

          {/* 敲木魚集氣互動專區 */}
          <div className="bg-gradient-to-b from-gray-850 to-gray-900 border border-gray-800 rounded-3xl p-6 text-center relative flex flex-col items-center">
            <div className="text-xs font-semibold text-gray-400 mb-1">
              點擊木魚敲擊集氣 · 功德無量
            </div>
            <div className="text-2xl font-black text-amber-300 font-mono mb-4">
              {prayerCount} <span className="text-xs text-gray-400 font-normal">次功德</span>
            </div>

            {/* 木魚按鈕容器 */}
            <div className="relative">
              {/* 飄浮粒子動畫 */}
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="absolute pointer-events-none text-xs font-bold text-amber-300 animate-floatUp select-none whitespace-nowrap z-20"
                  style={{ left: `${p.x}px`, top: `${p.y}px` }}
                >
                  {p.text}
                </div>
              ))}

              <button
                type="button"
                onClick={handleWoodFishClick}
                className={`w-32 h-32 rounded-full bg-gradient-to-br from-amber-700 via-yellow-800 to-amber-950 border-4 border-amber-500/80 shadow-2xl flex flex-col items-center justify-center text-white transition-all transform active:scale-90 hover:shadow-amber-500/30 select-none ${
                  isWoodFishBouncing ? 'scale-95 shadow-inner' : 'hover:scale-105'
                }`}
                title="敲木魚集氣"
              >
                <span className="text-4xl">🪵</span>
                <span className="text-xs font-black tracking-widest mt-1 text-amber-200 uppercase">
                  敲擊集氣
                </span>
              </button>
            </div>

            <p className="text-[11px] text-gray-500 mt-4">
              支援觸覺震動回饋與敲擊音效 · 越敲越幸運
            </p>
          </div>

          {/* 祈願祝福標籤選擇 */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span>選擇祈願心願:</span>
              <span className="text-[10px] text-gray-500">將印製於御守圖卡</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BLESSING_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setBlessingTag(tag);
                    haptics.selection();
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                    blessingTag === tag
                      ? 'bg-rose-950/80 border-rose-500 text-rose-300 font-bold shadow-sm'
                      : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 開運御守與籤詩卡片 */}
          <div className="bg-gradient-to-br from-rose-950/40 via-purple-950/20 to-gray-900 border border-rose-900/60 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="h-4 w-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">開賣幸運籤詩御守</h4>
              </div>
              <button
                type="button"
                onClick={handleDrawOmikuji}
                disabled={omikujiDrawing}
                className="text-xs px-3 py-1 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-semibold rounded-lg shadow transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${omikujiDrawing ? 'animate-spin' : ''}`} />
                <span>{luckyOmikuji ? '重新求籤' : '抽籤祈願'}</span>
              </button>
            </div>

            {luckyOmikuji ? (
              <div className="bg-gray-950/70 border border-amber-500/30 rounded-2xl p-4 text-center space-y-2 relative overflow-hidden">
                <div className="text-xs font-mono text-amber-400">{blessingTag}</div>
                <div className="text-xl font-black text-rose-400 tracking-wide font-serif">
                  {luckyOmikuji.match(/【(.*?)】/)?.[0] || '【大吉】'}
                </div>
                <div className="text-xs text-gray-200 leading-relaxed font-medium">
                  {luckyOmikuji.replace(/【.*?】/, '').trim()}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-950/40 border border-dashed border-gray-800 rounded-2xl text-center text-xs text-gray-400">
                點擊上方「抽籤祈願」獲取專屬幸運籤詩與開賣御守！
              </div>
            )}

            {/* 一鍵生成與下載御守圖卡 */}
            <button
              type="button"
              onClick={handleDownloadOmikujiCard}
              disabled={generatingCard || !luckyOmikuji}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-yellow-600 hover:from-rose-500 hover:to-yellow-500 text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {generatingCard ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>下載開運御守圖卡 (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
