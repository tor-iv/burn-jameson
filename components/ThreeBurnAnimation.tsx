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

// Paper burn effect with permanent holes
function SlowBurnFire({ boundingBox }: { boundingBox: BurnAnimationProps["boundingBox"] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const burnMeshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const burnMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const startTimeRef = useRef<number | null>(null);

  useFrame((state) => {
    if (materialRef.current) {
      if (startTimeRef.current === null) {
        startTimeRef.current = state.clock.elapsedTime;
      }
      const elapsed = state.clock.elapsedTime - startTimeRef.current;
      materialRef.current.uniforms.time.value = elapsed;
      if (burnMaterialRef.current) {
        burnMaterialRef.current.uniforms.time.value = elapsed;
      }
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
      if (burnMeshRef.current) {
        if (burnMeshRef.current.geometry) {
          burnMeshRef.current.geometry.dispose();
        }
        if (burnMeshRef.current.material) {
          (burnMeshRef.current.material as THREE.Material).dispose();
        }
      }
    };
  }, []);

  return (
    <>
      {/* Burn-through effect (darkens the bottle like burned paper) */}
      <mesh ref={burnMeshRef} position={[fireX, fireY, 0.5]}>
        <planeGeometry args={[fireWidth, fireHeight, 32, 32]} />
        <shaderMaterial
          ref={burnMaterialRef}
          transparent
          depthWrite={false}
          blending={THREE.MultiplyBlending}
          premultipliedAlpha={true}
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

            // Same noise functions
            float hash(vec2 p) {
              return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            float noise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);

              float a = hash(i);
              float b = hash(i + vec2(1.0, 0.0));
              float c = hash(i + vec2(0.0, 1.0));
              float d = hash(i + vec2(1.0, 1.0));

              return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            float fbm(vec2 p) {
              float value = 0.0;
              float amplitude = 0.5;
              float frequency = 1.0;

              for(int i = 0; i < 4; i++) {
                value += amplitude * noise(p * frequency);
                frequency *= 2.0;
                amplitude *= 0.5;
              }
              return value;
            }

            void main() {
              vec2 uv = vUv;

              // 5 second burn duration for slower, more dramatic effect
              float duration = 5.0;
              float progress = min(time / duration, 1.0);

              // Burn travels up the entire height - ensure it covers everything
              // Increased to 1.6 to guarantee full coverage to the very top
              float burnHeight = progress * 1.6;

              // Add organic edge variation with animation
              vec2 burnUv = uv * vec2(5.0, 8.0);
              float edgeNoise = fbm(burnUv + time * 0.3) * 0.2; // Animated edges

              // Create irregular, animated burn edge
              float burnEdge = uv.y - burnHeight + edgeNoise;

              // Burn-through darkness
              float darkness = 0.0;

              if (burnEdge < 0.0) {
                // This area is burned - it stays burned permanently
                float burnAge = burnHeight - uv.y;

                // Faster burn-through like thin paper
                if (burnAge > 0.1) {
                  // Fully burned through - PERMANENT dark hole that never fades
                  darkness = 0.92;

                  // Add subtle animated texture to burned holes
                  float burnTexture = fbm(uv * 25.0 + time * 0.15) * 0.08;
                  darkness = clamp(darkness + burnTexture, 0.85, 1.0);
                } else {
                  // Charring/darkening phase - quick transition
                  darkness = smoothstep(0.0, 0.1, burnAge) * 0.85;
                }

                // Add organic burn texture throughout for realism
                float organicTexture = fbm(uv * 15.0 + time * 0.05) * 0.08;
                darkness = clamp(darkness + organicTexture, 0.0, 1.0);

                // Add animated glowing edges at the burn boundary
                if (burnAge < 0.15) {
                  float glowEdge = 1.0 - (burnAge / 0.15);
                  float edgeGlow = glowEdge * fbm(uv * 35.0 + time * 0.8) * 0.12;
                  darkness = max(darkness, edgeGlow);
                }

                // Ensure burned areas stay very dark - no fading over time
                darkness = max(darkness, 0.75);
              }

              // Brown/black burned paper color
              vec3 charColor = vec3(0.1, 0.05, 0.0);

              gl_FragColor = vec4(charColor, darkness);
            }
          `}
        />
      </mesh>

      {/* Fire effect on top */}
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

          // Improved noise functions for more organic fire
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);

            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));

            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }

          // Fractal Brownian Motion for turbulent fire
          float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;

            for(int i = 0; i < 4; i++) {
              value += amplitude * noise(p * frequency);
              frequency *= 2.0;
              amplitude *= 0.5;
            }
            return value;
          }

          void main() {
            vec2 uv = vUv;

            // 5 second burn duration - slower for more impact
            float duration = 5.0;
            float progress = min(time / duration, 1.0);

            // Fire burns from bottom to top - ensure full coverage to the very top
            float burnHeight = progress * 1.6;

            // Create turbulent, organic flames
            vec2 flameUv = uv * vec2(3.0, 5.0);
            flameUv.y -= time * 1.2; // Rising flames

            // Multiple layers of turbulence for realistic fire
            float turbulence1 = fbm(flameUv + time * 0.5);
            float turbulence2 = fbm(flameUv * 1.5 + time * 0.8);
            float turbulence3 = fbm(flameUv * 2.5 - time * 0.3);

            // Combine turbulences for complex flame motion
            float flameTurbulence = (turbulence1 * 0.5 + turbulence2 * 0.3 + turbulence3 * 0.2);

            // Add horizontal distortion for flickering flames
            float distortion = (turbulence1 - 0.5) * 0.15;
            float distortedX = uv.x + distortion;

            // Distance from center for flame shape
            float centerDist = abs(distortedX - 0.5) * 2.0;

            // Flame shape: wider at bottom, pointed at top
            float flameShape = smoothstep(0.8, 0.2, centerDist) * smoothstep(0.0, 0.3, uv.y);

            // Create burn wave that moves upward with turbulence
            float distanceFromBurnLine = uv.y - burnHeight + flameTurbulence * 0.1;

            // Initialize fire intensity
            float fireIntensity = 0.0;

            // Burned area with HIGHLY persistent, intense flames that stay alive
            if (uv.y < burnHeight) {
              float timeSinceBurned = burnHeight - uv.y;

              // EXTREMELY slow decay - flames stay alive almost indefinitely
              // Only minimal reduction over distance (0.15 instead of 0.4)
              float persistentFlames = (1.0 - timeSinceBurned * 0.15) * flameShape;
              persistentFlames *= (0.85 + flameTurbulence * 0.15);

              // Very high baseline - burned areas stay extremely active
              fireIntensity = max(0.75, persistentFlames);

              // Add strong, animated ember patterns in burned areas
              float emberPattern = fbm(uv * 8.0 + time * 0.5);
              fireIntensity += emberPattern * 0.3;

              // Add flickering hot spots that dance around
              float hotSpots = fbm(uv * 12.0 - time * 0.3) * 0.25;
              fireIntensity += hotSpots;

              // Ensure flames never drop below a strong baseline
              fireIntensity = max(0.7, fireIntensity);
            }

            // Active burn line (brightest, most intense)
            float burnLineWidth = 0.2;
            float burnLineIntensity = smoothstep(burnLineWidth, 0.0, abs(distanceFromBurnLine));

            // Enhance burn line with turbulence
            burnLineIntensity *= (0.8 + flameTurbulence * 0.4);
            fireIntensity = max(fireIntensity, burnLineIntensity * 2.0);

            // Add dancing flames above burn line
            if (distanceFromBurnLine > -0.05 && distanceFromBurnLine < 0.3) {
              float flameHeight = (distanceFromBurnLine + 0.05) / 0.35;
              float dancingFlame = flameShape * (1.0 - flameHeight) * (0.7 + turbulence2 * 0.3);
              fireIntensity = max(fireIntensity, dancingFlame * 1.5);
            }

            // Edge fade for natural falloff
            float edgeFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);
            fireIntensity *= edgeFade;

            // Intense flickering using multiple noise layers
            float flicker = 0.8 +
                           turbulence1 * 0.15 +
                           sin(time * 12.0 + uv.x * 20.0) * 0.05;
            fireIntensity *= flicker;

            // Multi-layered fire colors for realism
            vec3 coreColor = vec3(1.0, 1.0, 0.9);      // White-hot core
            vec3 hotColor = vec3(1.0, 0.9, 0.3);       // Bright yellow
            vec3 warmColor = vec3(1.0, 0.5, 0.05);     // Orange
            vec3 emberColor = vec3(0.9, 0.2, 0.0);     // Deep red/ember
            vec3 smokeColor = vec3(0.15, 0.1, 0.08);   // Dark smoke

            // Color based on intensity and position
            vec3 fireColor;
            if (fireIntensity > 0.85) {
              // Core - white hot
              fireColor = mix(hotColor, coreColor, (fireIntensity - 0.85) / 0.15);
            } else if (fireIntensity > 0.6) {
              // Hot flames - yellow/orange
              fireColor = mix(warmColor, hotColor, (fireIntensity - 0.6) / 0.25);
            } else if (fireIntensity > 0.3) {
              // Warm flames - orange/red
              fireColor = mix(emberColor, warmColor, (fireIntensity - 0.3) / 0.3);
            } else {
              // Embers and smoke
              fireColor = mix(smokeColor, emberColor, fireIntensity / 0.3);
            }

            // Add ember sparkles at burn line
            float sparkle = 0.0;
            if (abs(distanceFromBurnLine) < 0.05) {
              float sparkleNoise = hash(vec2(uv.x * 50.0, time * 2.0));
              if (sparkleNoise > 0.95) {
                sparkle = (sparkleNoise - 0.95) * 20.0;
              }
            }
            fireColor = mix(fireColor, vec3(1.0, 0.9, 0.5), sparkle);

            // Dynamic brightness based on intensity
            float brightness = 1.8 + fireIntensity * 2.0 + burnLineIntensity * 1.5;

            // Enhanced alpha for more visible fire
            float alpha = fireIntensity * 0.9;

            gl_FragColor = vec4(fireColor * brightness, alpha);
          }
        `}
      />
    </mesh>
    </>
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
