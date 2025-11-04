"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import { PerspectiveCamera, Environment } from "@react-three/drei";

interface SpinReveal3DProps {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
  segmentationMask?: string;
  detectedBrand?: string | null;
  aspectRatio?: number | null;
  onComplete?: () => void;
  morphedImageUrl?: string | null;
  onRequestMorph?: () => void;
  onBurnComplete?: () => void;
}

// 3D Spinning Bottle Component
function SpinningBottle({
  croppedBottleUrl,
  morphedBottleUrl,
  onRotationComplete,
  onBurnComplete,
}: {
  croppedBottleUrl: string;
  morphedBottleUrl: string | null;
  onRotationComplete: () => void;
  onBurnComplete: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [rotationPhase, setRotationPhase] = useState<'spinning' | 'revealing' | 'complete'>('spinning');
  const rotationProgress = useRef(0);
  const hasCalledBurnComplete = useRef(false);
  const hasCalledComplete = useRef(false);

  // Load textures
  const competitorTexture = useLoader(TextureLoader, croppedBottleUrl);
  const keepersTexture = morphedBottleUrl
    ? useLoader(TextureLoader, morphedBottleUrl)
    : null;

  // Configure textures for proper wrapping
  useEffect(() => {
    if (competitorTexture) {
      competitorTexture.wrapS = THREE.RepeatWrapping;
      competitorTexture.wrapT = THREE.ClampToEdgeWrapping;
      competitorTexture.repeat.set(1, 1);
    }
    if (keepersTexture) {
      keepersTexture.wrapS = THREE.RepeatWrapping;
      keepersTexture.wrapT = THREE.ClampToEdgeWrapping;
      keepersTexture.repeat.set(1, 1);
    }
  }, [competitorTexture, keepersTexture]);

  // Animation loop
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const totalDuration = 4.0; // 4 seconds total
    const rotationSpeed = (Math.PI * 2) / totalDuration; // 360 degrees in 4 seconds

    if (rotationPhase === 'spinning') {
      // Spin the bottle
      mesh.rotation.y += rotationSpeed * delta;
      rotationProgress.current += delta;

      // At 60% (2.4s), signal burn complete and prepare for transition
      if (rotationProgress.current >= totalDuration * 0.6 && !hasCalledBurnComplete.current) {
        hasCalledBurnComplete.current = true;
        console.log('[SpinReveal3D] ✅ Burn phase complete at T=2.4s, signaling morph phase');
        onBurnComplete();

        // If we have morphed image, prepare to swap texture
        if (keepersTexture) {
          setRotationPhase('revealing');
        }
      }

      // Complete full rotation
      if (rotationProgress.current >= totalDuration) {
        setRotationPhase('complete');
        mesh.rotation.y = Math.PI * 2; // Lock at 360 degrees
      }
    } else if (rotationPhase === 'revealing') {
      // Continue spinning with morphed texture
      mesh.rotation.y += rotationSpeed * delta;
      rotationProgress.current += delta;

      if (rotationProgress.current >= totalDuration) {
        setRotationPhase('complete');
        mesh.rotation.y = Math.PI * 2;
      }
    } else if (rotationPhase === 'complete' && !hasCalledComplete.current) {
      hasCalledComplete.current = true;
      onRotationComplete();
    }
  });

  // Determine which texture to show
  const currentTexture = (rotationPhase === 'revealing' && keepersTexture)
    ? keepersTexture
    : competitorTexture;

  return (
    <group>
      {/* Main cylinder bottle */}
      <mesh ref={meshRef} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 3, 32]} />
        <meshStandardMaterial
          map={currentTexture}
          metalness={0.3}
          roughness={0.4}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Add ambient lighting */}
      <ambientLight intensity={0.6} />

      {/* Key light (main) */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2}
        castShadow
      />

      {/* Fill light (softer) */}
      <directionalLight
        position={[-3, 2, -3]}
        intensity={0.4}
      />

      {/* Rim light (for edge definition) */}
      <directionalLight
        position={[0, -2, -5]}
        intensity={0.3}
        color="#ffa500"
      />
    </group>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="text-amber-50 text-lg animate-pulse">Loading 3D...</div>
    </div>
  );
}

export default function SpinReveal3D({
  boundingBox,
  imageUrl,
  segmentationMask,
  detectedBrand,
  aspectRatio,
  onComplete,
  morphedImageUrl,
  onRequestMorph,
  onBurnComplete,
}: SpinReveal3DProps) {
  const [croppedBottleDataUrl, setCroppedBottleDataUrl] = useState<string>('');
  const hasCompletedRef = useRef(false);
  const morphRequestedRef = useRef(false);
  const burnCompleteRef = useRef(false);

  // Create cropped bottle image from original + bounding box
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate crop dimensions
      const cropX = boundingBox.x * img.width;
      const cropY = boundingBox.y * img.height;
      const cropWidth = boundingBox.width * img.width;
      const cropHeight = boundingBox.height * img.height;

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Draw cropped section
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      // Apply segmentation mask if available
      if (segmentationMask) {
        const maskImg = new Image();
        maskImg.crossOrigin = 'anonymous';
        maskImg.onload = () => {
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(maskImg, 0, 0, cropWidth, cropHeight);
          setCroppedBottleDataUrl(canvas.toDataURL('image/png'));
          console.log('[SpinReveal3D] 🎭 Applied Gemini segmentation mask (pixel-perfect)');
        };
        maskImg.src = segmentationMask;
      } else {
        setCroppedBottleDataUrl(canvas.toDataURL('image/png'));
        console.log('[SpinReveal3D] 📦 Using rectangular crop (no mask)');
      }
    };
    img.src = imageUrl;
  }, [imageUrl, boundingBox, segmentationMask]);

  // Request morph preload early
  useEffect(() => {
    const morphTimer = setTimeout(() => {
      if (onRequestMorph && !morphRequestedRef.current) {
        morphRequestedRef.current = true;
        console.log('[SpinReveal3D] 🚀 Requesting morph preload at T=0.5s');
        onRequestMorph();
      }
    }, 500);

    return () => clearTimeout(morphTimer);
  }, [onRequestMorph]);

  const handleRotationComplete = () => {
    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete?.();
    }
  };

  const handleBurnComplete = () => {
    if (!burnCompleteRef.current) {
      burnCompleteRef.current = true;
      onBurnComplete?.();
    }
  };

  if (!croppedBottleDataUrl) {
    return <LoadingFallback />;
  }

  // Convert normalized bounding box to percentage for canvas positioning
  const boxStyle = {
    left: `${boundingBox.x * 100}%`,
    top: `${boundingBox.y * 100}%`,
    width: `${boundingBox.width * 100}%`,
    height: `${boundingBox.height * 100}%`,
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Original bottle image as background */}
      <img
        src={imageUrl}
        alt="Bottle"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 3D Canvas positioned at bounding box */}
      <div
        className="absolute"
        style={boxStyle}
      >
        <Canvas
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          className="w-full h-full"
        >
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[0, 0, 5]} />

            <SpinningBottle
              croppedBottleUrl={croppedBottleDataUrl}
              morphedBottleUrl={morphedImageUrl || null}
              onRotationComplete={handleRotationComplete}
              onBurnComplete={handleBurnComplete}
            />

            {/* Environment for reflections */}
            <Environment preset="sunset" />
          </Suspense>
        </Canvas>
      </div>

      {/* Vignette effect for dramatic focus */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60 pointer-events-none" />
    </div>
  );
}
