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
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-8"
      >
        {/* Success Check */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500 mx-auto"
        >
          <span className="text-4xl text-white">✓</span>
        </motion.div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-cream">
            Nice!
          </h1>
        </div>

        {/* Bottle Image */}
        <div className="py-4">
          <div className="w-48 h-64 mx-auto bg-gradient-to-b from-whiskey-amber to-copper rounded-lg shadow-xl" />
          {/* Replace with actual Keeper's Heart bottle image */}
        </div>

        {/* Body Copy */}
        <div className="space-y-3">
          <p className="text-xl text-cream/90 leading-relaxed">
            Now buy Keeper's Heart whiskey and get your <span className="font-bold text-whiskey-amber">$5 back</span>
          </p>
          <p className="text-base text-cream/70">
            Find it at your local liquor store
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-4 pt-4">
          <Button
            onClick={handleUploadReceipt}
            size="lg"
            className="w-full text-lg py-6 h-auto font-bold"
          >
            I bought it! Upload receipt
          </Button>

          <button
            onClick={handleUploadLater}
            className="text-cream/60 text-sm hover:text-cream transition-colors underline"
          >
            I'll upload later
          </button>
        </div>
      </motion.div>
    </div>
  );
}
