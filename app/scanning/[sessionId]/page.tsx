"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

interface BoundingBox {
  vertices?: Array<{ x: number; y: number }>;
}

export default function ScanningPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [bottleImage, setBottleImage] = useState<string | null>(null);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    // Retrieve captured bottle image and bounding box from sessionStorage
    const image = sessionStorage.getItem(`bottle_image_${sessionId}`);
    const bbox = sessionStorage.getItem(`bottle_bbox_${sessionId}`);

    if (image) {
      setBottleImage(image);

      // Get actual image dimensions
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        console.log('Image dimensions:', img.width, 'x', img.height);
      };
      img.src = image;
    }
    if (bbox) setBoundingBox(JSON.parse(bbox));

    // Vibrate on load
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // Prefetch next screen during animation
    router.prefetch(`/success/${sessionId}`);

    // Auto-navigate after burn animation completes (2.5s)
    const timer = setTimeout(() => {
      router.push(`/success/${sessionId}`);
    }, 2500);

    return () => clearTimeout(timer);
  }, [router, sessionId]);

  // Calculate fire position and size based on bounding box
  const getFireStyles = () => {
    if (!boundingBox?.vertices || boundingBox.vertices.length < 4 || !imageSize) {
      // Fallback: center of screen with default size
      console.log('No bounding box or image size, using fallback');
      return {
        top: '20%',
        left: '50%',
        width: '300px',
        height: '400px',
        transform: 'translateX(-50%)',
      };
    }

    // Get bounding box dimensions in image coordinates
    const vertices = boundingBox.vertices;
    console.log('Bounding box vertices (image coords):', vertices);

    const minX = Math.min(...vertices.map(v => v.x));
    const maxX = Math.max(...vertices.map(v => v.x));
    const minY = Math.min(...vertices.map(v => v.y));
    const maxY = Math.max(...vertices.map(v => v.y));

    // Convert from image coordinates to normalized (0-1)
    const normalizedMinX = minX / imageSize.width;
    const normalizedMaxX = maxX / imageSize.width;
    const normalizedMinY = minY / imageSize.height;
    const normalizedMaxY = maxY / imageSize.height;

    const normalizedWidth = normalizedMaxX - normalizedMinX;
    const normalizedHeight = normalizedMaxY - normalizedMinY;

    console.log('Normalized coords:', {
      x: normalizedMinX,
      y: normalizedMinY,
      width: normalizedWidth,
      height: normalizedHeight,
    });

    // Convert to viewport percentages (works with object-cover)
    return {
      top: `${normalizedMinY * 100}%`,
      left: `${(normalizedMinX + normalizedWidth / 2) * 100}%`,
      width: `${normalizedWidth * 120}%`, // 1.2x width for dramatic effect
      height: `${normalizedHeight * 100}%`,
      transform: 'translateX(-50%)',
    };
  };

  const fireStyles = getFireStyles();

  console.log('Fire styles:', fireStyles);

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Captured Bottle Image - Full Screen */}
      {bottleImage ? (
        <img
          src={bottleImage}
          alt="Captured bottle"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        /* Fallback placeholder */
        <div className="relative z-10">
          <div className="w-64 h-96 bg-gradient-to-b from-amber-900 to-amber-700 rounded-lg opacity-80" />
        </div>
      )}

      {/* Debug: Show bounding box outline (GREEN) */}
      {boundingBox?.vertices && boundingBox.vertices.length >= 4 && (
        <div
          className="absolute pointer-events-none border-4 border-green-500 z-50"
          style={{
            top: fireStyles.top,
            left: fireStyles.left,
            width: fireStyles.width,
            height: fireStyles.height,
            transform: fireStyles.transform,
          }}
        >
          <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 text-xs">
            DEBUG: Bounding Box
          </div>
        </div>
      )}

      {/* Fire/Burn Overlay Animation - Positioned on bottle */}
      <motion.div
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [1.2, 1, 1, 0.8],
        }}
        transition={{ duration: 2.5, times: [0, 0.2, 0.8, 1] }}
        className="absolute pointer-events-none z-40"
        style={{
          ...fireStyles,
          background: "linear-gradient(to top, #ff6b00, #ff0000, #ffaa00)",
          mixBlendMode: "screen",
          filter: "blur(40px)",
        }}
      />

      {/* Animated particles - emit from bottle area */}
      {[...Array(20)].map((_, i) => {
        const particleX = boundingBox?.vertices
          ? (Math.min(...boundingBox.vertices.map(v => v.x)) + Math.max(...boundingBox.vertices.map(v => v.x))) / 2 + (Math.random() - 0.5) * 100
          : window.innerWidth / 2 + (Math.random() - 0.5) * 200;

        const particleStartY = boundingBox?.vertices
          ? Math.min(...boundingBox.vertices.map(v => v.y)) + 50
          : window.innerHeight / 2;

        return (
          <motion.div
            key={i}
            initial={{
              opacity: 0,
              x: particleX,
              y: particleStartY,
            }}
            animate={{
              opacity: [0, 1, 0],
              y: particleStartY - 300,
              x: particleX + (Math.random() - 0.5) * 100,
            }}
            transition={{
              duration: 2,
              delay: Math.random() * 0.5,
              ease: "easeOut",
            }}
            className="absolute w-2 h-2 bg-orange-500 rounded-full"
          />
        );
      })}

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -10] }}
        transition={{ duration: 2.5, times: [0, 0.2, 0.8, 1] }}
        className="absolute bottom-32 left-0 right-0 text-center"
      >
        <p className="text-white text-2xl font-bold drop-shadow-lg">
          Burning that ad...
        </p>
      </motion.div>
    </div>
  );
}
