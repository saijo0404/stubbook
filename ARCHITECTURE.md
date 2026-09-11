# 🏛️ StubBook 系統架構與技術設計規格書 (Architecture & System Design)

本文檔記錄 **StubBook**（演唱會歷程與資訊記錄系統）的整體架構、資料模型、網頁解析管線（Parsing Pipeline）、跨平台支援策略以及安全性設計。

---

## 1. 系統整體架構 (System Architecture)

StubBook 採 **Next.js PWA + Capacitor 單一程式碼庫 (方案 A)** 搭配 **Turborepo** 模組化設計。前後端、爬蟲核心與資料庫存取分層解耦：

```
                    ┌──────────────────────────────────────────────┐
                    │               客戶端 (Clients)               │
                    ├──────────────────────────────────────────────┤
                    │     統一前端程式庫 (Next.js 14+ App Router)   │
                    ├──────────────────────┬───────────────────────┤
                    │  PC / Desktop Web    │  Mobile App / PWA     │
                    │  - 大螢幕票夾與統計  │  (Capacitor + PWA)    │
                    │  - 詳細遊記/歌單排版 │  - 現場拍照/離線票夾  │
                    │                      │  - 系統級分享延伸模組 │
                    └──────────┬───────────┴──────────┬────────────┘
                               │                      │
                               ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   BFF & API 服務層 (Next.js Server Actions / API)        │
├────────────────────────────────┬─────────────────────────────────────────┤
│  本地單機儲存 (Local Storage)   │  票根隱私遮罩與畫布渲染 (Canvas / Satori)│
│  預算與統計彙總服務 (Analytics) │  外部串接 (Spotify / Setlist.fm API)     │
└────────────────────────────────┴─────────────────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌───────────────────────────────┐  ┌───────────────────────────────────────┐
│ 網頁擷取與解析管線 (Scraper)  │  │ 本地資料庫與檔案儲存 (SQLite)         │
├───────────────────────────────┤  ├───────────────────────────────────────┤
│ Tier 1: Meta / JSON-LD 標籤   │  │ Database: SQLite (better-sqlite3, WAL)│
│ Tier 2: 專屬平台 Scraper 適配器│  │ Mode: 本地單機，零雲端依賴           │
│         - KKTIX 專屬解析器    │  │ Storage: 本地檔案系統 (票根/照片)     │
│         - tixCraft 拓元解析器 │  │                                       │
│ Tier 3: Playwright / Cheerio  │  │                                       │
└───────────────────────────────┘  └───────────────────────────────────────┘
```

---

## 2. 網頁資訊自動抓取方案 (Parsing Pipeline)

售票平台（KKTIX、拓元 tixCraft）結構異質且具備防爬蟲機制。StubBook 採用**高確定性的三層解析管線 (3-Tier Parsing Pipeline)**：

```
[輸入售票網址]
      │
      ▼
[Tier 1: 靜態 Meta & 結構化資料] ─── (包含完整 MusicEvent 資料?) ───► [輸出結構化 JSON]
      │ 否 / 欄位不齊全
      ▼
[Tier 2: 售票平台專屬適配器 Scraper]
      ├──► KKTIX Scraper (API / DOM 抽取場次、主辦、票價) ──────► [輸出結構化 JSON]
      └──► tixCraft 拓元 Scraper (DOM 表格解析多場次、分區票價) ──► [輸出結構化 JSON]
      │ 遇特殊動態渲染或反爬蟲
      ▼
[Tier 3: Playwright Stealth 動態渲染引擎] ───────────────────────► [輸出結構化 JSON]
```

### 解析管線分層職責：

1. **Tier 1 (輕量標籤優先 - Meta & JSON-LD):**
   - 使用輕量 HTTP 客戶端取得 HTML，優先讀取 `schema.org/MusicEvent`（JSON-LD）或 Open Graph 標籤（`og:title`, `og:image`, `og:description`）。
   - 耗時極短（<300ms），適用於結構友善的活動專頁。
2. **Tier 2 (首批專屬適配器 - KKTIX & tixCraft):**
   - **KKTIX Scraper**：針對 KKTIX 活動頁面結構，解析演出者、多場次時間、售票狀態與組織者。
   - **tixCraft (拓元) Scraper**：精確抽取拓元活動場次表（多日期時間）、實名制規則、分區票價及開賣倒數。
3. **Tier 3 (動態渲染備援 - Playwright Stealth):**
   - 針對重度客戶端渲染（SPA）或有動態 DOM 的頁面，啟動無頭瀏覽器載入並執行 JavaScript 後再行解析。

---

## 3. 資料庫結構設計 (Database Schema)

基於 **SQLite (better-sqlite3)**，將模型拆分為**活動本體（Tour/Event）**、**具體場次（EventSession）**與**個人參與回憶（UserAttendance）**，避免重複建檔：

```mermaid
erDiagram
    ARTISTS ||--o{ EVENTS : organizes
    VENUES ||--o{ EVENT_SESSIONS : hosts
    EVENTS ||--o{ EVENT_SESSIONS : contains
    EVENT_SESSIONS ||--o{ USER_ATTENDANCES : recorded_by
    USERS ||--o{ USER_ATTENDANCES : logs
    USER_ATTENDANCES ||--o{ ATTENDANCE_MEDIA : uploads
    USER_ATTENDANCES ||--o{ MERCHANDISE_ITEMS : purchases
    USER_ATTENDANCES ||--o{ SETLIST_SONGS : remembers

    EVENTS {
        uuid id PK
        string title
        uuid artist_id FK
        string tour_name
        string official_url
        string poster_url
        jsonb metadata
        timestamp created_at
    }

    EVENT_SESSIONS {
        uuid id PK
        uuid event_id FK
        uuid venue_id FK
        timestamp session_date
        timestamp doors_open_time
        timestamp ticket_sale_time
        string ticket_platform "KKTIX | TIXCRAFT | OTHER"
        jsonb ticket_tiers
    }

    USER_ATTENDANCES {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        enum status "WANT_TO_GO | TICKETING | CONFIRMED | ATTENDED | MISSED"
        string seat_info
        enum ticket_type "PHYSICAL | DIGITAL | WRISTBAND"
        decimal ticket_price
        string currency
        int rating
        text notes
        string ticket_stub_url
        boolean stub_privacy_masked
        timestamp created_at
    }

    MERCHANDISE_ITEMS {
        uuid id PK
        uuid attendance_id FK
        string item_name
        string category "LIGHTSTICK | APPAREL | TOWEL | PAMPHLET | OTHER"
        decimal price
        string currency
        string photo_url
    }

    ATTENDANCE_MEDIA {
        uuid id PK
        uuid attendance_id FK
        string media_url
        enum media_type "PHOTO | VIDEO | AUDIO"
        timestamp captured_at
        text caption
    }

    SETLIST_SONGS {
        uuid id PK
        uuid attendance_id FK
        int song_order
        string song_name
        string original_artist
        boolean is_encore
        string note
        string spotify_track_id
    }
```

---

## 4. 關鍵設計細節 (Architecture Highlights)

### ① 巡迴與多場次分離 (Tour & Multi-Session Architecture)

- 演唱會多為連開多日（如：五月天跨年、Coldplay 連開數場）。拆分 `Event` 與 `EventSession`，爬蟲抓到多場次時一次建立關聯場次，使用者可精確標記「參加了哪一天的哪一場」。

### ② 票根個資與條碼智慧隱私遮罩 (Ticket Stub Privacy Shield)

- 實體與電子票根包含條碼 (Barcode / QR Code)、身分證字號與訂單序號。
- 前端票券預覽與上傳模組內建 **Canvas 自動偵測條碼區域** 並提供「一鍵高斯模糊/遮罩」，保護個人隱私。

### ③ 演唱會預算與全旅程記帳 (Expense & Travel Tracking)

- 擴充個人記錄模組，提供「總支出追蹤」（門票、手續費、交通、住宿與官方周邊），支援多國幣別轉換。

### ④ 現場無網路環境與離線票夾 (Offline-First Resilience)

- 數萬人場館現場往往基地台癱瘓無法連網。
- PWA 與 Mobile 端支援 **Service Worker 靜態快取 + IndexedDB 離線快取**。票券座位、演出須知即便處於飛航模式亦可即時離線開啟。

### ⑤ 歌單串接與自動同步 (Setlist.fm & Spotify Integration)

- 演出結束後，系統可自動比對 **Setlist.fm API** 匯入當晚現場演奏曲目，並提供一鍵「匯出為 Spotify 播放清單」。

### ⑥ 年度回顧與視覺化票根手帳 (Concert Wrapped & Canvas)

- **擬真票根牆**：提供復古撕票線、雷射防偽質感的數位票根手帳模式。
- **年度足跡 Wrapped**：年終自動產出專屬分享小卡（IG Story / Threads 規格）：年度場次、歌手雷達圖、踩點場館與花費統計。

---

## 5. 跨平台多端實現策略 (方案 A: Next.js PWA + Capacitor)

採用 **方案 A：單一程式碼庫全平台架構**：

| 平台                  | 容器 / 技術                             | 核心體驗場景                                                         |
| --------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| **Desktop Web**       | Next.js 14+ (App Router) + Tailwind CSS | 大螢幕票夾、統計儀表板、批次管理、高解析相片牆                       |
| **Mobile Web (PWA)**  | Next.js + next-pwa + Web Share Target   | 輕量免安裝、桌面捷徑、接收手機瀏覽器分享的售票網址                   |
| **iOS / Android App** | Capacitor 封裝 Next.js 前端             | 原生相機拍攝票根、離線 SQLite/IndexedDB 快取、系統級 Share Extension |

---

## 6. 安全性與權限控制 (Security & Governance)

1. **SQL 注入防護與安全查詢**:
   - 資料庫操作全面採用**參數化查詢（Prepared Statements）**，嚴禁字串拼接 SQL；資料庫開啟外鍵約束與 WAL 模式保障交易完整性。
2. **防爬蟲與合規 (Scraping Compliance)**:
   - 爬蟲管線僅擷取公開演出時間與售票資訊，嚴禁儲存個人訂票個資；設定合理 Rate Limiting 與 User-Agent 宣告。
3. **媒體本地安全儲存與敏感資訊遮罩**:
   - 票根與照片直接儲存於本機安全目錄，前端上傳時強制執行條碼 (Barcode) 與個人資料自動高斯模糊遮罩，防止隱私洩漏。

---

## 7. 本地資料安全、備份還原與 `.stubbook` 容器規格 (Data Portability & Backup Engine)

### 7.1 資料主權與全量備份架構理念 (Data Sovereignty)

StubBook 堅持 **100% 本地資料主權（Zero-Cloud Dependency）**，使用者記錄的票根、回憶日記、消費記帳與實名制入場時程完全存放於本地端 SQLite 與檔案系統。為提供跨裝置遷移與災難復原能力，系統建構了 **純本地備份與還原引擎（Backup & Restore Subsystem）**：

```
┌────────────────────────────────────────────────────────────────────────┐
│                        .stubbook 容器 (ZIP Archive)                    │
│                                                                        │
│  ├── manifest.json        (規格版本、產出時間戳、資料筆數統計、SHA-256 數位簽章)   │
│  ├── database.sqlite      (透過 SQLite 'VACUUM INTO' 產出的一致性無鎖快照)   │
│  └── uploads/             (遞迴封裝所有本機上傳票根、相片、影片與視野視角)     │
│       ├── stubs/                                                       │
│       ├── photos/                                                      │
│       ├── seatviews/                                                   │
│       └── videos/                                                      │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.2 `.stubbook` 容器與檔案規格 (Container Specification)

1. **容器格式 (Format)**：標準 ZIP 二進位壓縮檔，副檔名為 `.stubbook`。
2. **`manifest.json` 綱要 (Manifest Schema)**：
   ```json
   {
     "formatVersion": "1.0.0",
     "appName": "StubBook",
     "appVersion": "1.2.0",
     "createdAt": "2026-09-12T00:00:00.000Z",
     "database": {
       "filename": "database.sqlite",
       "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
       "size": 131072,
       "counts": {
         "events": 12,
         "sessions": 18,
         "attendances": 8,
         "merchandise": 5,
         "media": 24,
         "seatViews": 6,
         "setlists": 3,
         "salePhases": 14
       }
     },
     "mediaFiles": [
       {
         "path": "uploads/stubs/ticket-123.webp",
         "sha256": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
         "size": 45120
       }
     ]
   }
   ```
3. **資料庫無鎖快照 (`VACUUM INTO`)**：
   - 不採用單純複製使用中的 `.sqlite` 檔案（避免 WAL 模式下鎖定與髒讀）。
   - 調用 SQLite 3.27+ 原生指令 `VACUUM INTO ?`，產出完全重組（De-fragmented）、無 WAL 依賴、完整提交的一致性單一檔案快照。
4. **多媒體資產遞迴封裝**：
   - 走訪 `public/uploads` 目錄，將票根圖、現場相片、場館視野圖等靜態資源按原始路徑層級寫入 ZIP，並為每一份媒體檔計算 SHA-256 雜湊登記於清單。

### 7.3 安全性與強健防護 (Security Hardening)

1. **SHA-256 數位簽章與防竄改驗證 (Integrity Check)**：
   - 還原時優先解出 `manifest.json`，並對 `database.sqlite` 與解壓縮之媒體資產計算即時雜湊值。
   - 若 SHA-256 簽章不吻合，系統拒絕還原並回傳警告，防止檔案毀損或中途遭篡改。
2. **Zip Slip (路徑穿越攻擊 Path Traversal) 嚴格防禦**：
   - 封裝解壓模組實作 `assertSafePath(baseDir, relativePath)`。
   - 嚴格解析絕對規範化路徑（`path.resolve`），確保解壓目標嚴格位於安全隔離基底目錄內（`resolved.startsWith(safePrefix + path.sep)`），杜絕利用 `../` 覆蓋系統敏感檔案之攻擊風險。
3. **交易一致性與災難回滾備份 (`.bak` Fallback)**：
   - 在執行全量覆蓋還原前，系統自動於本地建立 `.bak` 備份檔（如 `database.sqlite.bak`）。
   - 若在還原寫入或外鍵檢查階段發生任何例外，立即自動回滾至原先資料庫與媒體庫，保障資料零毀損。

### 7.4 多模式智慧還原 (Restore Strategies)

還原引擎支援三種作業策略：

- **`OVERWRITE` (全量覆蓋替換)**：
  關閉既有資料庫連線，以快照檔案完整替換目前資料庫與媒體檔案，適合跨裝置無痛整機轉移。
- **`MERGE` (增量合併)**：
  透過 SQLite `ATTACH DATABASE` 技術，在單一交易內比對主鍵與外鍵關聯，以 `INSERT OR IGNORE` 匯入不重複的藝人、場館、演出、個人參戰回憶與歌單。既有資料保留不被覆蓋。
- **`DIFF` (乾跑預覽與差異檢視)**：
  支援 `dryRun: true` 模式，解構備份檔並與目前資料庫比對，回傳新活動數、新回憶數與重複項目數，讓使用者在確認還原前一目了然。

### 7.5 API 端點規範 (API Specification)

| 端點           | 方法   | 參數                  | 說明                                                                        |
| :------------- | :----- | :-------------------- | :-------------------------------------------------------------------------- |
| `/api/backup`  | `GET`  | `overview=true`       | 取得目前本地資料筆數、資料庫大小與媒體用量總覽 (JSON)                       |
| `/api/backup`  | `GET`  | `format=stubbook`     | 一鍵匯出並下載 `.stubbook` 全量封裝二進位壓縮檔 (ZIP)                       |
| `/api/backup`  | `GET`  | `format=json`         | 匯出跨平台標準純文字 JSON 資料庫內容 (Portable JSON)                        |
| `/api/restore` | `POST` | `multipart/form-data` | 上傳 `.stubbook` 二進位封裝檔，支援 `dryRun` 預覽與 `mode=OVERWRITE\|MERGE` |
| `/api/restore` | `POST` | `application/json`    | 上傳 JSON 備份物件進行快速文字型資料匯入與合併                              |
