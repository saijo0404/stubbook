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
  'https://ticket.ibon.com.tw/ActivityInfo/Details.aspx?id=38120': {
    title: '2026 五月天 [回到那一天] 25週年巡迴演唱會 高雄無限放大版',
    html: `<!DOCTYPE html>
<html>
<head>
  <title>2026 五月天 [回到那一天] 25週年巡迴演唱會 高雄無限放大版 - ibon售票系統</title>
  <meta property="og:title" content="2026 五月天 [回到那一天] 25週年巡迴演唱會 高雄無限放大版">
  <meta property="og:image" content="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&auto=format&fit=crop&q=80">
  <meta property="og:description" content="五月天回到那一天25週年巡迴演唱會，高雄世運主館震撼開唱！全面開賣：2026/08/15 (六) 12:00。">
</head>
<body>
  <div class="title-info">
    <h2>2026 五月天 [回到那一天] 25週年巡迴演唱會 高雄無限放大版</h2>
    <div class="organizer-name">相信音樂</div>
  </div>
  <div class="activity-detail">
    <div class="sale-info">
      <p>國泰世華卡友優先購：2026/08/15 (六) 10:00</p>
      <p>啟售時間：2026/08/15 (六) 12:00 全面開賣</p>
      <p>【取票提醒】支援全台 7-ELEVEN ibon 機台取票與 ibon App 電子票券。</p>
    </div>
    <div class="venue-info">高雄國家體育場 (世運主館)</div>
    <div class="address">高雄市左營區世運大道100號</div>
  </div>
  <table class="game-table">
    <tbody>
      <tr>
        <td>2026/10/24 (六) 18:30</td>
        <td>高雄世運場 Day 1</td>
        <td>高雄國家體育場 (世運主館)</td>
        <td><a href="https://ticket.ibon.com.tw/order/1" class="btn">立即購票 (NT$ 4500/3800/2800)</a></td>
      </tr>
      <tr>
        <td>2026/10/25 (日) 18:30</td>
        <td>高雄世運場 Day 2</td>
        <td>高雄國家體育場 (世運主館)</td>
        <td><span class="btn btn-disabled">已售完</span></td>
      </tr>
    </tbody>
  </table>
  <table class="ticket-table">
    <tr><td>搖滾特A區</td><td>NT$ 4,500</td></tr>
    <tr><td>看台歡樂區</td><td>NT$ 2,800</td></tr>
    <tr><td>看台一般區</td><td>NT$ 1,800</td></tr>
  </table>
</body>
</html>`,
  },
  'https://www.famiticket.com.tw/Home/Activity/Info/2026_JOLIN': {
    title: '蔡依林 Ugly Beauty 世界巡迴演唱會 最終場',
    html: `<!DOCTYPE html>
<html>
<head>
  <title>蔡依林 Ugly Beauty 世界巡迴演唱會 最終場 - 全網購票網</title>
  <meta property="og:title" content="蔡依林 Ugly Beauty 世界巡迴演唱會 最終場">
  <meta property="og:image" content="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80">
  <meta property="og:description" content="蔡依林怪美的巡演終章降臨！全面啟售：2026/11/01 (日) 13:00 全網購票網與全家機台同步。">
</head>
<body>
  <div class="activity-info">
    <h1 class="act-title">蔡依林 Ugly Beauty 世界巡迴演唱會 最終場</h1>
    <div class="organizer">凌時差音樂</div>
  </div>
  <div class="activity-intro">
    <div class="sale-time-info">
      <p>富邦卡友優先購：2026/11/01 (日) 11:00</p>
      <p>啟售時間：2026/11/01 (日) 13:00 全面開賣</p>
    </div>
    <div class="act-location">臺北小巨蛋</div>
    <div class="venue-address">台北市松山區南京東路四段2號</div>
  </div>
  <table class="session-table">
    <tbody>
      <tr>
        <td>2026/12/30 (三) 19:30</td>
        <td>台北跨年週 Day 1</td>
        <td>臺北小巨蛋</td>
        <td><a href="/order/1" class="btn">立即購票</a></td>
      </tr>
      <tr>
        <td>2026/12/31 (四) 21:30</td>
        <td>台北跨年週 跨年特別場</td>
        <td>臺北小巨蛋</td>
        <td><span class="btn btn-disabled">已售完</span></td>
      </tr>
    </tbody>
  </table>
  <div class="price-table">
    <div class="price-row">特A特區 NT$ 4,900</div>
    <div class="price-row">二樓看台 NT$ 3,900</div>
    <div class="price-row">三樓看台 NT$ 1,800</div>
  </div>
</body>
</html>`,
  },
  'https://kham.com.tw/application/UTK02/UTK0201_00.aspx?PRODUCT_ID=M0KHAM26': {
    title: '法文音樂劇《鐘樓怪人》二十五週年亞洲巡迴 台北站',
    html: `<!DOCTYPE html>
<html>
<head>
  <title>法文音樂劇《鐘樓怪人》二十五週年亞洲巡迴 台北站 - 寬宏售票</title>
  <meta property="og:title" content="法文音樂劇《鐘樓怪人》二十五週年亞洲巡迴 台北站">
  <meta property="og:image" content="https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=800&auto=format&fit=crop&q=80">
  <meta property="og:description" content="歐陸殿堂級法文音樂劇《鐘樓怪人》磅礴回歸！享譽全球二十五週年紀念巡演。">
</head>
<body>
  <div>
    <span id="ctl00_ContentPlaceHolder1_lblPRODUCT_NAME">法文音樂劇《鐘樓怪人》二十五週年亞洲巡迴 台北站</span>
    <span id="ctl00_ContentPlaceHolder1_lblSPONSOR">寬宏藝術</span>
    <span id="ctl00_ContentPlaceHolder1_lblACTOR">經典原裝劇組</span>
    <span id="ctl00_ContentPlaceHolder1_lblPLACE">國家戲劇院</span>
    <span id="ctl00_ContentPlaceHolder1_lblPRICE">800, 1600, 2400, 3200, 4200</span>
    <span id="ctl00_ContentPlaceHolder1_lblPRE_SALE">早鳥會員優先開賣：2026/06/10 (三) 12:00，全面開賣：2026/06/12 (五) 12:00</span>
    <div id="ctl00_ContentPlaceHolder1_lblINTRODUCTION">歐陸殿堂級法文音樂劇《鐘樓怪人》磅礴回歸！享譽全球二十五週年紀念巡演。</div>
  </div>
  <table id="ctl00_ContentPlaceHolder1_gvPERFORMANCE">
    <tbody>
      <tr>
        <td>第 1 場</td>
        <td>2026/09/18(五) 19:30</td>
        <td>國家戲劇院</td>
        <td>800,1600,2400,3200,4200</td>
        <td><input type="submit" value="立即訂購" /></td>
      </tr>
      <tr>
        <td>第 2 場</td>
        <td>2026/09/19(六) 14:30</td>
        <td>國家戲劇院</td>
        <td>800,1600,2400,3200,4200</td>
        <td><input type="submit" value="立即訂購" /></td>
      </tr>
      <tr>
        <td>第 3 場</td>
        <td>2026/09/19(六) 19:30</td>
        <td>國家戲劇院</td>
        <td>800,1600,2400,3200,4200</td>
        <td><span>全數售罄</span></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`,
  },
  'https://www.indievox.com/activity/detail/26_NO_PARTY': {
    title: '草東沒有派對 [北風呼呼] 專場巡演 台北場',
    html: `<!DOCTYPE html>
<html>
<head>
  <title>草東沒有派對 [北風呼呼] 專場巡演 台北場 - INDIEVOX</title>
  <meta property="og:title" content="草東沒有派對 [北風呼呼] 專場巡演 台北場">
  <meta property="og:image" content="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80">
  <meta property="og:description" content="草東沒有派對全新專場巡迴，台北 Legacy 震撼登場！預售開賣：2026/10/01 (四) 12:00。">
</head>
<body>
  <div class="event-header">
    <h1 class="event-title">草東沒有派對 [北風呼呼] 專場巡演 台北場</h1>
    <div class="performer">草東沒有派對 No Party For Cao Dong</div>
    <div class="organizer">黑市音樂</div>
  </div>
  <div class="event-info">
    <div class="event-time">2026/11/15 (日) 20:00 (19:00 入場)</div>
    <div class="ticket-notice">
      <p>預售開賣時間：2026/10/01 (四) 12:00</p>
      <p>現場售票時間：2026/11/15 (日) 19:00</p>
    </div>
    <div class="event-venue">Legacy Taipei 音樂展演空間</div>
    <div class="venue-address">台北市中正區八德路一段一號華山1914創意文化園區中5A館</div>
  </div>
  <ul class="ticket-type-list">
    <li class="ticket-tier"><span class="name">雙人套票</span><span class="price">NT$ 2,200</span></li>
    <li class="ticket-tier"><span class="name">現場票</span><span class="price">NT$ 1,500</span></li>
    <li class="ticket-tier"><span class="name">預售票</span><span class="price">NT$ 1,200</span></li>
  </ul>
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
