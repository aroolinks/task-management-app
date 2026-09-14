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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    await dbConnect();
    const { id } = await params;
    const invoice = await Invoice.findById(id).lean();
    if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const parsed = invoiceDraftSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid invoice details' }, { status: 400 });
    }

    await dbConnect();
    const draft = parsed.data;
    const totals = calculateInvoice(draft.items, draft.discount, draft.amountPaidMinor);
    const invoice = await Invoice.findByIdAndUpdate(
      id,
      { invoiceNumber: draft.invoiceNumber, draft, totals },
      { new: true, runValidators: true },
    );
    if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: invoice });
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      return NextResponse.json({ success: false, error: 'That invoice number already exists.' }, { status: 409 });
    }
    console.error('Error updating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyAuth(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Only administrators can delete invoices' }, { status: 403 });

  try {
    await dbConnect();
    const { id } = await params;
    const invoice = await Invoice.findByIdAndDelete(id);
    if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete invoice' }, { status: 500 });
  }
}