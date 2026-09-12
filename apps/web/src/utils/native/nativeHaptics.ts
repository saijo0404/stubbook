/**
 * Native Haptics & Vibration Engine
 * Supports @capacitor/haptics in native shell and navigator.vibrate in browser/PWA.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { nativeBridge } from './nativeBridge';

export const nativeHaptics = {
  /** 輕觸反饋（切換標籤、選取類別） */
  async light(): Promise<void> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Haptics')) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
        return;
      } catch {
        // Fallback
      }
    }
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  },

  /** 中度反饋（點擊主要動作按鈕、開啟彈窗） */
  async medium(): Promise<void> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Haptics')) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
        return;
      } catch {
        // Fallback
      }
    }
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
  },

  /** 重度反饋（啟動現場模式、螢幕高亮） */
  async heavy(): Promise<void> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Haptics')) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        return;
      } catch {
        // Fallback
      }
    }
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(45);
      } catch {}
    }
  },

  /** 成功反饋（保存出席、遮罩完成、成功入庫） */
  async success(): Promise<void> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Haptics')) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
        return;
      } catch {
        // Fallback
      }
    }
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([15, 30, 20]);
      } catch {}
    }
  },

  /** 警告 / 刪除反饋 */
  async warning(): Promise<void> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Haptics')) {
      try {
        await Haptics.notification({ type: NotificationType.Warning });
        return;
      } catch {
        // Fallback
      }
    }
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 50, 40]);
      } catch {}
    }
  },

  /** 選取 / 滾動刻度回饋 */
  async selection(): Promise<void> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Haptics')) {
      try {
        await Haptics.selectionChanged();
        return;
      } catch {
        // Fallback
      }
    }
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
  },
};
