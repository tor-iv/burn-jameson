import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// PayPal Webhook Event Types
// https://developer.paypal.com/api/rest/webhooks/event-names/
const WEBHOOK_EVENTS = {
  PAYOUT_ITEM_SUCCEEDED: 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED',
  PAYOUT_ITEM_FAILED: 'PAYMENT.PAYOUTS-ITEM.FAILED',
  PAYOUT_ITEM_BLOCKED: 'PAYMENT.PAYOUTS-ITEM.BLOCKED',
  PAYOUT_ITEM_CANCELED: 'PAYMENT.PAYOUTS-ITEM.CANCELED',
  PAYOUT_ITEM_DENIED: 'PAYMENT.PAYOUTS-ITEM.DENIED',
  PAYOUT_ITEM_HELD: 'PAYMENT.PAYOUTS-ITEM.HELD',
  PAYOUT_ITEM_REFUNDED: 'PAYMENT.PAYOUTS-ITEM.REFUNDED',
  PAYOUT_ITEM_RETURNED: 'PAYMENT.PAYOUTS-ITEM.RETURNED',
  PAYOUT_ITEM_UNCLAIMED: 'PAYMENT.PAYOUTS-ITEM.UNCLAIMED',
};

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  create_time: string;
  resource_type: string;
  resource: {
    payout_item_id: string;
    transaction_id?: string;
    transaction_status: string;
    payout_item_fee?: {
      currency: string;
      value: string;
    };
    payout_batch_id: string;
    sender_batch_id: string;
    payout_item: {
      amount: {
        currency: string;
        value: string;
      };
      receiver: string;
      sender_item_id: string; // This is our receipt ID
    };
    time_processed?: string;
    errors?: {
      name: string;
      message: string;
    };
  };
  summary?: string;
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

/**
 * Verify PayPal webhook signature
 * https://developer.paypal.com/api/rest/webhooks/rest/#verify-webhook-signature
 */
async function verifyWebhookSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    console.warn('⚠️ PAYPAL_WEBHOOK_ID not configured - skipping signature verification');
    // In development/testing, allow webhook without verification
    // In production, this should return false
    return process.env.PAYPAL_ENVIRONMENT === 'sandbox';
  }

  const transmissionId = request.headers.get('paypal-transmission-id');
  const transmissionTime = request.headers.get('paypal-transmission-time');
  const certUrl = request.headers.get('paypal-cert-url');
  const authAlgo = request.headers.get('paypal-auth-algo');
  const transmissionSig = request.headers.get('paypal-transmission-sig');

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error('❌ Missing PayPal webhook headers');
    return false;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';

  if (!clientId || !clientSecret) {
    console.error('❌ PayPal credentials not configured');
    return false;
  }

  try {
    // Get OAuth token
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
      console.error('❌ PayPal auth failed for webhook verification');
      return false;
    }

    const { access_token } = await authResponse.json();

    // Verify webhook signature
    const verifyUrl = environment === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature'
      : 'https://api-m.paypal.com/v1/notifications/verify-webhook-signature';

    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!verifyResponse.ok) {
      console.error('❌ Webhook verification failed:', await verifyResponse.text());
      return false;
    }

    const verifyResult = await verifyResponse.json();
    const isValid = verifyResult.verification_status === 'SUCCESS';

    console.log(isValid ? '✅ Webhook signature verified' : '❌ Webhook signature invalid');
    return isValid;
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    return false;
  }
}

/**
 * Update receipt status based on webhook event
 */
async function handleWebhookEvent(event: PayPalWebhookEvent): Promise<void> {
  const { event_type, resource } = event;
  const payoutItemId = resource.payout_item_id;
  const receiptId = resource.payout_item?.sender_item_id;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📨 PAYPAL WEBHOOK RECEIVED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Event Type:', event_type);
  console.log('Payout Item ID:', payoutItemId);
  console.log('Receipt ID:', receiptId);
  console.log('Status:', resource.transaction_status);
  console.log('Time:', event.create_time);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Find receipt by payout ID
  const { data: receipt, error: fetchError } = await supabase
    .from('receipts')
    .select('*')
    .eq('paypal_payout_id', payoutItemId)
    .single();

  if (fetchError || !receipt) {
    console.error('❌ Receipt not found for payout ID:', payoutItemId);
    return;
  }

  let newStatus: string | null = null;
  let adminNotes = receipt.admin_notes || '';

  switch (event_type) {
    case WEBHOOK_EVENTS.PAYOUT_ITEM_SUCCEEDED:
      // Payout successfully completed
      adminNotes += `\n[${new Date().toISOString()}] ✅ PayPal payout succeeded`;
      console.log('✅ Payout succeeded for receipt:', receiptId);
      // Status remains 'paid'
      break;

    case WEBHOOK_EVENTS.PAYOUT_ITEM_FAILED:
      // Payout failed - needs manual review
      newStatus = 'approved'; // Reset to approved so admin can retry
      const errorMsg = resource.errors?.message || 'Unknown error';
      adminNotes += `\n[${new Date().toISOString()}] ❌ PayPal payout failed: ${errorMsg}`;
      console.error('❌ Payout failed:', errorMsg);
      break;

    case WEBHOOK_EVENTS.PAYOUT_ITEM_BLOCKED:
    case WEBHOOK_EVENTS.PAYOUT_ITEM_DENIED:
      // Payout blocked or denied - needs manual review
      newStatus = 'approved';
      adminNotes += `\n[${new Date().toISOString()}] 🚫 PayPal payout ${event_type.split('.').pop()?.toLowerCase()}`;
      console.warn('🚫 Payout blocked/denied for receipt:', receiptId);
      break;

    case WEBHOOK_EVENTS.PAYOUT_ITEM_HELD:
    case WEBHOOK_EVENTS.PAYOUT_ITEM_UNCLAIMED:
      // Payout held or unclaimed - still in progress
      adminNotes += `\n[${new Date().toISOString()}] ⏳ PayPal payout ${event_type.split('.').pop()?.toLowerCase()}`;
      console.warn('⏳ Payout pending for receipt:', receiptId);
      // Status remains 'paid'
      break;

    case WEBHOOK_EVENTS.PAYOUT_ITEM_CANCELED:
    case WEBHOOK_EVENTS.PAYOUT_ITEM_RETURNED:
    case WEBHOOK_EVENTS.PAYOUT_ITEM_REFUNDED:
      // Payout was canceled, returned, or refunded
      newStatus = 'approved'; // Reset to approved
      adminNotes += `\n[${new Date().toISOString()}] ↩️ PayPal payout ${event_type.split('.').pop()?.toLowerCase()}`;
      console.warn('↩️ Payout returned/canceled for receipt:', receiptId);
      break;

    default:
      console.log('ℹ️ Unhandled webhook event type:', event_type);
      adminNotes += `\n[${new Date().toISOString()}] ℹ️ PayPal webhook: ${event_type}`;
  }

  // Update receipt in database
  const updateData: any = {
    admin_notes: adminNotes.trim(),
  };

  if (newStatus) {
    updateData.status = newStatus;
    // Clear payout ID if failed so it can be retried
    if (newStatus === 'approved') {
      updateData.paypal_payout_id = null;
      updateData.paid_at = null;
    }
  }

  const { error: updateError } = await supabase
    .from('receipts')
    .update(updateData)
    .eq('id', receipt.id);

  if (updateError) {
    console.error('❌ Failed to update receipt:', updateError);
    throw updateError;
  }

  console.log('✅ Receipt updated successfully');
}

/**
 * POST /api/webhooks/paypal
 * Receives and processes PayPal webhook events for payout status updates
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();

    // Verify webhook signature (production security requirement)
    const isValid = await verifyWebhookSignature(request, body);
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse webhook event
    const event: PayPalWebhookEvent = JSON.parse(body);

    // Process the event
    await handleWebhookEvent(event);

    // Return 200 to acknowledge receipt
    return NextResponse.json({
      success: true,
      eventId: event.id,
      eventType: event.event_type,
    });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);

    // Still return 200 to avoid PayPal retries (we logged the error)
    return NextResponse.json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 200 }); // Return 200 to prevent retries
  }
}

/**
 * GET /api/webhooks/paypal
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'PayPal webhook endpoint is running',
    environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
    webhookConfigured: !!process.env.PAYPAL_WEBHOOK_ID,
  });
}
