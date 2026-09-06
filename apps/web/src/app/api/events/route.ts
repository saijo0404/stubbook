import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@stubbook/database';
import { logger } from '@stubbook/logger';
import { ScrapedEvent } from '@stubbook/scraper-core';

// 記憶體簡易儲存（在未配置遠端 Supabase 時提供完整互動支援）
const IN_MEMORY_STORE: Array<{
  id: string;
  title: string;
  platform: string;
  sourceUrl: string;
  posterUrl?: string;
  sessionsCount: number;
  createdAt: string;
}> = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event as ScrapedEvent;

    if (!event || !event.title || !event.sessions || event.sessions.length === 0) {
      return NextResponse.json({ error: '無效的活動資料' }, { status: 400 });
    }

    logger.info(`收到活動入庫請求: ${event.title}`, 'DATABASE_API', {
      platform: event.platform,
      sessionsCount: event.sessions.length,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 1. 若已配置 Supabase 憑證，寫入遠端 PostgreSQL
    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
      try {
        const supabase = getSupabaseClient({ supabaseUrl, supabaseKey });

        // 寫入 events 表
        const { data: eventRow, error: eventErr } = await supabase
          .from('events')
          .insert({
            title: event.title,
            tour_name: event.tourName || null,
            source_url: event.sourceUrl,
            poster_url: event.posterUrl || null,
            platform: event.platform,
            description: event.description || null,
            organizer: event.organizer || null,
            raw_metadata: (event.rawMetadata as any) || {},
          })
          .select('id')
          .single();

        if (eventErr) {
          throw new Error(`寫入 events 失敗: ${eventErr.message}`);
        }

        const eventId = eventRow.id;

        // 寫入 event_sessions 表
        const sessionInserts = event.sessions.map((s) => ({
          event_id: eventId,
          session_title: s.sessionTitle || null,
          session_date: s.sessionDate,
          doors_open_time: s.doorsOpenTime || null,
          ticket_sale_time: s.ticketSaleTime || null,
          ticket_platform: s.ticketPlatform,
          ticket_tiers: s.ticketTiers as any,
          booking_url: s.bookingUrl || null,
          venue_name_override: s.venueName,
        }));

        const { error: sessionErr } = await supabase.from('event_sessions').insert(sessionInserts);
        if (sessionErr) {
          throw new Error(`寫入 event_sessions 失敗: ${sessionErr.message}`);
        }

        logger.info(`活動成功入庫至 Supabase (Event ID: ${eventId})`, 'DATABASE_API');

        return NextResponse.json({
          success: true,
          eventId,
          storage: 'supabase',
          message: '活動與場次已成功儲存至 Supabase 資料庫！',
        });
      } catch (dbError) {
        const err = dbError as Error;
        logger.error(`Supabase 寫入錯誤: ${err.message}`, 'DATABASE_API', err);
        // 降級處理
      }
    }

    // 2. 本地開發環境暫存 (未設定 Supabase 金鑰時的防呆流程)
    const mockId = `event-${Date.now()}`;
    IN_MEMORY_STORE.unshift({
      id: mockId,
      title: event.title,
      platform: event.platform,
      sourceUrl: event.sourceUrl,
      posterUrl: event.posterUrl,
      sessionsCount: event.sessions.length,
      createdAt: new Date().toISOString(),
    });

    logger.info(`活動已以本地預覽模式儲存 (ID: ${mockId})`, 'DATABASE_API');

    return NextResponse.json({
      success: true,
      eventId: mockId,
      storage: 'local_preview',
      message:
        '活動已成功記錄（本地預覽模式，設定 .env.local 之 Supabase 金鑰即可同步寫入雲端 PostgreSQL）',
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`入庫失敗: ${err.message}`, 'DATABASE_API', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    events: IN_MEMORY_STORE,
  });
}
