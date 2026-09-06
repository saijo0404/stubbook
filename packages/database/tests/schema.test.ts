import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase } from '../src/client';
import Database from 'better-sqlite3';

describe('SQLite Local Database Schema & Operations', () => {
  let db: Database.Database;

  beforeEach(() => {
    // 每個測試使用乾淨的 in-memory 資料庫
    db = getDatabase({ inMemory: true });
  });

  afterEach(() => {
    db.close();
  });

  it('應成功建立所有核心資料表', () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('artists');
    expect(tableNames).toContain('venues');
    expect(tableNames).toContain('events');
    expect(tableNames).toContain('event_sessions');
    expect(tableNames).toContain('user_attendances');
    expect(tableNames).toContain('merchandise_items');
    expect(tableNames).toContain('attendance_media');
    expect(tableNames).toContain('seat_view_photos');
    expect(tableNames).toContain('event_setlists');
    expect(tableNames).toContain('event_sale_phases');
  });

  it('應成功插入活動並自動生成預設欄位 (id, created_at, updated_at)', () => {
    const insertStmt = db.prepare(`
      INSERT INTO events (title, source_url, platform)
      VALUES (?, ?, ?)
    `);

    insertStmt.run('2026 告五人巡迴演唱會', 'https://kktix.cc/events/sample', 'KKTIX');

    const event = db
      .prepare('SELECT * FROM events WHERE title = ?')
      .get('2026 告五人巡迴演唱會') as any;

    expect(event).toBeDefined();
    expect(event.id).toBeTruthy();
    expect(typeof event.id).toBe('string');
    expect(event.platform).toBe('KKTIX');
    expect(event.raw_metadata).toBe('{}');
    expect(event.created_at).toBeTruthy();
    expect(event.updated_at).toBeTruthy();
  });

  it('應支援關聯場次並遵循外鍵 CASCADE 刪除約束', () => {
    // 1. 建立活動
    const insertEvent = db.prepare(`
      INSERT INTO events (title, source_url, platform) VALUES (?, ?, ?) RETURNING id
    `);
    const { id: eventId } = insertEvent.get(
      '周杰倫演唱會',
      'https://tixcraft.com/1',
      'TIXCRAFT'
    ) as any;

    // 2. 建立場次
    const insertSession = db.prepare(`
      INSERT INTO event_sessions (event_id, session_title, session_date, ticket_platform, ticket_tiers)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id
    `);
    const { id: sessionId } = insertSession.get(
      eventId,
      'Day 1',
      '2026-12-04T19:30:00Z',
      'TIXCRAFT',
      JSON.stringify([{ name: '搖滾區', price: 6880, status: 'AVAILABLE' }])
    ) as any;

    expect(sessionId).toBeTruthy();

    // 驗證場次存在
    const session = db.prepare('SELECT * FROM event_sessions WHERE id = ?').get(sessionId) as any;
    expect(session.session_title).toBe('Day 1');
    expect(JSON.parse(session.ticket_tiers)).toHaveLength(1);

    // 3. 刪除活動，測試 CASCADE
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);

    const sessionAfterDelete = db
      .prepare('SELECT * FROM event_sessions WHERE id = ?')
      .get(sessionId);
    expect(sessionAfterDelete).toBeUndefined();
  });

  it('外鍵約束違反時應拒絕插入', () => {
    const insertSession = db.prepare(`
      INSERT INTO event_sessions (event_id, session_date) VALUES (?, ?)
    `);

    expect(() => {
      insertSession.run('non-existent-event-id', '2026-12-04T19:30:00Z');
    }).toThrow();
  });

  it('更新活動時觸發器應自動更新 updated_at', async () => {
    const insertEvent = db.prepare(`
      INSERT INTO events (title, source_url, created_at, updated_at)
      VALUES (?, ?, '2026-01-01 00:00:00', '2026-01-01 00:00:00')
      RETURNING id
    `);
    const { id: eventId } = insertEvent.get('測試活動', 'https://example.com') as any;

    // 更新活動
    db.prepare('UPDATE events SET title = ? WHERE id = ?').run('新標題', eventId);

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as any;
    expect(updated.title).toBe('新標題');
    expect(updated.updated_at).not.toBe('2026-01-01 00:00:00');
  });

  it('應支援個人參加記錄 user_attendances 並防止同一使用者重複登記同一場次', () => {
    const { id: eventId } = db
      .prepare("INSERT INTO events (title, source_url) VALUES ('A', 'https://a.com') RETURNING id")
      .get() as any;

    const { id: sessionId } = db
      .prepare(
        "INSERT INTO event_sessions (event_id, session_date) VALUES (?, '2026-10-01') RETURNING id"
      )
      .get(eventId) as any;

    const insertAttendance = db.prepare(`
      INSERT INTO user_attendances (user_id, session_id, status, seat_info, ticket_price)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertAttendance.run('local', sessionId, 'CONFIRMED', '特A區 1排 1號', 4800);

    const record = db
      .prepare('SELECT * FROM user_attendances WHERE session_id = ?')
      .get(sessionId) as any;
    expect(record.status).toBe('CONFIRMED');
    expect(record.ticket_price).toBe(4800);
    expect(record.user_id).toBe('local');

    // 重複登記應觸發 UNIQUE(user_id, session_id) 約束失敗
    expect(() => {
      insertAttendance.run('local', sessionId, 'WANT_TO_GO', null, null);
    }).toThrow();
  });

  it('應支援 event_sale_phases 搶票開賣日程與外鍵 CASCADE 刪除約束', () => {
    const { id: eventId } = db
      .prepare(
        "INSERT INTO events (title, source_url) VALUES ('搶票測試活動', 'https://tixcraft.com/sample') RETURNING id"
      )
      .get() as any;

    const insertPhase = db.prepare(`
      INSERT INTO event_sale_phases (
        event_id, phase_name, sale_type, sale_start, ticketing_platform, is_lottery
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertPhase.run(
      eventId,
      '國泰卡友優先預購',
      'PRESALE',
      '2026-09-10T12:00:00+08:00',
      'TIXCRAFT',
      0
    );
    insertPhase.run(
      eventId,
      '拓元系統全面開賣',
      'GENERAL',
      '2026-09-12T12:00:00+08:00',
      'TIXCRAFT',
      0
    );

    const phases = db
      .prepare('SELECT * FROM event_sale_phases WHERE event_id = ? ORDER BY sale_start ASC')
      .all(eventId) as any[];

    expect(phases).toHaveLength(2);
    expect(phases[0].phase_name).toBe('國泰卡友優先預購');
    expect(phases[0].sale_type).toBe('PRESALE');
    expect(phases[1].phase_name).toBe('拓元系統全面開賣');
    expect(phases[1].sale_type).toBe('GENERAL');

    // 刪除活動應連帶刪除所有開賣階段
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    const remaining = db
      .prepare('SELECT COUNT(*) as count FROM event_sale_phases WHERE event_id = ?')
      .get(eventId) as any;
    expect(remaining.count).toBe(0);
  });
});
