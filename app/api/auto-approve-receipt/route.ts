import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/auto-approve-receipt
 *
 * Checks if a newly uploaded receipt meets auto-approval criteria:
 * - Confidence score >= 80%
 * - Valid Keeper's Heart purchase
 * - All receipt validation checks passed
 *
 * If approved automatically:
 * - Updates receipt status to 'approved'
 * - Sets auto_approved = true
 * - Triggers PayPal payout immediately
 *
 * If confidence < 80%:
 * - Keeps status as 'pending' for manual admin review
 * - Logs review_reason for admin visibility
 */

interface AutoApprovalRequest {
  receiptId: string;
  validationResult: {
    isValid: boolean;
    confidence: number;
    hasKeepersHeart: boolean;
    errors: string[];
  };
}

// Helper function to trigger PayPal payout
async function triggerPayout(receiptId: string, paypalEmail: string, amount: number) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/paypal-payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiptId,
        paypalEmail,
        amount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Payout failed');
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Auto-payout error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { receiptId, validationResult }: AutoApprovalRequest = await request.json();

    // Validate inputs
    if (!receiptId || !validationResult) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get receipt from database
    const { data: receipt, error: fetchError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (fetchError || !receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Check if already approved
    if (receipt.status !== 'pending') {
      return NextResponse.json(
        { error: 'Receipt already processed', status: receipt.status },
        { status: 400 }
      );
    }

    const { isValid, confidence, hasKeepersHeart, errors } = validationResult;
    const confidenceThreshold = 0.80; // 80% confidence required for auto-approval

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 AUTO-APPROVAL CHECK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Receipt ID:', receiptId);
    console.log('Confidence Score:', `${(confidence * 100).toFixed(1)}%`);
    console.log('Is Valid:', isValid);
    console.log('Has Keeper\'s Heart:', hasKeepersHeart);
    console.log('Threshold:', `${(confidenceThreshold * 100)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Determine if auto-approval criteria are met
    const shouldAutoApprove = isValid && confidence >= confidenceThreshold && hasKeepersHeart;

    if (shouldAutoApprove) {
      console.log('✅ AUTO-APPROVAL: APPROVED');

      // Update receipt to approved status
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          status: 'approved',
          auto_approved: true,
          confidence_score: confidence,
          auto_approved_at: new Date().toISOString(),
          admin_notes: `Auto-approved with ${(confidence * 100).toFixed(1)}% confidence`,
        })
        .eq('id', receiptId);

      if (updateError) {
        console.error('❌ Failed to update receipt:', updateError);
        return NextResponse.json(
          { error: 'Failed to update receipt', details: updateError.message },
          { status: 500 }
        );
      }

      // Trigger automatic payout
      try {
        const payoutResult = await triggerPayout(
          receiptId,
          receipt.paypal_email,
          receipt.rebate_amount || 5.00
        );

        console.log('✅ Auto-payout triggered successfully:', payoutResult.payoutId);

        return NextResponse.json({
          success: true,
          autoApproved: true,
          confidence,
          payoutTriggered: true,
          payoutId: payoutResult.payoutId,
          message: 'Receipt auto-approved and payout initiated',
        });
      } catch (payoutError) {
        // Payout failed, but receipt is still approved for manual retry
        console.error('⚠️ Auto-payout failed, but receipt remains approved:', payoutError);

        // Add note to receipt
        await supabase
          .from('receipts')
          .update({
            admin_notes: `${receipt.admin_notes}\n[${new Date().toISOString()}] Auto-payout failed: ${payoutError instanceof Error ? payoutError.message : 'Unknown error'}. Requires manual payout.`,
          })
          .eq('id', receiptId);

        return NextResponse.json({
          success: true,
          autoApproved: true,
          confidence,
          payoutTriggered: false,
          payoutError: payoutError instanceof Error ? payoutError.message : 'Unknown error',
          message: 'Receipt auto-approved but payout failed. Admin will process manually.',
        });
      }
    } else {
      // Confidence too low or validation failed - needs manual review
      console.log('⚠️ AUTO-APPROVAL: REQUIRES MANUAL REVIEW');

      const reviewReasons: string[] = [];

      if (!isValid) {
        reviewReasons.push('Failed validation checks');
      }
      if (!hasKeepersHeart) {
        reviewReasons.push('Keeper\'s Heart not clearly detected');
      }
      if (confidence < confidenceThreshold) {
        reviewReasons.push(`Low confidence (${(confidence * 100).toFixed(1)}% < ${(confidenceThreshold * 100)}%)`);
      }
      if (errors.length > 0) {
        reviewReasons.push(...errors);
      }

      const reviewReason = reviewReasons.join('; ');

      // Update receipt with confidence score and review reason
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          auto_approved: false,
          confidence_score: confidence,
          review_reason: reviewReason,
          admin_notes: `Requires manual review: ${reviewReason}`,
        })
        .eq('id', receiptId);

      if (updateError) {
        console.error('❌ Failed to update receipt:', updateError);
      }

      console.log('📋 Review Reason:', reviewReason);

      return NextResponse.json({
        success: true,
        autoApproved: false,
        requiresManualReview: true,
        confidence,
        reviewReason,
        message: 'Receipt requires manual admin review',
      });
    }
  } catch (error) {
    console.error('❌ Auto-approval error:', error);
    return NextResponse.json(
      {
        error: 'Auto-approval check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
