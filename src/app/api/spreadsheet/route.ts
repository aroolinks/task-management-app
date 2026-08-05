import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SpreadsheetSheet, {
  SPREADSHEET_ROWS,
  SPREADSHEET_COLS,
  SPREADSHEET_SHEETS_PER_MONTH,
  SPREADSHEET_YEARS,
} from '@/models/Spreadsheet';
import { verifyAuth } from '@/lib/auth';

function emptyGrid(): string[][] {
  return Array.from({ length: SPREADSHEET_ROWS }, () => Array.from({ length: SPREADSHEET_COLS }, () => ''));
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only administrators can view the spreadsheet' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '', 10);
    const month = parseInt(searchParams.get('month') || '', 10);

    if (!SPREADSHEET_YEARS.includes(year) || !Number.isInteger(month) || month < 0 || month > 11) {
      return NextResponse.json({ success: false, error: 'Invalid year or month' }, { status: 400 });
    }

    await dbConnect();

    let sheets = await SpreadsheetSheet.find({ year, month }).sort({ sheetIndex: 1 });

    // Seed the fixed set of sheets for this year+month the first time it's
    // queried. Upsert per-index (rather than insertMany) so concurrent
    // requests racing an empty set can't each insert their own full set.
    if (sheets.length < SPREADSHEET_SHEETS_PER_MONTH) {
      await Promise.all(
        Array.from({ length: SPREADSHEET_SHEETS_PER_MONTH }, (_, i) => i).map(sheetIndex =>
          SpreadsheetSheet.findOneAndUpdate(
            { year, month, sheetIndex },
            { $setOnInsert: { year, month, sheetIndex, data: emptyGrid() } },
            { upsert: true }
          ).catch(() => null)
        )
      );
      sheets = await SpreadsheetSheet.find({ year, month }).sort({ sheetIndex: 1 });
    }

    return NextResponse.json({ success: true, data: sheets });
  } catch (error) {
    console.error('Error fetching spreadsheet:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch spreadsheet' }, { status: 500 });
  }
}
