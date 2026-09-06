# 🤝 StubBook 貢獻指南與開發規範 (Contributing Guide)

感謝您關注並參與 **StubBook** 專案的開發！為了維持程式庫的高品質、高可讀性與流暢的協作體驗，請在提交程式碼前詳閱本規範。

---

## 🧭 目錄

1. [開發環境準備](#1-開發環境準備)
2. [目錄與專案架構](#2-目錄與專案架構)
3. [分支管理規範 (Git Workflow)](#3-分支管理規範-git-workflow)
4. [Commit 提交訊息規範 (Conventional Commits)](#4-commit-提交訊息規範-conventional-commits)
5. [程式碼撰寫與設計規範](#5-程式碼撰寫與設計規範)
6. [Pull Request (PR) 流程](#6-pull-request-pr-流程)

---

## 1. 開發環境準備

確保您的開發環境已安裝以下基礎工具：

- **Node.js**: `>= 20.0.0`
- **Package Manager**: `pnpm >= 9.0.0`
- **Git**: 最新版
- **GitHub CLI (`gh`)**: 建議安裝

```bash
# 1. Clone 儲存庫
git clone https://github.com/saijo0404/stubbook.git
cd stubbook

# 2. 安裝相依套件
pnpm install

# 3. 複製環境變數範本並設定
cp .env.example .env.local

# 4. 啟動開發伺服器
pnpm dev
```

---

## 2. 目錄與專案架構

本專案採用 **Turborepo Monorepo** 架構：

```
stubbook/
├── apps/
│   ├── web/               # Next.js 14+ (App Router) PC 桌面與行動響應式網頁
│   └── mobile/            # Expo / Capacitor 跨平台行動應用程式
├── packages/
│   ├── scraper-core/      # 獨立的核心爬蟲解析管線 (Meta, JSON-LD, Adapters, AI OCR)
│   ├── database/          # Prisma / Drizzle ORM Schema, Migrations, Supabase 存取
│   ├── shared/            # 共享的 TypeScript 介面、Zod Schema、通用公用工具
│   └── ui/                # 共享的設計系統元件庫 (Tailwind CSS / Radix UI)
├── docs/                  # 系統架構、規格與 API 文件
└── .github/               # Issue 範本、PR 範本與 GitHub Actions CI/CD
```

---

## 3. 分支管理規範 (Git Workflow)

我們採用精簡的 **GitHub Flow** 模式：

- `main` 為主要穩定分支，隨時保持可部署狀態。
- 所有的開發任務、Bug 修復或新適配器均應自 `main` 建立獨立功能分支。

### 分支命名格式：

- 新功能：`feat/功能簡述` (例如：`feat/tixcraft-scraper`, `feat/ticket-privacy-mask`)
- 錯誤修復：`fix/問題簡述` (例如：`fix/kktix-session-timezone`)
- 爬蟲適配器更新：`scraper/網站名稱` (例如：`scraper/ticket-plus-adapter`)
- 文件更新：`docs/文件主題` (例如：`docs/api-specification`)
- 重構與效能優化：`refactor/模組名` 或 `perf/模組名`

---

## 4. Commit 提交訊息規範 (Conventional Commits)

請遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範，格式如下：

```
<type>(<scope>): <subject>

[可選的詳細描述 body]

[可選的關聯 Issue footer, e.g., Closes #123]
```

### 支援的 Type：

- `feat`: 新增功能 (例如：`feat(scraper): add support for tixCraft multi-session parsing`)
- `fix`: 修復 Bug (例如：`fix(auth): handle expired supabase session correctly`)
- `scraper`: 爬蟲與網頁解析專屬更新 (例如：`scraper(kktix): update DOM selectors for new layout`)
- `docs`: 文件更動 (例如：`docs: update ARCHITECTURE.md with mobile share extension design`)
- `style`: 程式碼格式微調（不影響邏輯的空白、換行等）
- `refactor`: 重構（非新增功能亦非修復錯誤）
- `perf`: 效能優化
- `test`: 增加或修正測試
- `chore`: 建置設定、相依套件更新、CI/CD 調整

---

## 5. 程式碼撰寫與設計規範

1. **TypeScript 嚴格型別**：
   - 全專案啟用 `"strict": true`。
   - 避免使用 `any`，資料庫查詢與爬蟲輸出必須透過 **Zod Schema** 進行執行期驗證。
2. **爬蟲管線設計原則**：
   - 每個 Scraper Adapter 必須實作標準介面 `BaseScraperAdapter`。
   - 所有網頁解析器均需提供單元測試或靜態 HTML Mock Fixture，避免線上平台結構更新時默默失效。
   - 務必實作四層備援：若適配器報錯，優雅降級（Graceful Degradation）至 LLM 抽取。
3. **無障礙與響應式**：
   - 前端採用 Mobile-first 響應式佈局，並確保 PC 桌面端大螢幕體驗經過最佳化。
   - 所有圖片與圖示需具備適當的 `alt` 屬性。
4. **程式碼檢查與格式化**：
   - 提交前務必於本地執行：
     ```bash
     pnpm lint
     pnpm typecheck
     pnpm format:check
     ```

---

## 6. Pull Request (PR) 流程

1. 確保分支已同步最新 `main` 程式碼：`git rebase origin/main`。
2. 確認本機測試與 Lint 均通過。
3. 建立 PR 並詳細填寫 [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)。
4. 等候 CI 檢查通過（Lint, Typecheck, Tests）。
5. 獲得至少一位維護者審查（Review & Approve）後即可進行 Squash & Merge。
