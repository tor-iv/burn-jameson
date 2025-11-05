"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { resizeImage, getBase64Size, formatBytes } from "@/lib/image-utils";

// Import the animation switcher that dynamically loads the correct animation
const AnimationSwitcher = dynamic(() => import("@/components/AnimationSwitcher"), {
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
    console.log('[ScanningPage] ⏱️ Animation timer effect', {
      useMorphAnimation,
      hasBottleImage: !!bottleImage,
      animationPhase
    })

    // Only start timers when we have a bottle image (animation can actually render)
    if (!bottleImage) {
      console.log('[ScanningPage] ⏸️ No bottle image yet, waiting to start timers')
      return
    }

    if (useMorphAnimation) {
      // Two-phase animation: burn then morph
      // Fire now burns at 120px/sec, taking ~6 seconds to completely burn through bottle
      console.log('[ScanningPage] 🔥 Starting burn timer (6 seconds)')
      const burnTimer = setTimeout(() => {
        console.log('[ScanningPage] 🔄 Burn timer fired - switching to morph phase')
        setAnimationPhase('morph');
      }, 6000); // 6 seconds - faster burn, then morph

      // DON'T auto-advance when morph is enabled - let the animation complete first
      // The handleMorphComplete callback will show the continue button

      return () => {
        console.log('[ScanningPage] 🧹 Clearing burn timer')
        clearTimeout(burnTimer);
      };
    } else {
      // Burn-only timing: faster burn animation
      console.log('[ScanningPage] 🔥 Starting burn-only timers')
      const buttonTimer = setTimeout(() => setShowContinue(true), 6500);

      const autoTimer = setTimeout(() => {
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          router.push(`/success/${sessionId}`);
        }
      }, 8000);

      return () => {
        clearTimeout(buttonTimer);
        clearTimeout(autoTimer);
      };
    }
  }, [router, sessionId, useMorphAnimation, bottleImage]);

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
      setPreloadedTransformedImage(preloadedFromScan);
      setIsPreloading(false);
      return;
    }

    let isCancelled = false;

    async function preloadTransformedImage() {
      try {
        setIsPreloading(true);
        setPreloadError(null);

        // Check original image size
        const originalSize = getBase64Size(bottleImage!);

        // Resize image if it's too large (> 1MB)
        let imageToSend = bottleImage!;
        if (originalSize > 1024 * 1024) {
          try {
            imageToSend = await resizeImage(bottleImage!, {
              maxWidth: 1024,
              maxHeight: 1024,
              quality: 0.85,
              format: 'image/jpeg',
            });
          } catch (resizeError) {
            console.error('[SCANNING PAGE] Resize failed, using original:', resizeError);
            // Continue with original image if resize fails
          }
        }

        const response = await fetch('/api/morph-bottle-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageToSend,
            // Use normalizedBox (not expandedBox) since morph API adds its own padding
            boundingBox: normalizedBox || activeBox,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Unknown error' };
          }
          throw new Error(errorData.error || errorData.details || 'Failed to preload transformation');
        }

        const data = await response.json();

        if (isCancelled) return;

        // Preload the image into browser cache
        const img = new Image();

        img.onload = () => {
          if (isCancelled) return;
          setPreloadedTransformedImage(data.transformedImage);
          setIsPreloading(false);
        };

        img.onerror = () => {
          // Still save it - SimpleBottleMorph will try to use it
          if (!isCancelled) {
            setPreloadedTransformedImage(data.transformedImage);
            setIsPreloading(false);
          }
        };

        img.src = data.transformedImage;

      } catch (err) {
        if (isCancelled) return;
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
    setAnimationPhase('complete');
    setShowContinue(true);
  };

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
          style={{ zIndex: 1 }}
        />
      )}

      {/* Burn Animation (Phase 1) - Dynamically loaded based on NEXT_PUBLIC_ANIMATION_TYPE */}
      {bottleImage && animationPhase === 'burn' && (
        <AnimationSwitcher
          mode="burn"
          boundingBox={activeBox}
          imageUrl={bottleImage}
        />
      )}

      {/* Morph Animation (Phase 2 & 3) - Keep visible after completing */}
      {bottleImage && (animationPhase === 'morph' || animationPhase === 'complete') && useMorphAnimation && (
        <div className="absolute inset-0 w-full h-full">
          <AnimationSwitcher
            mode="morph"
            capturedImage={bottleImage}
            boundingBox={activeBox}
            onComplete={handleMorphComplete}
            duration={2000}
            preloadedImage={preloadedTransformedImage}
          />
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
    </motion.div>
  );
}
