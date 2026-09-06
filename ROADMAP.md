# 🗺️ StubBook 開發里程碑與路線圖 (Product Roadmap)

本文件規劃 **StubBook** 的產品分期目標與實施里程碑。架構採用 **方案 A (Next.js PWA + Capacitor 單一程式碼庫)**，資料儲存由 **SQLite (better-sqlite3)** 本地嵌入式資料庫驅動，爬蟲首批支援 **KKTIX** 與 **拓元 (tixCraft)**。

---

## 📅 里程碑總覽 (Milestones Overview)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Phase 1    │ ──► │   Phase 2    │ ──► │   Phase 3    │ ──► │   Phase 4    │
│  核心解析與  │     │ 票根回憶手帳 │     │ 跨平台與離線 │     │ 歌單串接與   │
│  活動資料庫  │     │ 與多媒體記錄 │     │ 體驗最佳化   │     │ 年度足跡回顧 │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
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

- [ ] **Setlist 現場歌單串接**
  - [ ] 串接 **Setlist.fm API**：表演結束後自動檢索並匯入當日演唱曲目
  - [ ] 串接 **Spotify / Apple Music**：一鍵將現場 Setlist 轉存為個人播放清單
- [ ] **統計儀表板 (Analytics & Insights)**
  - [ ] 累計參戰總場次、踩點場館數、看過最多次的歌手排行
  - [ ] 演唱會年度總花費統計（門票、交通、住宿、周邊圓餅圖）
- [ ] **年度回顧足跡卡 (StubBook Wrapped)**
  - [ ] 每年 12 月自動生成個人專屬回顧（高顏值 IG Story / Threads 尺寸圖片）
  - [ ] 支援客製化版型與一鍵社群匯出

---

## 🚀 進行中狀態與版本追蹤 (Release Changelog)

| 版本     | 狀態        | 預計交付核心                                               |
| -------- | ----------- | ---------------------------------------------------------- |
| `v0.1.0` | ✅ 已交付   | 規範確立、CI/CD、Repo 規範、方案 A 骨架與文件規格          |
| `v0.2.0` | ✅ 已交付   | 本地 SQLite Schema 與 KKTIX、拓元 (tixCraft) 專屬雙爬蟲管線 |
| `v0.3.0` | ✅ 已交付   | 個人參戰手帳、票根自動隱私遮罩、周邊記帳與多媒體時序牆     |
| `v0.4.0` | ✅ 已交付   | PWA 離線快取票夾、Web Share Target、今日現場卡片與視角資料庫 |
| `v1.0.0` | 🔨 下一階段 | Setlist.fm 現場歌單串接、Spotify 播放清單匯出與年度 Wrapped |

