"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Share2, MapPin, Camera } from "lucide-react";
import CouponCard from "@/components/coupon-card";
import { getScanById, type LocalScan } from "@/lib/local-storage";

export default function RevealPage() {
  const router = useRouter();
  const params = useParams();
  const scanId = params.scanId as string;

  const [scan, setScan] = useState<LocalScan | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!scanId) {
      router.push("/intro");
      return;
    }

    const foundScan = getScanById(scanId);
    if (!foundScan) {
      router.push("/intro");
      return;
    }

    setScan(foundScan);
    setShowConfetti(true);

    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [scanId, router]);

  if (!scan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-charcoal text-xl">Loading...</div>
      </div>
    );
  }

  // Calculate expiration (14 days from scan)
  const expiresAt = new Date(scan.scannedAt);
  expiresAt.setDate(expiresAt.getDate() + 14);

  return (
    <div className="min-h-screen bg-cream py-12 px-6 relative overflow-hidden">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                top: "-10%",
                left: `${Math.random() * 100}%`,
                rotate: 0,
              }}
              animate={{
                top: "110%",
                rotate: 360,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: "linear",
              }}
              className="absolute"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: [
                    "#B8860B",
                    "#CD853F",
                    "#2C5F2D",
                    "#B87333",
                  ][Math.floor(Math.random() * 4)],
                }}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-playfair font-bold text-charcoal mb-2">
            🎉 Success! 🎉
          </h1>
          <p className="text-charcoal/70 text-lg">
            You've unlocked an exclusive reward
          </p>
        </motion.div>

        {/* Product Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative w-64 h-80 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-whiskey-amber to-copper rounded-3xl opacity-20 blur-2xl" />
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Placeholder for bottle image */}
              <div className="w-40 h-64 bg-gradient-to-b from-whiskey-light to-whiskey-amber rounded-3xl flex items-center justify-center shadow-2xl">
                <p className="text-cream text-sm font-bold rotate-[-15deg] text-center px-4">
                  Keeper's Heart
                  <br />
                  Whiskey
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Offer Details */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <p className="text-2xl font-playfair text-charcoal mb-2">
            You've Unlocked
          </p>
          <p className="text-5xl font-playfair font-bold text-whiskey-amber mb-2">
            $5 OFF
          </p>
          <p className="text-lg text-charcoal/70">
            Any Keeper's Heart Whiskey
          </p>
        </motion.div>

        {/* Coupon Card */}
        <div className="mb-8 relative">
          <CouponCard code={scan.couponCode} expiresAt={expiresAt.toISOString()} />
        </div>

        {/* CTAs */}
        <div className="space-y-4 mb-12">
          <button
            onClick={() => window.open("https://keepersheart.com/find-us", "_blank")}
            className="w-full tap-target bg-whiskey-amber hover:bg-whiskey-light text-cream font-bold py-5 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 shadow-lg"
          >
            <MapPin className="w-5 h-5" />
            FIND RETAILERS
          </button>

          <button
            onClick={() => router.push("/scan")}
            className="w-full tap-target bg-transparent border-2 border-whiskey-amber text-whiskey-amber hover:bg-whiskey-amber/10 font-bold py-5 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
          >
            <Camera className="w-5 h-5" />
            SCAN AGAIN
          </button>
        </div>

        {/* Social Share */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <p className="text-charcoal/60 mb-4 flex items-center justify-center gap-2">
            Share Your Win <Share2 className="w-4 h-4" />
          </p>
          <div className="flex items-center justify-center gap-4">
            {["Twitter", "Facebook", "Instagram"].map((platform) => (
              <button
                key={platform}
                className="w-12 h-12 rounded-full bg-charcoal/10 hover:bg-charcoal/20 flex items-center justify-center transition-colors tap-target"
              >
                <span className="text-xs text-charcoal font-medium">
                  {platform[0]}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Receipt Upload CTA (for future) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 p-6 bg-emerald/10 rounded-xl border-2 border-emerald/30"
        >
          <p className="text-center text-emerald font-medium mb-2">
            💰 Get $5 Cash Back
          </p>
          <p className="text-center text-charcoal/70 text-sm mb-4">
            Upload your receipt after purchasing Keeper's Heart to receive a $5 rebate
          </p>
          <button
            onClick={() => router.push(`/upload/${scanId}`)}
            className="w-full tap-target bg-emerald text-cream font-bold py-3 px-6 rounded-xl hover:bg-emerald/90 transition-all duration-300 active:scale-95"
          >
            Upload Receipt
          </button>
        </motion.div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push("/intro")}
            className="text-charcoal/60 hover:text-charcoal text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
