import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import dbConnect from './mongodb';
import User from '@/models/User';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export interface AuthenticatedUser {
  userId: string;
  username: string;
  email?: string;
  role: 'admin' | 'team_member';
  permissions: {
    canViewTasks: boolean;
    canEditTasks: boolean;
    canViewClients: boolean;
    canEditClients: boolean;
    canManageUsers: boolean;
  };
}

export async function verifyAuth(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    console.log('🔐 verifyAuth: Token exists?', !!token);
    
    if (!token) {
      console.log('🔐 verifyAuth: No token found');
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    console.log('🔐 verifyAuth: Token verified, payload:', {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      hasPermissions: !!payload.permissions
    });

    // Role/permissions embedded in the token are a snapshot from login time.
    // Sessions can now live up to 30 days ("remember me"), so an admin
    // changing someone's permissions wouldn't take effect until that
    // person's token expired - re-check against the DB on every request
    // instead of trusting the token's payload.
    let role: 'admin' | 'team_member';
    let permissions: {
      canViewTasks: boolean;
      canEditTasks: boolean;
      canViewClients: boolean;
      canEditClients: boolean;
      canManageUsers: boolean;
    };

    try {
      await dbConnect();
      const dbUser = await User.findById(payload.userId as string);
      if (!dbUser) {
        console.log('🔐 verifyAuth: User no longer exists, denying');
        return null;
      }
      role = dbUser.role;
      permissions = dbUser.permissions;
    } catch (dbError) {
      // DB unreachable - fall back to the token's snapshot rather than
      // locking everyone out over a transient connection issue.
      console.error('🔐 verifyAuth: DB lookup failed, falling back to token payload:', dbError);
      role = (payload.role as 'admin' | 'team_member') || 'admin';
      permissions = (payload.permissions as typeof permissions) || {
        // Default to admin permissions if not present (legacy tokens)
        canViewTasks: true,
        canEditTasks: true,
        canViewClients: true,
        canEditClients: true,
        canManageUsers: true
      };
    }

    return {
      userId: payload.userId as string,
      username: payload.username as string,
      email: payload.email as string,
      role,
      permissions
    };
  } catch (error) {
    console.error('🔐 verifyAuth: Auth verification error:', error);
    return null;
  }
}

export function requireAuth() {
  return async (request: NextRequest) => {
    const user = await verifyAuth(request);
    if (!user) {
      return Response.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    return user;
  };
}

export function requirePermission(permission: keyof AuthenticatedUser['permissions']) {
  return async (request: NextRequest) => {
    const user = await verifyAuth(request);
    if (!user) {
      return Response.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (!user.permissions[permission]) {
      return Response.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return user;
  };
}

export function requireRole(role: 'admin' | 'team_member') {
  return async (request: NextRequest) => {
    const user = await verifyAuth(request);
    if (!user) {
      return Response.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (user.role !== role && user.role !== 'admin') { // Admin can access everything
      return Response.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return user;
  };
}