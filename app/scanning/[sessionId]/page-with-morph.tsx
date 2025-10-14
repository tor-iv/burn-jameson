"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

// Import the bottle morph animation
const BottleMorphAnimation = dynamic(() => import("@/components/BottleMorphAnimation"), {
  ssr: false,
});

const GifBurnAnimation = dynamic(() => import("@/components/GifBurnAnimation"), {
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

  const hasNavigated = useRef(false);

  useEffect(() => {
    const image = sessionStorage.getItem(`bottle_image_${sessionId}`);
    const bbox = sessionStorage.getItem(`bottle_bbox_${sessionId}`);
    const normalized = sessionStorage.getItem(
      `bottle_bbox_normalized_${sessionId}`
    );
    const expanded = sessionStorage.getItem(
      `bottle_bbox_expanded_${sessionId}`
    );

    // Check if morph animation should be enabled (you can set this via query param or session storage)
    const morphEnabled = sessionStorage.getItem('morph_enabled') === 'true';
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
      // Two-phase animation: burn then morph
      const burnTimer = setTimeout(() => {
        setAnimationPhase('morph');
      }, 2000); // Burn for 2 seconds

      const morphTimer = setTimeout(() => {
        setAnimationPhase('complete');
        setShowContinue(true);
      }, 7000); // Morph starts at 2s, takes ~5s (generation + playback)

      const autoTimer = setTimeout(() => {
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          router.push(`/success/${sessionId}`);
        }
      }, 10000); // Auto-advance after 10 seconds total

      return () => {
        clearTimeout(burnTimer);
        clearTimeout(morphTimer);
        clearTimeout(autoTimer);
      };
    } else {
      // Original timing: just burn animation
      const buttonTimer = setTimeout(() => setShowContinue(true), 3500);

      const autoTimer = setTimeout(() => {
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          router.push(`/success/${sessionId}`);
        }
      }, 5000);

      return () => {
        clearTimeout(buttonTimer);
        clearTimeout(autoTimer);
      };
    }
  }, [router, sessionId, useMorphAnimation]);

  const activeBox = useMemo<NormalizedBox>(() => {
    return expandedBox ?? normalizedBox ?? FALLBACK_BOX;
  }, [expandedBox, normalizedBox]);

  const handleContinue = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.push(`/success/${sessionId}`);
  };

  const handleMorphComplete = () => {
    console.log('Bottle morph animation complete');
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
      {/* Background bottle image (for burn animation) or hidden during morph */}
      {bottleImage && animationPhase === 'burn' && (
        <img
          src={bottleImage}
          alt="Captured bottle"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Burn Animation (Phase 1) */}
      {bottleImage && animationPhase === 'burn' && !useMorphAnimation && (
        <GifBurnAnimation boundingBox={activeBox} imageUrl={bottleImage} />
      )}

      {/* Burn Animation (Phase 1) - For morph-enabled flow */}
      {bottleImage && animationPhase === 'burn' && useMorphAnimation && (
        <GifBurnAnimation boundingBox={activeBox} imageUrl={bottleImage} />
      )}

      {/* Morph Animation (Phase 2) - NEW */}
      {bottleImage && animationPhase === 'morph' && useMorphAnimation && (
        <div className="absolute inset-0 w-full h-full">
          <BottleMorphAnimation
            capturedImage={bottleImage}
            boundingBox={activeBox}
            onComplete={handleMorphComplete}
            useThreeFrameMode={true} // Set to false for 8-frame mode ($0.31)
            duration={3000} // 3 second playback
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
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => {
              const newValue = !useMorphAnimation;
              setUseMorphAnimation(newValue);
              sessionStorage.setItem('morph_enabled', newValue.toString());
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded text-sm"
          >
            Morph: {useMorphAnimation ? 'ON' : 'OFF'}
          </button>
        </div>
      )}
    </motion.div>
  );
}
