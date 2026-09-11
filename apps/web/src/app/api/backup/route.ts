import { NextRequest, NextResponse } from 'next/server';
import {
  getBackupOverview,
  exportStructuredJson,
  exportStubbookArchive,
} from '../../../utils/backupEngine';
import { logger } from '@stubbook/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format')?.toLowerCase();
    const overview = searchParams.get('overview') === 'true';

    // 1. 若查詢系統備份概況 (用於 UI 儀表板卡片)
    if (overview) {
      const stats = getBackupOverview();
      return NextResponse.json(
        { success: true, overview: stats },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // 2. 結構化 JSON 匯出
    if (format === 'json') {
      logger.info('收到結構化 JSON 手帳備份匯出請求', 'BACKUP_API');
      const jsonBackup = exportStructuredJson();
      const content = JSON.stringify(jsonBackup, null, 2);

      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="stubbook_backup_${dateStr}.json"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // 3. 全量 .stubbook 容器封裝匯出 (預設)
    logger.info('收到全量 .stubbook 手帳容器備份匯出請求', 'BACKUP_API');
    const archiveBuffer = await exportStubbookArchive();

    return new NextResponse(new Uint8Array(archiveBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="stubbook_backup_${dateStr}.stubbook"`,
        'Content-Length': String(archiveBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const error = err as Error;
    logger.error('資料備份匯出失敗', 'BACKUP_API', error);
    return NextResponse.json({ error: '備份產生失敗', details: error.message }, { status: 500 });
  }
}
