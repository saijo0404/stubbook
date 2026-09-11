import { NextRequest, NextResponse } from 'next/server';
import { ScraperPipeline } from '@stubbook/scraper-core';
import { logger } from '@stubbook/logger';

const pipeline = new ScraperPipeline();

// 預載之示範樣本資料（以備本機無網路環境或示範體驗使用）
const SAMPLE_MOCKS: Record<string, { html: string; title: string }> = {
  'https://kktix.cc/events/sample-accupass': {
    title: '2026 告五人 [宇宙的有趣] 巡迴演唱會',
    html: `<!DOCTYPE html>
<html>
<head>
  <title>2026 告五人 [宇宙的有趣] 巡迴演唱會 | KKTIX</title>
  <meta property="og:title" content="2026 告五人 [宇宙的有趣] 巡迴演唱會">
  <meta property="og:image" content="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80">
  <meta property="og:description" content="告五人全新巡迴演唱會，震撼登陸小巨蛋！啟售時間：2026/05/10 (日) 12:00 全面開賣。">
</head>
<body>
  <h1 class="header-title">2026 告五人 [宇宙的有趣] 巡迴演唱會</h1>
  <div class="host-name">相信音樂</div>
  <div class="event-time">2026/11/20 (五) 19:30</div>
  <div class="tickets-header-info">
    <div class="ticket-warning">粉絲會員優先購票：2026/05/09 (六) 12:00</div>
    <div class="ticket-sale-time">啟售時間：2026/05/10 (日) 12:00 全面開賣</div>
  </div>
  <div class="location">臺北小巨蛋</div>
  <div class="address">台北市松山區南京東路四段2號</div>
  <div class="tickets">
    <div class="ticket-unit">
      <span class="ticket-name">搖滾特A區</span>
      <span class="ticket-price">NT$ 3,800</span>
      <span class="ticket-status">熱賣中</span>
    </div>
    <div class="ticket-unit">
      <span class="ticket-name">看台二樓區</span>
      <span class="ticket-price">NT$ 2,800</span>
      <span class="ticket-status">熱賣中</span>
    </div>
    <div class="ticket-unit">
      <span class="ticket-name">看台三樓區</span>
      <span class="ticket-price">NT$ 1,500</span>
      <span class="ticket-status">已售完</span>
    </div>
  </div>
</body>
</html>`,
  },
  'https://tixcraft.com/activity/detail/26_JAY': {
    title: '2026 周杰倫「嘉年華」世界巡迴演唱會',
    html: `<!DOCTYPE html>
<html>
<head>
  <title>2026 周杰倫「嘉年華」世界巡迴演唱會 - 拓元售票系統</title>
  <meta property="og:title" content="2026 周杰倫「嘉年華」世界巡迴演唱會">
  <meta property="og:image" content="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80">
  <meta property="og:description" content="睽違多年，周杰倫重返臺北大巨蛋！優先購票：2026/09/19 (六) 10:00，全面開賣：2026/09/20 (日) 12:00。">
</head>
<body>
  <h2 class="activity-name">2026 周杰倫「嘉年華」世界巡迴演唱會</h2>
  <div id="intro">
    <p>優先購票：2026/09/19 (六) 上午 10:00 國泰世華CUBE卡友優先購票</p>
    <p>售票時間：2026/09/20 (日) 中午 12:00 拓元售票系統正式開賣</p>
    <p>演出地點：臺北大巨蛋（台北市信義區忠孝東路四段515號）</p>
    <p>票　　價：NT$ 6,880 / 5,880 / 4,880 / 3,880 / 2,280 / 1,880</p>
  </div>
  <table id="gameList">
    <tbody>
      <tr>
        <td>2026/12/04 (四) 19:30</td>
        <td>台北大巨蛋場 Day 1</td>
        <td>臺北大巨蛋</td>
        <td><a href="/order/1" class="btn">已售完</a></td>
      </tr>
      <tr>
        <td>2026/12/05 (五) 19:30</td>
        <td>台北大巨蛋場 Day 2</td>
        <td>臺北大巨蛋</td>
        <td><a href="/order/2" class="btn">立即購票</a></td>
      </tr>
      <tr>
        <td>2026/12/06 (六) 19:00</td>
        <td>台北大巨蛋場 Day 3 (加場)</td>
        <td>臺北大巨蛋</td>
        <td><a href="/order/3" class="btn">尚未開賣</a></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`,
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      logger.warn('網頁解析請求缺少有效 URL', 'SCRAPE_API', { body });
      return NextResponse.json({ error: '請提供有效的售票活動網址 (URL)' }, { status: 400 });
    }

    logger.info(`開始解析活動網址: ${url}`, 'SCRAPE_API');

    // 若命中本地預載範本，直接透過解析管線處理 HTML
    if (SAMPLE_MOCKS[url]) {
      const mock = SAMPLE_MOCKS[url];
      const result = await pipeline.parseHtml(mock.html, url);
      logger.info(`示範網址解析成功: ${result.title}`, 'SCRAPE_API', {
        sessions: result.sessions.length,
      });
      return NextResponse.json({ success: true, event: result, source: 'sample' });
    }

    // 真實線上抓取
    const event = await pipeline.scrapeUrl(url);
    logger.info(`線上活動解析成功: ${event.title}`, 'SCRAPE_API', {
      platform: event.platform,
      sessions: event.sessions.length,
    });

    return NextResponse.json({ success: true, event, source: 'live' });
  } catch (error) {
    const err = error as Error;
    logger.error(`網址解析失敗: ${err.message}`, 'SCRAPE_API', err);
    return NextResponse.json(
      {
        error: `網址解析失敗: ${err.message}`,
        details: err.stack,
      },
      { status: 500 }
    );
  }
}
