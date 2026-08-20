import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import TeamTask, { TEAM_TASK_PRIORITIES, TEAM_TASK_STATUSES } from '@/models/TeamTask';
import User from '@/models/User';

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
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
  try {
    await dbConnect();
    const body = await request.json();
    if (body.title !== undefined && !body.title.trim()) return NextResponse.json({ success: false, error: 'Task title is required' }, { status: 400 });
    if (body.assignedTo && (!mongoose.Types.ObjectId.isValid(body.assignedTo) || !(await User.exists({ _id: body.assignedTo })))) return NextResponse.json({ success: false, error: 'Invalid team member' }, { status: 400 });
    if (body.priority && !TEAM_TASK_PRIORITIES.includes(body.priority)) return NextResponse.json({ success: false, error: 'Invalid priority' }, { status: 400 });
    if (body.status && !TEAM_TASK_STATUSES.includes(body.status)) return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    delete body.createdBy; delete body.completedAt;
    const existing = await TeamTask.findById(id);
    if (!existing) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    if (body.status === 'Completed' && existing.status !== 'Completed') body.completedAt = new Date();
    if (body.status && body.status !== 'Completed') body.completedAt = null;
    const task = await TeamTask.findByIdAndUpdate(id, body, { new: true, runValidators: true }).populate('assignedTo', 'username email').populate('createdBy', 'username email').lean();
    const serialized = task as unknown as Record<string, unknown>;
    return NextResponse.json({ success: true, data: { ...serialized, id: String(serialized._id), _id: undefined } });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update task' }, { status: 400 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
  await dbConnect();
  const task = await TeamTask.findByIdAndDelete(id);
  if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
