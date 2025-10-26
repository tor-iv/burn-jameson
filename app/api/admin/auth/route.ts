import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Admin password stored server-side only (NOT NEXT_PUBLIC_!)
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

    // Verify password (server-side only - password never exposed to client!)
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

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
