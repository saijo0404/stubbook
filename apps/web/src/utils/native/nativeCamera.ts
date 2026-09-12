/**
 * Native Camera & Image Capture Adapter
 * Leverages @capacitor/camera with fallback to Web file picker.
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { nativeBridge } from './nativeBridge';

export interface PhotoCaptureResult {
  dataUrl: string;
  format: string;
  source: 'native-camera' | 'native-gallery' | 'web-file-picker';
}

export interface CaptureOptions {
  quality?: number;
  promptLabelHeader?: string;
  allowEditing?: boolean;
}

export const nativeCamera = {
  /**
   * Capture photo via device camera
   * Falls back to HTML <input type="file"> on Web/PWA
   */
  async takePhoto(options?: CaptureOptions): Promise<PhotoCaptureResult> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Camera')) {
      try {
        const image = await Camera.getPhoto({
          quality: options?.quality ?? 90,
          allowEditing: options?.allowEditing ?? false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });

        if (image.dataUrl) {
          return {
            dataUrl: image.dataUrl,
            format: image.format || 'jpeg',
            source: 'native-camera',
          };
        }
      } catch (err: any) {
        // If user cancelled, rethrow or fallback
        if (err.message?.includes('cancelled') || err.message?.includes('canceled')) {
          throw new Error('User cancelled camera capture');
        }
        console.warn('Native camera error, falling back to Web file picker:', err);
      }
    }

    return this.fallbackWebPicker('environment');
  },

  /**
   * Pick photo from device gallery / photo library
   */
  async pickPhoto(options?: CaptureOptions): Promise<PhotoCaptureResult> {
    if (nativeBridge.isNative() && nativeBridge.isPluginAvailable('Camera')) {
      try {
        const image = await Camera.getPhoto({
          quality: options?.quality ?? 90,
          allowEditing: options?.allowEditing ?? false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });

        if (image.dataUrl) {
          return {
            dataUrl: image.dataUrl,
            format: image.format || 'jpeg',
            source: 'native-gallery',
          };
        }
      } catch (err: any) {
        if (err.message?.includes('cancelled') || err.message?.includes('canceled')) {
          throw new Error('User cancelled photo selection');
        }
        console.warn('Native gallery error, falling back to Web file picker:', err);
      }
    }

    return this.fallbackWebPicker();
  },

  /** Web fallback using temporary file input */
  fallbackWebPicker(captureMode?: 'user' | 'environment'): Promise<PhotoCaptureResult> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        return reject(new Error('Document is not defined'));
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (captureMode) {
        input.capture = captureMode;
      }

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          return reject(new Error('No image selected'));
        }

        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            dataUrl: reader.result as string,
            format: file.type.split('/')[1] || 'jpeg',
            source: 'web-file-picker',
          });
        };
        reader.onerror = () => reject(new Error('Failed to read selected image'));
        reader.readAsDataURL(file);
      };

      input.oncancel = () => reject(new Error('User cancelled file selection'));
      input.click();
    });
  },
};
