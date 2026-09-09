import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getJwtSecret } from '@/lib/auth';

// Verify user-management permissions. Checks the live user record rather than
// the JWT payload, so a permission change takes effect immediately instead of
// requiring the affected user to log out and back in. Returns the token
// payload plus whether the caller is a full admin (vs. a delegated manager).
async function verifyManager(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, getJwtSecret());

    await dbConnect();
    const dbUser = await User.findById(payload.userId as string).select('role permissions');
    if (!dbUser) {
      return null;
    }

    if (dbUser.role !== 'admin' && !dbUser.permissions?.canManageUsers) {
      return null;
    }

    return { payload, isAdmin: dbUser.role === 'admin' };
  } catch (error) {
    console.error('Manager verification error:', error);
    return null;
  }
}

// PUT /api/users/[id] - Update user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyManager(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await dbConnect();

    const updates = await request.json();

    // Don't allow updating password through this endpoint for security
    // Password updates are handled through the reset-password endpoint
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUpdates } = updates;

    // Validate role if provided
    if (safeUpdates.role && !['admin', 'team_member'].includes(safeUpdates.role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Only a full admin may change a user's role or grant user-management
    // rights. A delegated manager editing users cannot escalate anyone
    // (including themselves) to admin or to canManageUsers.
    if (!auth.isAdmin) {
      delete safeUpdates.role;
      if (safeUpdates.permissions && typeof safeUpdates.permissions === 'object') {
        safeUpdates.permissions = { ...safeUpdates.permissions, canManageUsers: false };
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: safeUpdates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    // Handle duplicate key error (username or email already exists)
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      const keyPattern = 'keyPattern' in error ? error.keyPattern as Record<string, unknown> : {};
      const field = Object.keys(keyPattern)[0];
      return NextResponse.json(
        { success: false, error: `${field === 'username' ? 'Username' : 'Email'} already exists` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyManager(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await dbConnect();

    // Prevent deleting yourself
    if (auth.payload.userId === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
