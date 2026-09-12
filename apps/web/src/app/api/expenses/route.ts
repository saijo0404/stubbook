import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const attendanceId = searchParams.get('attendanceId');
    const db = getDefaultDatabase();

    if (attendanceId) {
      const expenses = db
        .prepare(
          `
          SELECT * FROM attendance_expenses
          WHERE attendance_id = ?
          ORDER BY created_at ASC
        `
        )
        .all(attendanceId);

      const total = db
        .prepare(
          'SELECT COALESCE(SUM(amount), 0) as sum FROM attendance_expenses WHERE attendance_id = ?'
        )
        .get(attendanceId) as { sum: number };

      return NextResponse.json({
        success: true,
        expenses,
        totalAmount: total.sum,
      });
    }

    // 全量聚合查詢
    const allExpenses = db
      .prepare(
        `
        SELECT ae.*, e.title as event_title, s.session_date, v.name as venue_name
        FROM attendance_expenses ae
        JOIN user_attendances ua ON ae.attendance_id = ua.id
        JOIN event_sessions s ON ua.session_id = s.id
        JOIN events e ON s.event_id = e.id
        LEFT JOIN venues v ON s.venue_id = v.id
        ORDER BY s.session_date DESC, ae.created_at DESC
      `
      )
      .all();

    // 依類別分類彙總
    const categoryTotals = db
      .prepare(
        `
        SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM attendance_expenses
        GROUP BY category
      `
      )
      .all() as Array<{ category: string; total: number; count: number }>;

    // 亦納入門票與既有周邊統計以呈現完整旅程總出費
    const ticketSummary = db
      .prepare(
        `
        SELECT COALESCE(SUM(ticket_price), 0) as total, COUNT(*) as count
        FROM user_attendances
        WHERE ticket_price > 0
      `
      )
      .get() as { total: number; count: number };

    const merchSummary = db
      .prepare(
        `
        SELECT COALESCE(SUM(price * quantity), 0) as total, COUNT(*) as count
        FROM merchandise_items
      `
      )
      .get() as { total: number; count: number };

    const categoryMap: Record<string, number> = {
      TICKET: ticketSummary.total,
      MERCHANDISE: merchSummary.total,
      TRANSPORT: 0,
      ACCOMMODATION: 0,
      FOOD_DINING: 0,
      OTHER: 0,
    };

    for (const row of categoryTotals) {
      categoryMap[row.category] = (categoryMap[row.category] || 0) + row.total;
    }

    const grandTotal = Object.values(categoryMap).reduce((sum, val) => sum + val, 0);

    // 遠征出費佔比 (交通 + 住宿) / 總出費
    const expeditionSpend = (categoryMap.TRANSPORT || 0) + (categoryMap.ACCOMMODATION || 0);
    const expeditionRate = grandTotal > 0 ? (expeditionSpend / grandTotal) * 100 : 0;

    return NextResponse.json({
      success: true,
      expenses: allExpenses,
      categoryMap,
      grandTotal,
      expeditionSpend,
      expeditionRate: Math.round(expeditionRate * 10) / 10,
    });
  } catch (error) {
    logger.error(`查詢支出記錄失敗: ${(error as Error).message}`, 'EXPENSES_API', error);
    return NextResponse.json(
      { success: false, error: '查詢支出記錄失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { attendance_id, category, item_name, amount, currency = 'TWD', notes } = body;

    if (!attendance_id || !category || !item_name || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'attendance_id, category, item_name 與 amount 為必填欄位' },
        { status: 400 }
      );
    }

    const db = getDefaultDatabase();
    const res = db
      .prepare(
        `
        INSERT INTO attendance_expenses (attendance_id, category, item_name, amount, currency, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `
      )
      .get(
        attendance_id,
        category,
        item_name.trim(),
        Number(amount) || 0,
        currency,
        notes || null
      ) as any;

    logger.info(`遠征出費項目已新增: ${item_name} - $${amount}`, 'EXPENSES_API', { id: res.id });
    return NextResponse.json({
      success: true,
      expense: res,
      message: '出費項目已記錄！',
    });
  } catch (error) {
    logger.error(`新增支出失敗: ${(error as Error).message}`, 'EXPENSES_API', error);
    return NextResponse.json(
      { success: false, error: '新增支出失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, category, item_name, amount, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少支出 ID' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    db.prepare(
      `
      UPDATE attendance_expenses
      SET
        category = COALESCE(?, category),
        item_name = COALESCE(?, item_name),
        amount = COALESCE(?, amount),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `
    ).run(
      category || null,
      item_name ? item_name.trim() : null,
      amount !== undefined ? Number(amount) : null,
      notes || null,
      id
    );

    return NextResponse.json({ success: true, message: '出費記錄已更新' });
  } catch (error) {
    logger.error(`更新支出失敗: ${(error as Error).message}`, 'EXPENSES_API', error);
    return NextResponse.json(
      { success: false, error: '更新支出失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少支出 ID' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    db.prepare('DELETE FROM attendance_expenses WHERE id = ?').run(id);

    return NextResponse.json({ success: true, message: '出費記錄已刪除' });
  } catch (error) {
    logger.error(`刪除支出失敗: ${(error as Error).message}`, 'EXPENSES_API', error);
    return NextResponse.json(
      { success: false, error: '刪除支出失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
