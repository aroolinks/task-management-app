import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import Invoice from '@/models/Invoice';

async function requireAdmin(request: NextRequest) {
  const user = await verifyAuth(request);
  if (!user) return { response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  if (user.role !== 'admin') return { response: NextResponse.json({ success: false, error: 'Only administrators can manage invoices' }, { status: 403 }) };
  return { user };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    await dbConnect();
    const invoices = await Invoice.find({ invoiceNumber: /^INV-\d+$/ }).select('invoiceNumber').lean();

    let maxValue = 0;
    let width = 4;
    for (const invoice of invoices) {
      const match = invoice.invoiceNumber.match(/^INV-(\d+)$/);
      if (!match) continue;
      const digits = match[1];
      const value = Number(digits);
      if (value > maxValue) {
        maxValue = value;
        width = digits.length;
      }
    }

    const invoiceNumber = `INV-${String(maxValue + 1).padStart(width, '0')}`;
    return NextResponse.json({ success: true, data: { invoiceNumber } });
  } catch (error) {
    console.error('Error computing next invoice number:', error);
    return NextResponse.json({ success: false, error: 'Failed to compute next invoice number' }, { status: 500 });
  }
}
