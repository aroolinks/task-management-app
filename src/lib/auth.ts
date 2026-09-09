import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import dbConnect from './mongodb';
import User from '@/models/User';
import { getJwtSecret } from './jwt';

// Re-exported for existing callers that import it from '@/lib/auth'.
export { getJwtSecret };

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

type Permissions = AuthenticatedUser['permissions'];

function isRole(value: unknown): value is 'admin' | 'team_member' {
  return value === 'admin' || value === 'team_member';
}

function isPermissions(value: unknown): value is Permissions {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.canViewTasks === 'boolean' &&
    typeof v.canEditTasks === 'boolean' &&
    typeof v.canViewClients === 'boolean' &&
    typeof v.canEditClients === 'boolean' &&
    typeof v.canManageUsers === 'boolean'
  );
}

export async function verifyAuth(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, getJwtSecret());

    // Role/permissions embedded in the token are a snapshot from login time.
    // Sessions can now live up to 30 days ("remember me"), so an admin
    // changing someone's permissions wouldn't take effect until that
    // person's token expired - re-check against the DB on every request
    // instead of trusting the token's payload.
    let role: 'admin' | 'team_member';
    let permissions: Permissions;

    try {
      await dbConnect();
      const dbUser = await User.findById(payload.userId as string).select('role permissions');
      if (!dbUser) {
        return null;
      }
      role = dbUser.role;
      permissions = dbUser.permissions;
    } catch (dbError) {
      // DB unreachable - fall back to the token's own snapshot rather than
      // locking everyone out over a transient connection issue. Do NOT grant
      // blanket admin here: if the token predates role/permissions being
      // embedded, deny instead of escalating.
      console.error('verifyAuth: DB lookup failed, falling back to token payload:', dbError);
      if (!isRole(payload.role) || !isPermissions(payload.permissions)) {
        return null;
      }
      role = payload.role;
      permissions = payload.permissions;
    }

    return {
      userId: payload.userId as string,
      username: payload.username as string,
      email: payload.email as string,
      role,
      permissions,
    };
  } catch (error) {
    console.error('verifyAuth: Auth verification error:', error);
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
