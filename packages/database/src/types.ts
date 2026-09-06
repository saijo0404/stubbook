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
export interface Venue {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  country: string;
  capacity: number | null;
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
export type AttendanceStatus = 'WANT_TO_GO' | 'TICKETING' | 'CONFIRMED' | 'ATTENDED' | 'MISSED';
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
