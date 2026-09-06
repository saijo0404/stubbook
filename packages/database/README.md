# @stubbook/database (SQLite 本地嵌入式資料庫)

StubBook 的本地嵌入式資料庫模組，基於 `better-sqlite3`：

- **單機零依賴**：完全本地運作，無需配置雲端服務或外部資料庫
- **WAL 模式**：啟用 Write-Ahead Logging 保證高並發讀寫效能
- **外鍵級聯**：強制啟用外鍵約束與 `ON DELETE CASCADE`
- **安全防護**：強制使用參數化查詢（Prepared Statements），杜絕 SQL Injection
- **自動建表**：連線時自動執行冪等 Schema 初始化，資料儲存於 `data/stubbook.db`
