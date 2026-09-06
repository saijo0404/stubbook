/**
 * 觸覺震動回饋工具 (Haptics Feedback)
 * 支援行動端 PWA (navigator.vibrate) 與 Capacitor 原生環境
 */

export const haptics = {
  /** 輕觸反饋（切換標籤、選取類別） */
  light: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // 靜默降級
    }
  },

  /** 中度反饋（點擊主要動作按鈕、開啟彈窗） */
  medium: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
    } catch {
      // 靜默降級
    }
  },

  /** 成功反饋（保存出席、遮罩完成、成功入庫） */
  success: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([15, 30, 20]);
      }
    } catch {
      // 靜默降級
    }
  },

  /** 警告 / 刪除反饋 */
  warning: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 50, 40]);
      }
    } catch {
      // 靜默降級
    }
  },

  /** 選取 / 換日回饋 */
  selection: () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(8);
      }
    } catch {
      // 靜默降級
    }
  },
};
