/**
 * @stubbook/database — TypeScript 型別定義
 *
 * 純 TypeScript 介面，不依賴任何外部 ORM 或 BaaS SDK。
 * 與 SQLite schema.sql 中的表結構一一對應。
 */

// ── JSON 通用型別 ──────────────────────────────────────────────────────────
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ── 1. Artists (演出者 / 歌手 / 樂團) ─────────────────────────────────────
export interface Artist {
  id: string;
  name: string;
  english_name: string | null;
  image_url: string | null;
  created_at: string;
}

// ── 2. Venues (演唱會場館 / 場地) ─────────────────────────────────────────
export type VenueRegion = 'NORTH' | 'CENTRAL' | 'SOUTH' | 'EAST' | 'OVERSEAS';

export interface Venue {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  country: string;
  capacity: number | null;
  latitude?: number | null;
  longitude?: number | null;
  region?: VenueRegion;
  sub_halls?: string; // JSON string e.g. ["1館", "2館"]
  photo_url?: string | null;
  created_at: string;
}

// ── 3. Events (演唱會主體 / 巡迴活動) ─────────────────────────────────────
export interface Event {
  id: string;
  title: string;
  artist_id: string | null;
  tour_name: string | null;
  source_url: string;
  poster_url: string | null;
  platform: string;
  description: string | null;
  organizer: string | null;
  raw_metadata: string; // JSON string
  created_at: string;
  updated_at: string;
}

// ── 4. Event Sessions (各場次時間與票價階梯) ──────────────────────────────
export interface EventSession {
  id: string;
  event_id: string;
  venue_id: string | null;
  venue_name_override: string | null;
  hall_name?: string | null;
  session_title: string | null;
  session_date: string;
  doors_open_time: string | null;
  ticket_sale_time: string | null;
  ticket_platform: string;
  ticket_tiers: string; // JSON string
  booking_url: string | null;
  created_at: string;
}

// ── 5. User Attendances (使用者個人參與紀錄) ──────────────────────────────
export type AttendanceStatus =
  | 'WANT_TO_GO'
  | 'TICKETING'
  | 'CONFIRMED'
  | 'ATTENDED'
  | 'MISSED'
  | 'PURCHASED'
  | 'WAITING_TO_BUY'
  | 'LOTTERY_ENTERED'
  | 'TRANSFERRING'
  | 'ABANDONED';

export type TicketType = 'PHYSICAL' | 'DIGITAL' | 'WRISTBAND' | 'OTHER';

export interface UserAttendance {
  id: string;
  user_id: string;
  session_id: string;
  status: AttendanceStatus;
  seat_info: string | null;
  ticket_type: TicketType;
  ticket_price: number | null;
  currency: string;
  rating: number | null;
  rating_sound?: number | null;
  rating_sight?: number | null;
  rating_atmosphere?: number | null;
  rating_performance?: number | null;
  pros?: string | null;
  cons?: string | null;
  tips?: string | null;
  queue_time_minutes?: number | null;
  transfer_notes?: string | null;
  notes: string | null;
  ticket_stub_url: string | null;
  stub_privacy_masked: number; // SQLite boolean (0/1)
  created_at: string;
  updated_at: string;
}

// ── 6. Merchandise Items (演唱會周邊物品清單) ─────────────────────────────
export type MerchandiseCategory =
  'LIGHTSTICK' | 'APPAREL' | 'TOWEL' | 'PAMPHLET' | 'BADGE' | 'ACCESSORY' | 'OTHER';

export interface MerchandiseItem {
  id: string;
  attendance_id: string;
  user_id: string;
  item_name: string;
  category: MerchandiseCategory;
  price: number;
  currency: string;
  quantity: number;
  photo_url: string | null;
  created_at: string;
}

// ── 7. Attendance Media (現場照片、影片、錄音) ────────────────────────────
export type MediaType = 'PHOTO' | 'VIDEO' | 'AUDIO';

export interface AttendanceMedia {
  id: string;
  attendance_id: string;
  user_id: string;
  media_url: string;
  media_type: MediaType;
  captured_at: string | null;
  caption: string | null;
  created_at: string;
}

// ── 8. Seat View Photos (場館座位視野照片與視角資料庫) ────────────────────────
export type SeatVisibility = 'CLEAR' | 'GOOD' | 'PARTIAL' | 'OBSTRUCTED' | 'DISTANCE';

export interface SeatViewPhoto {
  id: string;
  user_id: string;
  venue_name: string;
  venue_id: string | null;
  session_id: string | null;
  attendance_id: string | null;
  event_title: string | null;
  section: string;
  row_number: string | null;
  seat_number: string | null;
  photo_url: string;
  view_rating: number | null;
  visibility: SeatVisibility;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── 9. Event Setlists (現場演出歌單) ──────────────────────────────────────
export interface SetlistSong {
  name: string;
  isEncore?: boolean;
  encoreNumber?: number; // 1 for Encore 1, 2 for Encore 2...
  coverOf?: string; // 原唱歌手（若為翻唱歌曲）
  info?: string; // 特別備註（例如：吉他 solo / 初次公開新曲）
}

export type SetlistSource = 'SETLIST_FM' | 'MANUAL' | 'COMMUNITY';

export interface EventSetlist {
  id: string;
  session_id: string;
  user_id: string;
  artist_name: string;
  tour_name: string | null;
  venue_name: string | null;
  session_date: string | null;
  source: SetlistSource;
  source_url: string | null;
  songs: string; // JSON string of SetlistSong[]
  spotify_playlist_url: string | null;
  apple_music_url: string | null;
  youtube_music_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── 10. Event Sale Phases (搶票開賣日程與多階段時程) ──────────────────────────
export type SaleType = 'PRESALE' | 'GENERAL' | 'LOTTERY' | 'RERELEASE' | 'DOOR' | 'OTHER';

export interface EventSalePhase {
  id: string;
  event_id: string;
  session_id: string | null;
  phase_name: string;
  sale_type: SaleType;
  sale_start: string;
  sale_end: string | null;
  ticketing_platform: string;
  booking_url: string | null;
  eligibility_notes: string | null;
  is_lottery: number; // 0/1
  reminder_enabled: number; // 0/1
  created_at: string;
  updated_at: string;
}

// ── 11. Event Prayers (推活祈願與幸運御守) ──────────────────────────
export interface EventPrayer {
  id: string;
  event_id: string;
  session_id: string | null;
  user_id: string;
  prayer_count: number;
  lucky_omikuji: string | null;
  blessing_tag: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── 12. Festival Stages (音樂祭舞台分區) ──────────────────────────
export interface FestivalStage {
  id: string;
  event_id: string;
  stage_name: string;
  stage_color: string;
  location_notes: string | null;
  created_at: string;
}

// ── 13. Festival Timetables (音樂祭演出時間表與排程) ───────────────
export interface FestivalTimetable {
  id: string;
  event_id: string;
  stage_id: string;
  session_date: string;
  artist_name: string;
  start_time: string;
  end_time: string;
  is_selected: number; // 0 or 1
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── 14. Wishlist Items (朝聖心願池 / 夢想清單) ─────────────────────
export type WishlistTargetType = 'ARTIST' | 'VENUE' | 'FESTIVAL';

export interface WishlistItem {
  id: string;
  user_id: string;
  target_type: WishlistTargetType;
  target_name: string;
  priority: number; // 1 ~ 5
  reason: string | null;
  is_fulfilled: number; // 0 or 1
  fulfilled_session_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── 15. Live Activity State (秒級即時動態與靈動島狀態機) ──────────────
export type LiveActivityPhase =
  'UPCOMING' | 'QUEUEING' | 'DOORS_OPEN' | 'COUNTDOWN' | 'LIVE' | 'EXIT';

export interface LiveActivityState {
  sessionId: string;
  eventTitle: string;
  artistName: string;
  venueName: string;
  hallName?: string | null;
  seatInfo: string | null;
  sessionDate: string;
  doorsOpenTime: string | null;
  phase: LiveActivityPhase;
  phaseTitle: string;
  phaseDescription: string;
  targetTime: string;
  remainingSeconds: number;
  status: AttendanceStatus;
}
