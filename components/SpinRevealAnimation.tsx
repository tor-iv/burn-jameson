"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";

interface SpinRevealAnimationProps {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
  onComplete?: () => void;
}

export default function SpinRevealAnimation({
  boundingBox,
  imageUrl,
  onComplete
}: SpinRevealAnimationProps) {
  const [keepersImage, setKeepersImage] = useState<string>('');
  const controls = useAnimation();
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    // Load Keeper's Heart reference image (placeholder - should be actual product image)
    // For now, we'll use a solid color overlay to represent the final bottle
    setKeepersImage('/keepers-heart-bottle.png'); // TODO: Add actual product image to public folder

    // Start spin animation
    const animate = async () => {
      await controls.start({
        rotateY: [0, 180, 360],
        transition: {
          duration: 4.0,
          ease: [0.43, 0.13, 0.23, 0.96], // Custom easing for smooth rotation
          times: [0, 0.5, 1], // Split animation into two halves
        }
      });

      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete?.();
      }
    };

    animate();
  }, [controls, onComplete]);

  // Convert normalized bounding box to percentage
  const boxStyle = {
    left: `${boundingBox.x * 100}%`,
    top: `${boundingBox.y * 100}%`,
    width: `${boundingBox.width * 100}%`,
    height: `${boundingBox.height * 100}%`,
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Original bottle image as background */}
      <img
        src={imageUrl}
        alt="Bottle"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Spinning bottle container positioned at bounding box */}
      <div
        className="absolute"
        style={{
          ...boxStyle,
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        }}
      >
        <motion.div
          animate={controls}
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front face: Original competitor bottle (0° to 180°) */}
          <motion.div
            className="absolute inset-0 bg-center bg-cover"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: `${-boundingBox.x * 100}% ${-boundingBox.y * 100}%`,
              backgroundSize: `${(1 / boundingBox.width) * 100}% ${(1 / boundingBox.height) * 100}%`,
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Add slight shadow/overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
          </motion.div>

          {/* Back face: Keeper's Heart bottle (180° to 360°) */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-amber-900/30 to-amber-950/40"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Keeper's Heart bottle placeholder */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Gold/amber background glow */}
              <div className="absolute inset-0 bg-gradient-radial from-amber-600/40 via-amber-800/20 to-transparent" />

              {/* Keeper's Heart bottle silhouette/icon */}
              <div className="relative z-10 flex flex-col items-center justify-center gap-2 text-amber-50">
                {/* Bottle shape using CSS */}
                <div className="relative w-16 h-32 sm:w-20 sm:h-40">
                  {/* Bottle cap */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-6 bg-gradient-to-b from-amber-700 to-amber-800 rounded-t-sm border-2 border-amber-600" />

                  {/* Bottle neck */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 w-6 h-8 bg-gradient-to-b from-amber-800 to-amber-900 border-2 border-amber-600" />

                  {/* Bottle body */}
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 w-16 h-24 bg-gradient-to-b from-amber-900 via-amber-950 to-amber-900 rounded-sm border-2 border-amber-600 shadow-2xl">
                    {/* Label */}
                    <div className="absolute inset-x-2 top-1/3 h-1/3 bg-amber-100/90 rounded-sm flex items-center justify-center">
                      <div className="text-amber-950 font-bold text-xs sm:text-sm text-center leading-tight">
                        Keeper's<br/>Heart
                      </div>
                    </div>

                    {/* Liquid inside */}
                    <div className="absolute inset-2 top-1/4 bg-gradient-to-b from-amber-600/60 to-amber-700/80 rounded-sm" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Vignette effect for dramatic focus */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60 pointer-events-none" />
    </div>
  );
}
