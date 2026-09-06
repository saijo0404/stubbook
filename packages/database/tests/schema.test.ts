import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Supabase PostgreSQL Schema & RLS', () => {
  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20260906000000_initial_schema.sql'
  );

  it('Migration SQL 檔案應存在且具備基本內容', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    expect(sql.length).toBeGreaterThan(100);
  });

  it('應建立所有關鍵核心資料表', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    const requiredTables = [
      'public.artists',
      'public.venues',
      'public.events',
      'public.event_sessions',
      'public.user_attendances',
      'public.merchandise_items',
      'public.attendance_media',
    ];

    for (const table of requiredTables) {
      expect(sql).toContain(`create table ${table}`);
    }
  });

  it('所有核心資料表均必須強制啟用 Row Level Security (RLS)', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    const requiredTables = [
      'public.artists',
      'public.venues',
      'public.events',
      'public.event_sessions',
      'public.user_attendances',
      'public.merchandise_items',
      'public.attendance_media',
    ];

    for (const table of requiredTables) {
      expect(sql).toContain(`alter table ${table} enable row level security;`);
    }
  });

  it('私人回憶資料表必須以 auth.uid() = user_id 嚴格隔離', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // 驗證 user_attendances, merchandise_items, attendance_media 包含 user_id 權限防護
    expect(sql).toContain('auth.uid() = user_id');
    expect(sql).toContain('Users can view own attendances');
    expect(sql).toContain('Users can view own merchandise');
    expect(sql).toContain('Users can view own media');
  });

  it('應建立票根與多媒體之 Supabase Storage Buckets 與安全存取政策', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain("'ticket-stubs'");
    expect(sql).toContain("'event-media'");
    expect(sql).toContain("'merchandise-photos'");
    expect(sql).toContain('create policy "Users can manage own ticket stubs"');
  });
});
