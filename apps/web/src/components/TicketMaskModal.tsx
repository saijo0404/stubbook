'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, RotateCcw, Check, X, Sliders, Scissors } from 'lucide-react';

interface TicketMaskModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onApplyMask: (maskedBlob: Blob, isMasked: boolean) => void;
}

export function TicketMaskModal({
  isOpen,
  imageSrc,
  onClose,
  onApplyMask,
}: TicketMaskModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState<number>(30);
  const [maskType, setMaskType] = useState<'solid' | 'mosaic'>('solid');
  const [hasMasked, setHasMasked] = useState(false);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

  // 初始化並在 Canvas 上繪製原圖
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      setImageElement(img);
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      setHasMasked(false);
    };
  }, [isOpen, imageSrc]);

  if (!isOpen) return null;

  const resetImage = () => {
    if (!imageElement || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(imageElement, 0, 0);
    setHasMasked(false);
  };

  // 一鍵遮蓋常見條碼區（預設底部 22% 區域）
  const maskBottomBarcodeArea = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const barHeight = canvas.height * 0.22;
    const barY = canvas.height - barHeight;

    if (maskType === 'solid') {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, barY, canvas.width, barHeight);

      // 繪製安全遮罩紋理線條
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, barY + 4, canvas.width - 8, barHeight - 8);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = `bold ${Math.max(16, Math.floor(canvas.width * 0.025))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒 PRIVACY SHIELD · BARCODE PROTECTED', canvas.width / 2, barY + barHeight / 2);
    } else {
      applyMosaic(0, barY, canvas.width, barHeight);
    }

    setHasMasked(true);
  };

  // 馬賽克演算法
  const applyMosaic = (x: number, y: number, w: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startX = Math.max(0, Math.floor(x));
    const startY = Math.max(0, Math.floor(y));
    const width = Math.min(canvas.width - startX, Math.ceil(w));
    const height = Math.min(canvas.height - startY, Math.ceil(h));

    if (width <= 0 || height <= 0) return;

    const imgData = ctx.getImageData(startX, startY, width, height);
    const data = imgData.data;
    const blockSize = Math.max(12, Math.floor(canvas.width * 0.02));

    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        const pIndex = (by * width + bx) * 4;
        const r = data[pIndex];
        const g = data[pIndex + 1];
        const b = data[pIndex + 2];

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(
          startX + bx,
          startY + by,
          Math.min(blockSize, width - bx),
          Math.min(blockSize, height - by)
        );
      }
    }
  };

  // 取得滑鼠或觸控在 Canvas 內部實際像素座標
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    const radius = (brushSize / 100) * (canvas.width * 0.1);

    if (maskType === 'solid') {
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      applyMosaic(x - radius, y - radius, radius * 2, radius * 2);
    }

    setHasMasked(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onApplyMask(blob, hasMasked);
          onClose();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-gray-800 flex items-center justify-between bg-gray-950/80">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm text-white">票根個資與條碼隱私遮罩工具</h3>
              <p className="text-[11px] text-gray-400">
                滑鼠塗抹或點選一鍵遮罩，自動覆蓋 Barcode、QR Code、姓名或訂單序號
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 工具列 */}
        <div className="px-6 py-2.5 bg-gray-950 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-medium">遮罩樣式：</span>
            <button
              type="button"
              onClick={() => setMaskType('solid')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                maskType === 'solid'
                  ? 'bg-gray-800 text-white border-indigo-500'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-gray-200'
              }`}
            >
              ⬛ 黑色實心
            </button>
            <button
              type="button"
              onClick={() => setMaskType('mosaic')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                maskType === 'mosaic'
                  ? 'bg-gray-800 text-white border-indigo-500'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-gray-200'
              }`}
            >
              🧊 馬賽克
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <Sliders className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-400">筆刷：</span>
            {[15, 30, 50].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBrushSize(size)}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  brushSize === size
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {size === 15 ? '細' : size === 30 ? '中' : '粗'}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={maskBottomBarcodeArea}
              className="inline-flex items-center px-3 py-1.5 rounded-lg font-semibold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 transition-colors"
            >
              <Scissors className="h-3.5 w-3.5 mr-1" />
              一鍵遮蓋底部條碼區
            </button>
            <button
              type="button"
              onClick={resetImage}
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
              title="重設原圖"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              重設
            </button>
          </div>
        </div>

        {/* 畫布檢視區 */}
        <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-gray-950/90 select-none">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="max-w-full max-h-[58vh] object-contain rounded-xl shadow-2xl border border-gray-800 cursor-crosshair"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-800 bg-gray-950 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {hasMasked ? (
              <span className="text-emerald-400 font-semibold flex items-center">
                <Check className="h-3.5 w-3.5 mr-1" />
                已套用隱私遮罩保護
              </span>
            ) : (
              <span className="text-gray-500">提示：直接在圖片上方拖曳即可塗抹</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white rounded-xl"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow transition-colors"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              完成並套用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
