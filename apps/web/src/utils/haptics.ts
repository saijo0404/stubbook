import { nativeHaptics } from './native/nativeHaptics';

export const haptics = {
  /** 輕觸反饋（切換標籤、選取類別） */
  light: () => {
    nativeHaptics.light().catch(() => {});
  },

  /** 中度反饋（點擊主要動作按鈕、開啟彈窗） */
  medium: () => {
    nativeHaptics.medium().catch(() => {});
  },

  /** 重度反饋（啟動現場模式、螢幕高亮） */
  heavy: () => {
    nativeHaptics.heavy().catch(() => {});
  },

  /** 成功反饋（保存出席、遮罩完成、成功入庫） */
  success: () => {
    nativeHaptics.success().catch(() => {});
  },

  /** 警告 / 刪除反饋 */
  warning: () => {
    nativeHaptics.warning().catch(() => {});
  },

  /** 選取 / 換日回饋 */
  selection: () => {
    nativeHaptics.selection().catch(() => {});
  },
};
