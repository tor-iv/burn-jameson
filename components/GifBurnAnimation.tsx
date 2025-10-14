"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BurnAnimationProps {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
}

export default function GifBurnAnimation({ boundingBox, imageUrl }: BurnAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Stop animation after 5 seconds
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!imageUrl) {
    return null;
  }

  // Convert normalized coordinates to viewport percentages
  const containerStyle = {
    position: "absolute" as const,
    left: `${boundingBox.x * 100}%`,
    top: `${boundingBox.y * 100}%`,
    width: `${boundingBox.width * 100}%`,
    height: `${boundingBox.height * 100}%`,
    pointerEvents: "none" as const,
    zIndex: 10,
  };

  return (
    <div style={containerStyle}>
      <AnimatePresence>
        {isAnimating && (
          <>
            {/* Main fire layer - travels from bottom to top */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: "-20%" }}
              transition={{
                duration: 5,
                ease: "linear",
              }}
              className="absolute inset-0"
              style={{
                mixBlendMode: "screen",
              }}
            >
              <img
                src="/animations/fire.gif"
                alt=""
                className="w-full h-full object-cover"
                style={{
                  filter: "brightness(1.3) contrast(1.2)",
                }}
              />
            </motion.div>

            {/* Left edge fire */}
            <motion.div
              initial={{ opacity: 0, x: "-10%" }}
              animate={{ opacity: [0, 1, 1, 0.8], x: ["-10%", "0%", "0%", "5%"] }}
              transition={{
                duration: 5,
                times: [0, 0.2, 0.7, 1],
              }}
              className="absolute left-0 top-0 bottom-0"
              style={{
                width: "40%",
                mixBlendMode: "screen",
              }}
            >
              <img
                src="/animations/fire.gif"
                alt=""
                className="w-full h-full object-cover"
                style={{
                  filter: "brightness(1.2) hue-rotate(10deg)",
                  transform: "scaleX(-1)",
                }}
              />
            </motion.div>

            {/* Right edge fire */}
            <motion.div
              initial={{ opacity: 0, x: "10%" }}
              animate={{ opacity: [0, 1, 1, 0.8], x: ["10%", "0%", "0%", "-5%"] }}
              transition={{
                duration: 5,
                times: [0, 0.2, 0.7, 1],
              }}
              className="absolute right-0 top-0 bottom-0"
              style={{
                width: "40%",
                mixBlendMode: "screen",
              }}
            >
              <img
                src="/animations/fire.gif"
                alt=""
                className="w-full h-full object-cover"
                style={{
                  filter: "brightness(1.2) hue-rotate(-10deg)",
                }}
              />
            </motion.div>

            {/* Intense center fire */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0, 0.8, 0.9, 0.7],
                scale: [0.8, 1, 1.1, 1],
              }}
              transition={{
                duration: 5,
                times: [0, 0.3, 0.6, 1],
              }}
              className="absolute inset-0"
              style={{
                mixBlendMode: "screen",
              }}
            >
              <img
                src="/animations/fire.gif"
                alt=""
                className="w-full h-full object-cover"
                style={{
                  filter: "brightness(1.5) saturate(1.3)",
                }}
              />
            </motion.div>

            {/* Burn-through darkening overlay */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: "-20%" }}
              transition={{
                duration: 5,
                ease: "linear",
              }}
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent"
              style={{
                mixBlendMode: "multiply",
              }}
            />

            {/* Orange glow overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.6, 0.8, 0.5],
              }}
              transition={{
                duration: 5,
                times: [0, 0.3, 0.6, 1],
              }}
              className="absolute inset-0"
              style={{
                background: "radial-gradient(circle, rgba(255,140,0,0.4) 0%, transparent 70%)",
                mixBlendMode: "screen",
              }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
