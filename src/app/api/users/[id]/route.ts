import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
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

// PUT /api/users/[id] - Update user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await dbConnect();
    
    const updates = await request.json();
    
    console.log('📝 Updating user:', {
      id,
      updates,
      adminUser: admin.username,
    });
    
    // Don't allow updating password through this endpoint for security
    // Create a separate password reset endpoint if needed
    const { password, ...safeUpdates } = updates;
    
    // Validate role if provided
    if (safeUpdates.role && !['admin', 'team_member'].includes(safeUpdates.role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
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

    console.log('✅ User updated successfully:', {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

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
  } catch (error: any) {
    console.error('Update user error:', error);
    
    // Handle duplicate key error (username or email already exists)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return NextResponse.json(
        { success: false, error: `${field === 'username' ? 'Username' : 'Email'} already exists` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
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
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await dbConnect();
    
    // Prevent deleting yourself
    if (admin.userId === id) {
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
