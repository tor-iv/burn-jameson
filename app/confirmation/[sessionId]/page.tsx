"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

export default function ConfirmationPage() {
  const router = useRouter();
  const paypalEmail = typeof window !== "undefined" ? localStorage.getItem("kh_paypal_email") : null;

  useEffect(() => {
    // Trigger confetti animation
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#B8860B", "#CD853F", "#2C5F2D"],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#B8860B", "#CD853F", "#2C5F2D"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center space-y-8"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
          className="text-7xl mb-4"
        >
          🎉
        </motion.div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="font-playfair text-5xl md:text-6xl font-bold text-cream">
            All Set!
          </h1>
          <p className="text-xl text-cream/80 leading-relaxed">
            Your receipt is being reviewed
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-2 py-4">
          <p className="text-lg text-cream/90">
            You'll receive <span className="font-bold text-whiskey-amber">$5</span> via PayPal in 1-2 days
          </p>
        </div>

        {/* Pending Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-whiskey-amber/20 to-copper/20 border-2 border-whiskey-amber/30 rounded-2xl p-6"
        >
          <div className="text-3xl font-bold text-whiskey-amber mb-2 animate-pulse">
            $5 Pending
          </div>
          {paypalEmail && (
            <div className="text-cream/70">to {paypalEmail}</div>
          )}
        </motion.div>

        {/* CTA Buttons */}
        <div className="space-y-4 pt-6">
          <Button
            onClick={() => router.push("/")}
            size="lg"
            className="w-full text-lg py-6 h-auto font-bold"
          >
            Done
          </Button>

          <button
            onClick={() => router.push("/scan")}
            className="text-cream/60 text-base hover:text-cream transition-colors underline"
          >
            Scan another bottle
          </button>
        </div>
      </motion.div>
    </div>
  );
}
