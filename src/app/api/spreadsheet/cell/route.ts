import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SpreadsheetSheet, {
  SPREADSHEET_ROWS,
  SPREADSHEET_COLS,
  SPREADSHEET_SHEETS_PER_MONTH,
  SPREADSHEET_YEARS,
} from '@/models/Spreadsheet';
import { verifyAuth } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only administrators can edit the spreadsheet' }, { status: 403 });
    }

    const body = await request.json();
    const { year, month, sheetIndex, row, col, value } = body as {
      year: number; month: number; sheetIndex: number; row: number; col: number; value: unknown;
    };

    if (
      !SPREADSHEET_YEARS.includes(year) ||
      !Number.isInteger(month) || month < 0 || month > 11 ||
      !Number.isInteger(sheetIndex) || sheetIndex < 0 || sheetIndex >= SPREADSHEET_SHEETS_PER_MONTH ||
      !Number.isInteger(row) || row < 0 || row >= SPREADSHEET_ROWS ||
      !Number.isInteger(col) || col < 0 || col >= SPREADSHEET_COLS
    ) {
      return NextResponse.json({ success: false, error: 'Invalid cell coordinates' }, { status: 400 });
    }

    const cellValue = typeof value === 'string' ? value.slice(0, 500) : '';

    await dbConnect();

    const updated = await SpreadsheetSheet.findOneAndUpdate(
      { year, month, sheetIndex },
      { $set: { [`data.${row}.${col}`]: cellValue, updatedBy: user.username } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Sheet not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating spreadsheet cell:', error);
    return NextResponse.json({ success: false, error: 'Failed to update cell' }, { status: 500 });
  }
}
