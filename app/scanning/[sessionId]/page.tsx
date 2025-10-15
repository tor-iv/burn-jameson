"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { resizeImage, getBase64Size, formatBytes } from "@/lib/image-utils";

// Import the bottle morph animation
const BottleMorphAnimation = dynamic(() => import("@/components/BottleMorphAnimation"), {
  ssr: false,
});

const SimpleBottleMorph = dynamic(() => import("@/components/SimpleBottleMorph"), {
  ssr: false,
});

const CanvasFireAnimation = dynamic(() => import("@/components/CanvasFireAnimation"), {
  ssr: false,
});

interface BoundingBox {
  vertices?: Array<{ x: number; y: number }>;
}

interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const FALLBACK_BOX: NormalizedBox = {
  x: 0.3,
  y: 0.15,
  width: 0.4,
  height: 0.7,
};

function normalizeFromRaw(
  box: BoundingBox | null,
  width: number | undefined,
  height: number | undefined
): NormalizedBox | null {
  if (!box?.vertices || box.vertices.length < 4 || !width || !height) {
    return null;
  }

  const xs = box.vertices.map((v) => v.x ?? 0);
  const ys = box.vertices.map((v) => v.y ?? 0);
  const minX = clamp(Math.min(...xs) / width, 0, 1);
  const maxX = clamp(Math.max(...xs) / width, 0, 1);
  const minY = clamp(Math.min(...ys) / height, 0, 1);
  const maxY = clamp(Math.max(...ys) / height, 0, 1);

  return {
    x: minX,
    y: minY,
    width: clamp(maxX - minX, 0, 1),
    height: clamp(maxY - minY, 0, 1),
  };
}

function expandBoundingBox(
  box: NormalizedBox | null,
  widthMultiplier = 1.05,
  heightMultiplier = 1.05
): NormalizedBox | null {
  if (!box) return null;

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  const width = box.width * widthMultiplier;
  const height = box.height * heightMultiplier;

  const x = centerX - width / 2;
  const y = centerY - height / 2;

  return {
    x: Math.max(0, Math.min(x, 1 - width)),
    y: Math.max(0, Math.min(y, 1 - height)),
    width: Math.min(width, 1),
    height: Math.min(height, 1),
  };
}

export default function ScanningPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [bottleImage, setBottleImage] = useState<string | null>(null);
  const [rawBoundingBox, setRawBoundingBox] = useState<BoundingBox | null>(null);
  const [normalizedBox, setNormalizedBox] = useState<NormalizedBox | null>(null);
  const [expandedBox, setExpandedBox] = useState<NormalizedBox | null>(null);
  const [showContinue, setShowContinue] = useState(false);

  // NEW: State to control which animation to show
  const [animationPhase, setAnimationPhase] = useState<'burn' | 'morph' | 'complete'>('burn');
  const [useMorphAnimation, setUseMorphAnimation] = useState(false); // Toggle for morph feature

  // NEW: Preloaded transformed image state
  const [preloadedTransformedImage, setPreloadedTransformedImage] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const hasNavigated = useRef(false);

  // Hydration safety - mark as mounted after first render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const image = sessionStorage.getItem(`bottle_image_${sessionId}`);
    const bbox = sessionStorage.getItem(`bottle_bbox_${sessionId}`);
    const normalized = sessionStorage.getItem(
      `bottle_bbox_normalized_${sessionId}`
    );
    const expanded = sessionStorage.getItem(
      `bottle_bbox_expanded_${sessionId}`
    );

    // Check if morph animation should be enabled
    // Default to true, but allow override via sessionStorage
    const storedValue = sessionStorage.getItem('morph_enabled');
    const morphEnabled = storedValue === null ? true : storedValue === 'true';
    console.log(`[SCANNING PAGE] 🎬 Morph animation enabled: ${morphEnabled}`);
    setUseMorphAnimation(morphEnabled);

    if (image) {
      setBottleImage(image);

      const img = new Image();
      img.onload = () => {
        if (!normalized && bbox) {
          const parsedRaw = JSON.parse(bbox) as BoundingBox;
          const computed = normalizeFromRaw(parsedRaw, img.width, img.height);
          if (computed) {
            setNormalizedBox(computed);
            const widened = expandBoundingBox(computed);
            if (widened) setExpandedBox(widened);
          }
        }
      };
      img.src = image;
    }

    if (bbox) {
      setRawBoundingBox(JSON.parse(bbox));
    }
    if (normalized) {
      const parsed = JSON.parse(normalized) as NormalizedBox;
      setNormalizedBox(parsed);
      if (!expanded) {
        const widened = expandBoundingBox(parsed);
        if (widened) setExpandedBox(widened);
      }
    }
    if (expanded) {
      setExpandedBox(JSON.parse(expanded));
    }

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    router.prefetch(`/success/${sessionId}`);
  }, [router, sessionId]);

  useEffect(() => {
    if (useMorphAnimation) {
      console.log('[SCANNING PAGE] 🔥 Starting morph animation flow');
      // Two-phase animation: burn then morph
      // Fire now burns at 40px/sec, taking ~10 seconds to rise through typical bottle (400px)
      const burnTimer = setTimeout(() => {
        console.log('[SCANNING PAGE] 🎨 Transitioning to morph phase');
        setAnimationPhase('morph');
      }, 10000); // 10 seconds - allows fire to reach top AND Gemini to finish

      // DON'T auto-advance when morph is enabled - let the animation complete first
      // The handleMorphComplete callback will show the continue button

      return () => {
        clearTimeout(burnTimer);
      };
    } else {
      console.log('[SCANNING PAGE] 🔥 Starting burn-only animation flow');
      // Original timing: just burn animation
      const buttonTimer = setTimeout(() => setShowContinue(true), 10500);

      const autoTimer = setTimeout(() => {
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          router.push(`/success/${sessionId}`);
        }
      }, 12000);

      return () => {
        clearTimeout(buttonTimer);
        clearTimeout(autoTimer);
      };
    }
  }, [router, sessionId, useMorphAnimation]);

  const activeBox = useMemo<NormalizedBox>(() => {
    return expandedBox ?? normalizedBox ?? FALLBACK_BOX;
  }, [expandedBox, normalizedBox]);

  // NEW: Check for preloaded image from scan page, or preload during burn animation
  useEffect(() => {
    // Only preload if morph animation is enabled and we have the necessary data
    if (!useMorphAnimation || !bottleImage) {
      return;
    }

    // Check if image was already preloaded during scan detection
    const preloadedFromScan = sessionStorage.getItem(`preloaded_morph_${sessionId}`);
    if (preloadedFromScan) {
      console.log('[SCANNING PAGE] ✅ Found preloaded image from scan page! Using immediately.');
      setPreloadedTransformedImage(preloadedFromScan);
      setIsPreloading(false);
      return;
    }

    let isCancelled = false;

    async function preloadTransformedImage() {
      try {
        setIsPreloading(true);
        setPreloadError(null);

        console.log('[SCANNING PAGE] 🚀 Starting preload of transformed image during burn animation (fallback)');

        // Check original image size
        const originalSize = getBase64Size(bottleImage!);
        console.log('[SCANNING PAGE] 📏 Original image size:', formatBytes(originalSize));

        // Resize image if it's too large (> 1MB)
        let imageToSend = bottleImage!;
        if (originalSize > 1024 * 1024) {
          console.log('[SCANNING PAGE] 📐 Image too large, resizing to max 1024x1024...');
          try {
            imageToSend = await resizeImage(bottleImage!, {
              maxWidth: 1024,
              maxHeight: 1024,
              quality: 0.85,
              format: 'image/jpeg',
            });
            const newSize = getBase64Size(imageToSend);
            console.log('[SCANNING PAGE] ✅ Resized to:', formatBytes(newSize));
          } catch (resizeError) {
            console.error('[SCANNING PAGE] ⚠️ Resize failed, using original:', resizeError);
            // Continue with original image if resize fails
          }
        }

        console.log('[SCANNING PAGE] 📦 Sending to API...');
        console.log('[SCANNING PAGE] Image length:', imageToSend.length, 'chars');
        console.log('[SCANNING PAGE] Bounding box:', activeBox);

        const response = await fetch('/api/morph-bottle-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageToSend,
            boundingBox: activeBox,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[SCANNING PAGE] ❌ Preload API error - Status:', response.status);
          console.error('[SCANNING PAGE] ❌ Error response:', errorText);

          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Unknown error' };
          }

          throw new Error(errorData.error || errorData.details || 'Failed to preload transformation');
        }

        const data = await response.json();
        console.log('[SCANNING PAGE] ✅ Received transformed image for preload');
        console.log('[SCANNING PAGE] Response keys:', Object.keys(data));
        console.log('[SCANNING PAGE] Has transformedImage:', !!data.transformedImage);
        console.log('[SCANNING PAGE] transformedImage size:', data.transformedImage?.length || 0, 'chars');

        if (isCancelled) return;

        // Preload the image into browser cache
        console.log('[SCANNING PAGE] 🖼️ Loading image into browser cache...');
        const img = new Image();

        img.onload = () => {
          if (isCancelled) return;
          console.log('[SCANNING PAGE] ✅ Image preloaded and cached successfully!');
          setPreloadedTransformedImage(data.transformedImage);
          setIsPreloading(false);
        };

        img.onerror = (err) => {
          console.error('[SCANNING PAGE] ❌ Failed to preload image into cache:', err);
          // Still save it - SimpleBottleMorph will try to use it
          if (!isCancelled) {
            setPreloadedTransformedImage(data.transformedImage);
            setIsPreloading(false);
          }
        };

        img.src = data.transformedImage;

      } catch (err) {
        if (isCancelled) return;
        console.error('[SCANNING PAGE] ❌ Preload error:', err);
        setPreloadError(err instanceof Error ? err.message : 'Failed to preload transformation');
        setIsPreloading(false);
      }
    }

    preloadTransformedImage();

    return () => {
      isCancelled = true;
    };
  }, [useMorphAnimation, bottleImage, activeBox]);

  const handleContinue = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.push(`/success/${sessionId}`);
  };

  const handleMorphComplete = () => {
    console.log('[SCANNING PAGE] ✅ Bottle morph animation complete callback');
    setAnimationPhase('complete');
    setShowContinue(true);
  };

  // Log current animation phase
  useEffect(() => {
    console.log(`[SCANNING PAGE] 📍 Animation phase: ${animationPhase}`);
  }, [animationPhase]);

  // Log when morph component should render
  useEffect(() => {
    if ((animationPhase === 'morph' || animationPhase === 'complete') && useMorphAnimation) {
      console.log('[SCANNING PAGE] 🎨 Rendering SimpleBottleMorph component (phase:', animationPhase, ')');
      console.log('[SCANNING PAGE] 📦 Preloaded image available:', !!preloadedTransformedImage);
    }
  }, [animationPhase, useMorphAnimation, preloadedTransformedImage]);

  return (
    <motion.div
      className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden"
      initial={{ x: 0, y: 0 }}
      animate={{
        x: [0, -3, 3, -2, 2, -1, 1, 0],
        y: [0, 2, -2, 2, -1, 1, -1, 0],
      }}
      transition={{
        duration: 0.5,
        times: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1],
        ease: "easeInOut",
      }}
    >
      {/* Background bottle image - always visible to prevent zoom */}
      {bottleImage && (
        <img
          src={bottleImage}
          alt="Captured bottle"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Burn Animation (Phase 1) */}
      {bottleImage && animationPhase === 'burn' && !useMorphAnimation && (
        <CanvasFireAnimation boundingBox={activeBox} imageUrl={bottleImage} />
      )}

      {/* Burn Animation (Phase 1) - For morph-enabled flow */}
      {bottleImage && animationPhase === 'burn' && useMorphAnimation && (
        <CanvasFireAnimation boundingBox={activeBox} imageUrl={bottleImage} />
      )}

      {/* Morph Animation (Phase 2 & 3) - Keep visible after completing */}
      {bottleImage && (animationPhase === 'morph' || animationPhase === 'complete') && useMorphAnimation && (
        <div className="absolute inset-0 w-full h-full">
          <SimpleBottleMorph
            capturedImage={bottleImage}
            boundingBox={activeBox}
            onComplete={handleMorphComplete}
            duration={2000} // 2 second cross-fade
            preloadedImage={preloadedTransformedImage}
          />
        </div>
      )}

      {/* Debug bounding box */}
      {process.env.NODE_ENV !== "production" && rawBoundingBox && (
        <div
          className="absolute pointer-events-none border-2 border-green-500/70 z-40"
          style={{
            top: `${activeBox.y * 100}%`,
            left: `${(activeBox.x + activeBox.width / 2) * 100}%`,
            width: `${activeBox.width * 100}%`,
            height: `${activeBox.height * 100}%`,
            transform: "translate(-50%, 0)",
          }}
        >
          <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 text-xs">
            DEBUG: Bounding Box
          </div>
        </div>
      )}

      {/* Continue button */}
      {showContinue && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center z-50 px-6">
          <Button
            onClick={handleContinue}
            size="lg"
            className="px-10 py-6 text-lg font-semibold"
          >
            Continue
          </Button>
        </div>
      )}

      {/* Development toggle for morph feature */}
      {process.env.NODE_ENV !== "production" && (
        <div className="absolute top-4 right-4 z-50 space-y-2">
          <button
            onClick={() => {
              const newValue = !useMorphAnimation;
              setUseMorphAnimation(newValue);
              sessionStorage.setItem('morph_enabled', newValue.toString());
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded text-sm block w-full"
          >
            Morph: {useMorphAnimation ? 'ON' : 'OFF'}
          </button>
          <div className="bg-black/80 text-white px-4 py-2 rounded text-xs">
            Phase: {animationPhase}
          </div>
          <div className="bg-black/80 text-white px-4 py-2 rounded text-xs">
            Preload: {isPreloading ? '⏳ Loading...' : preloadedTransformedImage ? '✅ Ready' : preloadError ? '❌ Error' : '⏸️ Waiting'}
          </div>
          {preloadError && (
            <div className="bg-red-900/80 text-white px-4 py-2 rounded text-xs max-w-xs">
              {preloadError}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
