import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const { username, password, rememberMe } = await request.json();

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
    }).select('+password +email +role +permissions');
    
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

    // Compare password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Login: Invalid password for user:', user.username);
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // "Remember me" keeps the session alive for 30 days instead of the
    // default 24 hours; unchecked, the cookie is session-only (no maxAge)
    // so it clears when the browser closes.
    const sessionLength = rememberMe ? '30d' : '24h';

    // Create JWT token with role and permissions
    const token = await new SignJWT({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(sessionLength)
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

    // Set HTTP-only cookie. Only give it a maxAge (persists across browser
    // restarts) when "remember me" was checked; otherwise it's a session
    // cookie that disappears when the browser closes.
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 } : {})
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