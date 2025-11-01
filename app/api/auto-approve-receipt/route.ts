import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateFraudScore, logFraudScore } from '@/lib/fraud-scoring';

/**
 * Auto-Approval API Route
 *
 * This endpoint automatically approves receipts based on confidence scoring.
 * High-confidence receipts are instantly approved and paid via PayPal.
 * Low-confidence receipts are flagged for manual admin review.
 *
 * Flow:
 * 1. Validate receipt exists and has OCR data
 * 2. Load bottle scan session data
 * 3. Calculate fraud confidence score
 * 4. If score >= threshold: Auto-approve + trigger PayPal payout
 * 5. If score < threshold: Flag for manual review
 */

interface AutoApproveRequest {
  receiptId: string;
  validationData: {
    hasKeepersHeart: boolean;
    hasReceiptKeywords: boolean;
    detectedText: string;
    matchedKeywords: string[];
    errors: string[];
  };
  fraudCheckData: {
    isLikelyRealPhoto: boolean;
    warnings: string[];
  };
}

// Daily auto-approval counter (in-memory, resets on server restart)
let dailyAutoApprovals = 0;
let lastResetDate = new Date().toDateString();

function checkDailyLimit(): boolean {
  const today = new Date().toDateString();

  // Reset counter if new day
  if (today !== lastResetDate) {
    dailyAutoApprovals = 0;
    lastResetDate = today;
  }

  const maxDaily = parseInt(process.env.AUTO_APPROVAL_MAX_DAILY || '1000', 10);
  return dailyAutoApprovals < maxDaily;
}

function incrementDailyCounter(): void {
  dailyAutoApprovals++;
}

export async function POST(request: NextRequest) {
  // ⚠️ SECURITY WARNING - NO AUTHENTICATION!
  // TODO: Add authentication check to prevent unauthorized auto-approvals
  // Currently, anyone can call this endpoint and auto-approve their own receipts!
  //
  // RECOMMENDATION: This endpoint is called from the client-side upload flow,
  // so it's semi-public. Consider:
  // 1. Add server-side validation of all fraud signals (don't trust client)
  // 2. Add rate limiting per IP/session
  // 3. Add CAPTCHA verification
  // 4. OR: Move auto-approval logic to server-side only (trigger after receipt upload)
  //
  // See: SECURITY.md - Vulnerability #2 (Admin API Endpoints - No Authorization Check)
  // See: docs/SECURITY_ROADMAP.md - Phase 1.2 (API Endpoint Authorization)

  try {
    const { receiptId, validationData, fraudCheckData }: AutoApproveRequest = await request.json();

    // Validate inputs
    if (!receiptId || !validationData || !fraudCheckData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if auto-approval is enabled
    const autoApprovalEnabled = process.env.ENABLE_AUTO_APPROVAL !== 'false';
    if (!autoApprovalEnabled) {
      return NextResponse.json({
        autoApproved: false,
        reason: 'Auto-approval disabled (manual review required)',
        requiresManualReview: true,
      });
    }

    // Check daily limit (safety mechanism)
    if (!checkDailyLimit()) {
      console.warn('⚠️ Daily auto-approval limit reached');
      return NextResponse.json({
        autoApproved: false,
        reason: 'Daily auto-approval limit reached (manual review required)',
        requiresManualReview: true,
      });
    }

    // Fetch receipt from database
    const { data: receipt, error: fetchError } = await supabase
      .from('receipts')
      .select('*, bottle_scans!receipts_session_id_fkey(*)')
      .eq('id', receiptId)
      .single();

    if (fetchError || !receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (receipt.status !== 'pending') {
      return NextResponse.json(
        { error: `Receipt already processed (status: ${receipt.status})` },
        { status: 400 }
      );
    }

    // Get bottle scan data (handle both array and object from join)
    const bottleScan = Array.isArray(receipt.bottle_scans)
      ? receipt.bottle_scans[0]
      : receipt.bottle_scans;

    if (!bottleScan) {
      return NextResponse.json(
        { error: 'Bottle scan not found' },
        { status: 404 }
      );
    }

    // Calculate fraud score
    const fraudScore = calculateFraudScore(
      {
        ...validationData,
        isLikelyRealPhoto: fraudCheckData.isLikelyRealPhoto,
        fraudWarnings: fraudCheckData.warnings,
      },
      {
        sessionId: receipt.session_id,
        ipAddress: bottleScan.ip_address || 'unknown',
        bottleConfidence: bottleScan.confidence || 0,
        bottleDetectedBrand: bottleScan.detected_brand || 'unknown',
      }
    );

    // Log fraud score for auditing
    logFraudScore(fraudScore, receipt.session_id);

    // Decision: Auto-approve or flag for review
    if (fraudScore.autoApprove) {
      // AUTO-APPROVE PATH
      console.log(`✅ Auto-approving receipt ${receiptId} (${(fraudScore.score * 100).toFixed(1)}% confidence)`);

      // Update receipt with auto-approval data
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          status: 'approved',
          auto_approved: true,
          confidence_score: fraudScore.score,
          auto_approved_at: new Date().toISOString(),
          admin_notes: `Auto-approved with ${(fraudScore.score * 100).toFixed(1)}% confidence`,
        })
        .eq('id', receiptId);

      if (updateError) {
        console.error('Database update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update receipt status' },
          { status: 500 }
        );
      }

      // Trigger PayPal payout
      const payoutResponse = await fetch(
        `${request.nextUrl.origin}/api/paypal-payout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiptId: receipt.id,
            paypalEmail: receipt.paypal_email,
            amount: receipt.rebate_amount || 5.0,
          }),
        }
      );

      const payoutResult = await payoutResponse.json();

      if (!payoutResponse.ok) {
        console.error('PayPal payout failed:', payoutResult);
        // Mark as approved but failed to pay (admin will need to retry)
        await supabase
          .from('receipts')
          .update({
            status: 'approved',
            admin_notes: `Auto-approved but payout failed: ${payoutResult.error}. Please retry manually.`,
          })
          .eq('id', receiptId);

        return NextResponse.json({
          autoApproved: true,
          payoutSuccess: false,
          error: 'Receipt approved but payout failed. Admin will process payment.',
          confidenceScore: fraudScore.score,
        });
      }

      // Success! Increment daily counter
      incrementDailyCounter();

      return NextResponse.json({
        autoApproved: true,
        payoutSuccess: true,
        confidenceScore: fraudScore.score,
        payoutId: payoutResult.payoutId,
        amount: payoutResult.amount,
        message: `Receipt auto-approved and paid instantly! $${payoutResult.amount.toFixed(2)} sent to ${payoutResult.paypalEmail}`,
      });

    } else {
      // FLAG FOR MANUAL REVIEW PATH
      console.log(`⚠️ Flagging receipt ${receiptId} for review: ${fraudScore.reviewReason}`);

      // Update receipt with review flag
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          status: 'pending',
          auto_approved: false,
          confidence_score: fraudScore.score,
          review_reason: fraudScore.reviewReason,
          admin_notes: `Flagged for manual review: ${fraudScore.reviewReason}`,
        })
        .eq('id', receiptId);

      if (updateError) {
        console.error('Database update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update receipt status' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        autoApproved: false,
        requiresManualReview: true,
        confidenceScore: fraudScore.score,
        reviewReason: fraudScore.reviewReason,
        message: 'Receipt submitted for manual review. You will be notified once approved.',
      });
    }
  } catch (error) {
    console.error('Auto-approval error:', error);
    return NextResponse.json(
      {
        error: 'Auto-approval failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallbackToManual: true,
      },
      { status: 500 }
    );
  }
}
