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

  it('應支援 event_setlists 儲存 Spotify、Apple Music 與 YouTube Music 串流歌單網址', () => {
    // 1. 建立活動與場次
    const { id: eventId } = db
      .prepare(
        "INSERT INTO events (title, source_url) VALUES ('串流歌單測試活動', 'https://kktix.cc/test') RETURNING id"
      )
      .get() as any;

    const { id: sessionId } = db
      .prepare(
        "INSERT INTO event_sessions (event_id, session_title, session_date) VALUES (?, '場次1', '2026-10-01') RETURNING id"
      )
      .get(eventId) as any;

    // 2. 插入歌單
    const insertSetlist = db.prepare(`
      INSERT INTO event_setlists (
        session_id, user_id, artist_name, tour_name, venue_name, session_date,
        source, songs, spotify_playlist_url, apple_music_url, youtube_music_url, notes
      )
      VALUES (?, 'local', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, spotify_playlist_url, apple_music_url, youtube_music_url
    `);

    const result = insertSetlist.get(
      sessionId,
      '測試藝人',
      '世界巡迴 2026',
      '台北小巨蛋',
      '2026-10-01',
      'MANUAL',
      JSON.stringify([{ name: '曲目一' }, { name: '曲目二' }]),
      'https://open.spotify.com/playlist/test123',
      'https://music.apple.com/playlist/test456',
      'https://music.youtube.com/playlist?list=test789',
      '極致現場體驗'
    ) as any;

    expect(result).toBeDefined();
    expect(result.spotify_playlist_url).toBe('https://open.spotify.com/playlist/test123');
    expect(result.apple_music_url).toBe('https://music.apple.com/playlist/test456');
    expect(result.youtube_music_url).toBe('https://music.youtube.com/playlist?list=test789');

    // 驗證查詢
    const queried = db
      .prepare('SELECT * FROM event_setlists WHERE session_id = ?')
      .get(sessionId) as any;
    expect(queried.youtube_music_url).toBe('https://music.youtube.com/playlist?list=test789');
    expect(JSON.parse(queried.songs)).toHaveLength(2);
  });

  it('應支援五維演出評鑑、結構化參戰手帳筆記與全生命週期狀態', () => {
    const { id: eventId } = db
      .prepare(
        "INSERT INTO events (title, source_url) VALUES ('評鑑測試活動', 'https://kktix.cc/eval') RETURNING id"
      )
      .get() as any;

    const { id: sessionId } = db
      .prepare(
        "INSERT INTO event_sessions (event_id, session_date) VALUES (?, '2026-11-01') RETURNING id"
      )
      .get(eventId) as any;

    const insertAttendance = db.prepare(`
      INSERT INTO user_attendances (
        user_id, session_id, status, seat_info, ticket_price, rating,
        rating_sound, rating_sight, rating_atmosphere, rating_performance,
        pros, cons, tips, queue_time_minutes, transfer_notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const record = insertAttendance.get(
      'local',
      sessionId,
      'PURCHASED',
      '搖滾A區 12排 10號',
      4500,
      5,
      5,
      4,
      5,
      5,
      '音響乾淨，主唱超水準發揮！',
      '排周邊動線混亂',
      '建議提早一小時到場領取手燈',
      45,
      '面交驗證序號安全'
    ) as any;

    expect(record.status).toBe('PURCHASED');
    expect(record.rating_sound).toBe(5);
    expect(record.rating_sight).toBe(4);
    expect(record.rating_atmosphere).toBe(5);
    expect(record.rating_performance).toBe(5);
    expect(record.pros).toBe('音響乾淨，主唱超水準發揮！');
    expect(record.queue_time_minutes).toBe(45);
    expect(record.transfer_notes).toBe('面交驗證序號安全');

    // 測試其他生命週期狀態更新
    db.prepare('UPDATE user_attendances SET status = ? WHERE id = ?').run(
      'TRANSFERRING',
      record.id
    );
    const updated = db
      .prepare('SELECT status FROM user_attendances WHERE id = ?')
      .get(record.id) as any;
    expect(updated.status).toBe('TRANSFERRING');
  });

  it('應支援 event_prayers 抽票祈願與集氣計數', () => {
    const { id: eventId } = db
      .prepare(
        "INSERT INTO events (title, source_url) VALUES ('祈願測試活動', 'https://kktix.cc/pray') RETURNING id"
      )
      .get() as any;

    const { id: sessionId } = db
      .prepare(
        "INSERT INTO event_sessions (event_id, session_date) VALUES (?, '2026-11-15') RETURNING id"
      )
      .get(eventId) as any;

    const insertPrayer = db.prepare(`
      INSERT INTO event_prayers (event_id, session_id, user_id, prayer_count, lucky_omikuji, blessing_tag)
      VALUES (?, ?, 'local', 10, '大吉：神席第一排預定！', '抽票必中')
      RETURNING *
    `);

    const prayer = insertPrayer.get(eventId, sessionId) as any;
    expect(prayer).toBeDefined();
    expect(prayer.prayer_count).toBe(10);
    expect(prayer.lucky_omikuji).toContain('神席第一排');
    expect(prayer.blessing_tag).toBe('抽票必中');

    // 外鍵 CASCADE 刪除
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    const count = db
      .prepare('SELECT COUNT(*) as c FROM event_prayers WHERE event_id = ?')
      .get(eventId) as any;
    expect(count.c).toBe(0);
  });

  it('應支援 venues 座標、行政區域、廳別子分區與 session hall_name', () => {
    const insertVenue = db.prepare(`
      INSERT INTO venues (name, city, address, latitude, longitude, region, sub_halls)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const venue = insertVenue.get(
      '高雄流行音樂中心',
      '高雄市',
      '高雄市鹽埕區真愛路1號',
      22.6186,
      120.2889,
      'SOUTH',
      JSON.stringify(['海音館', '鯨魚堤岸', 'LIVE WAREHOUSE'])
    ) as any;

    expect(venue.id).toBeTruthy();
    expect(venue.latitude).toBeCloseTo(22.6186);
    expect(venue.longitude).toBeCloseTo(120.2889);
    expect(venue.region).toBe('SOUTH');
    expect(JSON.parse(venue.sub_halls)).toContain('海音館');

    // 建立 event 與帶有 hall_name 的 session
    const { id: eventId } = db
      .prepare(
        "INSERT INTO events (title, source_url) VALUES ('大港開唱', 'https://megaport.tw') RETURNING id"
      )
      .get() as any;

    const { id: sessionId } = db
      .prepare(
        `
        INSERT INTO event_sessions (event_id, venue_id, hall_name, session_date)
        VALUES (?, ?, '海音館', '2026-03-28')
        RETURNING id
      `
      )
      .get(eventId, venue.id) as any;

    const session = db.prepare('SELECT * FROM event_sessions WHERE id = ?').get(sessionId) as any;
    expect(session.hall_name).toBe('海音館');
  });

  it('應支援 festival_stages 與 festival_timetables 多舞台排程與外鍵級聯', () => {
    const { id: eventId } = db
      .prepare(
        "INSERT INTO events (title, source_url) VALUES ('浪人祭 Vagabond Festival', 'https://vagabond.tw') RETURNING id"
      )
      .get() as any;

    // 1. 建立舞台
    const insertStage = db.prepare(`
      INSERT INTO festival_stages (event_id, stage_name, stage_color, location_notes)
      VALUES (?, '鯤鯓舞台', '#f43f5e', '近海灘主舞台')
      RETURNING *
    `);
    const stage = insertStage.get(eventId) as any;
    expect(stage.id).toBeTruthy();
    expect(stage.stage_name).toBe('鯤鯓舞台');
    expect(stage.stage_color).toBe('#f43f5e');

    // 2. 建立演出時間表
    const insertTimetable = db.prepare(`
      INSERT INTO festival_timetables (event_id, stage_id, session_date, artist_name, start_time, end_time, is_selected)
      VALUES (?, ?, '2026-10-10', '滅火器 Fire EX.', '16:00', '16:50', 1)
      RETURNING *
    `);
    const slot = insertTimetable.get(eventId, stage.id) as any;
    expect(slot.id).toBeTruthy();
    expect(slot.artist_name).toBe('滅火器 Fire EX.');
    expect(slot.is_selected).toBe(1);

    // 3. 測試級聯刪除
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    const stagesRemaining = db
      .prepare('SELECT COUNT(*) as c FROM festival_stages WHERE event_id = ?')
      .get(eventId) as any;
    const slotsRemaining = db
      .prepare('SELECT COUNT(*) as c FROM festival_timetables WHERE event_id = ?')
      .get(eventId) as any;
    expect(stagesRemaining.c).toBe(0);
    expect(slotsRemaining.c).toBe(0);
  });

  it('應支援 wishlist_items 朝聖心願池管理與更新', () => {
    const insertWish = db.prepare(`
      INSERT INTO wishlist_items (user_id, target_type, target_name, priority, reason)
      VALUES ('local', 'VENUE', '日本武道館', 5, '一生一定要朝聖一次的傳奇場館！')
      RETURNING *
    `);
    const wish = insertWish.get() as any;
    expect(wish.id).toBeTruthy();
    expect(wish.target_type).toBe('VENUE');
    expect(wish.target_name).toBe('日本武道館');
    expect(wish.priority).toBe(5);
    expect(wish.is_fulfilled).toBe(0);

    // 圓夢更新
    db.prepare('UPDATE wishlist_items SET is_fulfilled = 1 WHERE id = ?').run(wish.id);
    const updated = db
      .prepare('SELECT is_fulfilled FROM wishlist_items WHERE id = ?')
      .get(wish.id) as any;
    expect(updated.is_fulfilled).toBe(1);
  });

  it('應支援 attendance_expenses 遠征全量支出記帳與外鍵級聯', () => {
    // 1. 建立活動、場次與出席
    const { id: eventId } = db
      .prepare(
        "INSERT INTO events (title, source_url) VALUES ('遠征活動', 'https://expedition.com') RETURNING id"
      )
      .get() as any;
    const { id: sessionId } = db
      .prepare(
        "INSERT INTO event_sessions (event_id, session_date) VALUES (?, '2026-11-20') RETURNING id"
      )
      .get(eventId) as any;
    const { id: attendanceId } = db
      .prepare(
        "INSERT INTO user_attendances (user_id, session_id, status) VALUES ('local', ?, 'ATTENDED') RETURNING id"
      )
      .get(sessionId) as any;

    // 2. 插入多筆遠征開銷
    const insertExp = db.prepare(`
      INSERT INTO attendance_expenses (attendance_id, category, item_name, amount, notes)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);

    const exp1 = insertExp.get(
      attendanceId,
      'TRANSPORT',
      '台北-高雄高鐵來回票',
      2980,
      '早鳥 8 折'
    ) as any;
    const exp2 = insertExp.get(
      attendanceId,
      'ACCOMMODATION',
      '巨蛋周邊商旅單人房',
      2200,
      '走路 5 分鐘'
    ) as any;
    const exp3 = insertExp.get(
      attendanceId,
      'FOOD_DINING',
      '夜市宵夜慶功宴',
      450,
      '跟推友同樂'
    ) as any;

    expect(exp1.id).toBeTruthy();
    expect(exp1.category).toBe('TRANSPORT');
    expect(exp1.amount).toBe(2980);
    expect(exp2.category).toBe('ACCOMMODATION');
    expect(exp3.category).toBe('FOOD_DINING');

    // 3. 彙總查詢
    const summary = db
      .prepare(
        'SELECT category, SUM(amount) as total FROM attendance_expenses WHERE attendance_id = ? GROUP BY category'
      )
      .all(attendanceId) as any[];
    expect(summary).toHaveLength(3);

    // 4. 外鍵級聯測試 (刪除 attendance 連帶刪除費用)
    db.prepare('DELETE FROM user_attendances WHERE id = ?').run(attendanceId);
    const remaining = db
      .prepare('SELECT COUNT(*) as c FROM attendance_expenses WHERE attendance_id = ?')
      .get(attendanceId) as any;
    expect(remaining.c).toBe(0);
  });

  it('應支援四級隱私權限、本地好友名冊 (user_friends) 與同行夥伴標記 (attendance_companions)', () => {
    // 1. 建立好友名冊
    const insertFriend = db.prepare(`
      INSERT INTO user_friends (friend_name, friend_avatar, relationship_tier, contact_handle, notes)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);
    const friend1 = insertFriend.get(
      '小明',
      '🐱',
      'CLOSE_FRIEND',
      '@ming_live',
      '高中死黨，推團相同'
    ) as any;
    const friend2 = insertFriend.get(
      '推友小美',
      '🌸',
      'FRIEND',
      '@mei_concert',
      '在高雄巨蛋認識的推友'
    ) as any;

    expect(friend1.id).toBeTruthy();
    expect(friend1.relationship_tier).toBe('CLOSE_FRIEND');
    expect(friend2.relationship_tier).toBe('FRIEND');

    // 2. 建立活動、場次並指定四級隱私權限
    const { id: eventId } = db
      .prepare(
        "INSERT INTO events (title, source_url) VALUES ('好友同行演唱會', 'https://friends.com') RETURNING id"
      )
      .get() as any;
    const { id: sessionId } = db
      .prepare(
        "INSERT INTO event_sessions (event_id, session_date) VALUES (?, '2026-12-25') RETURNING id"
      )
      .get(eventId) as any;

    const insertAtt = db.prepare(`
      INSERT INTO user_attendances (user_id, session_id, status, privacy_level)
      VALUES ('local', ?, 'CONFIRMED', 'CLOSE_FRIENDS')
      RETURNING *
    `);
    const attendance = insertAtt.get(sessionId) as any;
    expect(attendance.privacy_level).toBe('CLOSE_FRIENDS');

    // 3. 標記同行參戰夥伴
    const insertComp = db.prepare(`
      INSERT INTO attendance_companions (attendance_id, friend_id, companion_name, companion_role, seat_nearby, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    const comp1 = insertComp.get(
      attendance.id,
      friend1.id,
      '小明',
      'BESTIE',
      '特A區 2排 12號 (隔壁)',
      '一起搶到票太感動'
    ) as any;
    expect(comp1.id).toBeTruthy();
    expect(comp1.companion_role).toBe('BESTIE');

    // 4. 連表查詢同行夥伴與好友資訊
    const companions = db
      .prepare(
        `
        SELECT c.*, f.relationship_tier, f.contact_handle
        FROM attendance_companions c
        LEFT JOIN user_friends f ON c.friend_id = f.id
        WHERE c.attendance_id = ?
      `
      )
      .all(attendance.id) as any[];
    expect(companions).toHaveLength(1);
    expect(companions[0].relationship_tier).toBe('CLOSE_FRIEND');

    // 5. 級聯刪除：刪除 attendance，同行夥伴應被自動清空
    db.prepare('DELETE FROM user_attendances WHERE id = ?').run(attendance.id);
    const compsLeft = db
      .prepare('SELECT COUNT(*) as c FROM attendance_companions WHERE attendance_id = ?')
      .get(attendance.id) as any;
    expect(compsLeft.c).toBe(0);
    // 好友名冊不應被刪除
    const friendStillExists = db
      .prepare('SELECT COUNT(*) as c FROM user_friends WHERE id = ?')
      .get(friend1.id) as any;
    expect(friendStillExists.c).toBe(1);
  });

  it('應支援讓換票進度追蹤 (ticket_exchanges) 與防偽檢核註記', () => {
    // 1. 建立讓換票記錄
    const insertExchange = db.prepare(`
      INSERT INTO ticket_exchanges (
        exchange_type, target_name, contact_info, platform, my_seat, target_seat,
        price_difference, status, meetup_location, meetup_time, serial_number, anti_fraud_checked, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const ex = insertExchange.get(
      'EXCHANGE',
      '陳小姐',
      'Line: chen_tickets',
      'THREADS',
      '12/31 特A區 5排',
      '01/01 特B區 2排',
      500,
      'INITIATED',
      '台北小巨蛋 1 號出口',
      '2026-12-31 16:30',
      'TIX-2026-9988',
      0,
      '補差價 $500，現場面交'
    ) as any;

    expect(ex.id).toBeTruthy();
    expect(ex.exchange_type).toBe('EXCHANGE');
    expect(ex.status).toBe('INITIATED');
    expect(ex.anti_fraud_checked).toBe(0);

    // 2. 更新交易狀態與防偽檢核註記
    db.prepare(
      `
      UPDATE ticket_exchanges
      SET status = 'IN_PERSON_MEETUP', anti_fraud_checked = 1, notes = '已現場核對拓元全像銀箔與證件'
      WHERE id = ?
    `
    ).run(ex.id);

    const updated = db.prepare('SELECT * FROM ticket_exchanges WHERE id = ?').get(ex.id) as any;
    expect(updated.status).toBe('IN_PERSON_MEETUP');
    expect(updated.anti_fraud_checked).toBe(1);

    // 3. 推進至完成
    db.prepare("UPDATE ticket_exchanges SET status = 'COMPLETED' WHERE id = ?").run(ex.id);
    const completed = db.prepare('SELECT * FROM ticket_exchanges WHERE id = ?').get(ex.id) as any;
    expect(completed.status).toBe('COMPLETED');
  });
});
