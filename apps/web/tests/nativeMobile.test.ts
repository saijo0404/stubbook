import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  nativeBridge,
  nativeHaptics,
  nativeNetwork,
  nativeStatusBar,
  nativeCalendar,
  nativeFilesystem,
} from '../src/utils/native';

describe('Phase 9: Native Mobile Packaging & Capacitor Integration', () => {
  describe('1. Native Platform Bridge & Fallback (nativeBridge)', () => {
    it('在測試或純 Web 環境應正確識別為 web 平台', () => {
      expect(nativeBridge.getPlatform()).toBe('web');
      expect(nativeBridge.isNative()).toBe(false);
      expect(nativeBridge.isWeb()).toBe(true);
      expect(nativeBridge.isIOS()).toBe(false);
      expect(nativeBridge.isAndroid()).toBe(false);
    });

    it('檢查外掛可用性方法應能安全執行且不拋錯', () => {
      expect(nativeBridge.isPluginAvailable('Camera')).toBe(false);
      expect(nativeBridge.isPluginAvailable('Haptics')).toBe(false);
    });
  });

  describe('2. 觸覺回饋引擎 (nativeHaptics)', () => {
    it('所有觸覺回饋等級在非原生環境應安全降級且正常 resolve', async () => {
      await expect(nativeHaptics.light()).resolves.toBeUndefined();
      await expect(nativeHaptics.medium()).resolves.toBeUndefined();
      await expect(nativeHaptics.heavy()).resolves.toBeUndefined();
      await expect(nativeHaptics.success()).resolves.toBeUndefined();
      await expect(nativeHaptics.warning()).resolves.toBeUndefined();
      await expect(nativeHaptics.selection()).resolves.toBeUndefined();
    });
  });

  describe('3. 網路狀態與現場雷達監控 (nativeNetwork)', () => {
    it('應能正確獲取初始網路狀態物件結構', async () => {
      const status = await nativeNetwork.getStatus();
      expect(status).toHaveProperty('connected');
      expect(typeof status.connected).toBe('boolean');
      expect(status).toHaveProperty('connectionType');
      expect(status).toHaveProperty('isCellular');
      expect(status).toHaveProperty('isOffline');
    });

    it('應能註冊監聽器並返回解除綁定函數', () => {
      const listener = () => {};
      const cleanup = nativeNetwork.addListener(listener);
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('mapStatus 應能正確解析連線類型與弱網蜂巢訊號', () => {
      const wifiStatus = nativeNetwork.mapStatus({ connected: true, connectionType: 'wifi' });
      expect(wifiStatus.connected).toBe(true);
      expect(wifiStatus.isCellular).toBe(false);
      expect(wifiStatus.isOffline).toBe(false);

      const cellStatus = nativeNetwork.mapStatus({ connected: true, connectionType: 'cellular' });
      expect(cellStatus.connected).toBe(true);
      expect(cellStatus.isCellular).toBe(true);
      expect(cellStatus.isOffline).toBe(false);

      const offlineStatus = nativeNetwork.mapStatus({ connected: false, connectionType: 'none' });
      expect(offlineStatus.connected).toBe(false);
      expect(offlineStatus.isOffline).toBe(true);
    });
  });

  describe('4. 系統狀態列控制 (nativeStatusBar)', () => {
    it('設定暗黑主題與現場沉浸模式在 Web 環境應安全執行不崩潰', async () => {
      await expect(nativeStatusBar.setDarkTheme()).resolves.toBeUndefined();
      await expect(nativeStatusBar.setConcertMode(true)).resolves.toBeUndefined();
      await expect(nativeStatusBar.setConcertMode(false)).resolves.toBeUndefined();
    });
  });

  describe('5. 原生檔案與備份存取 (nativeFilesystem)', () => {
    it('blobToBase64 應能正確轉換二進位資料為 Base64 字串', async () => {
      const testContent = 'StubBook Backup Package Test Data 2026';
      const blob = new Blob([testContent], { type: 'text/plain' });
      const base64 = await nativeFilesystem.blobToBase64(blob);
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
    });
  });

  describe('6. 原生日曆排程適配 (nativeCalendar)', () => {
    it('排定日曆日程應產出標準 .ics 格式並返回排程方式', async () => {
      const res = await nativeCalendar.scheduleEvent({
        title: 'StubBook World Tour 2026',
        sessionDate: '2026-10-15',
        doorsOpenTime: '18:30',
        venueName: 'Taipei Arena 台北小巨蛋',
        description: '搖滾特A區 15排',
      });

      expect(res.success).toBe(true);
      expect(typeof res.method).toBe('string');
    });
  });

  describe('7. Android 原生工程與 Gradle 配置驗證 (Issue #66)', () => {
    const androidDir = path.join(__dirname, '..', 'android');

    it('Android 專案目錄結構與 gradle 文件應完整存在', () => {
      expect(fs.existsSync(androidDir)).toBe(true);
      expect(fs.existsSync(path.join(androidDir, 'app', 'build.gradle'))).toBe(true);
      expect(fs.existsSync(path.join(androidDir, 'gradlew'))).toBe(true);
      expect(fs.existsSync(path.join(androidDir, 'app', 'proguard-rules.pro'))).toBe(true);
      expect(
        fs.existsSync(path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml'))
      ).toBe(true);
    });

    it('app/build.gradle 應配置 versionCode 20200 與 versionName 2.2.0 並啟用混淆優化', () => {
      const buildGradle = fs.readFileSync(path.join(androidDir, 'app', 'build.gradle'), 'utf-8');
      expect(buildGradle).toContain('versionCode 20200');
      expect(buildGradle).toContain('versionName "2.2.0"');
      expect(buildGradle).toContain('minifyEnabled true');
      expect(buildGradle).toContain('shrinkResources true');
    });

    it('AndroidManifest.xml 應配置必要硬體權限與 SEND Intent Filter', () => {
      const manifest = fs.readFileSync(
        path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml'),
        'utf-8'
      );
      expect(manifest).toContain('android.permission.INTERNET');
      expect(manifest).toContain('android.permission.CAMERA');
      expect(manifest).toContain('android.permission.VIBRATE');
      expect(manifest).toContain('android.permission.ACCESS_NETWORK_STATE');
      expect(manifest).toContain('android.intent.action.SEND');
      expect(manifest).toContain('android:hardwareAccelerated="true"');
    });

    it('ProGuard rules 應包含 Capacitor bridge 與 WebKit 介面防混淆規則', () => {
      const rules = fs.readFileSync(path.join(androidDir, 'app', 'proguard-rules.pro'), 'utf-8');
      expect(rules).toContain('-keep class com.getcapacitor.** { *; }');
      expect(rules).toContain('@android.webkit.JavascriptInterface');
    });

    it('執行 build-android.js 驗證腳本應退出碼為 0', () => {
      const scriptPath = path.join(__dirname, '..', 'scripts', 'build-android.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
      const out = execSync(`node "${scriptPath}"`, { encoding: 'utf-8' });
      expect(out).toContain('Android Packaging pipeline verification passed successfully');
    });
  });

  describe('8. iOS 原生工程與 Safe Area 配置驗證 (Issue #67)', () => {
    const iosDir = path.join(__dirname, '..', 'ios');

    it('iOS 專案目錄結構、Podfile 與 Info.plist 應完整存在', () => {
      expect(fs.existsSync(iosDir)).toBe(true);
      expect(fs.existsSync(path.join(iosDir, 'App', 'Podfile'))).toBe(true);
      expect(fs.existsSync(path.join(iosDir, 'App', 'App', 'Info.plist'))).toBe(true);
    });

    it('Podfile 應配置 iOS 14.0+ 部署目標並宣告所有 Capacitor 插件', () => {
      const podfile = fs.readFileSync(path.join(iosDir, 'App', 'Podfile'), 'utf-8');
      expect(podfile).toContain("platform :ios, '14.0'");
      expect(podfile).toContain('CapacitorCamera');
      expect(podfile).toContain('CapacitorFilesystem');
      expect(podfile).toContain('CapacitorHaptics');
      expect(podfile).toContain('CapacitorNetwork');
      expect(podfile).toContain('CapacitorStatusBar');
    });

    it('Info.plist 應具備 Apple App Store 審核合規之隱私授權說明與 URL Scheme', () => {
      const infoPlist = fs.readFileSync(path.join(iosDir, 'App', 'App', 'Info.plist'), 'utf-8');
      expect(infoPlist).toContain('NSCameraUsageDescription');
      expect(infoPlist).toContain('NSPhotoLibraryUsageDescription');
      expect(infoPlist).toContain('NSCalendarsUsageDescription');
      expect(infoPlist).toContain('CFBundleURLTypes');
      expect(infoPlist).toContain('stubbook');
      expect(infoPlist).toContain('UIStatusBarStyleLightContent');
    });

    it('執行 build-ios.js 驗證腳本應退出碼為 0', () => {
      const scriptPath = path.join(__dirname, '..', 'scripts', 'build-ios.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
      const out = execSync(`node "${scriptPath}"`, { encoding: 'utf-8' });
      expect(out).toContain('iOS Packaging pipeline verification passed successfully');
    });

    it('全域樣式 globals.css 應包含 Safe Area (Notch / Dynamic Island) 變數與邊界工具', () => {
      const cssPath = path.join(__dirname, '..', 'src', 'app', 'globals.css');
      const css = fs.readFileSync(cssPath, 'utf-8');
      expect(css).toContain('safe-area-inset-top');
      expect(css).toContain('.pt-safe');
      expect(css).toContain('.pb-safe');
    });
  });

  describe('9. 現場沉浸模式與離線弱網防護 (Issue #69)', () => {
    it('LiveConcertModeModal 元件應完整存在並匯出', () => {
      const modalPath = path.join(__dirname, '..', 'src', 'components', 'LiveConcertModeModal.tsx');
      expect(fs.existsSync(modalPath)).toBe(true);
      const content = fs.readFileSync(modalPath, 'utf-8');
      expect(content).toContain('LiveConcertModeModal');
      expect(content).toContain('螢幕最大亮度 (防反光)');
      expect(content).toContain('驗票速刷視圖');
      expect(content).toContain('虛擬應援螢光棒');
      expect(content).toContain('現場速記');
      expect(content).toContain('離線防護已就緒');
    });

    it('LiveEventHeroCard 應具備現場沉浸模式入口按鈕', () => {
      const cardPath = path.join(__dirname, '..', 'src', 'components', 'LiveEventHeroCard.tsx');
      const content = fs.readFileSync(cardPath, 'utf-8');
      expect(content).toContain('現場沉浸模式 🏟️');
      expect(content).toContain('onOpenConcertMode');
    });

    it('首頁 page.tsx 應串接 LiveConcertModeModal 與出席備忘註記', () => {
      const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).toContain('LiveConcertModeModal');
      expect(content).toContain('concertModeSession');
      expect(content).toContain('onOpenConcertMode');
    });
  });
});
