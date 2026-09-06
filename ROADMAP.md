# 🗺️ StubBook 開發里程碑與路線圖 (Product Roadmap)

本文件規劃 **StubBook** 的產品分期目標與實施里程碑。架構採用 **方案 A (Next.js PWA + Capacitor 單一程式碼庫)**，後端由 **Supabase** 驅動，爬蟲首批支援 **KKTIX** 與 **拓元 (tixCraft)**。

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

> **目標**：實現一鍵貼入 KKTIX 或 拓元售票網址即可自動結構化入庫，奠定 Supabase 資料與活動本體基礎。

- [ ] **專案架構與基礎設施建立**
  - [x] 初始化 Turborepo Monorepo 結構與 GitHub 開發規範 (`.github`, CI/CD)
  - [ ] 設定 Supabase 資料庫（PostgreSQL 表結構、RLS 權限設定與 Storage 儲存桶）
  - [ ] 設定 Next.js 14+ 應用骨架與 Supabase Auth（Email / Google / Apple 登入）
- [ ] **三層解析管線 (Scraping Pipeline v1)**
  - [ ] **Tier 1**: 靜態 Meta 與 JSON-LD (`schema.org/MusicEvent`) 提取器
  - [ ] **Tier 2 專屬適配器**:
    - [ ] **KKTIX 專屬解析器**：支援活動時間、售票狀態、主辦資訊與票種票價
    - [ ] **拓元售票 (tixCraft) 專屬解析器**：支援多場次表格、分區票價、實名制規則與開賣倒數
  - [ ] **Tier 3**: Playwright Stealth 動態網頁渲染管線（應對反爬蟲與動態 DOM）
- [ ] **基礎 Web 端操作**
  - [ ] 活動建立與預覽畫面（輸入網址 ➔ 自動擷取 ➔ 使用者確認入庫）
  - [ ] 歌手、場館與場次關聯查詢

---

## 🎟️ Phase 2: 個人回憶手帳、多媒體與票根牆 (Memories, Stubs & Media)

> **目標**：打造擬真且富含溫度的演唱會手帳，記錄票根、位置、周邊物品與現場氛圍。

- [ ] **個人參與記錄模組 (User Attendance Tracking)**
  - [ ] 標記參與狀態（想去 / 已搶票 / 確定參加 / 已結束 / 未參加）
  - [ ] 座位記錄（特區、排號、視野評價）
  - [ ] 購票金額與全旅程支出記帳（支援多幣別）
- [ ] **票根典藏與隱私保護**
  - [ ] 票根數位化上傳至 Supabase Storage（支援實體票、電子票截圖、手環）
  - [ ] **條碼智慧自動遮罩 (Ticket Privacy Mask)**：上傳時自動模糊 Barcode / 個資防盜用
  - [ ] 擬真票根手帳 Canvas 排版展示模式（復古撕票線、雷射防偽質感）
- [ ] **多媒體與周邊管理 (Merch & Media)**
  - [ ] 現場相片與短影片時序牆
  - [ ] 演唱會周邊物品清單（手燈、T恤、毛巾、場刊記錄，含花費統計）
  - [ ] 心得隨筆與星等評分

---

## 📱 Phase 3: 跨平台多端與現場離線體驗 (Cross-Platform & Offline Mode)

> **目標**：以 Capacitor 封裝行動端原生殼，並在網路癱瘓的現場提供可靠的離線票夾體驗。

- [ ] **行動端與 Capacitor 整合**
  - [ ] PWA (Progressive Web App) 完整支援與離線快取（Service Worker + IndexedDB）
  - [ ] **系統級分享延伸模組 (Share Extension)**：
    - [ ] Web Share Target API（手機瀏覽器點分享直接送入 StubBook）
    - [ ] Capacitor 系統級 Share Target 插件（iOS / Android 原生接收分享）
- [ ] **現場模式 (Live Event Mode / Offline Wallet)**
  - [ ] 「今日演唱會」卡片：倒數入場、天氣提醒、交通建議
  - [ ] 離線座位與票券快取（基地台斷網時一秒出示座位號與注意事項）
- [ ] **視角資料庫 (View From My Seat)**
  - [ ] 整合場館座位圖，上傳視野照片形成社群視角圖庫

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

| 版本     | 狀態      | 預計交付核心                                               |
| -------- | --------- | ---------------------------------------------------------- |
| `v0.1.0` | 🔨 進行中 | 規範確立、CI/CD、Repo 規範、方案 A 骨架與文件規格          |
| `v0.2.0` | 規劃中    | Supabase Schema 設計與 KKTIX、拓元 (tixCraft) 專屬解析器   |
| `v0.3.0` | 規劃中    | 個人參與記錄、票根上傳與自動隱私遮罩                       |
| `v0.4.0` | 規劃中    | Capacitor 封裝、PWA 離線票夾與 Share Target 支援           |
| `v1.0.0` | 規劃中    | 完整跨平台 PC + Mobile 上線，Setlist.fm 串接與年度 Wrapped |
