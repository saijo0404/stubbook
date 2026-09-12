/**
 * Native Network & Venue Signal Monitor
 * Detects online/offline transitions, cellular network congestion, and offline protection status.
 */

import { Network, ConnectionStatus } from '@capacitor/network';
import { nativeBridge } from './nativeBridge';

export interface AppNetworkStatus {
  connected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
  isCellular: boolean;
  isOffline: boolean;
}

export const nativeNetwork = {
  /** Get current network status */
  async getStatus(): Promise<AppNetworkStatus> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Network')) {
      try {
        const status = await Network.getStatus();
        return this.mapStatus(status);
      } catch (err) {
        console.warn('Native network error, using browser navigator:', err);
      }
    }

    const isOnline =
      typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
        ? navigator.onLine
        : true;
    return {
      connected: isOnline,
      connectionType: isOnline ? 'unknown' : 'none',
      isCellular: false,
      isOffline: !isOnline,
    };
  },

  /** Listen for network connectivity changes */
  addListener(callback: (status: AppNetworkStatus) => void): () => void {
    let cleanup = () => {};

    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Network')) {
      try {
        const handlePromise = Network.addListener('networkStatusChange', (status) => {
          callback(this.mapStatus(status));
        });
        cleanup = () => {
          handlePromise.then((h) => h.remove()).catch(() => {});
        };
        return cleanup;
      } catch (err) {
        console.warn('Failed to bind native network listener:', err);
      }
    }

    // Web fallback
    if (typeof window !== 'undefined') {
      const handleOnline = () =>
        callback({
          connected: true,
          connectionType: 'unknown',
          isCellular: false,
          isOffline: false,
        });
      const handleOffline = () =>
        callback({
          connected: false,
          connectionType: 'none',
          isCellular: false,
          isOffline: true,
        });

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      cleanup = () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return cleanup;
  },

  mapStatus(status: ConnectionStatus): AppNetworkStatus {
    const isConnected = !!status.connected;
    const isCellular = status.connectionType === 'cellular';
    return {
      connected: isConnected,
      connectionType: (status.connectionType as any) || (isConnected ? 'unknown' : 'none'),
      isCellular,
      isOffline: !isConnected,
    };
  },
};
