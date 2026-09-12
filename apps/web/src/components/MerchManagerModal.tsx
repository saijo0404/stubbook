'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface MerchItem {
  id: string;
  attendanceId: string;
  userId: string;
  itemName: string;
  category: string;
  price: number;
  currency: string;
  quantity: number;
  photoUrl: string | null;
  createdAt: string;
}

interface MerchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceId: string;
  eventTitle: string;
  onUpdated?: () => void;
}

export const MERCH_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  LIGHTSTICK: {
    label: '應援手燈',
    icon: '🪄',
    color: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  },
  APPAREL: {
    label: '服飾 T恤',
    icon: '👕',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  TOWEL: {
    label: '應援毛巾',
    icon: '🧣',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  PAMPHLET: {
    label: '場刊畫冊',
    icon: '📖',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  BADGE: {
    label: '徽章別針',
    icon: '📛',
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  ACCESSORY: {
    label: '提袋配件',
    icon: '🎒',
    color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  OTHER: {
    label: '其他戰利品',
    icon: '📦',
    color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  },
};

export const MerchManagerModal: React.FC<MerchManagerModalProps> = ({
  isOpen,
  onClose,
  attendanceId,
  eventTitle,
  onUpdated,
}) => {
  const [items, setItems] = useState<MerchItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 新增表單狀態
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<string>('LIGHTSTICK');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [currency, setCurrency] = useState<string>('TWD');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && attendanceId) {
      loadMerchItems();
    }
  }, [isOpen, attendanceId]);

  const loadMerchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/merchandise?attendanceId=${encodeURIComponent(attendanceId)}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalCost(data.totalCost || 0);
      }
    } catch (err) {
      console.error('載入周邊清單失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'merch');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '圖片上傳失敗');
      }

      const data = await res.json();
      setPhotoUrl(data.url);
    } catch (err) {
      const error = err as Error;
      alert(`周邊照片上傳失敗: ${error.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/merchandise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId,
          itemName: itemName.trim(),
          category,
          price: Number(price) || 0,
          currency,
          quantity: Number(quantity) || 1,
          photoUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '新增周邊失敗');
      }

      // 重設表單
      setItemName('');
      setPrice('');
      setQuantity(1);
      setPhotoUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await loadMerchItems();
      onUpdated?.();
    } catch (err) {
      const error = err as Error;
      alert(`新增失敗: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」這件周邊戰利品嗎？`)) return;

    try {
      const res = await fetch(`/api/merchandise?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '刪除失敗');
      }

      await loadMerchItems();
      onUpdated?.();
    } catch (err) {
      const error = err as Error;
      alert(`刪除失敗: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 pt-safe pb-safe bg-black/80 backdrop-blur-sm animate-fadeIn flex min-h-full items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl my-auto max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛍️</span>
              <h3 className="text-lg font-bold text-zinc-100">演唱會戰利品與周邊清單</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1 truncate max-w-md">{eventTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Summary Banner */}
          <div className="grid grid-cols-2 gap-4 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-zinc-900 border border-purple-500/20 rounded-xl p-4">
            <div>
              <div className="text-xs text-purple-300 font-medium">戰利品總件數</div>
              <div className="text-2xl font-black text-white mt-1">
                {items.reduce((acc, it) => acc + (it.quantity || 1), 0)}{' '}
                <span className="text-sm font-normal text-zinc-400">件</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-purple-300 font-medium">周邊總花費</div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {currency} {totalCost.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Add Merch Form */}
          <form
            onSubmit={handleAddItem}
            className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4 space-y-4"
          >
            <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <span>➕</span> 記錄新的戰利品
            </h4>

            {/* Category selection */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">商品類別</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(MERCH_CATEGORIES).map(([catKey, cat]) => (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                      category === catKey
                        ? `${cat.color} font-bold ring-1 ring-white/20`
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">周邊品名 *</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="例如：2026 巡演專屬場控手燈、會場限定 T-shirt"
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Price, Currency & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">單價</label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">幣別</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="TWD">TWD (新台幣)</option>
                  <option value="JPY">JPY (日圓)</option>
                  <option value="USD">USD (美元)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">購買數量</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">實體照片 (可選)</label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-200 transition flex items-center gap-1.5"
                >
                  <span>📷</span>
                  <span>
                    {uploadingPhoto ? '上傳中...' : photoUrl ? '更換照片' : '上傳戰利品實拍'}
                  </span>
                </button>
                {photoUrl && (
                  <div className="flex items-center gap-2">
                    <img
                      src={photoUrl}
                      alt="預覽"
                      className="w-10 h-10 object-cover rounded-lg border border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(null)}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      移除
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !itemName.trim()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              {submitting ? '記錄中...' : '加入周邊戰利品'}
            </button>
          </form>

          {/* Items List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-300 flex items-center justify-between">
              <span>戰利品明細清單</span>
              <span className="text-xs text-zinc-500">{items.length} 項物品</span>
            </h4>

            {loading ? (
              <div className="text-center py-8 text-zinc-500 text-sm">載入戰利品中...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl">
                <span className="text-3xl block mb-2">🎁</span>
                <p className="text-sm text-zinc-400">尚未記錄任何周邊物品</p>
                <p className="text-xs text-zinc-500 mt-1">
                  手燈、T恤、會場限定場刊，把演唱會的美好記憶帶回家吧！
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const cat = MERCH_CATEGORIES[item.category] || MERCH_CATEGORIES.OTHER;
                  const itemSubtotal = (item.price || 0) * (item.quantity || 1);

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/50 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.itemName}
                            className="w-12 h-12 object-cover rounded-lg border border-zinc-700 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-zinc-850 border border-zinc-700/60 flex items-center justify-center text-xl flex-shrink-0">
                            {cat.icon}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${cat.color}`}
                            >
                              {cat.label}
                            </span>
                            <h5 className="text-sm font-semibold text-zinc-100 truncate">
                              {item.itemName}
                            </h5>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1">
                            {item.price > 0 ? (
                              <>
                                <span>
                                  {item.currency} {item.price.toLocaleString()}
                                </span>
                                <span className="mx-1.5 text-zinc-600">×</span>
                                <span>{item.quantity} 件</span>
                              </>
                            ) : (
                              <span>數量: {item.quantity} (免費特典 / 贈品)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-amber-300">
                            {itemSubtotal > 0
                              ? `${item.currency} ${itemSubtotal.toLocaleString()}`
                              : '免費'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.itemName)}
                          className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-750 transition"
                          title="刪除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
