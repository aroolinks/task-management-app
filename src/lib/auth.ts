import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

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
    
    // Handle legacy tokens that don't have role/permissions
    const role = (payload.role as 'admin' | 'team_member') || 'admin';
    const permissions = (payload.permissions as {
      canViewTasks: boolean;
      canEditTasks: boolean;
      canViewClients: boolean;
      canEditClients: boolean;
      canManageUsers: boolean;
    }) || {
      // Default to admin permissions if not present (legacy tokens)
      canViewTasks: true,
      canEditTasks: true,
      canViewClients: true,
      canEditClients: true,
      canManageUsers: true
    };
    
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