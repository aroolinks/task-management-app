import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import Invoice from '@/models/Invoice';
import { calculateInvoice } from '@/lib/invoices/calculations';
import { invoiceDraftSchema } from '@/lib/invoices/validation';

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
    const invoices = await Invoice.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const parsed = invoiceDraftSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid invoice details' }, { status: 400 });
    }

    await dbConnect();
    const draft = parsed.data;
    const totals = calculateInvoice(draft.items, draft.discount, draft.amountPaidMinor);
    const invoice = await Invoice.create({ invoiceNumber: draft.invoiceNumber, draft, totals, createdBy: auth.user.username });
    return NextResponse.json({ success: true, data: invoice }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      return NextResponse.json({ success: false, error: 'That invoice number already exists.' }, { status: 409 });
    }
    console.error('Error creating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
  }
}