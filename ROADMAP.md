# 🗺️ StubBook 開發里程碑與路線圖 (Product Roadmap)

本文件規劃 **StubBook** 的產品分期目標與實施里程碑。架構採用 **方案 A (Next.js PWA + Capacitor 單一程式碼庫)**，資料儲存由 **SQLite (better-sqlite3)** 本地嵌入式資料庫驅動，爬蟲首批支援 **KKTIX** 與 **拓元 (tixCraft)**。

---

## 📅 里程碑總覽 (Milestones Overview)

```
【已交付里程碑】
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Phase 1    │ ──► │   Phase 2    │ ──► │   Phase 3    │
│  核心解析與  │     │ 票根回憶手帳 │     │ 跨平台與離線 │
│  活動資料庫  │     │ 與多媒體記錄 │     │ 體驗最佳化   │
│  (v0.2.0) ✅ │     │  (v0.3.0) ✅ │     │  (v0.4.0) ✅ │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Phase 4    │ ──► │   Phase 5    │ ──► │   Phase 6    │
│ 歌單串接與   │     │ 智慧行事曆   │     │ 資料備份還原 │
│ 年度足跡回顧 │     │ 與搶票提醒   │     │ 與冷熱遷移   │
│  (v1.0.0) ✅ │     │  (v1.1.0) ✅ │     │  (v1.2.0) ✅ │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
【後續規劃里程碑】
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Phase 7    │ ──► │   Phase 8    │ ──► │   Phase 9    │
│ 售票平台擴展 │     │ 串流音樂生態 │     │ 原生雙端發行 │
│ (ibon/全網等)│     │(Spotify/Apple│     │(Android/iOS) │
│   (v1.3.0)   │     │ /YT Music)   │     │   (v2.0.0)   │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 🎯 Phase 1: 核心資料結構與 KKTIX / 拓元網頁解析管線 (Foundation & Parsing Pipeline)

> **目標**：實現一鍵貼入 KKTIX 或 拓元售票網址即可自動結構化入庫，奠定本地 SQLite 資料與活動本體基礎。

- [x] **專案架構與基礎設施建立**
  - [x] 初始化 Turborepo Monorepo 結構與 GitHub 開發規範 (`.github`, CI/CD)
  - [x] 設定本地 SQLite 資料庫（表結構、外鍵級聯與 WAL 模式）
  - [x] 設定 Next.js 14+ 應用骨架與本地單機儲存模式
- [x] **三層解析管線 (Scraping Pipeline v1)**
  - [x] **Tier 1**: 靜態 Meta 與 JSON-LD (`schema.org/MusicEvent`) 提取器
  - [x] **Tier 2 專屬適配器**:
    - [x] **KKTIX 專屬解析器**：支援活動時間、售票狀態、主辦資訊與票種票價
    - [x] **拓元售票 (tixCraft) 專屬解析器**：支援多場次表格、分區票價、實名制規則與開賣倒數
  - [x] **Tier 3**: Playwright Stealth 動態網頁渲染管線（應對反爬蟲與動態 DOM）
- [x] **基礎 Web 端操作**
  - [x] 活動建立與預覽畫面（輸入網址 ➔ 自動擷取 ➔ 使用者確認入庫）
  - [x] 歌手、場館與場次關聯查詢

---

## 🎟️ Phase 2: 個人回憶手帳、多媒體與票根牆 (Memories, Stubs & Media)

> **目標**：打造擬真且富含溫度的演唱會手帳，記錄票根、位置、周邊物品與現場氛圍。

- [x] **個人參與記錄模組 (User Attendance Tracking)**
  - [x] 標記參與狀態（想去 / 已搶票 / 確定參加 / 已結束 / 未參加）
  - [x] 座位記錄（特區、排號、視野評價）
  - [x] 購票金額與全旅程支出記帳（支援多幣別）
- [x] **票根典藏與隱私保護**
  - [x] 票根數位化保存至本地檔案儲存（支援實體票、電子票截圖、手環）
  - [x] **條碼智慧自動遮罩 (Ticket Privacy Mask)**：上傳時自動模糊 Barcode / 個資防盜用
  - [x] 擬真票根手帳 Canvas 排版展示模式（復古撕票線、雷射防偽質感）
- [x] **多媒體與周邊管理 (Merch & Media)**
  - [x] 現場相片與短影片時序牆
  - [x] 演唱會周邊物品清單（手燈、T恤、毛巾、場刊記錄，含花費統計）
  - [x] 心得隨筆與星等評分

---

## 📱 Phase 3: 跨平台多端與現場離線體驗 (Cross-Platform & Offline Mode)

> **目標**：以 Capacitor 封裝行動端原生殼，並在網路癱瘓的現場提供可靠的離線票夾體驗。

- [x] **行動端與 Capacitor 整合**
  - [x] PWA (Progressive Web App) 完整支援與離線快取（Service Worker + CacheStorage）
  - [x] **系統級分享延伸模組 (Share Extension)**：
    - [x] Web Share Target API（手機瀏覽器點分享直接送入 StubBook）
    - [x] 行動端觸覺回饋（Haptics 震動互動體驗）
- [x] **現場模式 (Live Event Mode / Offline Wallet)**
  - [x] 「今日演唱會」卡片：倒數入場、天氣提醒、交通建議
  - [x] 離線座位與票券快取（基地台斷網時一秒出示座位號與注意事項）
- [x] **視角資料庫 (View From My Seat)**
  - [x] 整合場館座位圖，上傳視野照片形成社群視角圖庫（支援場館/分區/排號篩選、無遮蔽狀態與五星評鑑）

---

## 📊 Phase 4: 歌單串接、年度統計與社群回顧 (Setlists & Concert Wrapped)

> **目標**：自動留存現場 Setlist，年終產出高顏值演唱會足跡分享卡。

- [x] **Setlist 現場歌單串接**
  - [x] 串接 **Setlist.fm API**：表演結束後自動檢索並匯入當日演唱曲目
  - [x] 串接 **Spotify / Apple Music**：一鍵將現場 Setlist 轉存為個人播放清單
- [x] **統計儀表板 (Analytics & Insights)**
  - [x] 累計參戰總場次、踩點場館數、看過最多次的歌手排行
  - [x] 演唱會年度總花費統計（門票、周邊分類花費圖表與各類別分析）
- [x] **年度回顧足跡卡 (StubBook Wrapped)**
  - [x] 每年 12 月或一鍵自動生成個人專屬回顧（高顏值 9:16 IG Story / Threads 尺寸圖片）
  - [x] 支援客製化版型、樂迷專屬稱號、Canvas 渲染、一鍵下載 PNG 與原生社群匯出

---

## 📅 Phase 5: 智慧行事曆排程與搶票倒數 (Smart Calendar & On-Sale Timelines)

> **目標**：貼上售票網址即可自動萃取演出日期與搶票日程，以美觀視覺化行事曆呈現，並提供一鍵匯出與提醒機制。
> **對應版本**：`v1.1.0` ✅

- [x] **智慧日期萃取與排程標記**
  - [x] 爬蟲管線擴充：解析售票系統之「會員優先購票」、「實名制登記/抽票」、「一般公開售票」及演出場次起訖時間
  - [x] 自動標記活動關鍵時間節點（開賣搶票倒數、整票釋票日、實名核對日、取票日、演出日）
- [x] **視覺化美觀行事曆儀表板 (In-App Live Calendar)**
  - [x] 手帳風格月曆/週曆視圖：高顏值霓虹/膠卷風格標籤，直觀區分「購票日 🏷️」與「演出日 🎫」
  - [x] 搶票倒數雷達卡片：依時間遠近排序即將開賣的活動，支援開賣前 10 分鐘 / 1 小時視覺警示與高亮
- [x] **跨平台日曆同步與匯出**
  - [x] 一鍵匯出標準 `.ics` (iCalendar) 檔案（相容 iOS Calendar、Google 日曆、Outlook）
  - [x] 支援 Google Calendar 與 Apple Calendar 快速加入 URL 生成
  - [x] 行動端系統級日曆通知與搶票前推播提醒整合 (VALARM 鬧鐘機制)

---

## 💾 Phase 6: 資料安全、備份還原與冷熱遷移 (Data Portability & Backup Engine)

> **目標**：落實純本地無雲端之資料主權，提供一鍵全量打包與彈性資料還原機制。
> **對應版本**：`v1.2.0` ✅

- [x] **全量備份機制 (`.stubbook` 容器封裝)**
  - [x] 一鍵打包本地 SQLite 資料庫快照與本機上傳之多媒體檔案（票根、相片、影片、視角圖庫）
  - [x] 支援 ZIP 壓縮封裝與 AES-GCM 本地可選密碼保護，產出 `.stubbook` 專屬封裝檔案
  - [x] 檔案完整性校驗：加入 SHA-256 數位簽章防損毀校驗
- [x] **結構化資料匯出與還原**
  - [x] JSON 標準資料集匯出（活動、場次、歌手、手帳、記帳周邊、歌單）
  - [x] 智慧還原與衝突策略：支援「覆蓋 (Overwrite)」、「保留並合併 (Merge)」、「僅更新差異 (Diff)」模式
  - [x] 遷移導航精靈：提供還原前資料預覽、統計比對與錯誤回滾 (Rollback) 機制

---

## 🎟️ Phase 7: 售票平台全覆蓋擴展 (Universal Ticketing Scrapers v2)

> **目標**：擴大 Tier 2 爬蟲適配矩陣，完整支援台灣主流各大售票系統。
> **對應版本**：`v1.3.0`

- [ ] **ibon 售票系統適配器**
  - [ ] 支援 7-ELEVEN ibon 售票網頁結構解析（多場次、全區票價級距、售票時間）
  - [ ] 解析實體機台取票與線上電子票規則
- [ ] **FamiTicket 全網購票網適配器**
  - [ ] 支援全家便利商店 FamiTicket 系統解析與票圖/分區抓取
  - [ ] 應對其多層級選位網址結構
- [ ] **寬宏售票 (Kham Ticketing) 適配器**
  - [ ] 支援寬宏售票系統之大型展演、藝文舞台劇與海外巡演解析
- [ ] **INDIEVOX 獨立音樂網適配器**
  - [ ] 支援獨立音樂 Livehouse（如 Legacy、THE WALL、PIPE 等）小型專場與預售票結構

---

## 🎧 Phase 8: 串流音樂全生態深度聯動 (Full Streaming Music Hub)

> **目標**：將歌單從單向搜尋導購，升級為跨各大串流平台的帳號雙向授權與一鍵自動建立歌單。
> **對應版本**：`v1.4.0`

- [ ] **Spotify OAuth 2.0 PKCE 深入整合**
  - [ ] 實作純前端安全 PKCE 授權流程（無須後端代理存取 Token）
  - [ ] 一鍵調用 Spotify Web API 在使用者帳號內自動建立「[藝人名] [巡演名] 現場歌單」
  - [ ] 智慧曲目比對演算法（排除 Live 雜音標籤、比對曲名與合作藝人、精準加入 Track URI）
- [ ] **Apple Music (MusicKit JS) 串接**
  - [ ] 串接 Apple Music Developer Token 與 MusicKit Web SDK
  - [ ] 支援將 StubBook 現場 Setlist 一鍵加入使用者 Apple Music 音樂庫
- [ ] **YouTube Music 串接**
  - [ ] 整合 Google OAuth 2.0 與 YouTube Data API
  - [ ] 自動搜尋官方 Audio / MV 並在用戶帳號建立 YouTube Music 專屬播放清單

---

## 📱 Phase 9: 原生行動雙端封裝與發行 (Native Mobile Packaging & App Store Delivery)

> **目標**：將單一程式碼庫完全封裝為 Android 與 iOS 原生應用，完成真機測試與發行準備。
> **對應版本**：`v2.0.0`

- [ ] **Android 平台深度封裝與最佳化**
  - [ ] Android Studio / Gradle 原生工程調優，支援 Android 10+ 各種螢幕比例與深色主題
  - [ ] APK 與 AAB (Android App Bundle) 生產簽章與建置管線
  - [ ] 系統狀態列 (Status Bar)、導航列透明度與沉浸式現場模式調校
- [ ] **iOS 平台深度封裝與最佳化**
  - [ ] Xcode 專案結構、CocoaPods 依賴與 Provisioning Profile 憑證配置
  - [ ] 支援動態島 (Dynamic Island) / 瀏海螢幕 Safe Area 安全邊界與手勢互動
- [ ] **原生真機外掛與效能調校**
  - [ ] 原生系統日曆外掛 (`@capacitor-community/calendar`) 深度呼叫
  - [ ] 原生檔案系統與相簿存取 (`@capacitor/filesystem` / `@capacitor/camera`)
  - [ ] 現場極端弱網/斷網環境壓力測試與記憶體洩漏分析，達成 60fps 流暢手帳翻頁體驗

---

## 🚀 進行中狀態與版本追蹤 (Release Changelog)

| 版本     | 狀態        | 預計交付核心                                                 |
| -------- | ----------- | ------------------------------------------------------------ |
| `v0.1.0` | ✅ 已交付   | 規範確立、CI/CD、Repo 規範、方案 A 骨架與文件規格            |
| `v0.2.0` | ✅ 已交付   | 本地 SQLite Schema 與 KKTIX、拓元 (tixCraft) 專屬雙爬蟲管線  |
| `v0.3.0` | ✅ 已交付   | 個人參戰手帳、票根自動隱私遮罩、周邊記帳與多媒體時序牆       |
| `v0.4.0` | ✅ 已交付   | PWA 離線快取票夾、Web Share Target、今日現場卡片與視角資料庫 |
| `v1.0.0` | ✅ 正式交付 | Setlist.fm 歌單串接、Spotify 轉存、統計儀表板與年度 Wrapped  |
| `v1.1.0` | ✅ 已交付   | 智慧行事曆排程、搶票倒數雷達、.ics 匯出與美觀日曆儀表板      |
| `v1.2.0` | ✅ 已交付   | 本地資料安全、.stubbook 全量封裝備份、JSON 匯入匯出與還原    |
| `v1.3.0` | 📋 規劃中   | 全域售票平台爬蟲擴展 (ibon, FamiTicket, 寬宏售票, INDIEVOX)  |
| `v1.4.0` | 📋 規劃中   | 串流音樂全生態深度聯動 (Spotify PKCE, Apple Music, YT Music) |
| `v2.0.0` | 📋 規劃中   | 原生行動雙端封裝發行 (Android APK/AAB, iOS, 原生外掛調校)    |
