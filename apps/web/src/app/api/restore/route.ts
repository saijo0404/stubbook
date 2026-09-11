import { NextRequest, NextResponse } from 'next/server';
import { inspectBackup, restoreFromBackup, RestoreMode } from '../../../utils/backupEngine';
import { logger } from '@stubbook/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let fileBuffer: Buffer | null = null;
    let modeParam = 'OVERWRITE';
    let dryRun = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const modeForm = formData.get('mode') as string | null;
      const dryRunForm = formData.get('dryRun') as string | null;

      if (!file) {
        return NextResponse.json(
          { error: '請提供欲還原的備份檔案 (.stubbook 或 .json)' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      if (modeForm) modeParam = modeForm.toUpperCase();
      if (dryRunForm === 'true' || dryRunForm === '1') dryRun = true;
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      if (body.rawJson) {
        fileBuffer = Buffer.from(body.rawJson, 'utf-8');
      } else if (body.data && body.appName === 'StubBook') {
        fileBuffer = Buffer.from(JSON.stringify(body), 'utf-8');
      } else {
        return NextResponse.json({ error: '無效的 JSON 備份內容' }, { status: 400 });
      }
      if (body.mode) modeParam = String(body.mode).toUpperCase();
      if (body.dryRun) dryRun = true;
    } else {
      // 處理直接傳送 binary 串流
      const arrayBuffer = await req.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      const { searchParams } = new URL(req.url);
      modeParam = (searchParams.get('mode') || 'OVERWRITE').toUpperCase();
      dryRun = searchParams.get('dryRun') === 'true';
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: '未接收到有效檔案資料' }, { status: 400 });
    }

    // 檢查還原模式
    const validModes: RestoreMode[] = ['OVERWRITE', 'MERGE', 'DIFF'];
    const mode: RestoreMode = validModes.includes(modeParam as RestoreMode)
      ? (modeParam as RestoreMode)
      : 'OVERWRITE';

    // 1. 預檢 (Dry Run)
    const inspection = inspectBackup(fileBuffer);
    if (dryRun) {
      logger.info('執行還原前預檢 (Dry Run)', 'RESTORE_API', {
        format: inspection.format,
        counts: inspection.counts,
      });
      return NextResponse.json({
        success: true,
        dryRun: true,
        inspection,
      });
    }

    // 2. 正式執行還原
    logger.info(`開始執行正式資料還原 (模式: ${mode})`, 'RESTORE_API');
    const result = await restoreFromBackup(fileBuffer, { mode });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('手帳資料還原失敗', 'RESTORE_API', error);
    return NextResponse.json(
      {
        error: `還原失敗: ${error.message}`,
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
