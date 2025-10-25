"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Camera, ShoppingCart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useRef } from "react";
import { isTestModeEnabled, enableTestMode, disableTestMode } from "@/lib/test-mode";

export default function IntroPage() {
  const router = useRouter();
  const [skipIntro, setSkipIntro] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if test mode is already enabled
    setTestMode(isTestModeEnabled());

    // Preload camera permissions in background
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => stream.getTracks().forEach(t => t.stop()))
        .catch(() => {
          // Ignore errors during preload
        });
    }
  }, []);

  const handleStartScanning = () => {
    if (skipIntro) {
      localStorage.setItem('kh_seen_intro', 'true');
    }
    router.push('/scan');
  };

  const handleTitleClick = () => {
    // Triple-click to open password modal
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current === 3) {
      setShowPasswordModal(true);
      clickCountRef.current = 0;
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 500);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = enableTestMode(password);

    if (success) {
      setTestMode(true);
      setShowPasswordModal(false);
      setPassword("");
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  const handleDisableTestMode = () => {
    disableTestMode();
    setTestMode(false);
  };

  const steps = [
    {
      icon: Camera,
      emoji: "📸",
      number: "①",
      title: "Scan",
      description: "Point camera at Jameson bottle",
    },
    {
      icon: ShoppingCart,
      emoji: "🛒",
      number: "②",
      title: "Buy",
      description: "Purchase Keeper's Heart whiskey",
    },
    {
      icon: DollarSign,
      emoji: "💰",
      number: "③",
      title: "Get $5",
      description: "Upload receipt, get instant rebate",
    },
  ];

  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-12">
        {/* Test Mode Badge */}
        {testMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
              TEST MODE
              <button
                onClick={handleDisableTestMode}
                className="ml-1 hover:text-orange-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1
            className="font-playfair text-4xl md:text-5xl font-bold text-cream mb-8 cursor-pointer select-none"
            onClick={handleTitleClick}
          >
            How It Works
          </h1>
        </motion.div>

        {/* Steps */}
        <div className="space-y-10">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
              className="flex gap-6 items-start"
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-whiskey-amber flex items-center justify-center text-2xl">
                {step.emoji}
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-xl font-bold text-cream mb-1 flex items-center gap-2">
                  <span className="text-whiskey-amber">{step.number}</span>
                  {step.title}
                </h3>
                <p className="text-cream/80 text-base leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4 pt-6"
        >
          <Button
            onClick={handleStartScanning}
            size="lg"
            className="w-full text-xl py-6 h-auto font-bold tracking-wide"
          >
            Start Scanning
          </Button>

          {/* Skip intro checkbox */}
          <div className="flex items-center justify-center gap-2">
            <Checkbox
              id="skip-intro"
              checked={skipIntro}
              onCheckedChange={(checked) => setSkipIntro(checked)}
            />
            <label
              htmlFor="skip-intro"
              className="text-sm text-cream/70 cursor-pointer select-none"
            >
              Skip intro next time
            </label>
          </div>
        </motion.div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-charcoal border-2 border-whiskey-amber rounded-xl p-8 max-w-sm w-full mx-4"
          >
            <h2 className="text-2xl font-bold text-cream mb-4">Test Mode</h2>
            <p className="text-cream/70 text-sm mb-6">
              Enter password to enable test mode (bypass bottle detection)
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`w-full px-4 py-3 rounded-lg bg-black/40 border-2 text-cream placeholder:text-cream/30 focus:outline-none focus:border-whiskey-amber transition-colors ${
                  passwordError ? 'border-red-500 shake' : 'border-cream/20'
                }`}
                autoFocus
              />
              {passwordError && (
                <p className="text-red-400 text-sm">Incorrect password</p>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword("");
                    setPasswordError(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Enable
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
