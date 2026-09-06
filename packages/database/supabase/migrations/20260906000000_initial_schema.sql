-- ============================================================================
-- StubBook Supabase PostgreSQL Database Schema
-- Initial Migration: Events, Sessions, Attendances, Merchandise, Media & RLS
-- ============================================================================

-- 0. Extensions & Utilities
create extension if not exists "uuid-ossp";

-- Trigger function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 1. Artists (演出者 / 歌手 / 樂團)
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  english_name text,
  image_url text,
  created_at timestamptz not null default now()
);

-- 2. Venues (演唱會場館 / 場地)
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  address text,
  country text not null default 'TW',
  capacity integer,
  created_at timestamptz not null default now()
);

-- 3. Events (演唱會主體 / 巡迴活動)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_id uuid references public.artists(id) on delete set null,
  tour_name text,
  source_url text not null,
  poster_url text,
  platform text not null default 'OTHER',
  description text,
  organizer text,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tr_events_updated_at
  before update on public.events
  for each row execute function public.handle_updated_at();

-- 4. Event Sessions (各場次時間與票價階梯)
create table public.event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  venue_name_override text,
  session_title text,
  session_date timestamptz not null,
  doors_open_time timestamptz,
  ticket_sale_time timestamptz,
  ticket_platform text not null default 'OTHER',
  ticket_tiers jsonb not null default '[]'::jsonb,
  booking_url text,
  created_at timestamptz not null default now()
);

-- 5. User Attendances (使用者個人參與紀錄與回憶手帳)
create table public.user_attendances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.event_sessions(id) on delete cascade,
  status text not null default 'CONFIRMED' check (
    status in ('WANT_TO_GO', 'TICKETING', 'CONFIRMED', 'ATTENDED', 'MISSED')
  ),
  seat_info text,
  ticket_type text not null default 'DIGITAL' check (
    ticket_type in ('PHYSICAL', 'DIGITAL', 'WRISTBAND', 'OTHER')
  ),
  ticket_price numeric(10, 2),
  currency text not null default 'TWD',
  rating smallint check (rating between 1 and 5),
  notes text,
  ticket_stub_url text,
  stub_privacy_masked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create trigger tr_user_attendances_updated_at
  before update on public.user_attendances
  for each row execute function public.handle_updated_at();

-- 6. Merchandise Items (演唱會周邊物品清單與花費)
create table public.merchandise_items (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.user_attendances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_name text not null,
  category text not null default 'OTHER' check (
    category in ('LIGHTSTICK', 'APPAREL', 'TOWEL', 'PAMPHLET', 'BADGE', 'ACCESSORY', 'OTHER')
  ),
  price numeric(10, 2) not null default 0,
  currency text not null default 'TWD',
  quantity smallint not null default 1,
  photo_url text,
  created_at timestamptz not null default now()
);

-- 7. Attendance Media (現場照片、短影片與錄音回憶)
create table public.attendance_media (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.user_attendances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'PHOTO' check (
    media_type in ('PHOTO', 'VIDEO', 'AUDIO')
  ),
  captured_at timestamptz,
  caption text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
create index idx_events_artist on public.events(artist_id);
create index idx_events_platform on public.events(platform);
create index idx_event_sessions_event on public.event_sessions(event_id);
create index idx_event_sessions_date on public.event_sessions(session_date);
create index idx_user_attendances_user on public.user_attendances(user_id);
create index idx_user_attendances_session on public.user_attendances(session_id);
create index idx_merchandise_attendance on public.merchandise_items(attendance_id);
create index idx_attendance_media_attendance on public.attendance_media(attendance_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
alter table public.artists enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.event_sessions enable row level security;
alter table public.user_attendances enable row level security;
alter table public.merchandise_items enable row level security;
alter table public.attendance_media enable row level security;

-- 1. Artists Policies (Public Read, Authenticated Write)
create policy "Artists are viewable by everyone"
  on public.artists for select
  using (true);

create policy "Artists can be inserted by authenticated users"
  on public.artists for insert
  with check (auth.role() = 'authenticated');

-- 2. Venues Policies (Public Read, Authenticated Write)
create policy "Venues are viewable by everyone"
  on public.venues for select
  using (true);

create policy "Venues can be inserted by authenticated users"
  on public.venues for insert
  with check (auth.role() = 'authenticated');

-- 3. Events Policies (Public Read, Authenticated Insert/Update)
create policy "Events are viewable by everyone"
  on public.events for select
  using (true);

create policy "Events can be created by authenticated users"
  on public.events for insert
  with check (auth.role() = 'authenticated');

create policy "Events can be updated by authenticated users"
  on public.events for update
  using (auth.role() = 'authenticated');

-- 4. Event Sessions Policies (Public Read, Authenticated Insert/Update)
create policy "Event sessions are viewable by everyone"
  on public.event_sessions for select
  using (true);

create policy "Event sessions can be created by authenticated users"
  on public.event_sessions for insert
  with check (auth.role() = 'authenticated');

create policy "Event sessions can be updated by authenticated users"
  on public.event_sessions for update
  using (auth.role() = 'authenticated');

-- 5. User Attendances Policies (Private - User only)
create policy "Users can view own attendances"
  on public.user_attendances for select
  using (auth.uid() = user_id);

create policy "Users can insert own attendances"
  on public.user_attendances for insert
  with check (auth.uid() = user_id);

create policy "Users can update own attendances"
  on public.user_attendances for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own attendances"
  on public.user_attendances for delete
  using (auth.uid() = user_id);

-- 6. Merchandise Items Policies (Private - User only)
create policy "Users can view own merchandise"
  on public.merchandise_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own merchandise"
  on public.merchandise_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own merchandise"
  on public.merchandise_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own merchandise"
  on public.merchandise_items for delete
  using (auth.uid() = user_id);

-- 7. Attendance Media Policies (Private - User only)
create policy "Users can view own media"
  on public.attendance_media for select
  using (auth.uid() = user_id);

create policy "Users can insert own media"
  on public.attendance_media for insert
  with check (auth.uid() = user_id);

create policy "Users can update own media"
  on public.attendance_media for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own media"
  on public.attendance_media for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- Supabase Storage Buckets Configuration (Metadata)
-- ============================================================================
insert into storage.buckets (id, name, public)
values 
  ('ticket-stubs', 'ticket-stubs', false),
  ('event-media', 'event-media', false),
  ('merchandise-photos', 'merchandise-photos', false)
on conflict (id) do nothing;

-- Storage RLS: Users can only upload and view their own files in the buckets
create policy "Users can manage own ticket stubs"
  on storage.objects for all
  using (bucket_id = 'ticket-stubs' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'ticket-stubs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can manage own event media"
  on storage.objects for all
  using (bucket_id = 'event-media' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'event-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can manage own merchandise photos"
  on storage.objects for all
  using (bucket_id = 'merchandise-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'merchandise-photos' and auth.uid()::text = (storage.foldername(name))[1]);
