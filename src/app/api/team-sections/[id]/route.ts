import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import TeamSection from '@/models/TeamSection';
import TeamTask from '@/models/TeamTask';

const serialize = (s: Record<string, unknown>) => ({ id: String(s._id), name: s.name as string, order: (s.order as number) ?? 0 });

async function authorize(request: NextRequest) {
  const user = await verifyAuth(request);
  if (!user) return { response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  if (!user.permissions.canEditTasks) return { response: NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 }) };
  return { user };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, error: 'Invalid section ID' }, { status: 400 });
  try {
    await dbConnect();
    const body = await request.json();
    const update: { name?: string; order?: number } = {};
    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return NextResponse.json({ success: false, error: 'Section name is required' }, { status: 400 });
      if (name.length > 120) return NextResponse.json({ success: false, error: 'Section name is too long' }, { status: 400 });
      update.name = name;
    }
    if (typeof body.order === 'number' && Number.isFinite(body.order)) update.order = body.order;
    const section = await TeamSection.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!section) return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: serialize(section as Record<string, unknown>) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update section' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, error: 'Invalid section ID' }, { status: 400 });
  try {
    await dbConnect();
    const section = await TeamSection.findByIdAndDelete(id);
    if (!section) return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    // Tasks in a deleted section fall back to "No section" rather than being removed.
    await TeamTask.updateMany({ section: id }, { $set: { section: null } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to delete section' }, { status: 400 });
  }
}
