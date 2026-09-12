import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

const OMIKUJI_FORTUNES = [
  { fortune: '超大吉', desc: '秒殺搶票必中第一志願！網速比光速還快 🚀', tag: '搶票必中' },
  { fortune: '神席吉', desc: '神席第一排預定！連偶像眼角閃粉都看得一清二楚 ✨', tag: '神席預定' },
  { fortune: '特上吉', desc: '特區延伸舞台最近視角，本命親自眼神對到揮手 💖', tag: '本命對視' },
  { fortune: '大吉', desc: '候補排隊奇蹟釋票，零秒順利刷進結帳頁面 🎫', tag: '奇蹟釋票' },
  { fortune: '吉', desc: '戰友通力合作全體安全上岸，快樂參戰聚餐 🎉', tag: '全員上岸' },
  { fortune: '開運吉', desc: '現場音響調音天花板，主唱開口全場起雞皮疙瘩 🎵', tag: '神級現場' },
  { fortune: '福德吉', desc: '木魚功德圓滿，周邊盲盒一發入魂抽出隱藏款 🪄', tag: '歐氣爆棚' },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId') || 'local';

    if (!eventId) {
      return NextResponse.json({ error: '缺少 eventId 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();

    // 總集氣次數
    let totalPrayers = 0;
    const totalStmt = sessionId
      ? db.prepare(
          'SELECT COALESCE(SUM(prayer_count), 0) as total FROM event_prayers WHERE event_id = ? AND session_id = ?'
        )
      : db.prepare(
          'SELECT COALESCE(SUM(prayer_count), 0) as total FROM event_prayers WHERE event_id = ?'
        );

    const totalRow = (
      sessionId ? totalStmt.get(eventId, sessionId) : totalStmt.get(eventId)
    ) as any;
    totalPrayers = totalRow?.total || 0;

    // 使用者自身的祈願記錄
    const userStmt = sessionId
      ? db.prepare(
          'SELECT * FROM event_prayers WHERE event_id = ? AND session_id = ? AND user_id = ?'
        )
      : db.prepare(
          'SELECT * FROM event_prayers WHERE event_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 1'
        );

    const userPrayer = (
      sessionId ? userStmt.get(eventId, sessionId, userId) : userStmt.get(eventId, userId)
    ) as any;

    // 最近祈願榜單/集氣祝福
    const recentPrayers = db
      .prepare(
        `SELECT id, prayer_count as prayerCount, lucky_omikuji as luckyOmikuji, blessing_tag as blessingTag, notes, created_at as createdAt
         FROM event_prayers
         WHERE event_id = ? AND lucky_omikuji IS NOT NULL
         ORDER BY updated_at DESC LIMIT 10`
      )
      .all(eventId);

    return NextResponse.json({
      totalPrayers,
      userPrayer: userPrayer || null,
      recentPrayers,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`查詢祈願數據失敗: ${err.message}`, 'PRAYER_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventId,
      sessionId = null,
      userId = 'local',
      increment = 1,
      blessingTag = null,
      notes = null,
      drawOmikuji = false,
    } = body;

    if (!eventId) {
      return NextResponse.json({ error: '缺少 eventId 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();

    // 檢查現有記錄
    const existing = db
      .prepare(
        'SELECT * FROM event_prayers WHERE event_id = ? AND user_id = ? AND (session_id = ? OR (session_id IS NULL AND ? IS NULL))'
      )
      .get(eventId, userId, sessionId, sessionId) as any;

    let luckyOmikuji = existing?.lucky_omikuji || null;
    let selectedTag = blessingTag || existing?.blessing_tag || null;

    if (drawOmikuji || !luckyOmikuji) {
      const randomItem = OMIKUJI_FORTUNES[Math.floor(Math.random() * OMIKUJI_FORTUNES.length)];
      luckyOmikuji = `【${randomItem.fortune}】${randomItem.desc}`;
      if (!selectedTag) {
        selectedTag = randomItem.tag;
      }
    }

    let result;
    if (existing) {
      const updateStmt = db.prepare(`
        UPDATE event_prayers 
        SET prayer_count = prayer_count + ?,
            lucky_omikuji = COALESCE(?, lucky_omikuji),
            blessing_tag = COALESCE(?, blessing_tag),
            notes = COALESCE(?, notes),
            updated_at = datetime('now')
        WHERE id = ?
        RETURNING *
      `);
      result = updateStmt.get(
        Math.max(1, Number(increment) || 1),
        drawOmikuji ? luckyOmikuji : null,
        blessingTag || null,
        notes || null,
        existing.id
      ) as any;
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO event_prayers (
          event_id, session_id, user_id, prayer_count, lucky_omikuji, blessing_tag, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `);
      result = insertStmt.get(
        eventId,
        sessionId,
        userId,
        Math.max(1, Number(increment) || 1),
        luckyOmikuji,
        selectedTag,
        notes || null
      ) as any;
    }

    // 獲取該活動總祈願數
    const totalRow = db
      .prepare(
        'SELECT COALESCE(SUM(prayer_count), 0) as total FROM event_prayers WHERE event_id = ?'
      )
      .get(eventId) as any;

    logger.info(
      `祈願集氣: Event ${eventId} -> User count: ${result.prayer_count}, Total: ${totalRow.total}`,
      'PRAYER_API'
    );

    return NextResponse.json({
      success: true,
      prayer: result,
      totalPrayers: totalRow.total,
      omikuji: luckyOmikuji,
      message: '祈願功德圓滿！願好運常伴！',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`集氣祈願失敗: ${err.message}`, 'PRAYER_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
