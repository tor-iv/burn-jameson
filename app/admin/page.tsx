"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface PendingReceipt {
  id: string;
  session_id: string;
  image_url: string;
  paypal_email: string;
  uploaded_at: string;
  rebate_amount: number;
  bottle_scans?: {
    bottle_image?: string;
    detected_brand?: string;
    confidence?: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<PendingReceipt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isAuthenticated || receipts.length === 0) return;

      if (e.key === 'a' || e.key === 'A') handleApprove();
      if (e.key === 'r' || e.key === 'R') handleReject();
      if (e.key === 'ArrowRight') setCurrentIndex(prev => Math.min(prev + 1, receipts.length - 1));
      if (e.key === 'ArrowLeft') setCurrentIndex(prev => Math.max(prev - 1, 0));
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, receipts, isAuthenticated]);

  const checkAuth = async () => {
    // Simple password protection for MVP
    const password = prompt("Enter admin password:");
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";

    if (password === adminPassword) {
      setIsAuthenticated(true);
      await loadPendingReceipts();
    } else {
      alert("Invalid password");
      router.push("/");
    }
  };

  const loadPendingReceipts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          *,
          bottle_scans!receipts_session_id_fkey (
            bottle_image,
            detected_brand,
            confidence
          )
        `)
        .eq('status', 'pending')
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error loading receipts:', error);
        alert('Failed to load receipts');
        return;
      }

      setReceipts(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Failed to load receipts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    const receipt = receipts[currentIndex];
    if (!receipt) return;

    const confirmPayout = confirm(
      `Send $${(receipt.rebate_amount || 5.00).toFixed(2)} to ${receipt.paypal_email}?`
    );

    if (!confirmPayout) return;

    try {
      // Step 1: Update status to approved
      const { error: approveError } = await supabase
        .from('receipts')
        .update({
          status: 'approved',
          admin_notes: 'Approved - processing payout'
        })
        .eq('id', receipt.id);

      if (approveError) {
        alert('Error approving receipt: ' + approveError.message);
        return;
      }

      // Step 2: Trigger PayPal payout via API
      const payoutResponse = await fetch('/api/paypal-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: receipt.id,
          paypalEmail: receipt.paypal_email,
          amount: receipt.rebate_amount || 5.00,
        }),
      });

      const payoutResult = await payoutResponse.json();

      if (!payoutResponse.ok) {
        alert(`Payout failed: ${payoutResult.error}\n\nReceipt marked as approved but payment not sent. Please retry or process manually.`);
        return;
      }

      alert(`✓ Payout sent!\n\nAmount: $${payoutResult.amount}\nEmail: ${payoutResult.paypalEmail}\nPayout ID: ${payoutResult.payoutId}\n\nFunds will arrive in 1-2 business days.`);

      // Remove from pending list
      const updatedReceipts = receipts.filter((_, index) => index !== currentIndex);
      setReceipts(updatedReceipts);

      // Adjust index if needed
      if (currentIndex >= updatedReceipts.length && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch (error) {
      console.error('Payout error:', error);
      alert('Failed to process payout: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleReject = async () => {
    const receipt = receipts[currentIndex];
    if (!receipt) return;

    const reason = prompt("Reason for rejection:");
    if (!reason) return;

    const { error } = await supabase
      .from('receipts')
      .update({
        status: 'rejected',
        admin_notes: reason
      })
      .eq('id', receipt.id);

    if (error) {
      alert('Error rejecting receipt: ' + error.message);
      return;
    }

    // Remove from list
    const updatedReceipts = receipts.filter((_, index) => index !== currentIndex);
    setReceipts(updatedReceipts);

    // Adjust index if needed
    if (currentIndex >= updatedReceipts.length && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-cream text-2xl">Loading receipts...</div>
      </div>
    );
  }

  const receipt = receipts[currentIndex];

  if (!receipt) {
    return (
      <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center gap-6">
        <div className="text-cream text-2xl">No pending receipts</div>
        <Button onClick={loadPendingReceipts} variant="outline">
          Refresh
        </Button>
      </div>
    );
  }

  const bottleScan = Array.isArray(receipt.bottle_scans)
    ? receipt.bottle_scans[0]
    : receipt.bottle_scans;

  return (
    <div className="min-h-screen bg-charcoal p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-cream">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-cream/70">
              {currentIndex + 1} / {receipts.length} pending
            </div>
            <Button onClick={loadPendingReceipts} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-charcoal/50 border-2 border-whiskey-amber/30 rounded-2xl p-4 md:p-8">
          {/* Session Info */}
          <div className="mb-6 text-cream/70 space-y-1">
            <div className="font-mono text-sm">Session: {receipt.session_id}</div>
            <div>Uploaded: {new Date(receipt.uploaded_at).toLocaleString()}</div>
            <div>PayPal: <span className="text-whiskey-amber font-semibold">{receipt.paypal_email}</span></div>
            <div>Amount: <span className="text-green-400 font-semibold">${receipt.rebate_amount?.toFixed(2) || '5.00'}</span></div>
          </div>

          {/* Images Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8">
            {/* Bottle Image */}
            {bottleScan?.bottle_image && (
              <div>
                <h3 className="text-cream font-bold mb-3">Bottle Scan</h3>
                <div className="relative w-full h-64 md:h-96 bg-black rounded-lg overflow-hidden">
                  <Image
                    src={bottleScan.bottle_image}
                    alt="Bottle"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="mt-2 text-cream/70 text-sm">
                  {bottleScan.detected_brand || 'Unknown'} ({Math.round((bottleScan.confidence || 0) * 100)}% confidence)
                </div>
              </div>
            )}

            {/* Receipt Image */}
            <div>
              <h3 className="text-cream font-bold mb-3">Receipt</h3>
              <div className="relative w-full h-64 md:h-96 bg-black rounded-lg overflow-hidden">
                <Image
                  src={receipt.image_url}
                  alt="Receipt"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-4">
            <Button
              onClick={handleApprove}
              size="lg"
              className="flex-1 text-xl py-6 bg-green-600 hover:bg-green-700"
            >
              ✓ Approve & Pay (A)
            </Button>
            <Button
              onClick={handleReject}
              size="lg"
              variant="outline"
              className="flex-1 text-xl py-6 border-red-500 text-red-500 hover:bg-red-500/10"
            >
              ✗ Reject (R)
            </Button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="mt-6 text-center text-cream/50 text-sm">
            Keyboard: A = Approve, R = Reject, → = Next, ← = Previous
          </div>
        </div>
      </div>
    </div>
  );
}
