import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username/Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: username },
        { email: username }
      ]
    }).select('+email +role +permissions');
    
    console.log('🔍 Login: Found user:', {
      exists: !!user,
      username: user?.username,
      hasEmail: !!user?.email,
      hasRole: !!user?.role,
      hasPermissions: !!user?.permissions,
      email: user?.email,
      role: user?.role,
      permissions: user?.permissions
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // For now, doing simple password comparison
    // In production, you should use bcrypt to hash passwords
    if (user.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token with role and permissions
    const token = await new SignJWT({ 
      userId: user._id.toString(), 
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    console.log('🔑 Login: Creating token for user:', {
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    console.log('🔑 Login: Cookie set successfully');

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}