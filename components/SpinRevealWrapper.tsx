"use client";

import { useState, useEffect } from "react";
import { getDevicePerformanceTier } from "@/lib/animation-manager";
import dynamic from "next/dynamic";

// Dynamic imports for code splitting
const SpinReveal3D = dynamic(() => import("@/components/SpinReveal3D"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="text-amber-50 text-lg animate-pulse">Loading 3D...</div>
    </div>
  ),
});

const SpinRevealAnimation = dynamic(() => import("@/components/SpinRevealAnimation"), {
  ssr: false,
});

interface SpinRevealWrapperProps {
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

/**
 * Wrapper component for spin-reveal animation with device-tier detection
 *
 * - High-end devices (iOS, 8GB+ RAM): WebGL 3D version (SpinReveal3D)
 * - Medium/Low-end devices: CSS 3D fallback (SpinRevealAnimation)
 * - Checks WebGL support before using 3D version
 */
export default function SpinRevealWrapper(props: SpinRevealWrapperProps) {
  const [use3D, setUse3D] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check device capabilities
    const performanceTier = getDevicePerformanceTier();
    const hasWebGL = checkWebGLSupport();

    console.log(`[SpinRevealWrapper] Performance tier: ${performanceTier}, WebGL: ${hasWebGL}`);

    // Use 3D version only on high-end devices with WebGL support
    const shouldUse3D = performanceTier === 'high' && hasWebGL;
    setUse3D(shouldUse3D);
    setIsChecking(false);

    console.log(`[SpinRevealWrapper] Using ${shouldUse3D ? '3D WebGL' : 'CSS 3D fallback'} version`);
  }, []);

  // Don't render anything while checking
  if (isChecking) {
    return (
      <div className="relative w-full h-full bg-black">
        <img
          src={props.imageUrl}
          alt="Bottle"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    );
  }

  // Render appropriate component based on device tier
  if (use3D) {
    return <SpinReveal3D {...props} />;
  } else {
    return <SpinRevealAnimation {...props} />;
  }
}

/**
 * Check if browser supports WebGL
 */
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}
