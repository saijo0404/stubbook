/**
 * StubBook SQLite Database Schema DDL
 * 本地嵌入式資料庫結構：Events, Sessions, Attendances, Merchandise, Media
 */
export const SCHEMA_SQL = `
-- 1. Artists (演出者 / 歌手 / 樂團)
CREATE TABLE IF NOT EXISTS artists (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name          TEXT NOT NULL,
  english_name  TEXT,
  image_url     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Venues (演唱會場館 / 場地)
CREATE TABLE IF NOT EXISTS venues (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  city        TEXT,
  address     TEXT,
  country     TEXT NOT NULL DEFAULT 'TW',
  capacity    INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Events (演唱會主體 / 巡迴活動)
CREATE TABLE IF NOT EXISTS events (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title           TEXT NOT NULL,
  artist_id       TEXT REFERENCES artists(id) ON DELETE SET NULL,
  tour_name       TEXT,
  source_url      TEXT NOT NULL,
  poster_url      TEXT,
  platform        TEXT NOT NULL DEFAULT 'OTHER',
  description     TEXT,
  organizer       TEXT,
  raw_metadata    TEXT NOT NULL DEFAULT '{}',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Event Sessions (各場次時間與票價階梯)
CREATE TABLE IF NOT EXISTS event_sessions (
  id                    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_id              TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  venue_id              TEXT REFERENCES venues(id) ON DELETE SET NULL,
  venue_name_override   TEXT,
  session_title         TEXT,
  session_date          TEXT NOT NULL,
  doors_open_time       TEXT,
  ticket_sale_time      TEXT,
  ticket_platform       TEXT NOT NULL DEFAULT 'OTHER',
  ticket_tiers          TEXT NOT NULL DEFAULT '[]',
  booking_url           TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. User Attendances (使用者個人參與紀錄與回憶手帳)
CREATE TABLE IF NOT EXISTS user_attendances (
  id                    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id               TEXT NOT NULL DEFAULT 'local',
  session_id            TEXT NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  status                TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (
    status IN ('WANT_TO_GO', 'TICKETING', 'CONFIRMED', 'ATTENDED', 'MISSED')
  ),
  seat_info             TEXT,
  ticket_type           TEXT NOT NULL DEFAULT 'DIGITAL' CHECK (
    ticket_type IN ('PHYSICAL', 'DIGITAL', 'WRISTBAND', 'OTHER')
  ),
  ticket_price          REAL,
  currency              TEXT NOT NULL DEFAULT 'TWD',
  rating                INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes                 TEXT,
  ticket_stub_url       TEXT,
  stub_privacy_masked   INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, session_id)
);

-- 6. Merchandise Items (演唱會周邊物品清單與花費)
CREATE TABLE IF NOT EXISTS merchandise_items (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  attendance_id   TEXT NOT NULL REFERENCES user_attendances(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL DEFAULT 'local',
  item_name       TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'OTHER' CHECK (
    category IN ('LIGHTSTICK', 'APPAREL', 'TOWEL', 'PAMPHLET', 'BADGE', 'ACCESSORY', 'OTHER')
  ),
  price           REAL NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'TWD',
  quantity        INTEGER NOT NULL DEFAULT 1,
  photo_url       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Attendance Media (現場照片、短影片與錄音回憶)
CREATE TABLE IF NOT EXISTS attendance_media (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  attendance_id   TEXT NOT NULL REFERENCES user_attendances(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL DEFAULT 'local',
  media_url       TEXT NOT NULL,
  media_type      TEXT NOT NULL DEFAULT 'PHOTO' CHECK (
    media_type IN ('PHOTO', 'VIDEO', 'AUDIO')
  ),
  captured_at     TEXT,
  caption         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_artist ON events(artist_id);
CREATE INDEX IF NOT EXISTS idx_events_platform ON events(platform);
CREATE INDEX IF NOT EXISTS idx_event_sessions_event ON event_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sessions_date ON event_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_user_attendances_user ON user_attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_attendances_session ON user_attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_merchandise_attendance ON merchandise_items(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_media_attendance ON attendance_media(attendance_id);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS tr_events_updated_at
  AFTER UPDATE ON events
  FOR EACH ROW
  BEGIN
    UPDATE events SET updated_at = datetime('now') WHERE id = OLD.id;
  END;

CREATE TRIGGER IF NOT EXISTS tr_user_attendances_updated_at
  AFTER UPDATE ON user_attendances
  FOR EACH ROW
  BEGIN
    UPDATE user_attendances SET updated_at = datetime('now') WHERE id = OLD.id;
  END;
`;
