import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import TeamTask, { TEAM_TASK_PRIORITIES, TEAM_TASK_STATUSES } from '@/models/TeamTask';
import User from '@/models/User';
import mongoose from 'mongoose';

const serialize = (task: Record<string, unknown>) => ({ ...task, id: String(task._id), _id: undefined });

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!auth.permissions.canViewTasks) return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  await dbConnect();
  const [tasks, members] = await Promise.all([
    TeamTask.find().populate('assignedTo', 'username email').populate('createdBy', 'username email').sort({ createdAt: -1 }).lean(),
    User.find({}, 'username email').sort({ username: 1 }).lean(),
  ]);
  return NextResponse.json({ success: true, data: tasks.map(t => serialize(t as Record<string, unknown>)), members: members.map(m => ({ id: String(m._id), username: m.username, email: m.email })) });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!auth.permissions.canEditTasks) return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  try {
    await dbConnect();
    const body = await request.json();
    if (!body.title?.trim()) return NextResponse.json({ success: false, error: 'Task title is required' }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(body.assignedTo) || !(await User.exists({ _id: body.assignedTo }))) return NextResponse.json({ success: false, error: 'Please select a valid team member' }, { status: 400 });
    if (!TEAM_TASK_PRIORITIES.includes(body.priority) || !TEAM_TASK_STATUSES.includes(body.status)) return NextResponse.json({ success: false, error: 'Invalid priority or status' }, { status: 400 });
    const task = await TeamTask.create({ ...body, title: body.title.trim(), createdBy: auth.userId, completedAt: body.status === 'Completed' ? new Date() : null });
    const populated = await TeamTask.findById(task._id).populate('assignedTo', 'username email').populate('createdBy', 'username email').lean();
    return NextResponse.json({ success: true, data: serialize(populated as Record<string, unknown>) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create task' }, { status: 400 });
  }
}
