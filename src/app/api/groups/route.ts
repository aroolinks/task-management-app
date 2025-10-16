import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';

export async function GET() {
  try {
    await dbConnect();
    const groups = await Group.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: groups });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const rawName: unknown = body?.name;
    if (typeof rawName !== 'string' || !rawName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invalid group name' },
        { status: 400 }
      );
    }
    const name = rawName.trim();

    // Avoid duplicates (case-insensitive)
    const exists = await Group.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (exists) {
      return NextResponse.json(
        { success: false, error: 'Group already exists' },
        { status: 409 }
      );
    }

    const group = await Group.create({ name });
    return NextResponse.json({ success: true, data: group }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create group' },
      { status: 400 }
    );
  }
}