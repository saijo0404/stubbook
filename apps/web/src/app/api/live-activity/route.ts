import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const simulatePhase = searchParams.get('simulatePhase');

    const db = getDefaultDatabase();

    // 取得最近一場即將到來或當天之確認參戰行程
    const attendances = db
      .prepare(
        `
        SELECT
          ua.id as attendance_id,
          ua.status,
          ua.seat_info,
          ua.ticket_price,
          ua.currency,
          ua.rating,
          es.id as session_id,
          es.session_date,
          es.doors_open_time,
          es.hall_name,
          e.id as event_id,
          e.title as event_title,
          e.poster_url,
          a.name as artist_name,
          v.id as venue_id,
          v.name as venue_name,
          v.city as venue_city,
          v.address as venue_address
        FROM user_attendances ua
        JOIN event_sessions es ON ua.session_id = es.id
        JOIN events e ON es.event_id = e.id
        LEFT JOIN artists a ON e.artist_id = a.id
        LEFT JOIN venues v ON es.venue_id = v.id
        WHERE ua.status IN ('CONFIRMED', 'PURCHASED', 'ATTENDED', 'WANT_TO_GO', 'TICKETING')
        ORDER BY es.session_date ASC
      `
      )
      .all() as any[];

    if (attendances.length === 0) {
      return NextResponse.json({
        success: true,
        hasUpcoming: false,
        message: '目前尚無即將到來的演出參戰紀錄',
      });
    }

    const now = new Date();
    // 找出最靠近現在的活動（若無未來活動則取最新的一場）
    let activeItem = attendances.find((att) => {
      const sessionTime = new Date(att.session_date).getTime();
      // 演出結束 6 小時內仍視為活躍
      return sessionTime + 6 * 3600 * 1000 >= now.getTime();
    });

    if (!activeItem) {
      activeItem = attendances[attendances.length - 1];
    }

    const sessionDateObj = new Date(activeItem.session_date);
    const sessionDateStr = activeItem.session_date.slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);
    const isToday = sessionDateStr === todayStr;

    // 開放進場時間推算（預設為開演前 1.5 小時）
    let doorsOpenObj = activeItem.doors_open_time
      ? new Date(activeItem.doors_open_time)
      : new Date(sessionDateObj.getTime() - 90 * 60 * 1000);

    const diffMs = sessionDateObj.getTime() - now.getTime();
    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

    // 狀態機計算
    let phase: 'UPCOMING' | 'QUEUEING' | 'DOORS_OPEN' | 'COUNTDOWN' | 'LIVE' | 'EXIT' = 'UPCOMING';
    let phaseTitle = '倒數期待中';
    let phaseDescription = '準備好你的手燈與參戰心情，期待狂歡現場！';
    let targetTime = activeItem.session_date;

    if (simulatePhase) {
      phase = simulatePhase as any;
    } else if (isToday) {
      const nowMs = now.getTime();
      const showMs = sessionDateObj.getTime();
      const doorsMs = doorsOpenObj.getTime();

      if (nowMs < doorsMs - 2 * 3600 * 1000) {
        phase = 'QUEUEING';
        phaseTitle = '🎪 現場整隊與周邊排隊中';
        phaseDescription = '提早到場領取官方特典與購買限定周邊，記得補充水份！';
        targetTime = doorsOpenObj.toISOString();
      } else if (nowMs < showMs - 30 * 60 * 1000) {
        phase = 'DOORS_OPEN';
        phaseTitle = '🎟️ 驗票閘門開放進場';
        phaseDescription = '請準備好實體票或將手機螢幕切換至最大亮度出示條碼。';
        targetTime = showMs ? new Date(showMs - 30 * 60 * 1000).toISOString() : targetTime;
      } else if (nowMs < showMs) {
        phase = 'COUNTDOWN';
        phaseTitle = '⚡ 即將開演！心跳倒數';
        phaseDescription = '全員就位！燈光即將暗下，沉浸於最極致的現場震撼！';
        targetTime = sessionDateObj.toISOString();
      } else if (nowMs < showMs + 3 * 3600 * 1000) {
        phase = 'LIVE';
        phaseTitle = '🔥 LIVE 演出進行中';
        phaseDescription = '正在現場！盡情揮舞應援手燈，享受每一首音符！';
        targetTime = new Date(showMs + 3 * 3600 * 1000).toISOString();
      } else {
        phase = 'EXIT';
        phaseTitle = '🌙 演出落幕 · 散場交通指引';
        phaseDescription = '注意隨身物品與大眾運輸班次，回家後別忘了填寫今天的手帳五維評價！';
        targetTime = new Date(showMs + 4 * 3600 * 1000).toISOString();
      }
    } else {
      phase = 'UPCOMING';
      const days = Math.floor(diffSeconds / 86400);
      phaseTitle = `距離現場還有 ${days} 天`;
      phaseDescription = `下一場震撼現場：${activeItem.artist_name || activeItem.event_title}`;
    }

    return NextResponse.json({
      success: true,
      hasUpcoming: true,
      data: {
        sessionId: activeItem.session_id,
        eventId: activeItem.event_id,
        eventTitle: activeItem.event_title,
        artistName: activeItem.artist_name || activeItem.event_title,
        posterUrl: activeItem.poster_url,
        venueName: activeItem.venue_name || '現場演出館',
        hallName: activeItem.hall_name || null,
        venueCity: activeItem.venue_city,
        seatInfo: activeItem.seat_info,
        status: activeItem.status,
        sessionDate: activeItem.session_date,
        doorsOpenTime: doorsOpenObj.toISOString(),
        isToday,
        phase,
        phaseTitle,
        phaseDescription,
        targetTime,
        remainingSeconds: diffSeconds,
      },
    });
  } catch (error) {
    logger.error(`計算即時動態狀態失敗: ${(error as Error).message}`, 'LIVE_ACTIVITY_API', error);
    return NextResponse.json(
      { success: false, error: '無法取得即時動態: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, phase } = body;

    logger.info(`即時動態通知模擬完成: Session ${sessionId}, Phase ${phase}`, 'LIVE_ACTIVITY_API', {
      sessionId,
      phase,
    });
    return NextResponse.json({
      success: true,
      message: `即時動態狀態已更新為 [${phase}]，靈動島與通知已同步推播`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '更新失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
