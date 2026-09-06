# StubBook Mobile (Capacitor Native Shell)

基於 **方案 A (Next.js PWA + Capacitor)** 架構：
本模組透過 `@capacitor/core` 與 `@capacitor/cli` 將 `apps/web` 封裝為 iOS 與 Android 原生應用，提供：
1. 原生相機功能（快速拍攝實體票根、現場周邊）。
2. 系統級分享擴充（Share Extension / Android Send Intent）：在手機瀏覽器點擊分享售票網址時，可直接呼叫 StubBook 建立活動。
3. 離線狀態儲存與本機通知。
