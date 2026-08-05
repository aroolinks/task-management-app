import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ExpenseCategory from '@/models/ExpenseCategory';
import { verifyAuth } from '@/lib/auth';

const DEFAULT_EXPENSE_CATEGORIES = ['Salaries', 'Software', 'Marketing', 'Rent', 'Utilities', 'Other'];

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();

    let expenseCategories = await ExpenseCategory.find({}).sort({ name: 1 });

    // Seed sensible defaults the first time this collection is queried, so
    // existing expenses created against the old hardcoded list keep working.
    // Upsert per-name (rather than insertMany) so concurrent requests racing
    // an empty collection can't each insert their own full set of defaults.
    if (expenseCategories.length === 0) {
      await Promise.all(
        DEFAULT_EXPENSE_CATEGORIES.map(name =>
          ExpenseCategory.findOneAndUpdate(
            { name },
            { $setOnInsert: { name } },
            { upsert: true }
          ).catch(() => null)
        )
      );
      expenseCategories = await ExpenseCategory.find({}).sort({ name: 1 });
    }

    return NextResponse.json({ success: true, data: expenseCategories });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expense categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const rawName: unknown = body?.name;
    if (typeof rawName !== 'string' || !rawName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense category name' },
        { status: 400 }
      );
    }
    const name = rawName.trim();

    const exists = await ExpenseCategory.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (exists) {
      return NextResponse.json(
        { success: false, error: 'Expense category already exists' },
        { status: 409 }
      );
    }

    const expenseCategory = await ExpenseCategory.create({ name });
    return NextResponse.json({ success: true, data: expenseCategory }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create expense category' },
      { status: 400 }
    );
  }
}
