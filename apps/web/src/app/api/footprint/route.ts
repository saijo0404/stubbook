import { NextRequest, NextResponse } from 'next/server';
import { getDefaultDatabase } from '@stubbook/database';
import { logger } from '@stubbook/logger';

// 知名場館座標與區域預設詞典 (自動補全經緯度與次廳別)
const KNOWN_VENUES_MAP: Record<
  string,
  {
    name: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    region: 'NORTH' | 'CENTRAL' | 'SOUTH' | 'EAST' | 'OVERSEAS';
    sub_halls: string[];
  }
> = {
  台北小巨蛋: {
    name: '台北小巨蛋',
    city: '台北市',
    country: 'TW',
    latitude: 25.051,
    longitude: 121.5501,
    region: 'NORTH',
    sub_halls: ['主場館', '副館'],
  },
  高雄流行音樂中心: {
    name: '高雄流行音樂中心',
    city: '高雄市',
    country: 'TW',
    latitude: 22.6186,
    longitude: 120.2889,
    region: 'SOUTH',
    sub_halls: ['海音館', '海風廣場', '鯨魚堤岸', 'LIVE WAREHOUSE'],
  },
  台北流行音樂中心: {
    name: '台北流行音樂中心',
    city: '台北市',
    country: 'TW',
    latitude: 25.0528,
    longitude: 121.5901,
    region: 'NORTH',
    sub_halls: ['表演廳', '文化館', '產業區'],
  },
  南港展覽館: {
    name: '台北南港展覽館',
    city: '台北市',
    country: 'TW',
    latitude: 25.0566,
    longitude: 121.6171,
    region: 'NORTH',
    sub_halls: ['1館 1F', '1館 4F', '2館 1F', '2館 7F'],
  },
  'Zepp New Taipei': {
    name: 'Zepp New Taipei',
    city: '新北市',
    country: 'TW',
    latitude: 25.0603,
    longitude: 121.4552,
    region: 'NORTH',
    sub_halls: ['Zepp 主場館'],
  },
  'Legacy Taipei': {
    name: 'Legacy Taipei 音樂展演空間',
    city: '台北市',
    country: 'TW',
    latitude: 25.0441,
    longitude: 121.5294,
    region: 'NORTH',
    sub_halls: ['華山中5A館'],
  },
  'Legacy TERA': {
    name: 'Legacy TERA',
    city: '台北市',
    country: 'TW',
    latitude: 25.0543,
    longitude: 121.591,
    region: 'NORTH',
    sub_halls: ['TERA 大廳'],
  },
  'Legacy Taichung': {
    name: 'Legacy Taichung 音樂展演空間',
    city: '台中市',
    country: 'TW',
    latitude: 24.1681,
    longitude: 120.6387,
    region: 'CENTRAL',
    sub_halls: ['主展場'],
  },
  高雄巨蛋: {
    name: '高雄巨蛋',
    city: '高雄市',
    country: 'TW',
    latitude: 22.6698,
    longitude: 120.3023,
    region: 'SOUTH',
    sub_halls: ['主體育館'],
  },
  國家體育場: {
    name: '國家體育場 (世運主場館)',
    city: '高雄市',
    country: 'TW',
    latitude: 22.7027,
    longitude: 120.2946,
    region: 'SOUTH',
    sub_halls: ['主場地'],
  },
  樂天桃園棒球場: {
    name: '樂天桃園棒球場',
    city: '桃園市',
    country: 'TW',
    latitude: 25.0003,
    longitude: 121.2003,
    region: 'NORTH',
    sub_halls: ['主球場'],
  },
  洲際棒球場: {
    name: '台中洲際棒球場',
    city: '台中市',
    country: 'TW',
    latitude: 24.1998,
    longitude: 120.6851,
    region: 'CENTRAL',
    sub_halls: ['主球場'],
  },
  駁二藝術特區: {
    name: '駁二藝術特區',
    city: '高雄市',
    country: 'TW',
    latitude: 22.62,
    longitude: 120.2818,
    region: 'SOUTH',
    sub_halls: ['大勇倉庫群', '蓬萊倉庫群', '大義倉庫群', '大港開唱舞台區'],
  },
  漁光島: {
    name: '台南漁光島',
    city: '台南市',
    country: 'TW',
    latitude: 22.9818,
    longitude: 120.1554,
    region: 'SOUTH',
    sub_halls: ['浪人祭沙灘區', '樹林舞台'],
  },
  日本武道館: {
    name: '日本武道館 (Nippon Budokan)',
    city: '東京都',
    country: 'JP',
    latitude: 35.6933,
    longitude: 139.7497,
    region: 'OVERSEAS',
    sub_halls: ['大廳'],
  },
  東京巨蛋: {
    name: '東京巨蛋 (Tokyo Dome)',
    city: '東京都',
    country: 'JP',
    latitude: 35.7056,
    longitude: 139.7519,
    region: 'OVERSEAS',
    sub_halls: ['主球場'],
  },
  橫濱體育館: {
    name: '橫濱體育館 (Yokohama Arena)',
    city: '神奈川縣',
    country: 'JP',
    latitude: 35.5132,
    longitude: 139.6366,
    region: 'OVERSEAS',
    sub_halls: ['主場館'],
  },
  溫布利球場: {
    name: 'Wembley Stadium',
    city: 'London',
    country: 'UK',
    latitude: 51.556,
    longitude: -0.2795,
    region: 'OVERSEAS',
    sub_halls: ['Main Pitch'],
  },
};

export async function GET() {
  try {
    const db = getDefaultDatabase();

    // 1. 取得所有 venues
    const venues = db.prepare('SELECT * FROM venues ORDER BY name ASC').all() as any[];

    // 2. 自動補全經緯度、區域與次廳
    const updateVenueStmt = db.prepare(`
      UPDATE venues
      SET latitude = ?, longitude = ?, region = ?, sub_halls = ?, city = COALESCE(city, ?), country = COALESCE(country, ?)
      WHERE id = ?
    `);

    for (const venue of venues) {
      if (!venue.latitude || !venue.longitude) {
        // 比對關鍵字
        for (const [kw, preset] of Object.entries(KNOWN_VENUES_MAP)) {
          if (venue.name.includes(kw) || kw.includes(venue.name)) {
            venue.latitude = preset.latitude;
            venue.longitude = preset.longitude;
            venue.region = preset.region;
            venue.sub_halls = JSON.stringify(preset.sub_halls);
            venue.city = venue.city || preset.city;
            venue.country = venue.country || preset.country;

            updateVenueStmt.run(
              venue.latitude,
              venue.longitude,
              venue.region,
              venue.sub_halls,
              venue.city,
              venue.country,
              venue.id
            );
            break;
          }
        }
      }
    }

    // 3. 聚合使用者參戰資料與場館關聯
    const detailedVenues = venues.map((venue) => {
      // 取得在該場館參戰的所有場次
      const sessions = db
        .prepare(
          `
          SELECT
            ua.id as attendance_id,
            ua.status,
            ua.seat_info,
            ua.ticket_price,
            ua.currency,
            ua.rating,
            ua.rating_sound,
            ua.rating_sight,
            ua.rating_atmosphere,
            ua.rating_performance,
            ua.pros,
            ua.cons,
            ua.tips,
            ua.notes,
            ua.ticket_stub_url,
            es.id as session_id,
            es.session_date,
            es.hall_name,
            e.id as event_id,
            e.title as event_title,
            e.poster_url,
            a.name as artist_name
          FROM user_attendances ua
          JOIN event_sessions es ON ua.session_id = es.id
          JOIN events e ON es.event_id = e.id
          LEFT JOIN artists a ON e.artist_id = a.id
          WHERE es.venue_id = ?
          ORDER BY es.session_date DESC
        `
        )
        .all(venue.id) as any[];

      // 取得周邊消費總額
      let merchExpense = 0;
      for (const s of sessions) {
        const merchSum = db
          .prepare(
            'SELECT COALESCE(SUM(price * quantity), 0) as total FROM merchandise_items WHERE attendance_id = ?'
          )
          .get(s.attendance_id) as any;
        merchExpense += merchSum?.total || 0;
      }

      const ticketExpense = sessions.reduce((acc, s) => acc + (s.ticket_price || 0), 0);
      const totalExpense = ticketExpense + merchExpense;

      // 取得座位視野照
      const seatViews = db
        .prepare(
          `
          SELECT * FROM seat_view_photos
          WHERE venue_id = ? OR venue_name = ?
          ORDER BY created_at DESC
        `
        )
        .all(venue.id, venue.name) as any[];

      // 次廳別解析
      let parsedSubHalls: string[] = [];
      try {
        parsedSubHalls = JSON.parse(venue.sub_halls || '[]');
      } catch {
        parsedSubHalls = [];
      }

      return {
        ...venue,
        sub_halls: parsedSubHalls,
        attendanceCount: sessions.length,
        totalExpense,
        sessions,
        seatViews,
        firstAttended: sessions.length > 0 ? sessions[sessions.length - 1].session_date : null,
        lastAttended: sessions.length > 0 ? sessions[0].session_date : null,
      };
    });

    // 4. 統計全域足跡大數據
    const visitedVenues = detailedVenues.filter((v) => v.attendanceCount > 0);
    const totalAttendances = visitedVenues.reduce((acc, v) => acc + v.attendanceCount, 0);
    const domesticVenues = visitedVenues.filter((v) => v.country === 'TW');
    const overseasVenues = visitedVenues.filter((v) => v.country !== 'TW');
    const totalSpent = visitedVenues.reduce((acc, v) => acc + v.totalExpense, 0);

    const regionBreakdown: Record<string, number> = {
      NORTH: visitedVenues.filter((v) => v.region === 'NORTH').length,
      CENTRAL: visitedVenues.filter((v) => v.region === 'CENTRAL').length,
      SOUTH: visitedVenues.filter((v) => v.region === 'SOUTH').length,
      EAST: visitedVenues.filter((v) => v.region === 'EAST').length,
      OVERSEAS: visitedVenues.filter((v) => v.region === 'OVERSEAS').length,
    };

    return NextResponse.json({
      success: true,
      venues: detailedVenues,
      stats: {
        totalVenues: visitedVenues.length,
        allVenuesCount: detailedVenues.length,
        totalAttendances,
        domesticCount: domesticVenues.length,
        overseasCount: overseasVenues.length,
        totalSpent,
        regionBreakdown,
      },
    });
  } catch (error) {
    logger.error(`聚合巡迴足跡地圖失敗: ${(error as Error).message}`, 'FOOTPRINT_API', error);
    return NextResponse.json(
      { success: false, error: '無法取得足跡地圖資料: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, latitude, longitude, region, sub_halls, photo_url, city, address } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '場館 ID 為必填' }, { status: 400 });
    }

    const db = getDefaultDatabase();
    const subHallsStr = Array.isArray(sub_halls) ? JSON.stringify(sub_halls) : sub_halls;

    db.prepare(
      `
      UPDATE venues
      SET
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        region = COALESCE(?, region),
        sub_halls = COALESCE(?, sub_halls),
        photo_url = COALESCE(?, photo_url),
        city = COALESCE(?, city),
        address = COALESCE(?, address)
      WHERE id = ?
    `
    ).run(latitude, longitude, region, subHallsStr, photo_url, city, address, id);

    logger.info(`場館足跡已更新 (ID: ${id})`, 'FOOTPRINT_API', { venueId: id });
    return NextResponse.json({ success: true, message: '場館資訊已更新' });
  } catch (error) {
    logger.error(`更新場館足跡失敗: ${(error as Error).message}`, 'FOOTPRINT_API', error);
    return NextResponse.json(
      { success: false, error: '更新失敗: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
