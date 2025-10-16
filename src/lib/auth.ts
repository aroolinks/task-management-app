import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export interface AuthenticatedUser {
  userId: string;
  username: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    return {
      userId: payload.userId as string,
      username: payload.username as string
    };
  } catch (error) {
    console.error('Auth verification error:', error);
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