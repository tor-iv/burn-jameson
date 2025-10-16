import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PayPal SDK types (install with: npm install @paypal/payouts-sdk)
// For now, we'll use fetch API directly which is production-ready

interface PayoutRequest {
  receiptId: string;
  paypalEmail: string;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const { receiptId, paypalEmail, amount }: PayoutRequest = await request.json();

    // Validate inputs
    if (!receiptId || !paypalEmail || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify receipt exists and is approved
    const { data: receipt, error: fetchError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .eq('status', 'approved')
      .single();

    if (fetchError || !receipt) {
      return NextResponse.json(
        { error: 'Receipt not found or not approved' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (receipt.paypal_payout_id) {
      return NextResponse.json(
        { error: 'Receipt already paid', payoutId: receipt.paypal_payout_id },
        { status: 400 }
      );
    }

    // Check PayPal email rate limiting (configurable via ENV)
    // Set ENABLE_PAYPAL_EMAIL_RATE_LIMIT=false to disable for testing
    const enableRateLimit = process.env.ENABLE_PAYPAL_EMAIL_RATE_LIMIT !== 'false';
    const rateLimitDays = parseInt(process.env.PAYPAL_EMAIL_RATE_LIMIT_DAYS || '30', 10);

    if (enableRateLimit) {
      const rateLimitDate = new Date();
      rateLimitDate.setDate(rateLimitDate.getDate() - rateLimitDays);

      const { data: recentPayouts, error: rateLimitError } = await supabase
        .from('receipts')
        .select('id, paid_at')
        .eq('paypal_email', paypalEmail)
        .eq('status', 'paid')
        .gte('paid_at', rateLimitDate.toISOString())
        .limit(1);

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
        // Don't block on rate limit check error, just log it
      } else if (recentPayouts && recentPayouts.length > 0) {
        const lastPayoutDate = new Date(recentPayouts[0].paid_at);
        const daysRemaining = Math.ceil(
          (rateLimitDays - (Date.now() - lastPayoutDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        return NextResponse.json(
          {
            error: `This PayPal email has already received a payout in the last ${rateLimitDays} days`,
            details: `Please wait ${daysRemaining} more day(s) before submitting another receipt with this email.`,
            lastPayoutDate: lastPayoutDate.toISOString(),
          },
          { status: 429 } // Too Many Requests
        );
      }
    }

    // Get PayPal credentials from environment
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'live'

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'PayPal credentials not configured' },
        { status: 500 }
      );
    }

    // Step 1: Get PayPal OAuth token
    const authUrl = environment === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com/v1/oauth2/token'
      : 'https://api-m.paypal.com/v1/oauth2/token';

    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('PayPal auth error:', errorText);
      return NextResponse.json(
        { error: 'Failed to authenticate with PayPal' },
        { status: 500 }
      );
    }

    const { access_token } = await authResponse.json();

    // Step 2: Create payout batch
    const payoutUrl = environment === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com/v1/payments/payouts'
      : 'https://api-m.paypal.com/v1/payments/payouts';

    const payoutBatchId = `BATCH-${Date.now()}-${receiptId.slice(0, 8)}`;

    const payoutPayload = {
      sender_batch_header: {
        sender_batch_id: payoutBatchId,
        email_subject: 'You received a payment from Keeper\'s Heart Whiskey!',
        email_message: 'You have received a rebate for participating in our Burn That Ad campaign. Thank you for choosing Keeper\'s Heart!',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: 'USD',
          },
          receiver: paypalEmail,
          note: 'Burn That Ad rebate',
          sender_item_id: receiptId,
        },
      ],
    };

    const payoutResponse = await fetch(payoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify(payoutPayload),
    });

    if (!payoutResponse.ok) {
      const errorData = await payoutResponse.json();
      console.error('PayPal payout error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create PayPal payout', details: errorData },
        { status: 500 }
      );
    }

    const payoutResult = await payoutResponse.json();
    const payoutItemId = payoutResult.items?.[0]?.payout_item_id || payoutResult.batch_header?.payout_batch_id;

    // Step 3: Update receipt in database
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        status: 'paid',
        paypal_payout_id: payoutItemId,
        paid_at: new Date().toISOString(),
        admin_notes: `PayPal payout sent. Batch ID: ${payoutBatchId}`,
      })
      .eq('id', receiptId);

    if (updateError) {
      console.error('Database update error:', updateError);
      // Payout was sent but DB update failed - log this for manual review
      return NextResponse.json(
        {
          warning: 'Payout sent but database update failed',
          payoutId: payoutItemId,
          error: updateError.message
        },
        { status: 207 } // Multi-status
      );
    }

    return NextResponse.json({
      success: true,
      payoutId: payoutItemId,
      batchId: payoutBatchId,
      amount,
      paypalEmail,
      message: 'Payout sent successfully',
    });

  } catch (error) {
    console.error('PayPal payout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
