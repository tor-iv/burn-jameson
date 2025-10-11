import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple API route to get client IP address
 */
export async function GET(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() :
             request.headers.get('x-real-ip') ||
             'unknown';

  return NextResponse.json({ ip });
}
