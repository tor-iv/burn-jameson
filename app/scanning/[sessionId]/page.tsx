"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

export default function ScanningPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  useEffect(() => {
    // Vibrate on load
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // Prefetch next screen during animation
    router.prefetch(`/success/${sessionId}`);

    // Auto-navigate after burn animation completes (2.5s)
    const timer = setTimeout(() => {
      router.push(`/success/${sessionId}`);
    }, 2500);

    return () => clearTimeout(timer);
  }, [router, sessionId]);

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Bottle Image (placeholder - would be actual captured image) */}
      <div className="relative z-10">
        <div className="w-64 h-96 bg-gradient-to-b from-amber-900 to-amber-700 rounded-lg opacity-80" />
      </div>

      {/* Fire/Burn Overlay Animation */}
      <motion.div
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [1.2, 1, 1, 0.8],
        }}
        transition={{ duration: 2.5, times: [0, 0.2, 0.8, 1] }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, #ff6b00, #ff0000, #ffaa00)",
          mixBlendMode: "screen",
          filter: "blur(40px)",
        }}
      />

      {/* Animated particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            opacity: 0,
            x: Math.random() * 400 - 200,
            y: 100,
          }}
          animate={{
            opacity: [0, 1, 0],
            y: -200,
            x: Math.random() * 400 - 200 + (Math.random() - 0.5) * 100,
          }}
          transition={{
            duration: 2,
            delay: Math.random() * 0.5,
            ease: "easeOut",
          }}
          className="absolute w-2 h-2 bg-orange-500 rounded-full"
          style={{
            left: "50%",
            top: "50%",
          }}
        />
      ))}

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -10] }}
        transition={{ duration: 2.5, times: [0, 0.2, 0.8, 1] }}
        className="absolute bottom-32 left-0 right-0 text-center"
      >
        <p className="text-white text-2xl font-bold drop-shadow-lg">
          Burning that ad...
        </p>
      </motion.div>
    </div>
  );
}
