import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

const VALID_CATEGORIES = [
  'LIGHTSTICK',
  'APPAREL',
  'TOWEL',
  'PAMPHLET',
  'BADGE',
  'ACCESSORY',
  'OTHER',
] as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const attendanceId = searchParams.get('attendanceId');

    if (!attendanceId) {
      return NextResponse.json({ error: '缺少 attendanceId 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();

    const items = db
      .prepare(
        `
      SELECT 
        id,
        attendance_id as attendanceId,
        user_id as userId,
        item_name as itemName,
        category,
        price,
        currency,
        quantity,
        photo_url as photoUrl,
        created_at as createdAt
      FROM merchandise_items
      WHERE attendance_id = ?
      ORDER BY created_at ASC
    `
      )
      .all(attendanceId) as Array<{
      id: string;
      attendanceId: string;
      userId: string;
      itemName: string;
      category: string;
      price: number;
      currency: string;
      quantity: number;
      photoUrl: string | null;
      createdAt: string;
    }>;

    const totalCost = items.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
      0
    );

    return NextResponse.json({
      items,
      count: items.length,
      totalCost,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`查詢周邊商品清單失敗: ${err.message}`, 'MERCHANDISE_API', err);
    return NextResponse.json({ error: err.message, items: [], totalCost: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id = null,
      attendanceId,
      itemName,
      category = 'OTHER',
      price = 0,
      currency = 'TWD',
      quantity = 1,
      photoUrl = null,
    } = body;

    if (!attendanceId) {
      return NextResponse.json({ error: '缺少 attendanceId 參數' }, { status: 400 });
    }

    if (!itemName || typeof itemName !== 'string' || !itemName.trim()) {
      return NextResponse.json({ error: '周邊品名不得為空' }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: '無效的周邊分類' }, { status: 400 });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json({ error: '金額必須為大於或等於 0 之數字' }, { status: 400 });
    }

    const numericQty = parseInt(String(quantity), 10);
    if (isNaN(numericQty) || numericQty <= 0) {
      return NextResponse.json({ error: '數量必須為大於 0 之整數' }, { status: 400 });
    }

    const db = getDefaultDatabase();

    if (id) {
      const updated = db
        .prepare(
          `
        UPDATE merchandise_items
        SET 
          item_name = ?,
          category = ?,
          price = ?,
          currency = ?,
          quantity = ?,
          photo_url = ?
        WHERE id = ? AND attendance_id = ?
        RETURNING 
          id, attendance_id as attendanceId, item_name as itemName,
          category, price, currency, quantity, photo_url as photoUrl, created_at as createdAt
      `
        )
        .get(
          itemName.trim(),
          category,
          numericPrice,
          currency,
          numericQty,
          photoUrl,
          id,
          attendanceId
        );

      logger.info(`周邊商品已更新: ${itemName.trim()} (ID: ${id})`, 'MERCHANDISE_API');
      return NextResponse.json({ item: updated });
    } else {
      const inserted = db
        .prepare(
          `
        INSERT INTO merchandise_items (attendance_id, item_name, category, price, currency, quantity, photo_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING 
          id, attendance_id as attendanceId, item_name as itemName,
          category, price, currency, quantity, photo_url as photoUrl, created_at as createdAt
      `
        )
        .get(attendanceId, itemName.trim(), category, numericPrice, currency, numericQty, photoUrl);

      logger.info(`周邊商品已新增: ${itemName.trim()}`, 'MERCHANDISE_API', { attendanceId });
      return NextResponse.json({ item: inserted }, { status: 201 });
    }
  } catch (error) {
    const err = error as Error;
    logger.error(`儲存周邊商品失敗: ${err.message}`, 'MERCHANDISE_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少 id 參數' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    const result = db.prepare(`DELETE FROM merchandise_items WHERE id = ?`).run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: '找不到指定的周邊項目' }, { status: 404 });
    }

    logger.info(`周邊商品已刪除 (ID: ${id})`, 'MERCHANDISE_API');
    return NextResponse.json({ success: true, id });
  } catch (error) {
    const err = error as Error;
    logger.error(`刪除周邊商品失敗: ${err.message}`, 'MERCHANDISE_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
