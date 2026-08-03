import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Income from '@/models/Income';
import { verifyAuth } from '@/lib/auth';

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

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');

    let query = {};
    if (yearParam) {
      const year = parseInt(yearParam);
      if (!isNaN(year)) {
        query = {
          date: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1),
          },
        };
      }
    }

    const income = await Income.find(query).sort({ date: -1 });

    return NextResponse.json({ success: true, data: income });
  } catch (error) {
    console.error('Error fetching income:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch income' }, { status: 500 });
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

    const body = await request.json();

    await dbConnect();

    const income = await Income.create({
      ...body,
      createdBy: user.username,
    });

    return NextResponse.json({ success: true, data: income }, { status: 201 });
  } catch (error) {
    console.error('Error creating income:', error);
    return NextResponse.json({ success: false, error: 'Failed to create income' }, { status: 400 });
  }
}
