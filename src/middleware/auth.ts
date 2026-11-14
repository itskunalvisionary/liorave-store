import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifySessionToken } from '../lib/auth-token.ts';
import { isConfiguredAdminEmail } from '../lib/admin-env.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: string;
}

export interface AuthRequest extends Request {
  authUser?: AuthenticatedUser;
  isAdminSession?: boolean;
}

export async function getOrCreateFirebaseUser(
  uid: string,
  email: string,
  name?: string
): Promise<AuthenticatedUser> {
  const normalizedEmail = email.toLowerCase();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    const nextName = user.name || name || normalizedEmail.split('@')[0];
    if (user.uid !== uid || user.name !== nextName) {
      const updated = await db
        .update(users)
        .set({
          uid,
          name: nextName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();
      return {
        id: updated[0].id,
        uid: updated[0].uid,
        email: updated[0].email,
        name: updated[0].name,
        phone: updated[0].phone,
        // Google/Firebase storefront sign-in never grants admin panel access
        role: 'customer',
      };
    }
    return {
      id: user.id,
      uid: user.uid,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: 'customer',
    };
  }

  const inserted = await db
    .insert(users)
    .values({
      uid,
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      role: 'customer',
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email: normalizedEmail,
        updatedAt: new Date(),
      },
    })
    .returning();

  const row = inserted[0];
  return {
    id: row.id,
    uid: row.uid,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: 'customer',
  };
}

async function resolveUserFromHeader(
  authHeader: string | undefined
): Promise<{ user: AuthenticatedUser; isAdminSession: boolean } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  // 1. Check local HMAC session token first
  const localPayload = verifySessionToken(token);
  if (localPayload) {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.uid, localPayload.uid))
      .limit(1);
    if (rows.length > 0) {
      const u = rows[0];
      const adminAllowed =
        localPayload.isAdminSession === true &&
        isConfiguredAdminEmail(u.email);
      return {
        user: {
          id: u.id,
          uid: u.uid,
          email: u.email,
          name: u.name,
          phone: u.phone,
          role: adminAllowed ? 'admin' : 'customer',
        },
        isAdminSession: adminAllowed,
      };
    }
    return null;
  }

  // 2. Verify Firebase ID Token (Google storefront customers only; never Admin)
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email) return null;
    const fbUser = await getOrCreateFirebaseUser(
      decoded.uid,
      decoded.email,
      typeof decoded.name === 'string' ? decoded.name : undefined
    );
    return {
      user: { ...fbUser, role: 'customer' },
      isAdminSession: false,
    };
  } catch {
    return null;
  }
}

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const resolved = await resolveUserFromHeader(req.headers.authorization);
    if (resolved) {
      req.authUser = resolved.user;
      req.isAdminSession = resolved.isAdminSession;
    }
  } catch (err) {
    console.error('Optional auth resolution failed:', err);
  }
  next();
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const resolved = await resolveUserFromHeader(req.headers.authorization);
    if (!resolved) {
      res.status(401).json({ error: 'Unauthorized: Valid sign-in required' });
      return;
    }
    req.authUser = resolved.user;
    req.isAdminSession = resolved.isAdminSession;
    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (
    req.authUser.role !== 'admin' ||
    !req.isAdminSession ||
    !isConfiguredAdminEmail(req.authUser.email)
  ) {
    res.status(403).json({ error: 'Forbidden: Administrator access required' });
    return;
  }
  next();
};
