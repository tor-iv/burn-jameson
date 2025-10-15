'use client';

import { useEffect, useRef, useState } from 'react';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SimpleBottleMorphProps {
  capturedImage: string; // base64 data URL of the original photo
  boundingBox?: BoundingBox;
  onComplete?: () => void;
  duration?: number; // Cross-fade duration in milliseconds (default: 2000)
  preloadedImage?: string | null; // Optional preloaded transformed image
}

export default function SimpleBottleMorph({
  capturedImage,
  boundingBox, // Note: Not used in simplified version, but kept for API compatibility
  onComplete,
  duration = 2000,
  preloadedImage,
}: SimpleBottleMorphProps) {
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error] = useState<string | null>(null); // Kept for future error handling
  const [opacity, setOpacity] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const hasInitialized = useRef<boolean>(false);
  const onCompleteRef = useRef<(() => void) | undefined>(onComplete);
  const opacityRef = useRef<number>(0); // Use ref to avoid re-renders during animation

  // Update onComplete ref when it changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // MAIN EFFECT: Use preloaded image when available
  useEffect(() => {
    if (!preloadedImage || hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    // Set the transformed image immediately
    setTransformedImage(preloadedImage);
    setIsGenerating(false);
  }, [preloadedImage]);

  // ANIMATION EFFECT: Start animation after image is rendered
  useEffect(() => {
    // Only run if we have the transformed image and we're not generating
    if (!transformedImage || isGenerating || animationComplete) {
      return;
    }

    // Wait for next tick to ensure DOM has updated with the image element
    const timeoutId = setTimeout(() => {
      const startTime = Date.now();
      const transformedImg = document.getElementById('transformed-bottle-img') as HTMLImageElement;

      if (!transformedImg) {
        console.error('[SIMPLE MORPH] Could not find transformed image element');
        return;
      }

      function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        opacityRef.current = progress;

        // Update DOM directly to avoid re-renders
        if (transformedImg) {
          transformedImg.style.opacity = progress.toString();
        }

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setAnimationComplete(true);
          setOpacity(1); // Final state update
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
        }
      }

      animate();
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [transformedImage, isGenerating, duration, animationComplete]);

  return (
    <div className="relative w-full h-full bg-black">
      {isGenerating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/80">
          <div className="text-white text-center space-y-4 p-8">
            <div className="text-2xl font-bold">Transforming Bottle...</div>
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-sm text-gray-300">
              Creating Keeper's Heart bottle
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/90">
          <div className="text-white text-center space-y-4 p-8">
            <div className="text-2xl font-bold text-red-500">Error</div>
            <div className="text-sm">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Original image (always show as base layer) */}
      {capturedImage && !isGenerating && (
        <img
          src={capturedImage}
          alt="Original bottle"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      )}

      {/* Transformed image (fades in over original) */}
      {transformedImage && !isGenerating && (
        <img
          id="transformed-bottle-img"
          src={transformedImage}
          alt="Keeper's Heart bottle"
          className="absolute inset-0 w-full h-full object-cover z-10"
          style={{ opacity: 0 }}
        />
      )}
    </div>
  );
}
