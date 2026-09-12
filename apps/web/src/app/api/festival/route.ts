import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

// 時間字串（"HH:mm"）轉換為當日分鐘數
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

// 檢測兩個時間區間是否重疊
function isOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): { overlap: boolean; overlapMinutes: number } {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  const start = Math.max(s1, s2);
  const end = Math.min(e1, e2);
  const overlapMinutes = Math.max(0, end - start);

  return {
    overlap: overlapMinutes > 0,
    overlapMinutes,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    const db = getDefaultDatabase();

    // 1. 取得目標活動
    let targetEventId = eventId;
    if (!targetEventId) {
      // 預設尋找有 festival_stages 的活動或任意最新活動
      const stageEvent = db
        .prepare('SELECT DISTINCT event_id FROM festival_stages ORDER BY created_at DESC LIMIT 1')
        .get() as any;

      if (stageEvent) {
        targetEventId = stageEvent.event_id;
      } else {
        const anyEvent = db
          .prepare('SELECT id FROM events ORDER BY created_at DESC LIMIT 1')
          .get() as any;
        targetEventId = anyEvent?.id;
      }
    }

    if (!targetEventId) {
      return NextResponse.json({
        success: true,
        stages: [],
        timetables: [],
        clashes: [],
        message: '目前資料庫中尚未建立活動',
      });
    }

    // 2. 檢查此活動是否已有舞台，若無則自動產生示範大型音樂祭舞台與時程 (如大港開唱風格)
    const existingStages = db
      .prepare('SELECT * FROM festival_stages WHERE event_id = ? ORDER BY stage_name ASC')
      .all(targetEventId) as any[];

    if (existingStages.length === 0) {
      const stageTemplates = [
        { name: '南霸天 (South King)', color: '#f43f5e', notes: '戶外海風主舞台' },
        { name: '海龍王 (Sea Dragon)', color: '#06b6d4', notes: '海音館室內巨型舞台' },
        { name: '女神龍 (Goddess)', color: '#a855f7', notes: '愛河灣親水舞台' },
        { name: '卡魔麥 (Kamome)', color: '#10b981', notes: '大港倉庫獨立新聲舞台' },
        { name: '出風頭 (Spotlight)', color: '#f59e0b', notes: '電子與嘻哈舞台' },
      ];

      const insertStage = db.prepare(`
        INSERT INTO festival_stages (id, event_id, stage_name, stage_color, location_notes)
        VALUES (?, ?, ?, ?, ?)
      `);

      const insertTimetable = db.prepare(`
        INSERT INTO festival_timetables (id, event_id, stage_id, session_date, artist_name, start_time, end_time, is_selected, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const createdStages: any[] = [];
      const sessionDate = '2026-03-28';

      // 建立舞台
      for (const t of stageTemplates) {
        const stageId = 'stage_' + Math.random().toString(36).substring(2, 9);
        insertStage.run(stageId, targetEventId, t.name, t.color, t.notes);
        createdStages.push({
          id: stageId,
          stage_name: t.name,
          stage_color: t.color,
          location_notes: t.notes,
        });
      }

      // 建立示範時程（刻意設計一組衝堂供使用者體驗警示機制）
      const mockSlots = [
        {
          stageIdx: 0,
          artist: '滅火器 Fire EX.',
          start: '16:00',
          end: '16:50',
          sel: 1,
          notes: '壓軸主舞台必看！',
        },
        {
          stageIdx: 0,
          artist: '草東沒有派對',
          start: '18:00',
          end: '18:50',
          sel: 1,
          notes: '萬人合唱',
        },
        {
          stageIdx: 1,
          artist: '拍謝少年 Sorry Youth',
          start: '15:30',
          end: '16:20',
          sel: 1,
          notes: '海口味搖滾（與滅火器衝堂 20 分鐘）',
        },
        {
          stageIdx: 1,
          artist: '告五人 Accusefive',
          start: '17:30',
          end: '18:20',
          sel: 0,
          notes: '披星戴月的想你',
        },
        {
          stageIdx: 2,
          artist: '鄭宜農 Enno Cheng',
          start: '14:20',
          end: '15:10',
          sel: 1,
          notes: '給天王星',
        },
        {
          stageIdx: 2,
          artist: '大象體操 Elephant Gym',
          start: '16:40',
          end: '17:30',
          sel: 0,
          notes: '數字搖滾',
        },
        {
          stageIdx: 3,
          artist: 'deca joins',
          start: '17:00',
          end: '17:50',
          sel: 0,
          notes: '午後慵懶氛圍',
        },
        { stageIdx: 4, artist: 'Leo王', start: '18:30', end: '19:20', sel: 0, notes: '金曲嘻哈' },
      ];

      for (const slot of mockSlots) {
        const slotId = 'tt_' + Math.random().toString(36).substring(2, 9);
        const stage = createdStages[slot.stageIdx];
        if (stage) {
          insertTimetable.run(
            slotId,
            targetEventId,
            stage.id,
            sessionDate,
            slot.artist,
            slot.start,
            slot.end,
            slot.sel,
            slot.notes
          );
        }
      }
    }

    // 3. 讀取舞台與演出時間表
    const stages = db
      .prepare('SELECT * FROM festival_stages WHERE event_id = ? ORDER BY stage_name ASC')
      .all(targetEventId) as any[];

    const timetables = db
      .prepare(
        `
        SELECT ft.*, fs.stage_name, fs.stage_color
        FROM festival_timetables ft
        JOIN festival_stages fs ON ft.stage_id = fs.id
        WHERE ft.event_id = ?
        ORDER BY ft.session_date ASC, ft.start_time ASC
      `
      )
      .all(targetEventId) as any[];

    // 4. 檢測個人選定演出之間的「衝堂衝突 (Clashes)」
    const selectedSlots = timetables.filter((t) => t.is_selected === 1);
    const clashes: Array<{
      slot1: any;
      slot2: any;
      overlapMinutes: number;
      message: string;
    }> = [];

    for (let i = 0; i < selectedSlots.length; i++) {
      for (let j = i + 1; j < selectedSlots.length; j++) {
        const a = selectedSlots[i];
        const b = selectedSlots[j];

        if (a.session_date === b.session_date && a.stage_id !== b.stage_id) {
          const { overlap, overlapMinutes } = isOverlapping(
            a.start_time,
            a.end_time,
            b.start_time,
            b.end_time
          );

          if (overlap) {
            clashes.push({
              slot1: a,
              slot2: b,
              overlapMinutes,
              message: `⚠️ 衝堂警示：【${a.artist_name}】(${a.stage_name}) 與 【${b.artist_name}】(${b.stage_name}) 演出時間重疊 ${overlapMinutes} 分鐘！`,
            });
            a.isClashing = true;
            b.isClashing = true;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      eventId: targetEventId,
      stages,
      timetables,
      clashes,
      selectedCount: selectedSlots.length,
    });
  } catch (error) {
    logger.error(`查詢音樂祭時程失敗: ${(error as Error).message}`, 'FESTIVAL_API', error);
    return NextResponse.json(
      { success: false, error: '查詢音樂祭時程失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { timetableId, isSelected } = body;

    if (!timetableId) {
      return NextResponse.json({ success: false, error: '缺少 timetableId' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    db.prepare('UPDATE festival_timetables SET is_selected = ? WHERE id = ?').run(
      isSelected ? 1 : 0,
      timetableId
    );

    return NextResponse.json({
      success: true,
      message: isSelected ? '已標記為必看演出！' : '已取消選取',
    });
  } catch (error) {
    logger.error(`更新音樂祭選取失敗: ${(error as Error).message}`, 'FESTIVAL_API', error);
    return NextResponse.json(
      { success: false, error: '更新失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, stageId, sessionDate, artistName, startTime, endTime, notes } = body;

    if (!eventId || !stageId || !artistName || !startTime || !endTime) {
      return NextResponse.json({ success: false, error: '演出資料不完整' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    const slotId = 'tt_' + Math.random().toString(36).substring(2, 9);

    db.prepare(
      `
      INSERT INTO festival_timetables (id, event_id, stage_id, session_date, artist_name, start_time, end_time, is_selected, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `
    ).run(
      slotId,
      eventId,
      stageId,
      sessionDate || new Date().toISOString().slice(0, 10),
      artistName,
      startTime,
      endTime,
      notes || null
    );

    return NextResponse.json({
      success: true,
      timetableId: slotId,
      message: '已新增音樂祭時程',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '新增時程失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
