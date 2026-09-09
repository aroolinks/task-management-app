import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

// GET /api/users - List all users (for assignments and admin management)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // verifyAuth re-checks role/permissions against the live DB record, so
    // this reflects the user's current access, not a stale JWT snapshot.
    const isAdmin = user.role === 'admin' || user.permissions.canManageUsers;

    if (isAdmin) {
      // Full user info for admins
      const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });

      return NextResponse.json({
        success: true,
        users: users.map(u => ({
          id: u._id,
          username: u.username,
          email: u.email,
          role: u.role,
          permissions: u.permissions,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt
        }))
      });
    } else {
      // Only usernames for regular users (for assignment dropdown)
      const users = await User.find({}, { username: 1 }).sort({ username: 1 });

      return NextResponse.json({
        success: true,
        users: users.map(u => ({
          id: u._id,
          username: u.username
        }))
      });
    }
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (admin / user-manager only)
export async function POST(request: NextRequest) {
  try {
    const actor = await verifyAuth(request);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isAdmin = actor.role === 'admin';
    if (!isAdmin && !actor.permissions.canManageUsers) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { username, email, password, role, permissions } = await request.json();

    // Validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username },
        { email: email }
      ]
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Username or email already exists' },
        { status: 409 }
      );
    }

    // Set default permissions for team members
    const defaultPermissions = {
      canViewTasks: false,
      canEditTasks: false,
      canViewClients: true,
      canEditClients: true,
      canManageUsers: false
    };

    // Only a full admin may mint another admin or grant user-management
    // rights. A non-admin user-manager can create ordinary team members
    // only, so they cannot escalate their own privilege level.
    let finalRole: 'admin' | 'team_member' = role === 'admin' ? 'admin' : 'team_member';
    const finalPermissions = { ...defaultPermissions, ...(permissions || {}) };

    if (!isAdmin) {
      finalRole = 'team_member';
      finalPermissions.canManageUsers = false;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: finalRole,
      permissions: finalPermissions
    });

    await newUser.save();

    return NextResponse.json({
      success: true,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
