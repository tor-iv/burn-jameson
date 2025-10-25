import { NextResponse } from 'next/server';

/**
 * API endpoint to check if TEST_PAYOUT_AMOUNT is configured
 * Used by admin dashboard to show visual indicator
 */
export async function GET() {
  const testAmount = process.env.TEST_PAYOUT_AMOUNT;

  return NextResponse.json({
    testAmount: testAmount || null,
    isTestMode: !!testAmount,
  });
}
