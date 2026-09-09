import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getJwtSecret } from '@/lib/auth';

// Verify user-management permissions. Checks the live user record rather than
// the JWT payload, so a permission change takes effect immediately instead of
// requiring the affected user to log out and back in.
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

    return payload;
  } catch (error) {
    console.error('Manager verification error:', error);
    return null;
  }
}

// POST /api/users/[id]/reset-password - Reset user password (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyManager(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { newPassword } = await request.json();

    // Validate password
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the user
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${user.username}`
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
