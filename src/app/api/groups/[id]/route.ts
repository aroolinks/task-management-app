import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const rawName: unknown = body?.name;
    if (typeof rawName !== 'string' || !rawName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invalid group name' },
        { status: 400 }
      );
    }

    const name = rawName.trim();
    const dup = await Group.findOne({ _id: { $ne: id }, name: new RegExp(`^${name}$`, 'i') });
    if (dup) {
      return NextResponse.json(
        { success: false, error: 'Group name already in use' },
        { status: 409 }
      );
    }

    const updated = await Group.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to update group' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID' },
        { status: 400 }
      );
    }

    const deleted = await Group.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deleted });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}