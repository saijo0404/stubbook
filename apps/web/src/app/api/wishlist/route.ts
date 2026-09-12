import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export async function GET() {
  try {
    const db = getDefaultDatabase();

    // 檢查是否有預設心願，若無則建立示範心願清單
    let items = db
      .prepare(
        'SELECT * FROM wishlist_items ORDER BY is_fulfilled ASC, priority DESC, created_at DESC'
      )
      .all() as any[];

    if (items.length === 0) {
      const defaultWishes = [
        {
          type: 'VENUE',
          name: '日本武道館',
          priority: 5,
          reason: '搖滾樂迷有生之年必訪的神聖殿堂！',
        },
        {
          type: 'ARTIST',
          name: 'Coldplay',
          priority: 5,
          reason: '希望能在體育場看全場發光手環海洋！',
        },
        {
          type: 'FESTIVAL',
          name: '大港開唱 Megaport Festival',
          priority: 4,
          reason: '每年春天一定要去高雄港邊吹海風聽搖滾！',
        },
      ];

      const insertWish = db.prepare(`
        INSERT INTO wishlist_items (target_type, target_name, priority, reason)
        VALUES (?, ?, ?, ?)
      `);

      for (const w of defaultWishes) {
        insertWish.run(w.type, w.name, w.priority, w.reason);
      }

      items = db
        .prepare(
          'SELECT * FROM wishlist_items ORDER BY is_fulfilled ASC, priority DESC, created_at DESC'
        )
        .all() as any[];
    }

    // 進行售票與演出智慧比對（Radar Match）
    const itemsWithMatches = items.map((item) => {
      let matchedEvents: any[] = [];

      if (item.target_type === 'ARTIST') {
        matchedEvents = db
          .prepare(
            `
            SELECT e.id, e.title, e.poster_url, e.source_url, es.session_date, v.name as venue_name
            FROM events e
            LEFT JOIN artists a ON e.artist_id = a.id
            LEFT JOIN event_sessions es ON es.event_id = e.id
            LEFT JOIN venues v ON es.venue_id = v.id
            WHERE a.name LIKE ? OR e.title LIKE ?
            ORDER BY es.session_date ASC
            LIMIT 3
          `
          )
          .all(`%${item.target_name}%`, `%${item.target_name}%`) as any[];
      } else if (item.target_type === 'VENUE') {
        matchedEvents = db
          .prepare(
            `
            SELECT e.id, e.title, e.poster_url, e.source_url, es.session_date, v.name as venue_name
            FROM event_sessions es
            JOIN events e ON es.event_id = e.id
            JOIN venues v ON es.venue_id = v.id
            WHERE v.name LIKE ?
            ORDER BY es.session_date ASC
            LIMIT 3
          `
          )
          .all(`%${item.target_name}%`) as any[];
      } else if (item.target_type === 'FESTIVAL') {
        matchedEvents = db
          .prepare(
            `
            SELECT e.id, e.title, e.poster_url, e.source_url, es.session_date, v.name as venue_name
            FROM events e
            LEFT JOIN event_sessions es ON es.event_id = e.id
            LEFT JOIN venues v ON es.venue_id = v.id
            WHERE e.title LIKE ?
            ORDER BY es.session_date ASC
            LIMIT 3
          `
          )
          .all(`%${item.target_name}%`) as any[];
      }

      return {
        ...item,
        matchedEvents,
        hasMatch: matchedEvents.length > 0,
      };
    });

    const totalCount = itemsWithMatches.length;
    const fulfilledCount = itemsWithMatches.filter((i) => i.is_fulfilled === 1).length;
    const matchedCount = itemsWithMatches.filter((i) => i.hasMatch && i.is_fulfilled === 0).length;

    return NextResponse.json({
      success: true,
      items: itemsWithMatches,
      stats: {
        totalCount,
        fulfilledCount,
        pendingCount: totalCount - fulfilledCount,
        matchedCount,
      },
    });
  } catch (error) {
    logger.error(`查詢心願池失敗: ${(error as Error).message}`, 'WISHLIST_API', error);
    return NextResponse.json(
      { success: false, error: '無法讀取心願池清單: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target_type, target_name, priority, reason } = body;

    if (!target_type || !target_name) {
      return NextResponse.json({ success: false, error: '心願類型與名稱為必填' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    const res = db
      .prepare(
        `
        INSERT INTO wishlist_items (target_type, target_name, priority, reason)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `
      )
      .get(target_type, target_name, priority || 3, reason || null) as any;

    logger.info(`心願項目已新增: ${target_name} (ID: ${res.id})`, 'WISHLIST_API', {
      id: res.id,
      name: target_name,
    });
    return NextResponse.json({ success: true, item: res, message: '已加入朝聖心願池！' });
  } catch (error) {
    logger.error(`新增心願項目失敗: ${(error as Error).message}`, 'WISHLIST_API', error);
    return NextResponse.json(
      { success: false, error: '新增心願失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, is_fulfilled, priority, reason } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少心願 ID' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    db.prepare(
      `
      UPDATE wishlist_items
      SET
        is_fulfilled = COALESCE(?, is_fulfilled),
        priority = COALESCE(?, priority),
        reason = COALESCE(?, reason),
        updated_at = datetime('now')
      WHERE id = ?
    `
    ).run(
      is_fulfilled !== undefined ? (is_fulfilled ? 1 : 0) : null,
      priority || null,
      reason || null,
      id
    );

    return NextResponse.json({
      success: true,
      message: is_fulfilled ? '🎉 恭喜解鎖朝聖圓夢成就！' : '心願狀態已更新',
    });
  } catch (error) {
    logger.error(`更新心願項目失敗: ${(error as Error).message}`, 'WISHLIST_API', error);
    return NextResponse.json(
      { success: false, error: '更新心願失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少心願 ID' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    db.prepare('DELETE FROM wishlist_items WHERE id = ?').run(id);

    return NextResponse.json({ success: true, message: '心願已刪除' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '刪除失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
