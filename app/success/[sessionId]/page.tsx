"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { motion } from "framer-motion";

export default function SuccessPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const handleUploadReceipt = () => {
    router.push(`/upload/${sessionId}`);
  };

  const handleUploadLater = () => {
    // Copy session URL to clipboard
    const url = `${window.location.origin}/upload/${sessionId}`;
    navigator.clipboard.writeText(url);
    alert("Link copied! You can upload your receipt later.");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal via-charcoal to-black flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Ambient background glow effects */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-whiskey-amber/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-emerald/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-6 relative z-10"
      >
        {/* Keeper's Heart Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="bg-cream/10 backdrop-blur-sm rounded-2xl px-8 py-4 border border-whiskey-amber/30 shadow-xl">
            <img
              src="/images/logo.png"
              alt="Keeper's Heart"
              className="h-20 w-auto"
            />
          </div>
        </motion.div>

        {/* Success Check */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald to-emerald/80 mx-auto shadow-2xl shadow-emerald/50"
        >
          <span className="text-5xl text-white">✓</span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <h1 className="font-playfair text-5xl md:text-6xl font-bold text-cream">
            You Burned It!
          </h1>
          <p className="text-whiskey-amber text-xl font-semibold">
            Now taste the difference
          </p>
        </motion.div>

        {/* Decorative divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-32 h-1 bg-gradient-to-r from-transparent via-whiskey-amber to-transparent mx-auto"
        />

        {/* Body Copy */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4 bg-cream/5 backdrop-blur-sm rounded-2xl p-6 border border-cream/10"
        >
          <p className="text-2xl text-cream font-semibold leading-relaxed">
            Buy Keeper's Heart whiskey
          </p>
          <p className="text-xl text-whiskey-amber font-bold">
            Get <span className="text-3xl">$5</span> back
          </p>
          <p className="text-base text-cream/70">
            Upload your receipt to claim your rebate
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-4 pt-6"
        >
          <Button
            onClick={handleUploadReceipt}
            size="lg"
            className="w-full text-xl py-7 h-auto font-bold bg-gradient-to-r from-whiskey-amber to-copper hover:from-copper hover:to-whiskey-amber border-2 border-whiskey-amber/50 shadow-2xl shadow-whiskey-amber/30 transform hover:scale-105 transition-all duration-200"
          >
            Upload Receipt Now
          </Button>

          <button
            onClick={handleUploadLater}
            className="text-cream/60 text-base hover:text-cream transition-colors underline decoration-whiskey-amber/50 hover:decoration-whiskey-amber"
          >
            I'll upload later
          </button>
        </motion.div>

        {/* Bottom tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-cream/40 text-sm italic pt-4"
        >
          Keeper's Heart - Whiskey Worth Burning For
        </motion.p>
      </motion.div>
    </div>
  );
}
