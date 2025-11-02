import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db } from './db';
import type { User } from '@/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this'
);

const TOKEN_NAME = 'print-shop-token';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
}

// Create JWT token
export async function createToken(user: User): Promise<string> {
  return await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionData;
  } catch (error) {
    return null;
  }
}

// Get current session
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;

  if (!token) {
    return null;
  }

  return await verifyToken(token);
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  
  if (!session) {
    return null;
  }

  return await db.getUserById(session.userId);
}

// Login
export async function login(email: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const user = await db.getUser(email);

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Get password hash
    const result = await db.getUser(email);
    if (!result) {
      return { success: false, error: 'Invalid email or password' };
    }

    const passwordHash = (result as any).password_hash;
    const isValidPassword = await bcrypt.compare(password, passwordHash);

    if (!isValidPassword) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Update last login
    await db.updateLastLogin(user.id);

    // Create token
    const token = await createToken(user);

    return { success: true, token };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
}

// Set session cookie
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Clear session cookie
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

// Check permissions
export function hasPermission(user: User | null, requiredRole: 'admin' | 'manager' | 'operator'): boolean {
  if (!user) return false;

  const roleHierarchy = {
    admin: 3,
    manager: 2,
    operator: 1,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

