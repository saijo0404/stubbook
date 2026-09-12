/**
 * Capacitor Native Platform Bridge
 * Detects native runtime (iOS / Android) vs Web / PWA, with graceful fallback detection.
 */

import { Capacitor } from '@capacitor/core';

export type SupportedPlatform = 'ios' | 'android' | 'web';

export const nativeBridge = {
  /** Check whether code is running inside a Capacitor native shell (iOS or Android) */
  isNative(): boolean {
    try {
      return typeof window !== 'undefined' && Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  },

  /** Get current runtime platform */
  getPlatform(): SupportedPlatform {
    try {
      if (typeof window === 'undefined') return 'web';
      const p = Capacitor.getPlatform();
      if (p === 'ios' || p === 'android') return p;
      return 'web';
    } catch {
      return 'web';
    }
  },

  /** Check if running on iOS native shell */
  isIOS(): boolean {
    return this.getPlatform() === 'ios';
  },

  /** Check if running on Android native shell */
  isAndroid(): boolean {
    return this.getPlatform() === 'android';
  },

  /** Check if running in browser / PWA */
  isWeb(): boolean {
    return this.getPlatform() === 'web';
  },

  /** Check if a specific Capacitor plugin is registered and available */
  isPluginAvailable(name: string): boolean {
    try {
      return typeof window !== 'undefined' && Capacitor.isPluginAvailable(name);
    } catch {
      return false;
    }
  },
};
