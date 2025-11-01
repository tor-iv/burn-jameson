"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isTestModeEnabled, enableTestMode, disableTestMode, getMockReceiptData } from "@/lib/debug-mode";
import {
  getAnimationMode,
  setAnimationMode,
  getAvailableModes,
  getAnimationConfig,
  type AnimationMode,
} from "@/lib/animation-manager";

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
  const [autoApprovedReceipts, setAutoApprovedReceipts] = useState<PendingReceipt[]>([]);
  const [currentQueue, setCurrentQueue] = useState<'flagged' | 'auto-approved'>('flagged');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [testAmount, setTestAmount] = useState<string | null>(null);
  const [testModeActive, setTestModeActive] = useState(false);
  const [isCreatingTestReceipt, setIsCreatingTestReceipt] = useState(false);
  const [currentAnimationMode, setCurrentAnimationMode] = useState<AnimationMode>('ai-morph-simple');
  const [showAnimationSettings, setShowAnimationSettings] = useState(false);

  // Login form state
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if test payout amount is configured
  useEffect(() => {
    const checkTestAmount = async () => {
      try {
        const response = await fetch('/api/get-test-amount');
        if (response.ok) {
          const data = await response.json();
          setTestAmount(data.testAmount);
        }
      } catch (err) {
        // Ignore errors - just won't show test mode indicator
      }
    };

    if (isAuthenticated) {
      checkTestAmount();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    checkAuth();
  }, []);

  // Check test mode status on mount
  useEffect(() => {
    if (isAuthenticated) {
      setTestModeActive(isTestModeEnabled());
      setCurrentAnimationMode(getAnimationMode());
    }
  }, [isAuthenticated]);

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
    // Check if already authenticated (server-side session cookie)
    try {
      const authCheckResponse = await fetch('/api/admin/auth');
      const authCheck = await authCheckResponse.json();

      if (authCheck.authenticated) {
        setIsAuthenticated(true);
        await loadPendingReceipts();
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }

    // Not authenticated - show login form
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      // Authenticate with server (password checked server-side only!)
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (result.authenticated) {
        setIsAuthenticated(true);
        setIsLoading(true);
        await loadPendingReceipts();
      } else {
        setLoginError("Invalid password. Please try again.");
        setPassword('');
        // Trigger shake animation
        setTimeout(() => setLoginError(''), 3000);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setLoginError("Authentication failed. Please try again.");
      setPassword('');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadPendingReceipts = async () => {
    setIsLoading(true);
    try {
      // Load flagged receipts (pending + manual review needed)
      const { data: flaggedData, error: flaggedError } = await supabase
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

      if (flaggedError) {
        console.error('Error loading flagged receipts:', flaggedError);
        alert('Failed to load flagged receipts');
        return;
      }

      // Load recently auto-approved receipts (last 100 for audit trail)
      const { data: autoApprovedData, error: autoApprovedError } = await supabase
        .from('receipts')
        .select(`
          *,
          bottle_scans!receipts_session_id_fkey (
            bottle_image,
            detected_brand,
            confidence
          )
        `)
        .eq('auto_approved', true)
        .in('status', ['approved', 'paid'])
        .order('auto_approved_at', { ascending: false })
        .limit(100);

      if (autoApprovedError) {
        console.error('Error loading auto-approved receipts:', autoApprovedError);
        // Don't alert - auto-approved is optional view
      }

      setReceipts(flaggedData || []);
      setAutoApprovedReceipts(autoApprovedData || []);
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

  const handleToggleTestMode = () => {
    if (testModeActive) {
      disableTestMode();
      setTestModeActive(false);
    } else {
      const password = prompt("Enter test mode password:");
      if (password && enableTestMode(password)) {
        setTestModeActive(true);
      } else {
        alert("Invalid password");
      }
    }
  };

  const handleCreateTestReceipt = async () => {
    if (!testModeActive) return;

    setIsCreatingTestReceipt(true);
    try {
      const mockData = getMockReceiptData();

      // Insert bottle scan first
      const { data: bottleScanData, error: bottleError } = await supabase
        .from('bottle_scans')
        .insert([mockData.bottleScan])
        .select()
        .single();

      if (bottleError) {
        alert('Error creating test bottle scan: ' + bottleError.message);
        return;
      }

      // Insert receipt
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert([{
          ...mockData.receipt,
          image_url: mockData.receipt.receipt_image
        }])
        .select()
        .single();

      if (receiptError) {
        alert('Error creating test receipt: ' + receiptError.message);
        return;
      }

      alert(`✓ Test receipt created!\n\nSession: ${mockData.sessionId}\nPayPal: ${mockData.receipt.paypal_email}\n\nRefresh to see it in the list.`);

      // Reload receipts
      await loadPendingReceipts();
    } catch (error) {
      console.error('Test receipt creation error:', error);
      alert('Failed to create test receipt: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreatingTestReceipt(false);
    }
  };

  const handleAnimationModeChange = (mode: AnimationMode) => {
    setAnimationMode(mode);
    setCurrentAnimationMode(mode);
    console.log(`[ADMIN] Animation mode changed to: ${mode}`);
  };

  // Show login form if not authenticated
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-charcoal via-charcoal to-charcoal/90 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          {/* Login Card */}
          <div className="bg-charcoal/80 backdrop-blur-xl border-2 border-whiskey-amber/30 rounded-2xl shadow-2xl p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-block p-4 bg-whiskey-amber/10 rounded-full mb-4">
                <svg className="w-12 h-12 text-whiskey-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-cream mb-2">Admin Dashboard</h1>
              <p className="text-cream/60">Enter your password to continue</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-cream/80 text-sm font-semibold mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-charcoal/50 border-2 rounded-lg text-cream placeholder-cream/30 focus:outline-none focus:border-whiskey-amber transition-all ${
                      loginError ? 'border-red-500 animate-shake' : 'border-cream/20'
                    }`}
                    placeholder="Enter admin password"
                    autoFocus
                    required
                    disabled={isLoggingIn}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 hover:text-cream/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {loginError && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm text-center animate-fade-in">
                  {loginError}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoggingIn || !password}
                className="w-full py-4 bg-gradient-to-r from-whiskey-amber to-whiskey-amber/80 hover:from-whiskey-amber/90 hover:to-whiskey-amber/70 text-charcoal font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoggingIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  'Enter Admin Dashboard'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push("/")}
                className="text-cream/50 hover:text-cream/80 text-sm transition-colors"
              >
                ← Back to home
              </button>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="mt-4 text-center text-cream/30 text-xs">
            Keeper's Heart Admin Portal
          </div>
        </div>

        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }

          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }

          .animate-shake {
            animation: shake 0.4s ease-in-out;
          }
        `}</style>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-cream text-2xl">Loading receipts...</div>
      </div>
    );
  }

  // Get current queue receipts
  const currentQueueReceipts = currentQueue === 'flagged' ? receipts : autoApprovedReceipts;
  const receipt = currentQueueReceipts[currentIndex];

  if (!receipt) {
    return (
      <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center gap-6">
        <div className="text-cream text-2xl">
          {currentQueue === 'flagged' ? 'No receipts pending review' : 'No auto-approved receipts yet'}
        </div>
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
        {/* Test Mode Badge */}
        {testModeActive && (
          <div className="mb-4 bg-orange-500 text-white px-4 py-3 rounded-lg font-bold text-center flex items-center justify-between">
            <span>🧪 TEST MODE ACTIVE - Click to create test receipts for PayPal testing</span>
            <button
              onClick={handleToggleTestMode}
              className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
            >
              ✕ Disable
            </button>
          </div>
        )}

        {/* Test Amount Indicator */}
        {testAmount && (
          <div className="mb-4 bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-center">
            ⚠️ TEST MODE: Payouts set to ${parseFloat(testAmount).toFixed(2)} (not $5.00)
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1
            className="text-3xl font-bold text-cream cursor-pointer"
            onDoubleClick={handleToggleTestMode}
            title="Double-click to toggle test mode"
          >
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-4">
            {testModeActive && (
              <Button
                onClick={handleCreateTestReceipt}
                disabled={isCreatingTestReceipt}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                size="sm"
              >
                {isCreatingTestReceipt ? '🧪 Creating...' : '🧪 Create Test Receipt'}
              </Button>
            )}
            <div className="text-cream/70">
              {currentIndex + 1} / {currentQueueReceipts.length} {currentQueue === 'flagged' ? 'flagged' : 'auto-approved'}
            </div>
            <Button onClick={loadPendingReceipts} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>

        {/* Animation Settings Section */}
        <div className="mb-6 bg-charcoal/50 rounded-lg border border-cream/10 overflow-hidden">
          <button
            onClick={() => setShowAnimationSettings(!showAnimationSettings)}
            className="w-full px-6 py-4 flex items-center justify-between text-cream hover:bg-charcoal/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎬</span>
              <div className="text-left">
                <h2 className="font-bold text-lg">Animation Settings</h2>
                <p className="text-sm text-cream/60">Current: {getAnimationConfig(currentAnimationMode).name}</p>
              </div>
            </div>
            <span className="text-2xl">{showAnimationSettings ? '▼' : '▶'}</span>
          </button>

          {showAnimationSettings && (
            <div className="px-6 py-4 border-t border-cream/10">
              <p className="text-cream/80 mb-4 text-sm">
                Select the animation mode for bottle transformation effects. Changes apply immediately to new scans.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getAvailableModes().map((mode) => {
                  const config = getAnimationConfig(mode);
                  const isActive = currentAnimationMode === mode;

                  return (
                    <button
                      key={mode}
                      onClick={() => handleAnimationModeChange(mode)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isActive
                          ? 'border-whiskey-amber bg-whiskey-amber/10'
                          : 'border-cream/20 hover:border-cream/40 bg-charcoal/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-bold ${isActive ? 'text-whiskey-amber' : 'text-cream'}`}>
                          {config.name}
                        </h3>
                        {isActive && <span className="text-whiskey-amber">✓</span>}
                      </div>

                      <p className="text-sm text-cream/70 mb-3">{config.description}</p>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className={`px-2 py-1 rounded ${
                          config.performance === 'high' ? 'bg-green-500/20 text-green-400' :
                          config.performance === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {config.performance.toUpperCase()}
                        </span>

                        {config.costPerUse > 0 ? (
                          <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-400">
                            ${config.costPerUse.toFixed(2)}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                            FREE
                          </span>
                        )}

                        <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                          {(config.estimatedDuration / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-cream/5 rounded-lg border border-cream/10">
                <p className="text-xs text-cream/60">
                  <strong>Tip:</strong> Free animations (Burn to Coal, Spin Reveal, Melt Down) use Canvas/CSS and have no API costs.
                  AI-powered modes use Gemini API and cost $0.04-$0.31 per scan but provide the most realistic transformations.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Queue Selector Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => {
              setCurrentQueue('flagged');
              setCurrentIndex(0);
            }}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              currentQueue === 'flagged'
                ? 'bg-whiskey-amber text-charcoal'
                : 'bg-charcoal/50 text-cream/70 hover:bg-charcoal/70'
            }`}
          >
            ⚠️ Flagged for Review ({receipts.length})
          </button>
          <button
            onClick={() => {
              setCurrentQueue('auto-approved');
              setCurrentIndex(0);
            }}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              currentQueue === 'auto-approved'
                ? 'bg-whiskey-amber text-charcoal'
                : 'bg-charcoal/50 text-cream/70 hover:bg-charcoal/70'
            }`}
          >
            ✅ Auto-Approved ({autoApprovedReceipts.length})
          </button>
        </div>

        {/* Main Content */}
        <div className="bg-charcoal/50 border-2 border-whiskey-amber/30 rounded-2xl p-4 md:p-8">
          {/* Test Receipt Indicator */}
          {receipt.session_id.startsWith('kh-test-') && (
            <div className="mb-4 bg-orange-500/20 border-2 border-orange-500 text-orange-400 px-4 py-2 rounded-lg font-bold text-center">
              🧪 TEST RECEIPT - For PayPal API testing only
            </div>
          )}

          {/* Session Info */}
          <div className="mb-6 text-cream/70 space-y-1">
            <div className="font-mono text-sm">Session: {receipt.session_id}</div>
            <div>Uploaded: {new Date(receipt.uploaded_at).toLocaleString()}</div>
            <div>PayPal: <span className="text-whiskey-amber font-semibold">{receipt.paypal_email}</span></div>
            <div>Amount: <span className="text-green-400 font-semibold">${receipt.rebate_amount?.toFixed(2) || '5.00'}</span></div>
            {(receipt as any).confidence_score && (
              <div>
                Confidence Score: <span className={`font-semibold ${
                  (receipt as any).confidence_score >= 0.85 ? 'text-green-400' :
                  (receipt as any).confidence_score >= 0.7 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {((receipt as any).confidence_score * 100).toFixed(1)}%
                </span>
              </div>
            )}
            {(receipt as any).review_reason && (
              <div className="text-orange-400 mt-2">
                ⚠️ Review Reason: {(receipt as any).review_reason}
              </div>
            )}
            {(receipt as any).auto_approved && (
              <div className="text-green-400 mt-2">
                ✅ Auto-approved at {new Date((receipt as any).auto_approved_at).toLocaleString()}
              </div>
            )}
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

          {/* Action Buttons - Only show for flagged queue */}
          {currentQueue === 'flagged' ? (
            <>
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
            </>
          ) : (
            <>
              {/* Auto-approved receipts - read-only view */}
              <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/50 text-center">
                <div className="text-green-400 font-semibold">
                  ✅ This receipt was automatically approved and paid
                </div>
                {(receipt as any).paypal_payout_id && (
                  <div className="text-cream/70 text-sm mt-2">
                    PayPal Payout ID: {(receipt as any).paypal_payout_id}
                  </div>
                )}
              </div>

              {/* Navigation shortcuts */}
              <div className="mt-6 text-center text-cream/50 text-sm">
                Keyboard: → = Next, ← = Previous
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
