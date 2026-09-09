import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

/** Escapes a user-supplied string for safe use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function canManageUsers(user: { role: string; permissions?: { canManageUsers?: boolean } }): boolean {
  return user.role === 'admin' || !!user.permissions?.canManageUsers;
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get all users for assignment dropdown
    const users = await User.find({}, { username: 1 }).sort({ username: 1 });
    const usernames = users.map(u => u.username);

    return NextResponse.json({
      success: true,
      data: usernames
    });
  } catch (error) {
    console.error('Error fetching users for assignments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
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
    if (!canManageUsers(user)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();

    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({
      username: { $regex: new RegExp(`^${escapeRegExp(trimmedName)}$`, 'i') }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create new user with basic team member permissions
    const created = new User({
      username: trimmedName,
      email: `${trimmedName.toLowerCase()}@company.com`, // Default email
      password: 'defaultpassword123', // Default password - should be changed
      role: 'team_member',
      permissions: {
        canViewTasks: true,
        canEditTasks: true,
        canViewClients: true,
        canEditClients: true,
        canManageUsers: false
      }
    });
    await created.save();

    return NextResponse.json({
      success: true,
      data: { _id: created._id, name: created.username }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!canManageUsers(user)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    // Remove user by username
    await User.deleteOne({ username: name });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
