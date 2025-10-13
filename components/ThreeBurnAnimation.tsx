"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface BurnAnimationProps {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
}

// Simple slow burn effect with correct positioning
function SlowBurnFire({ boundingBox }: { boundingBox: BurnAnimationProps["boundingBox"] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const startTimeRef = useRef<number | null>(null);

  useFrame((state) => {
    if (materialRef.current) {
      if (startTimeRef.current === null) {
        startTimeRef.current = state.clock.elapsedTime;
      }
      const elapsed = state.clock.elapsedTime - startTimeRef.current;
      materialRef.current.uniforms.time.value = elapsed;
    }
  });

  // Get viewport dimensions
  const { viewport } = useThree();

  // Convert normalized coordinates to viewport space
  // Note: Three.js uses center origin, so we need to adjust
  const fireX = (boundingBox.x + boundingBox.width / 2 - 0.5) * viewport.width;
  const fireY = (0.5 - (boundingBox.y + boundingBox.height / 2)) * viewport.height;
  const fireWidth = boundingBox.width * viewport.width;
  const fireHeight = boundingBox.height * viewport.height;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (meshRef.current) {
        if (meshRef.current.geometry) {
          meshRef.current.geometry.dispose();
        }
        if (meshRef.current.material) {
          (meshRef.current.material as THREE.Material).dispose();
        }
      }
    };
  }, []);

  return (
    <mesh ref={meshRef} position={[fireX, fireY, 1]}>
      <planeGeometry args={[fireWidth, fireHeight, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          time: { value: 0 },
        }}
        vertexShader={`
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          varying vec2 vUv;

          // Simple noise function
          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }

          void main() {
            vec2 uv = vUv;

            // 3 second animation duration
            float duration = 3.0;
            float progress = min(time / duration, 1.0);

            // Fire burns from bottom (uv.y = 0) to top (uv.y = 1)
            // Progress 0.0 = no burn, 1.0 = fully burned
            float burnHeight = progress * 1.3; // Slightly over 1.0 to ensure full coverage

            // Create burn wave that moves upward
            float distanceFromBurnLine = uv.y - burnHeight;

            // Fire intensity: bright at the burn line, then stays burned
            float fireIntensity = 0.0;

            if (uv.y < burnHeight) {
              // Already burned area - keep it burning (not fading)
              float timeSinceBurned = burnHeight - uv.y;
              fireIntensity = 0.7 + 0.3 * smoothstep(0.3, 0.0, timeSinceBurned);
            }

            // Active burn line (brightest part)
            float burnLineWidth = 0.15;
            float burnLineIntensity = smoothstep(burnLineWidth, 0.0, abs(distanceFromBurnLine));
            fireIntensity = max(fireIntensity, burnLineIntensity * 1.5);

            // Side edges fade slightly
            fireIntensity *= smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x);

            // Add simple flickering
            float flicker = noise(vec2(uv.x * 10.0, time * 8.0)) * 0.2 + 0.8;
            fireIntensity *= flicker;

            // Fire color - bright yellow/orange with variation
            vec3 hotColor = vec3(1.0, 0.9, 0.4); // White-hot
            vec3 warmColor = vec3(1.0, 0.5, 0.1); // Orange
            vec3 fireColor = mix(warmColor, hotColor, burnLineIntensity);

            // Brighter overall
            float brightness = 2.5 + fireIntensity * 1.5;

            gl_FragColor = vec4(fireColor * brightness, fireIntensity * 0.85);
          }
        `}
      />
    </mesh>
  );
}

// Main scene component
function BurnScene({ boundingBox }: { boundingBox: BurnAnimationProps["boundingBox"] }) {
  return (
    <>
      <SlowBurnFire boundingBox={boundingBox} />
    </>
  );
}

export default function ThreeBurnAnimation({ boundingBox, imageUrl }: BurnAnimationProps) {
  // Validate bounding box
  const safeBoundingBox = useMemo(() => {
    const box = { ...boundingBox };

    // Ensure values are valid numbers and within bounds
    box.x = Math.max(0, Math.min(1, box.x || 0));
    box.y = Math.max(0, Math.min(1, box.y || 0));
    box.width = Math.max(0.1, Math.min(1, box.width || 0.5));
    box.height = Math.max(0.1, Math.min(1, box.height || 0.5));

    // Ensure box doesn't go out of bounds
    if (box.x + box.width > 1) {
      box.width = 1 - box.x;
    }
    if (box.y + box.height > 1) {
      box.height = 1 - box.y;
    }

    return box;
  }, [boundingBox]);

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        orthographic
      >
        <BurnScene boundingBox={safeBoundingBox} />
      </Canvas>
    </div>
  );
}
