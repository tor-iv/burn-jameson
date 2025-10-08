"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface BurnAnimationProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function BurnAnimation({
  isActive,
  onComplete,
}: BurnAnimationProps) {
  const [flames, setFlames] = useState<number[]>([]);

  useEffect(() => {
    if (isActive) {
      // Generate random flame positions
      const flameCount = 20;
      setFlames(Array.from({ length: flameCount }, (_, i) => i));

      // Complete animation after 2.5 seconds
      const timer = setTimeout(() => {
        onComplete();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] pointer-events-none"
        >
          {/* Dark overlay that burns away */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 bg-black"
          />

          {/* Flames rising from bottom */}
          {flames.map((flame) => (
            <motion.div
              key={flame}
              initial={{
                bottom: "-100px",
                left: `${(flame / flames.length) * 100}%`,
                opacity: 1,
                scale: 0.5,
              }}
              animate={{
                bottom: "100%",
                opacity: [1, 1, 0],
                scale: [0.5, 1, 0.8],
              }}
              transition={{
                duration: 2,
                delay: flame * 0.05,
                ease: "easeOut",
              }}
              className="absolute"
            >
              <div
                className="w-16 h-24 rounded-full blur-xl"
                style={{
                  background: `radial-gradient(circle,
                    rgba(255, 140, 0, 0.9) 0%,
                    rgba(255, 69, 0, 0.7) 40%,
                    rgba(139, 0, 0, 0.4) 70%,
                    transparent 100%)`,
                }}
              />
            </motion.div>
          ))}

          {/* Central burn effect */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 3],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="relative"
            >
              {/* Orange glow */}
              <div
                className="w-96 h-96 rounded-full blur-3xl"
                style={{
                  background: `radial-gradient(circle,
                    rgba(255, 140, 0, 0.8) 0%,
                    rgba(255, 69, 0, 0.5) 40%,
                    transparent 70%)`,
                }}
              />
            </motion.div>
          </div>

          {/* Embers/particles */}
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={`ember-${i}`}
              initial={{
                top: "50%",
                left: "50%",
                opacity: 1,
              }}
              animate={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: 0,
              }}
              transition={{
                duration: 1.5 + Math.random(),
                delay: Math.random() * 0.5,
                ease: "easeOut",
              }}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: `rgba(255, ${140 + Math.random() * 60}, 0, 1)`,
                boxShadow: "0 0 8px rgba(255, 140, 0, 0.8)",
              }}
            />
          ))}

          {/* Success text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.5,
                  repeat: 2,
                  delay: 1.2,
                }}
              >
                <p className="text-6xl mb-4">🔥</p>
                <p className="text-white text-3xl font-playfair font-bold drop-shadow-lg">
                  Burned!
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
