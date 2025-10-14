"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

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

  // Minimal 5% expansion for tight fit
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
  const [particles, setParticles] = useState<
    Array<{
      startX: number;
      startY: number;
      driftX: number;
      size: number;
      color: string;
      velocity: number;
      rotation: number;
    }>
  >([]);
  const [showContinue, setShowContinue] = useState(false);

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
    const buttonTimer = setTimeout(() => setShowContinue(true), 3500);

    const autoTimer = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        router.push(`/success/${sessionId}`);
      }
    }, 5000); // Auto-advance after 5 seconds total

    return () => {
      clearTimeout(buttonTimer);
      clearTimeout(autoTimer);
    };
  }, [router, sessionId]);

  const activeBox = useMemo<NormalizedBox>(() => {
    return expandedBox ?? normalizedBox ?? FALLBACK_BOX;
  }, [expandedBox, normalizedBox]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const box = activeBox;

    const nextParticles = Array.from({ length: 35 }).map(() => {
      const hue = 30 + Math.random() * 30; // Orange to red range
      const lightness = 50 + Math.random() * 30;
      const saturation = 90 + Math.random() * 10;

      return {
        startX: (box.x + Math.random() * box.width) * viewportWidth,
        startY: (box.y + box.height * 0.9) * viewportHeight,
        driftX: (Math.random() - 0.5) * viewportWidth * 0.15,
        size: 2 + Math.random() * 6,
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        velocity: 200 + Math.random() * 150,
        rotation: Math.random() * 360,
      };
    });

    setParticles(nextParticles);
  }, [activeBox]);

  const fireBox = useMemo(() => {
    // Remove size limits - let the animation cover the entire detected bottle
    const widthPercent = activeBox.width * 100;
    const heightPercent = activeBox.height * 100;
    const centerXPercent = (activeBox.x + activeBox.width / 2) * 100;
    const topPercent = activeBox.y * 100;

    return {
      top: `${topPercent}%`,
      left: `${centerXPercent}%`,
      width: `${widthPercent}%`,
      height: `${heightPercent}%`,
      transform: "translate(-50%, 0)",
    };
  }, [activeBox]);

  const handleContinue = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.push(`/success/${sessionId}`);
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
      {bottleImage ? (
        <img
          src={bottleImage}
          alt="Captured bottle"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="relative z-10">
          <div className="w-64 h-96 bg-gradient-to-b from-amber-900 via-amber-700 to-amber-500 rounded-lg opacity-80" />
        </div>
      )}

      {/* GIF Burn Animation */}
      {bottleImage && (
        <GifBurnAnimation boundingBox={activeBox} imageUrl={bottleImage} />
      )}

      {process.env.NODE_ENV !== "production" && rawBoundingBox && (
        <div
          className="absolute pointer-events-none border-2 border-green-500/70 z-40"
          style={fireBox}
        >
          <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 text-xs">
            DEBUG: Bounding Box
          </div>
        </div>
      )}

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
