import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

// Verify admin permissions
async function verifyAdmin(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Check if user is admin or has user management permissions
    const role = payload.role as string | undefined;
    const permissions = payload.permissions as { canManageUsers?: boolean } | undefined;
    
    if (role !== 'admin' && !permissions?.canManageUsers) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Admin verification error:', error);
    return null;
  }
}

// GET /api/users - List all users (for assignments and admin management)
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated (any authenticated user can see the list for assignments)
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    // Return only basic info (username) for non-admins, full info for admins
    const role = payload.role as string | undefined;
    const permissions = payload.permissions as { canManageUsers?: boolean } | undefined;
    const isAdmin = role === 'admin' || permissions?.canManageUsers;
    
    if (isAdmin) {
      // Full user info for admins
      const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
      
      return NextResponse.json({
        success: true,
        users: users.map(user => ({
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }))
      });
    } else {
      // Only usernames for regular users (for assignment dropdown)
      const users = await User.find({}, { username: 1 }).sort({ username: 1 });
      
      return NextResponse.json({
        success: true,
        users: users.map(user => ({
          id: user._id,
          username: user.username
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

// POST /api/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'team_member',
      permissions: permissions || defaultPermissions
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