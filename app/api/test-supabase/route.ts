import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test database connection by querying users table
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      return NextResponse.json(
        {
          connected: false,
          error: error.message,
          details: error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      connected: true,
      message: 'Successfully connected to Supabase',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        connected: false,
        error: 'Unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
