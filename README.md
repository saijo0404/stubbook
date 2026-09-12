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

### 6. 🎵 歌單串接與年度回顧 (Setlists & Concert Wrapped)

- 串接 **Setlist.fm API**：演出散場後自動同步當晚現場真實演奏曲目。
- 串接 **Spotify / Apple Music**：一鍵將現場 Setlist 存為串流歌單。
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

- **Phase 1**：核心資料結構與三層解析管線 (KKTIX, tixCraft) (`v0.2.0` ✅)
- **Phase 2**：個人回憶手帳、票根自動隱私遮罩與多媒體週邊記帳 (`v0.3.0` ✅)
- **Phase 3**：跨平台 PWA、Capacitor Share Extension 與現場無網路離線票夾 (`v0.4.0` ✅)
- **Phase 4**：Setlist.fm 串接、Spotify 播放清單同步與年度演唱會 Wrapped (`v1.0.0` ✅)
- **Phase 5**：智慧行事曆排程、搶票倒數雷達與 .ics 雙向匯出 (`v1.1.0` ✅)
- **Phase 6**：純本地資料安全、.stubbook 全量封裝備份與智慧還原中心 (`v1.2.0` ✅)
- **Phase 7**：全域售票平台爬蟲擴展 (ibon, FamiTicket, 寬宏售票, INDIEVOX) (`v1.3.0` ✅)
- **Phase 8**：串流音樂全生態深度聯動 (Spotify PKCE, Apple Music, YT Music) (`v1.4.0` 📋)
- **Phase 9**：原生行動雙端封裝發行 (Android APK/AAB, iOS) (`v2.0.0` 📋)

---

## 🤝 貢獻指南 (Contributing)

歡迎提交 Issue 與 Pull Request！
在開始貢獻之前，請務必閱讀 [CONTRIBUTING.md](CONTRIBUTING.md) 了解分支規範、Conventional Commits 與程式碼風格。

---

## 📄 授權條款 (License)

本專案基於 [MIT License](LICENSE) 授權開源。
