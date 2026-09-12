import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDefaultDatabase();

    // 1. 取得所有使用者的參戰記錄與場次資料
    const attendances = db
      .prepare(
        `
        SELECT 
          ua.id as attendance_id,
          ua.session_id,
          ua.status,
          ua.ticket_price,
          s.session_date,
          e.id as event_id,
          e.title as event_title,
          a.name as artist_name,
          v.id as venue_id,
          v.name as venue_name
        FROM user_attendances ua
        JOIN event_sessions s ON ua.session_id = s.id
        JOIN events e ON s.event_id = e.id
        LEFT JOIN artists a ON e.artist_id = a.id
        LEFT JOIN venues v ON s.venue_id = v.id
        WHERE s.session_date IS NOT NULL AND s.session_date != ''
        ORDER BY s.session_date ASC
      `
      )
      .all() as Array<{
      attendance_id: string;
      session_id: string;
      status: string;
      ticket_price: number;
      session_date: string;
      event_id: string;
      event_title: string;
      artist_name: string | null;
      venue_id: string | null;
      venue_name: string | null;
    }>;

    // 2. 構建過去 365 天之 Contribution Heatmap 矩陣
    const today = new Date();
    const heatmapDays: Array<{
      date: string;
      count: number;
      level: 0 | 1 | 2 | 3 | 4;
      sessions: Array<{
        id: string;
        eventTitle: string;
        artistName: string;
        venueName: string;
      }>;
    }> = [];

    // 依日期分組活動
    const dateMap = new Map<
      string,
      Array<{
        id: string;
        eventTitle: string;
        artistName: string;
        venueName: string;
      }>
    >();

    for (const att of attendances) {
      const dateStr = att.session_date.slice(0, 10);
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, []);
      }
      dateMap.get(dateStr)!.push({
        id: att.session_id,
        eventTitle: att.event_title,
        artistName: att.artist_name || '未知藝人',
        venueName: att.venue_name || '未知場館',
      });
    }

    // 產出過去 364 天至今天的每日資料 (共 365 天)
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isoDate = d.toISOString().slice(0, 10);

      const items = dateMap.get(isoDate) || [];
      const count = items.length;
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count === 3) level = 3;
      else if (count >= 4) level = 4;

      heatmapDays.push({
        date: isoDate,
        count,
        level,
        sessions: items,
      });
    }

    // 3. 週幾分佈與最多參戰星期 (Weekday distribution)
    const weekdayLabels = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    const weekdayDistribution: Record<string, number> = {
      週日: 0,
      週一: 0,
      週二: 0,
      週三: 0,
      週四: 0,
      週五: 0,
      週六: 0,
    };

    for (const att of attendances) {
      const d = new Date(att.session_date);
      if (!isNaN(d.getTime())) {
        const dayIdx = d.getDay();
        const label = weekdayLabels[dayIdx];
        weekdayDistribution[label] = (weekdayDistribution[label] || 0) + 1;
      }
    }

    let maxDay = '週六';
    let maxCount = -1;
    for (const [day, count] of Object.entries(weekdayDistribution)) {
      if (count > maxCount) {
        maxCount = count;
        maxDay = day;
      }
    }

    // 4. 每月分佈 (Monthly distribution: 過去 12 個月)
    const monthlyDistribution: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mKey = d.toISOString().slice(0, 7); // e.g. "2026-03"
      monthlyDistribution[mKey] = 0;
    }

    for (const att of attendances) {
      const mKey = att.session_date.slice(0, 7);
      if (monthlyDistribution[mKey] !== undefined) {
        monthlyDistribution[mKey]++;
      }
    }

    // 5. 現場歌單解鎖深度指標 (Unique Songs & Top Songs)
    const setlists = db.prepare('SELECT songs, artist_name FROM event_setlists').all() as Array<{
      songs: string;
      artist_name: string;
    }>;

    const songFrequency = new Map<
      string,
      { songName: string; artistName: string; playCount: number }
    >();
    const uniqueSongKeys = new Set<string>();

    for (const sl of setlists) {
      try {
        const parsed = JSON.parse(sl.songs) as Array<{ name?: string }>;
        for (const item of parsed) {
          if (item?.name && item.name.trim()) {
            const trimmed = item.name.trim();
            const key = `${sl.artist_name || ''} - ${trimmed}`.toLowerCase();
            uniqueSongKeys.add(key);

            if (!songFrequency.has(key)) {
              songFrequency.set(key, {
                songName: trimmed,
                artistName: sl.artist_name || '未知藝人',
                playCount: 0,
              });
            }
            songFrequency.get(key)!.playCount++;
          }
        }
      } catch {
        // 容錯跳過不合法的 JSON
      }
    }

    const topSongs = Array.from(songFrequency.values())
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 5);

    // 6. 出費統計
    const expenses = db.prepare('SELECT category, amount FROM attendance_expenses').all() as Array<{
      category: string;
      amount: number;
    }>;

    const ticketSum = attendances.reduce((acc, a) => acc + (a.ticket_price || 0), 0);
    const merchRows = db
      .prepare('SELECT COALESCE(SUM(price * quantity), 0) as s FROM merchandise_items')
      .get() as { s: number };
    const merchSum = merchRows.s || 0;

    const spendByCategory: Record<string, number> = {
      TICKET: ticketSum,
      MERCHANDISE: merchSum,
      TRANSPORT: 0,
      ACCOMMODATION: 0,
      FOOD_DINING: 0,
      OTHER: 0,
    };

    for (const exp of expenses) {
      spendByCategory[exp.category] = (spendByCategory[exp.category] || 0) + exp.amount;
    }

    const totalExpeditionSpend = Object.values(spendByCategory).reduce((sum, v) => sum + v, 0);
    const attendedCount = attendances.filter(
      (a) => a.status === 'ATTENDED' || a.status === 'CONFIRMED'
    ).length;
    const averageSpendPerConcert =
      attendedCount > 0 ? Math.round(totalExpeditionSpend / attendedCount) : 0;

    const farExpeditionSpend =
      (spendByCategory.TRANSPORT || 0) + (spendByCategory.ACCOMMODATION || 0);
    const farExpeditionRate =
      totalExpeditionSpend > 0
        ? Math.round((farExpeditionSpend / totalExpeditionSpend) * 1000) / 10
        : 0;

    // 7. 推活熱量分數 (Passion Score & Title)
    const uniqueVenues = new Set(attendances.map((a) => a.venue_id || a.venue_name).filter(Boolean))
      .size;
    const uniqueSongsCount = uniqueSongKeys.size;

    const attendancePoints = attendedCount * 60;
    const songPoints = uniqueSongsCount * 8;
    const venuePoints = uniqueVenues * 35;
    const spendPoints = Math.floor(totalExpeditionSpend / 200);

    const passionScore = attendancePoints + songPoints + venuePoints + spendPoints;

    let passionRankTitle = '🌱 初心者推活探索者 (Lv.1)';
    let passionRankBadge = '探索中';
    if (passionScore >= 1200) {
      passionRankTitle = '🔥 傳說級狂熱推活大師 (Lv.99)';
      passionRankBadge = 'LEGENDARY';
    } else if (passionScore >= 700) {
      passionRankTitle = '🌟 資深金牌現場信徒 (Lv.50)';
      passionRankBadge = 'MASTER';
    } else if (passionScore >= 350) {
      passionRankTitle = '⚡ 狂熱巡迴參戰先鋒 (Lv.25)';
      passionRankBadge = 'PIONEER';
    } else if (passionScore >= 100) {
      passionRankTitle = '✨ 熱血 Livehouse 常客 (Lv.10)';
      passionRankBadge = 'REGULAR';
    }

    return NextResponse.json({
      success: true,
      analytics: {
        totalAttendances: attendances.length,
        completedCount: attendedCount,
        activeDays: dateMap.size,
        activeRate: Math.round((dateMap.size / 365) * 1000) / 10,
        passionScore,
        passionRankTitle,
        passionRankBadge,
        heatmapDays,
        weekdayDistribution,
        mostFrequentWeekday: maxDay,
        monthlyDistribution,
        totalUniqueSongsHeard: uniqueSongsCount,
        topSongs,
        totalExpeditionSpend,
        spendByCategory,
        averageSpendPerConcert,
        farExpeditionRate,
      },
    });
  } catch (error) {
    logger.error(`計算推活熱量指標失敗: ${(error as Error).message}`, 'PASSION_API', error);
    return NextResponse.json(
      { success: false, error: '計算推活熱量指標失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
