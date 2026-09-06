import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '@stubbook/logger';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// 驗證圖片檔案開頭之 Magic Bytes
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === 'image/jpeg') {
    // JPEG: FF D8 FF
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimeType === 'image/webp') {
    // WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    return riff === 'RIFF' && webp === 'WEBP';
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '未提供上傳檔案' }, { status: 400 });
    }

    // 1. 檔案大小檢查
    if (file.size > MAX_FILE_SIZE) {
      logger.warn(`檔案大小超出限制: ${(file.size / 1024 / 1024).toFixed(2)} MB`, 'UPLOAD_API');
      return NextResponse.json(
        { error: '檔案大小超出限制，請上傳 5MB 以內之圖片' },
        { status: 400 }
      );
    }

    // 2. MIME 類型白名單檢查
    const mimeType = file.type.toLowerCase();
    const extension = ALLOWED_MIME_TYPES[mimeType];

    if (!extension) {
      logger.warn(`不支援的檔案格式: ${file.type}`, 'UPLOAD_API');
      return NextResponse.json(
        { error: '不支援的圖片格式，僅接受 JPEG, PNG 或 WebP' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Magic Bytes 簽章安全驗證
    if (!validateMagicBytes(buffer, mimeType)) {
      logger.warn('檔案內容與宣告之 MIME 類型不符 (Magic bytes verification failed)', 'UPLOAD_API');
      return NextResponse.json({ error: '檔案損毀或副檔名與內容簽章不符' }, { status: 400 });
    }

    // 4. 生成隨機唯一檔名，防止路徑穿越與檔名覆寫
    const randomName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${extension}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ticket-stubs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const targetPath = path.join(uploadDir, randomName);

    // 嚴格目錄邊界檢查
    if (!targetPath.startsWith(uploadDir + path.sep)) {
      throw new Error('路徑檢查異常 (Path traversal attempt detected)');
    }

    fs.writeFileSync(targetPath, buffer);

    const publicUrl = `/uploads/ticket-stubs/${randomName}`;
    logger.info(`票根圖片安全上傳成功: ${publicUrl} (${(file.size / 1024).toFixed(1)} KB)`, 'UPLOAD_API');

    return NextResponse.json({
      success: true,
      url: publicUrl,
      size: file.size,
      mimeType,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`圖片上傳失敗: ${err.message}`, 'UPLOAD_API', err);
    return NextResponse.json({ error: `上傳失敗: ${err.message}` }, { status: 500 });
  }
}
