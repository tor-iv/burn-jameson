"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

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
  x: 0.2,
  y: 0.08,
  width: 0.6,
  height: 0.78,
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
  widthMultiplier = 1.8,
  heightMultiplier = 1.6
): NormalizedBox | null {
  if (!box) return null;

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  const width = clamp(box.width * widthMultiplier, 0.32, 0.92);
  const height = clamp(box.height * heightMultiplier, 0.6, 0.96);

  const x = clamp(centerX - width / 2, 0.02, 1 - width - 0.02);
  const y = clamp(centerY - height / 2, 0.04, 1 - height - 0.04);

  return { x, y, width, height };
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
    Array<{ startX: number; startY: number; driftX: number }>
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
    }, 12000); // Extended from 7.5s to 12s

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

    const nextParticles = Array.from({ length: 22 }).map(() => ({
      startX:
        (box.x + Math.random() * box.width) *
        viewportWidth,
      startY: (box.y + box.height * 0.9) * viewportHeight,
      driftX: (Math.random() - 0.5) * viewportWidth * 0.12,
    }));

    setParticles(nextParticles);
  }, [activeBox]);

  const fireBox = useMemo(() => {
    const widthPercent = clamp(activeBox.width * 100, 34, 88);
    const heightPercent = clamp(activeBox.height * 100, 58, 94);
    const maxTop = 100 - heightPercent - 3;
    const centerXPercent = clamp(
      (activeBox.x + activeBox.width / 2) * 100,
      widthPercent / 2 + 2,
      100 - widthPercent / 2 - 2
    );

    return {
      top: `${clamp(activeBox.y * 100, 4, maxTop)}%`,
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
    <div className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden">
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

      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{
          opacity: [0, 0.85, 0.95, 0],
          scale: [1.05, 1, 1, 0.92],
        }}
        transition={{ duration: 4, times: [0, 0.18, 0.85, 1], ease: "easeInOut" }}
        className="absolute pointer-events-none z-30 rounded-full"
        style={{
          ...fireBox,
          background:
            "radial-gradient(circle at 50% 80%, rgba(255,255,255,0.45), rgba(255,106,0,0.75) 40%, rgba(255,20,0,0.6) 70%, rgba(0,0,0,0) 100%)",
          mixBlendMode: "screen",
          filter: "blur(38px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0.4, 0] }}
        transition={{ duration: 4, times: [0, 0.3, 0.8, 1] }}
        className="absolute z-20"
        style={{
          ...fireBox,
          background:
            "radial-gradient(circle at 50% 90%, rgba(255,215,0,0.45), rgba(255,69,0,0.3) 65%, transparent 100%)",
          mixBlendMode: "screen",
          filter: "blur(60px)",
        }}
      />

      {particles.map((particle, index) => (
        <motion.div
          key={`particle-${index}`}
          initial={{
            opacity: 0,
            x: particle.startX,
            y: particle.startY,
            scale: Math.random() * 0.6 + 0.4,
          }}
          animate={{
            opacity: [0, 1, 0],
            y: particle.startY - 320 - Math.random() * 120,
            x: particle.startX + particle.driftX,
            scale: [0.4, 1, 0],
          }}
          transition={{
            duration: 3.4 + Math.random() * 0.6,
            delay: Math.random() * 0.4,
            ease: "easeOut",
          }}
          className="absolute w-2 h-2 rounded-full bg-orange-400"
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: [0, 1, 1, 0], y: [18, 0, 0, -12] }}
        transition={{ duration: 4, times: [0, 0.2, 0.85, 1] }}
        className="absolute bottom-36 left-0 right-0 text-center z-40"
      >
        <p className="text-white text-2xl font-bold drop-shadow-lg">
          Keeper&apos;s Heart is taking over...
        </p>
        <p className="text-white/70 text-base mt-2">
          Watch the burn, then continue to claim your rebate.
        </p>
      </motion.div>

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
    </div>
  );
}
