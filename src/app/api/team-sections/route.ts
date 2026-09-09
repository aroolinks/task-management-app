import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import TeamSection from '@/models/TeamSection';

const serialize = (s: Record<string, unknown>) => ({ id: String(s._id), name: s.name as string, order: (s.order as number) ?? 0 });

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!auth.permissions.canViewTasks) return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  try {
    await dbConnect();
    const sections = await TeamSection.find().sort({ order: 1, createdAt: 1 }).lean();
    return NextResponse.json({ success: true, data: sections.map(s => serialize(s as Record<string, unknown>)) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to load sections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!auth.permissions.canEditTasks) return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  try {
    await dbConnect();
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ success: false, error: 'Section name is required' }, { status: 400 });
    if (name.length > 120) return NextResponse.json({ success: false, error: 'Section name is too long' }, { status: 400 });
    const last = await TeamSection.findOne().sort({ order: -1 }).lean() as { order?: number } | null;
    const section = await TeamSection.create({ name, order: (last?.order ?? 0) + 1 });
    return NextResponse.json({ success: true, data: serialize(section.toObject()) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create section' }, { status: 400 });
  }
}
