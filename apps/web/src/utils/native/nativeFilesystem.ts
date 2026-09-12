/**
 * Native Filesystem & Backup Storage Adapter
 * Leverages @capacitor/filesystem to store and read .stubbook packages locally on mobile devices.
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { nativeBridge } from './nativeBridge';

export interface FileSaveResult {
  success: boolean;
  uri?: string;
  path?: string;
  source: 'native-filesystem' | 'web-download';
}

export const nativeFilesystem = {
  /**
   * Save .stubbook backup file to local filesystem
   * On Android / iOS: writes to Documents directory
   * On Web: triggers browser download anchor
   */
  async saveBackupPackage(fileName: string, base64OrBlob: string | Blob): Promise<FileSaveResult> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Filesystem')) {
      try {
        let base64Data: string;
        if (typeof base64OrBlob === 'string') {
          base64Data = base64OrBlob.includes(',') ? base64OrBlob.split(',')[1] : base64OrBlob;
        } else {
          base64Data = await this.blobToBase64(base64OrBlob);
        }

        const writeRes = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });

        return {
          success: true,
          uri: writeRes.uri,
          path: fileName,
          source: 'native-filesystem',
        };
      } catch (err) {
        console.warn('Native filesystem write failed, falling back to Web download:', err);
      }
    }

    // Web fallback
    return this.fallbackWebDownload(fileName, base64OrBlob);
  },

  /**
   * Read file from native device Documents folder
   */
  async readBackupPackage(fileName: string): Promise<string> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Filesystem')) {
      const readRes = await Filesystem.readFile({
        path: fileName,
        directory: Directory.Documents,
      });

      return typeof readRes.data === 'string' ? readRes.data : '';
    }

    throw new Error('Native filesystem read is only available in native mobile environment');
  },

  /** Fallback to browser Blob download */
  fallbackWebDownload(fileName: string, base64OrBlob: string | Blob): FileSaveResult {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { success: false, source: 'web-download' };
    }

    let url: string;
    if (typeof base64OrBlob === 'string') {
      const byteCharacters = atob(
        base64OrBlob.includes(',') ? base64OrBlob.split(',')[1] : base64OrBlob
      );
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/octet-stream' });
      url = URL.createObjectURL(blob);
    } else {
      url = URL.createObjectURL(base64OrBlob);
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return {
      success: true,
      uri: url,
      path: fileName,
      source: 'web-download',
    };
  },

  async blobToBase64(blob: Blob): Promise<string> {
    if (typeof FileReader !== 'undefined') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.includes(',') ? res.split(',')[1] : res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // Node.js or modern runtime fallback
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  },
};
