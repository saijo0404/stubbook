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
  latitude    REAL,
  longitude   REAL,
  region      TEXT NOT NULL DEFAULT 'NORTH' CHECK (
    region IN ('NORTH', 'CENTRAL', 'SOUTH', 'EAST', 'OVERSEAS')
  ),
  sub_halls   TEXT NOT NULL DEFAULT '[]',
  photo_url   TEXT,
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
  hall_name             TEXT,
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
    status IN (
      'WANT_TO_GO', 'TICKETING', 'CONFIRMED', 'ATTENDED', 'MISSED',
      'PURCHASED', 'WAITING_TO_BUY', 'LOTTERY_ENTERED', 'TRANSFERRING', 'ABANDONED'
    )
  ),
  seat_info             TEXT,
  ticket_type           TEXT NOT NULL DEFAULT 'DIGITAL' CHECK (
    ticket_type IN ('PHYSICAL', 'DIGITAL', 'WRISTBAND', 'OTHER')
  ),
  ticket_price          REAL,
  currency              TEXT NOT NULL DEFAULT 'TWD',
  rating                INTEGER CHECK (rating BETWEEN 1 AND 5),
  rating_sound          INTEGER CHECK (rating_sound BETWEEN 1 AND 5),
  rating_sight          INTEGER CHECK (rating_sight BETWEEN 1 AND 5),
  rating_atmosphere     INTEGER CHECK (rating_atmosphere BETWEEN 1 AND 5),
  rating_performance    INTEGER CHECK (rating_performance BETWEEN 1 AND 5),
  pros                  TEXT,
  cons                  TEXT,
  tips                  TEXT,
  queue_time_minutes    INTEGER,
  transfer_notes        TEXT,
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

-- 8. Seat View Photos (場館座位視野照片與視角資料庫)
CREATE TABLE IF NOT EXISTS seat_view_photos (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id           TEXT NOT NULL DEFAULT 'local',
  venue_name        TEXT NOT NULL,
  venue_id          TEXT REFERENCES venues(id) ON DELETE SET NULL,
  session_id        TEXT REFERENCES event_sessions(id) ON DELETE SET NULL,
  attendance_id     TEXT REFERENCES user_attendances(id) ON DELETE SET NULL,
  event_title       TEXT,
  section           TEXT NOT NULL,
  row_number        TEXT,
  seat_number       TEXT,
  photo_url         TEXT NOT NULL,
  view_rating       INTEGER CHECK (view_rating BETWEEN 1 AND 5),
  visibility        TEXT NOT NULL DEFAULT 'CLEAR' CHECK (
    visibility IN ('CLEAR', 'GOOD', 'PARTIAL', 'OBSTRUCTED', 'DISTANCE')
  ),
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
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
CREATE INDEX IF NOT EXISTS idx_seat_view_venue ON seat_view_photos(venue_name);
CREATE INDEX IF NOT EXISTS idx_seat_view_section ON seat_view_photos(section);
CREATE INDEX IF NOT EXISTS idx_seat_view_session ON seat_view_photos(session_id);

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

CREATE TRIGGER IF NOT EXISTS tr_seat_view_photos_updated_at
  AFTER UPDATE ON seat_view_photos
  FOR EACH ROW
  BEGIN
    UPDATE seat_view_photos SET updated_at = datetime('now') WHERE id = OLD.id;
  END;

-- 9. Event Setlists (演唱會現場歌單 / 演出曲目)
CREATE TABLE IF NOT EXISTS event_setlists (
  id                    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id            TEXT NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  user_id               TEXT NOT NULL DEFAULT 'local',
  artist_name           TEXT NOT NULL,
  tour_name             TEXT,
  venue_name            TEXT,
  session_date          TEXT,
  source                TEXT NOT NULL DEFAULT 'MANUAL' CHECK (
    source IN ('SETLIST_FM', 'MANUAL', 'COMMUNITY')
  ),
  source_url            TEXT,
  songs                 TEXT NOT NULL DEFAULT '[]',
  spotify_playlist_url  TEXT,
  apple_music_url       TEXT,
  youtube_music_url     TEXT,
  notes                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_setlists_session ON event_setlists(session_id);
CREATE INDEX IF NOT EXISTS idx_setlists_artist ON event_setlists(artist_name);

CREATE TRIGGER IF NOT EXISTS tr_event_setlists_updated_at
  AFTER UPDATE ON event_setlists
  FOR EACH ROW
  BEGIN
    UPDATE event_setlists SET updated_at = datetime('now') WHERE id = OLD.id;
  END;

-- 10. Event Sale Phases (搶票開賣日程與多階段時程)
CREATE TABLE IF NOT EXISTS event_sale_phases (
  id                    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_id              TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id            TEXT REFERENCES event_sessions(id) ON DELETE CASCADE,
  phase_name            TEXT NOT NULL,
  sale_type             TEXT NOT NULL DEFAULT 'GENERAL' CHECK (
    sale_type IN ('PRESALE', 'GENERAL', 'LOTTERY', 'RERELEASE', 'DOOR', 'OTHER')
  ),
  sale_start            TEXT NOT NULL,
  sale_end              TEXT,
  ticketing_platform    TEXT NOT NULL DEFAULT 'OTHER',
  booking_url           TEXT,
  eligibility_notes     TEXT,
  is_lottery            INTEGER NOT NULL DEFAULT 0,
  reminder_enabled      INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sale_phases_event ON event_sale_phases(event_id);
CREATE INDEX IF NOT EXISTS idx_sale_phases_start ON event_sale_phases(sale_start);
CREATE INDEX IF NOT EXISTS idx_sale_phases_session ON event_sale_phases(session_id);

CREATE TRIGGER IF NOT EXISTS tr_event_sale_phases_updated_at
  AFTER UPDATE ON event_sale_phases
  FOR EACH ROW
  BEGIN
    UPDATE event_sale_phases SET updated_at = datetime('now') WHERE id = OLD.id;
  END;

-- 11. Event Prayers (推活祈願、幸運御守與集氣儀式)
CREATE TABLE IF NOT EXISTS event_prayers (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_id      TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id    TEXT REFERENCES event_sessions(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL DEFAULT 'local',
  prayer_count  INTEGER NOT NULL DEFAULT 1,
  lucky_omikuji TEXT,
  blessing_tag  TEXT,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_prayers_event ON event_prayers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_prayers_session ON event_prayers(session_id);

CREATE TRIGGER IF NOT EXISTS tr_event_prayers_updated_at
  AFTER UPDATE ON event_prayers
  FOR EACH ROW
  BEGIN
    UPDATE event_prayers SET updated_at = datetime('now') WHERE id = OLD.id;
  END;

-- 12. Festival Stages (音樂祭舞台分區)
CREATE TABLE IF NOT EXISTS festival_stages (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_id        TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage_name      TEXT NOT NULL,
  stage_color     TEXT NOT NULL DEFAULT '#6366f1',
  location_notes  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_festival_stages_event ON festival_stages(event_id);

-- 13. Festival Timetables (音樂祭演出時間表與排程)
CREATE TABLE IF NOT EXISTS festival_timetables (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_id      TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage_id      TEXT NOT NULL REFERENCES festival_stages(id) ON DELETE CASCADE,
  session_date  TEXT NOT NULL,
  artist_name   TEXT NOT NULL,
  start_time    TEXT NOT NULL,
  end_time      TEXT NOT NULL,
  is_selected   INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_festival_timetables_event ON festival_timetables(event_id);
CREATE INDEX IF NOT EXISTS idx_festival_timetables_stage ON festival_timetables(stage_id);
CREATE INDEX IF NOT EXISTS idx_festival_timetables_date ON festival_timetables(session_date);

CREATE TRIGGER IF NOT EXISTS tr_festival_timetables_updated_at
  AFTER UPDATE ON festival_timetables
  FOR EACH ROW
  BEGIN
    UPDATE festival_timetables SET updated_at = datetime('now') WHERE id = OLD.id;
  END;

-- 14. Wishlist Items (朝聖心願池 / 夢想清單)
CREATE TABLE IF NOT EXISTS wishlist_items (
  id                    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id               TEXT NOT NULL DEFAULT 'local',
  target_type           TEXT NOT NULL CHECK (target_type IN ('ARTIST', 'VENUE', 'FESTIVAL')),
  target_name           TEXT NOT NULL,
  priority              INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  reason                TEXT,
  is_fulfilled          INTEGER NOT NULL DEFAULT 0,
  fulfilled_session_id  TEXT REFERENCES event_sessions(id) ON DELETE SET NULL,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_target ON wishlist_items(target_name);

CREATE TRIGGER IF NOT EXISTS tr_wishlist_items_updated_at
  AFTER UPDATE ON wishlist_items
  FOR EACH ROW
  BEGIN
    UPDATE wishlist_items SET updated_at = datetime('now') WHERE id = OLD.id;
  END;

-- 15. Attendance Expenses (推活遠征全量開銷與支出記帳)
CREATE TABLE IF NOT EXISTS attendance_expenses (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  attendance_id   TEXT NOT NULL REFERENCES user_attendances(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL DEFAULT 'local',
  category        TEXT NOT NULL CHECK (
    category IN ('TICKET', 'TRANSPORT', 'ACCOMMODATION', 'MERCHANDISE', 'FOOD_DINING', 'OTHER')
  ),
  item_name       TEXT NOT NULL,
  amount          REAL NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'TWD',
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_attendance ON attendance_expenses(attendance_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON attendance_expenses(category);

CREATE TRIGGER IF NOT EXISTS tr_attendance_expenses_updated_at
  AFTER UPDATE ON attendance_expenses
  FOR EACH ROW
  BEGIN
    UPDATE attendance_expenses SET updated_at = datetime('now') WHERE id = OLD.id;
  END;
`;
