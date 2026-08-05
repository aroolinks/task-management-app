import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CompanyDataCategory from '@/models/CompanyDataCategory';
import { verifyAuth } from '@/lib/auth';

const DEFAULT_COMPANY_DATA_CATEGORIES = ['Domain', 'Hosting', 'Email', 'Software', 'Banking', 'Social Media', 'Other'];

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only administrators can view company data categories' }, { status: 403 });
    }

    await dbConnect();

    let categories = await CompanyDataCategory.find({}).sort({ name: 1 });

    // Seed sensible defaults the first time this collection is queried, so
    // existing credentials created against the old hardcoded list keep working.
    // Upsert per-name (rather than insertMany) so concurrent requests racing
    // an empty collection can't each insert their own full set of defaults.
    if (categories.length === 0) {
      await Promise.all(
        DEFAULT_COMPANY_DATA_CATEGORIES.map(name =>
          CompanyDataCategory.findOneAndUpdate(
            { name },
            { $setOnInsert: { name } },
            { upsert: true }
          ).catch(() => null)
        )
      );
      categories = await CompanyDataCategory.find({}).sort({ name: 1 });
    }

    return NextResponse.json({ success: true, data: categories });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company data categories' },
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
      return NextResponse.json({ success: false, error: 'Only administrators can add company data categories' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const rawName: unknown = body?.name;
    if (typeof rawName !== 'string' || !rawName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invalid company data category name' },
        { status: 400 }
      );
    }
    const name = rawName.trim();

    const exists = await CompanyDataCategory.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (exists) {
      return NextResponse.json(
        { success: false, error: 'Company data category already exists' },
        { status: 409 }
      );
    }

    const category = await CompanyDataCategory.create({ name });
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create company data category' },
      { status: 400 }
    );
  }
}
