import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// 🚨 CRITICAL SECURITY VULNERABILITIES IN THIS FILE:
// 1. Plaintext password comparison (timing attack vulnerable)
// 2. Weak session token (base64 only, not signed/encrypted)
// 3. No rate limiting (brute force attacks possible)
// 4. No account lockout mechanism
// 5. No authentication attempt logging
// 6. Weak default password ('admin123')
//
// TODO: Complete rewrite required. See SECURITY.md - Vulnerability #1
// See: docs/SECURITY_ROADMAP.md - Phase 1.1 (Admin Authentication System)

// ❌ INSECURE: Plaintext password (should be bcrypt hash!)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Session token expiry (24 hours)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

/**
 * Simple admin authentication endpoint
 * POST /api/admin/auth - Verify password and set secure cookie
 * GET /api/admin/auth - Check if authenticated
 * DELETE /api/admin/auth - Logout
 */

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }

    // ❌ INSECURE: Non-constant-time comparison (timing attack vulnerable!)
    // TODO: Replace with bcrypt.compare() for constant-time comparison
    // Verify password (server-side only - password never exposed to client!)
    if (password !== ADMIN_PASSWORD) {
      // TODO: Add failed attempt tracking and rate limiting here
      // TODO: Add logging (IP, timestamp, attempt count)
      return NextResponse.json(
        { authenticated: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    // ❌ INSECURE: Base64-encoded token (not signed, easily forged!)
    // TODO: Replace with JWT signed token using jsonwebtoken library
    // Create session token (simple timestamp-based for MVP)
    const sessionToken = Buffer.from(
      JSON.stringify({
        authenticated: true,
        timestamp: Date.now(),
      })
    ).toString('base64');

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('admin_session', sessionToken, {
      httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: SESSION_DURATION / 1000, // 24 hours
      path: '/',
    });

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }

    // Verify session token
    try {
      const session = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString()
      );

      // Check if session is expired
      if (Date.now() - session.timestamp > SESSION_DURATION) {
        return NextResponse.json({ authenticated: false });
      }

      return NextResponse.json({ authenticated: true });
    } catch {
      return NextResponse.json({ authenticated: false });
    }
  } catch (error) {
    console.error('Admin auth check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
