"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";

interface CouponCardProps {
  code: string;
  expiresAt?: string;
}

export default function CouponCard({ code, expiresAt }: CouponCardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-auto"
    >
      <div className="text-center">
        <p className="text-charcoal/60 text-sm font-medium mb-2 uppercase tracking-wide">
          Your Coupon Code
        </p>

        {/* Coupon Code Display */}
        <div className="bg-oak border-2 border-whiskey-amber/30 rounded-xl p-6 mb-4">
          <p className="font-mono font-bold text-3xl text-charcoal tracking-wider">
            {code}
          </p>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="w-full tap-target bg-whiskey-amber hover:bg-whiskey-light text-cream font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
        >
          {isCopied ? (
            <>
              <Check className="w-5 h-5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copy Code
            </>
          )}
        </button>

        {/* Expiration */}
        {expiresAt && (
          <p className="text-charcoal/50 text-sm mt-4">
            Expires: {new Date(expiresAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-3 -left-3 w-6 h-6 border-t-4 border-l-4 border-whiskey-amber rounded-tl-lg" />
      <div className="absolute -top-3 -right-3 w-6 h-6 border-t-4 border-r-4 border-whiskey-amber rounded-tr-lg" />
      <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-4 border-l-4 border-whiskey-amber rounded-bl-lg" />
      <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-4 border-r-4 border-whiskey-amber rounded-br-lg" />
    </motion.div>
  );
}
