/**
 * Native Status Bar & System UI Controller
 * Manages status bar styling, transparency, and immersive concert mode fullscreen.
 */

import { StatusBar, Style } from '@capacitor/status-bar';
import { nativeBridge } from './nativeBridge';

export const nativeStatusBar = {
  /** Set status bar to dark theme (light icons on dark background) */
  async setDarkTheme(): Promise<void> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('StatusBar')) {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0b0f19' });
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch (err) {
        console.warn('Native status bar error:', err);
      }
    }
  },

  /** Enable or disable immersive concert mode (hiding/showing status bar) */
  async setConcertMode(enabled: boolean): Promise<void> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('StatusBar')) {
      try {
        if (enabled) {
          await StatusBar.hide();
        } else {
          await StatusBar.show();
          await this.setDarkTheme();
        }
      } catch (err) {
        console.warn('Failed to toggle status bar for concert mode:', err);
      }
    }
  },
};
