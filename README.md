# 🎟️ StubBook (票根手帳)

> **演唱會歷程與資訊記錄應用** —— 精準網頁解析管線 × 結構化個人回憶資料庫 × 跨平台擬真手帳。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI Status](https://img.shields.io/badge/CI-passing-brightgreen.svg)](.github/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/Node-%3E%3D20.0.0-green.svg)](package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 📖 專案簡介 (Introduction)

熱愛現場音樂的樂迷，往往散落在各大售票系統（KKTIX、拓元 tixCraft、ibon、FamiTicket、寬宏售票、INDIEVOX 等）搶票，散場後的回憶與票根也零碎地沉睡在相簿或抽屜深處。

**StubBook** 旨在打造一個專為音樂現場愛好者設計的**跨平台演唱會歷程與數位手帳系統**。核心在於**高強健度的網頁擷取管線**，只需輸入售票網址，系統便會自動結構化提取演唱會巡迴、多場次時間、場館與票務資訊；同時提供**個人回憶歸檔**（票根防偽擬真展示、座位視野、周邊記帳、現場歌單自動同步與年度足跡回顧）。

應用採用 **方案 A：Next.js PWA + Capacitor** 統一程式碼庫，一次支援 PC 桌面、手機瀏覽器與 iOS/Android 行動應用。

---

## ✨ 核心特色與功能 (Core Features)

```
[前端 / PC / 手機]
       │ 貼上售票網址 / 瀏覽器一鍵分享 (Share Extension)
       ▼
[三層式解析管線] ─── (Open Graph / JSON-LD / 6 大售票平台專屬 Scraper) ───► [結構化演唱會本體]
                                                                                │
                                                                                ▼
[個人專屬回憶錄] ◄─── (標記狀態、票根隱私遮罩、周邊記帳、現場歌單) ──────────── [SQLite 本地資料庫儲存]
```

### 1. 🕷️ 三層式網頁解析管線 (3-Tier Parsing Pipeline)

- **Tier 1 (輕量標籤優先)**：高速解析 HTML Meta、Open Graph 及 `schema.org/MusicEvent` (JSON-LD)。
- **Tier 2 (全台 6 大售票平台專屬適配器)**：
  - **KKTIX Scraper**：精確抽取演出者、時間多場次、售票狀態與組織者。
  - **拓元售票 (tixCraft) Scraper**：自動解析多場次表格、啟售倒數時間、實名制說明與分區票價。
  - **7-ELEVEN ibon 售票系統 Scraper**：多場次日期時間、全票種/票價級距與開賣時間抽取。
  - **全家 FamiTicket 全網購票網 Scraper**：多場次時間、各區票價與預售截止時間結構化解析。
  - **寬宏售票 (Kham Ticketing) Scraper**：藝文與大型展演之場次表、分區多票價及啟售時間抽取。
  - **INDIEVOX 獨立音樂網 Scraper**：獨立音樂 Livehouse 專場之演出/入場時間、多段啟售階段與預售/現場票價解析。
- **Tier 3 (動態渲染保護)**：Playwright Stealth 引擎應對 SPA 與客戶端動態渲染。

### 2. 🎫 巡迴與多場次結構 (Tour & Session Architecture)

- 完整支援單一巡迴包含多個場次（例如：連續開唱三天或跨城市巡迴）。
- 使用者可精確標記自己參加的具體場次與座位（如：特A區 3排 12號），避免重複建檔。

### 3. 🛡️ 票根典藏與條碼個資自動遮罩 (Ticket Stub Privacy Shield)

- 支援實體票、電子票截圖與手環數位典藏。
- **智慧隱私防護**：上傳時前端自動偵測條碼 (Barcode/QR Code) 及敏感資訊，提供一鍵高斯模糊與遮罩，放心曬票無資安疑慮。
- 擬真手帳畫布（Skeuomorphic Canvas）：撕票齒孔、微立體光影與質感排版。

### 4. 💰 全旅程記帳與周邊管理 (Merch & Expense Tracker)

- 記錄手燈、場刊、T恤、毛巾等周邊物件，附購買照片與金額。
- 完整記錄門票、手續費、交通與住宿開銷，支援多幣別換算（跨國參戰必備）。

### 5. 📱 跨平台多端與現場離線票夾 (Cross-Platform & Offline Mode)

- **PC Desktop**：大螢幕長文遊記排版、資料庫批次管理與詳細花費儀表板。
- **Mobile (PWA / Capacitor 原生殼)**：
  - **分享頁擴充 (Share Extension)**：手機瀏覽售票網時，點擊瀏覽器「分享」即可一鍵送入 StubBook。
  - **現場離線票夾 (Offline Wallet)**：數萬人場館網路癱瘓時，依然能離線秒開座位號與入場須知。

### 6. 🎵 歌單串接、串流音樂生態聯動與年度回顧 (Streaming Hub & Concert Wrapped)

- **Setlist.fm 智慧曲目串接**：演出散場後自動同步當晚現場真實演奏曲目與安可曲。
- **全生態三大串流深度聯動 (Full Streaming Music Hub)**：
  - **Spotify**：純前端安全 PKCE 授權，智慧曲目去雜訊比對，一鍵在個人帳號自動建立現場歌單。
  - **Apple Music**：整合 MusicKit JS，支援將演出曲目加入使用者音樂庫或生成深度搜尋連結。
  - **YouTube Music**：整合 YouTube Data API v3，精準配對官方音訊/MV 並建立專屬播放清單。
- **年度回顧 (StubBook Wrapped)**：年終自動生成專屬 IG Story / Threads 高顏值分享卡片。

### 7. 📅 智慧行事曆與搶票倒數雷達 (Smart Calendar & Ticketing Radar)

- **搶票倒數雷達**：多階段啟售提醒（會員優先購、全面啟售）、精確開賣倒數計時與作戰筆記。
- **雙向日曆整合**：標準 iCalendar (`.ics`) 格式匯出，一鍵同步至 Google Calendar、Apple Calendar 與 Outlook。
- **現代化互動行事曆**：直覺依「啟售日」與「演出日」分類篩選，並以時間軸色彩視覺化排程。

### 8. 💾 資料主權、備份還原與 `.stubbook` 容器 (Data Sovereignty & Portable Backups)

- **100% 純本地單機運作**：資料零雲端依賴，完全存放於本地 SQLite 與私有媒體目錄，捍衛樂迷資料主權。
- **`.stubbook` 全量打包封裝**：調用 SQLite 原生 `VACUUM INTO` 產出無鎖一致性資料庫快照，遞迴封裝所有票根、現場相片與場館視野。
- **SHA-256 數位簽章與 Zip Slip 防護**：內建數位指紋完整性檢查與嚴格路徑穿越防禦，支援自動 `.bak` 災難回滾備份。
- **智慧多模式還原**：支援全量覆蓋 (Overwrite)、增量合併 (Merge) 與乾跑預覽 (Dry-run Diff)，亦提供通用 JSON 匯出匯入。

### 9. 📱 原生行動雙端封裝與現場沉浸模式 (Native Mobile & Live Concert Mode)

- **Android 平台深度封裝**：支援 Android 10+（API Level 29~34+），配置 AAB / Release APK 生產管線、R8/ProGuard 程式碼防混淆優化，以及 Edge-to-Edge 透明邊緣沉浸導航。
- **iOS 平台深度封裝**：Xcode 原生工程、CocoaPods 外掛管理，相容 iPhone 動態島 (Dynamic Island) 與頂底 Safe Area 邊界，完整配置 App Store 審核合規隱私權宣告。
- **原生硬體外掛橋接矩陣**：相機票根速拍 (`@capacitor/camera`)、原生日曆日程排定、本機檔案系統儲存 (`@capacitor/filesystem`)、震動馬達多段觸覺回饋 (`@capacitor/haptics`) 與現場人潮網路監控 (`@capacitor/network`)。
- **行動端專屬現場沉浸模式 (Live Concert Mode)**：
  - **巨型座位指示牌 (Seat View)**：發光高對比字體，昏暗現場秒看分區與排號。
  - **驗票閘門螢幕最大亮度 (Turnstile Scanner)**：一鍵切換純白防反光高對比條碼，供閘門檢票人員秒刷通過。
  - **現場人潮弱網雷達 (Offline Protector)**：數萬人擠爆基地台時自動切換離線快取防護，票券、回憶與手帳 100% 離線可用。
  - **舞台視野速拍、現場速記與虛擬應援手燈**：即時快拍視野照、速記 Talking 感動，並提供五色螢光棒揮舞燈效。

### 10. 🎨 視覺相片月曆、推活祈願儀式感與多維手帳範本 (Visual Photo Calendar & Fan Rituals)

- **視覺相片月曆與 9:16 手機鎖定畫面桌布導出**：
  - 支援「相片月曆」與「經典標籤」雙模式切換，日曆單元格直接內嵌演出海報或現場精選照，讓整月份回憶一覽無遺。
  - 內建 HTML5 Canvas 合成引擎，支援一鍵將單月相片月曆導出為 9:16 (1080×1920 PNG) 原生高解析度手機鎖定畫面桌布。
- **推活抽票祈願與開賣集氣儀式感**：
  - 提供木魚敲擊互動（Web Audio API 擬真音效與觸覺震動回饋），即時累計功德與全站集氣次數。
  - 求取開賣吉凶籤詩（超大吉、神席吉、特上吉等），並支援一鍵繪製下載 600×900 祈願開運御守圖卡供社群轉發。
- **票券全生命週期狀態追蹤與讓換票防詐指南**：
  - 全面支援 10 種票券生命週期狀態（已購票、待搶票、抽票登記中、搶票中、讓換票中、未中籤/已放棄等）。
  - 整合「防詐五不原則」、實名制現場檢核清單與安全面交交易備忘錄範本，支援一鍵複製標準安全確認文案。
- **五維度演出評鑑與結構化參戰筆記範本**：
  - 綜合評分、音響音質、視野角度、現場氛圍、藝人現場表現等五維星等視覺化呈現。
  - 結構化填寫「排隊耗時」、「亮點好評」、「踩雷提醒」、「避坑貼士」與「換票備忘」，沉澱高品質現場攻略。

### 11. 🗺️ 巡迴足跡地圖、秒級即時動態與多舞台場館庫 (Tour Footprint Map & Live Activities)

- **全台與海外巡迴足跡互動向量地圖**：
  - 墨卡托向量投影互動地圖，依經緯度標記參戰場館，標記光暈與尺寸依打卡頻次動態增強。
  - 支援海外指標性場館（日本武道館、東京巨蛋、英國 Wembley 體育館等）分頁探索。
  - 點選任一場館標記，即刻深潛展開「歷史參戰時序軌跡」、「座位視野歷史照片牆」、「累積總出費統計」與 Google Maps 導航。
- **秒級精密動態倒數卡與行動端 Live Activities 狀態機**：
  - 首頁突出展示即時秒級跳動倒數（`DD 天 HH 時 MM 分 SS 秒`），提供平滑渲染時鐘。
  - 5 階段狀態機流轉（整隊領周邊 `QUEUEING` ➔ 開放入場 `DOORS_OPEN` ➔ 即將開演 `COUNTDOWN` ➔ Live 熱血進行中 `LIVE` ➔ 散場回味 `EXIT`），並支援靈動島與通知模擬推播。
- **大型場館多廳子分區與音樂祭 Timetable 排程工具**：
  - 支援場館多廳子分區（南港展覽館 1/2 館、高流海音館/鯨魚堤岸、Legacy Taipei/Tera）。
  - 音樂祭多舞台柱狀時程排程，必看選取清單自動偵測重疊演出，跳出衝堂警示條並計算衝突時長。
  - 自動梳理個人本日跑台行程單，支援一鍵複製文字至備忘錄或社群。
- **朝聖心願池與售票雷達智慧匹配**：
  - 登記夢想藝人與夢想朝聖指標場館，設定 1~5 星優先權與心願理由。
  - 售票雷達自動比對活動庫，若發現有匹配之預售/在售活動，即時顯示「🎯 售票雷達已捕獲！」提示。
  - 一鍵解鎖圓夢成就，附帶五彩紙屑慶祝動效。

---

## 🛠️ 技術選型 (Tech Stack)

| 領域                  | 技術棧                                            | 說明                                                      |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| **架構架構**          | Turborepo + pnpm Monorepo                         | 高效模組解耦、共享型別與程式碼                            |
| **全端應用 (方案 A)** | Next.js 14+ (App Router), Tailwind CSS, shadcn/ui | 統一程式碼庫，支援桌面 Web 與 Mobile PWA                  |
| **行動端原生外殼**    | Capacitor (@capacitor/core, @capacitor/cli)       | 提供 iOS/Android 原生相機、分享延伸模組 (Share Extension) |
| **網頁擷取管線**      | Cheerio, Playwright Stealth, Zod                  | 輕重型動態解析、結構化 Schema 驗證                        |
| **後端與資料庫**      | SQLite (better-sqlite3)                           | 本地嵌入式資料庫，支援 WAL 模式、外鍵約束與原子性交易     |
| **檔案與多媒體**      | Local File Storage                                | 本地安全保存票根、周邊物品與現場照片                      |

---

## 📁 專案目錄結構 (Monorepo Layout)

```
stubbook/
├── apps/
│   └── web/                     # Next.js 14 Web 應用 (PC + PWA + Capacitor 原生殼)
├── packages/
│   ├── scraper-core/            # 核心爬蟲管線 (Meta, JSON-LD, 6 大售票平台專屬適配器)
│   │   ├── src/
│   │   │   ├── adapters/        # kktix, tixcraft, ibon, famiticket, kham, indievox 適配器
│   │   │   ├── engine/          # pipeline 調度引擎
│   │   │   └── types/           # 結構化活動型別定義
│   ├── database/                # SQLite 資料庫操作、型別定義與 Schema
│   ├── logger/                  # 容量限制滾動日誌與去敏導出模組
│   ├── shared/                  # 共享型別 (TypeScript), Zod 驗證綱要, 常數
│   └── ui/                      # 共享元件庫 (Button, Dialog, StubCard...)
├── .github/
│   ├── ISSUE_TEMPLATE/          # Bug, Feature, Scraper Request 範本
│   ├── workflows/               # CI/CD, 爬蟲巡檢, Release 流程
│   └── PULL_REQUEST_TEMPLATE.md # PR 提交範本
├── ARCHITECTURE.md              # 系統架構與領域模型深度設計文件
├── ROADMAP.md                   # 產品分期目標與里程碑路線圖
├── CONTRIBUTING.md               # 開發與程式碼提交規範
└── LICENSE                      # MIT 授權條款
```

---

## 🚀 快速開始 (Quick Start)

### 1. 前置需求

- Node.js `>= 20.0.0`
- pnpm `>= 9.0.0`

### 2. 安裝與執行

```bash
# Clone 本儲存庫
git clone https://github.com/saijo0404/stubbook.git
cd stubbook

# 安裝所有相依套件
pnpm install

# 複製環境變數
cp .env.example .env.local

# 啟動本機開發伺服器
pnpm dev
```

---

## 🗺️ 開發路線圖 (Roadmap)

詳細的階段規劃與待辦清單請參閱 [ROADMAP.md](ROADMAP.md)：

- **Phase 1 ~ 4**：核心手帳、擬真票根、PWA 離線快取、Setlist 歌單與年度 Wrapped (`v1.0.0` ✅)
- **Phase 5 ~ 9**：全域售票爬蟲、串流聯動、全量備份還原、原生雙端與現場沉浸模式 (`v2.0.0` ✅)
- **Phase 10**：視覺相片月曆、中籤祈願集氣儀式、票券狀態追蹤與多維評鑑範本 (`v2.1.0` ✅)
- **Phase 11**：巡迴足跡互動地圖、秒級即時倒數/動態島、音樂祭多舞台與朝聖心願池 (`v2.2.0` ✅)
- **Phase 12**：推活全出費大數據、熱量儀表板、潮流分享卡工廠 (收據/CD外盒/透明貼紙) (`v2.3.0` 📋)
- **Phase 13**：四級隱私好友參戰圈、去中心化 P2P 票根快傳、讓換票防詐核驗助手 (`v2.4.0` 📋)
- **Phase 14**：AI 實體票根 Vision OCR 掃描入庫、現場 Talking 語音速記、手錶智慧伴侶 (`v3.0.0` 🚀)

---

## 🤝 貢獻指南 (Contributing)

歡迎提交 Issue 與 Pull Request！
在開始貢獻之前，請務必閱讀 [CONTRIBUTING.md](CONTRIBUTING.md) 了解分支規範、Conventional Commits 與程式碼風格。

---

## 📄 授權條款 (License)

本專案基於 [MIT License](LICENSE) 授權開源。
