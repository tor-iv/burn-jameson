import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/supabase-helpers';

export async function POST(request: NextRequest) {
  try {
    // Get IP address from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() :
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit (3 scans per 24 hours)
    const result = await checkRateLimit(ip, 3, 24);

    return NextResponse.json({
      allowed: result.allowed,
      remaining: result.remaining,
      limit: 3,
      windowHours: 24
    });
  } catch (error) {
    console.error('Rate limit check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check rate limit',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
