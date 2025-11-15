"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BurnAnimationProps } from "@/types/animations";

// Extended props for internal use (includes optional morph-related props)
interface SpinRevealAnimationProps extends BurnAnimationProps {
  morphedImageUrl?: string | null;
  onRequestMorph?: () => void;
  onComplete?: () => void;
}

/**
 * CSS 3D Transform-based spin reveal animation
 * Fallback for devices without WebGL support or lower performance tier
 *
 * Animation sequence (4 seconds total):
 * 1. Spin bottle 360 degrees (0-2.4s)
 * 2. Signal burn complete at 60% (2.4s)
 * 3. Continue spin while revealing morphed image (2.4-4s)
 * 4. Complete and show final state
 */
export default function SpinRevealAnimation({
  boundingBox,
  imageUrl,
  morphedImageUrl,
  onComplete,
  onRequestMorph,
  onBurnComplete,
}: SpinRevealAnimationProps) {
  const [phase, setPhase] = useState<'spinning' | 'revealing' | 'complete'>('spinning');
  const [showMorphed, setShowMorphed] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCroppedImage = useRef(false);
  const hasRequestedMorph = useRef(false);
  const hasCalledBurnComplete = useRef(false);
  const hasCalledComplete = useRef(false);

  // Get container dimensions for converting normalized coordinates to pixels
  useEffect(() => {
    if (containerRef.current) {
      const updateDimensions = () => {
        if (containerRef.current) {
          setContainerDimensions({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight,
          });
        }
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, []);

  // Convert normalized bounding box (0-1) to pixel coordinates
  const pixelBoundingBox = {
    x: boundingBox.x * containerDimensions.width,
    y: boundingBox.y * containerDimensions.height,
    width: boundingBox.width * containerDimensions.width,
    height: boundingBox.height * containerDimensions.height,
  };

  // Extract bottle from original image using bounding box
  useEffect(() => {
    if (hasCroppedImage.current || !pixelBoundingBox.width || !pixelBoundingBox.height) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Set canvas size to bounding box dimensions
      canvas.width = pixelBoundingBox.width;
      canvas.height = pixelBoundingBox.height;

      // Draw the cropped bottle portion
      ctx.drawImage(
        img,
        pixelBoundingBox.x,
        pixelBoundingBox.y,
        pixelBoundingBox.width,
        pixelBoundingBox.height,
        0,
        0,
        pixelBoundingBox.width,
        pixelBoundingBox.height
      );

      hasCroppedImage.current = true;
      console.log('[SpinRevealAnimation] Bottle cropped and ready');
    };
    img.src = imageUrl;
  }, [imageUrl, pixelBoundingBox.x, pixelBoundingBox.y, pixelBoundingBox.width, pixelBoundingBox.height]);

  // Request morph image early
  useEffect(() => {
    if (!hasRequestedMorph.current && onRequestMorph) {
      hasRequestedMorph.current = true;
      console.log('[SpinRevealAnimation] Requesting morph image...');
      onRequestMorph();
    }
  }, [onRequestMorph]);

  // Animation timeline
  useEffect(() => {
    const totalDuration = 4000; // 4 seconds
    const burnCompleteTime = totalDuration * 0.6; // 2.4 seconds (60%)

    // Signal burn complete at 60%
    const burnTimer = setTimeout(() => {
      if (!hasCalledBurnComplete.current && onBurnComplete) {
        hasCalledBurnComplete.current = true;
        console.log('[SpinRevealAnimation] ✅ Burn phase complete at T=2.4s');
        onBurnComplete();

        // If we have morphed image, prepare to reveal
        if (morphedImageUrl) {
          setPhase('revealing');
          setShowMorphed(true);
        }
      }
    }, burnCompleteTime);

    // Complete animation at 100%
    const completeTimer = setTimeout(() => {
      setPhase('complete');

      if (!hasCalledComplete.current && onComplete) {
        hasCalledComplete.current = true;
        console.log('[SpinRevealAnimation] ✅ Animation complete at T=4s');
        onComplete();
      }
    }, totalDuration);

    return () => {
      clearTimeout(burnTimer);
      clearTimeout(completeTimer);
    };
  }, [morphedImageUrl, onBurnComplete, onComplete]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black">
      {/* Background: Original full image (darkened) */}
      <div className="absolute inset-0 opacity-30">
        <img
          src={imageUrl}
          alt="Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Spinning bottle container */}
      <div
        className="absolute"
        style={{
          left: `${pixelBoundingBox.x}px`,
          top: `${pixelBoundingBox.y}px`,
          width: `${pixelBoundingBox.width}px`,
          height: `${pixelBoundingBox.height}px`,
          perspective: '1000px',
        }}
      >
        {/* Competitor bottle (spinning out) */}
        <AnimatePresence>
          {!showMorphed && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transformStyle: 'preserve-3d',
              }}
              initial={{ rotateY: 0 }}
              animate={{
                rotateY: 360,
              }}
              exit={{
                rotateY: 360,
                opacity: 0,
              }}
              transition={{
                duration: 4,
                ease: 'linear',
              }}
            >
              <img
                src={imageUrl}
                alt="Competitor bottle"
                className="w-full h-full object-contain"
                style={{
                  objectPosition: `${-pixelBoundingBox.x}px ${-pixelBoundingBox.y}px`,
                  objectFit: 'none',
                  width: `${pixelBoundingBox.width}px`,
                  height: `${pixelBoundingBox.height}px`,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Morphed bottle (spinning in) */}
        <AnimatePresence>
          {showMorphed && morphedImageUrl && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transformStyle: 'preserve-3d',
              }}
              initial={{
                rotateY: 180,
                opacity: 0,
              }}
              animate={{
                rotateY: 360,
                opacity: 1,
              }}
              transition={{
                duration: 1.6, // Remaining 40% of 4s
                ease: 'linear',
              }}
            >
              <img
                src={morphedImageUrl}
                alt="Keeper's Heart bottle"
                className="w-full h-full object-contain"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Particle effects overlay (simple CSS animation) */}
      {phase === 'spinning' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-orange-500/10 to-transparent animate-pulse" />
        </div>
      )}

      {/* Phase indicator (debug - remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm font-mono">
          Phase: {phase}
          {morphedImageUrl && ' | Morph ready'}
        </div>
      )}
    </div>
  );
}
