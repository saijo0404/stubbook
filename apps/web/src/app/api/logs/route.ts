import { NextResponse } from 'next/server';
import { logger } from '@stubbook/logger';

export async function GET() {
  const snippet = logger.exportBugReportSnippet({ maxLines: 50, onlyErrors: false });
  return NextResponse.json({ snippet });
}
