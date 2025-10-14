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
  boundingBox,
  onComplete,
  duration = 2000,
  preloadedImage,
}: SimpleBottleMorphProps) {
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

    console.log('[SIMPLE MORPH] 🎬 Starting cross-fade animation');

    // Start cross-fade animation using refs to avoid re-renders
    requestAnimationFrame(() => {
      const startTime = Date.now();
      const transformedImg = document.getElementById('transformed-bottle-img') as HTMLImageElement;

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
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [preloadedImage, duration]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
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
              Using AI image generation ($0.04)
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
      {transformedImage && !isGenerating && (
        <img
          id="transformed-bottle-img"
          src={transformedImage}
          alt="Keeper's Heart bottle"
          className="absolute inset-0 w-full h-full object-cover z-1"
          style={{ opacity: 0 }}
        />
      )}

      {/* Cost indicator */}
      {transformedImage && !isGenerating && (
        <div className="absolute bottom-4 right-4 text-xs text-white/60 bg-black/50 px-3 py-1 rounded z-20">
          Cost: $0.04 | Opacity: {Math.round(opacity * 100)}%
        </div>
      )}
    </div>
  );
}
