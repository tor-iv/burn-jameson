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
    console.log('[SIMPLE MORPH] ✅ Using preloaded image! Size:', preloadedImage.length, 'chars');

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

    console.log('[SIMPLE MORPH] 🎬 Starting cross-fade animation');

    // Wait for next tick to ensure DOM has updated with the image element
    const timeoutId = setTimeout(() => {
      const startTime = Date.now();
      const transformedImg = document.getElementById('transformed-bottle-img') as HTMLImageElement;

      if (!transformedImg) {
        console.error('[SIMPLE MORPH] ❌ Could not find transformed-bottle-img element!');
        console.error('[SIMPLE MORPH] Debug - isGenerating:', isGenerating);
        console.error('[SIMPLE MORPH] Debug - transformedImage exists:', !!transformedImage);
        return;
      }

      console.log('[SIMPLE MORPH] ✅ Found transformed image element, starting animation');

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
          console.log('[SIMPLE MORPH] ✅ Cross-fade complete');
          setAnimationComplete(true);
          setOpacity(1); // Final state update
          if (onCompleteRef.current) {
            console.log('[SIMPLE MORPH] 📞 Calling onComplete callback');
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
      {/* Debug overlay - always visible in dev */}
      {process.env.NODE_ENV !== "production" && (
        <div className="absolute top-20 left-4 z-50 bg-purple-900/90 text-white p-4 rounded text-xs space-y-1 max-w-xs">
          <div className="font-bold text-sm">SimpleBottleMorph Debug</div>
          <div>isGenerating: {isGenerating ? '✅' : '❌'}</div>
          <div>hasTransformedImage: {transformedImage ? '✅' : '❌'}</div>
          <div>hasCapturedImage: {capturedImage ? '✅' : '❌'}</div>
          <div>hasPreloadedImage: {preloadedImage ? '✅' : '❌'}</div>
          <div>opacity: {Math.round(opacity * 100)}%</div>
          <div>animationComplete: {animationComplete ? '✅' : '❌'}</div>
          <div>hasError: {error ? '✅' : '❌'}</div>
        </div>
      )}

      {isGenerating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/80">
          <div className="text-white text-center space-y-4 p-8">
            <div className="text-2xl font-bold">Transforming Bottle...</div>
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-sm text-gray-300">
              Creating Keeper's Heart bottle
            </div>
            <div className="text-xs text-gray-400">
              AI-powered realistic bottle replacement
            </div>
            {/* Debug button */}
            {process.env.NODE_ENV !== "production" && (
              <button
                onClick={() => {
                  console.log('[SIMPLE MORPH] 🔧 DEBUG: Force hiding loading screen');
                  setIsGenerating(false);
                }}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded text-xs"
              >
                DEBUG: Skip Loading
              </button>
            )}
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
      {/* SIMPLIFIED: Show full-screen since Gemini transforms the whole image while keeping everything else the same */}
      {transformedImage && !isGenerating && (
        <img
          id="transformed-bottle-img"
          src={transformedImage}
          alt="Keeper's Heart bottle"
          className="absolute inset-0 w-full h-full object-cover z-10"
          style={{ opacity: 0 }}
          onLoad={() => console.log('[SIMPLE MORPH] 🖼️ Transformed image loaded into DOM')}
          onError={(e) => console.error('[SIMPLE MORPH] ❌ Transformed image failed to load:', e)}
        />
      )}

      {/* Debug indicator */}
      {transformedImage && !isGenerating && process.env.NODE_ENV !== "production" && (
        <div className="absolute bottom-4 right-4 text-xs text-white/60 bg-black/50 px-3 py-1 rounded z-20">
          Opacity: {Math.round(opacity * 100)}%
        </div>
      )}
    </div>
  );
}
