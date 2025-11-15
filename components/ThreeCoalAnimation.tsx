'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { BurnAnimationProps } from '../types/animations';

/**
 * ThreeCoalAnimation - Simple 2D particle-based coal dust animation
 *
 * Features:
 * - Phase 1: Coal dust particles fall and accumulate (0-3s)
 * - Phase 2: Stable state with gentle settling (3-4s)
 * - Phase 3: Particles scatter outward (4-6s)
 * - Fully 2D (Z=0) for guaranteed rendering
 * - Mobile-optimized
 */

interface CoalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  settled: boolean;
}

export default function ThreeCoalAnimation({
  boundingBox,
  imageUrl,
  onBurnComplete
}: BurnAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'falling' | 'stable' | 'scattering' | 'complete'>('falling');

  // Stable callback ref pattern
  const callbackRef = useRef(onBurnComplete);
  callbackRef.current = onBurnComplete;

  console.log('[ThreeCoalAnimation] 🎬 Component render', { phase, boundingBox });

  useEffect(() => {
    console.log('[ThreeCoalAnimation] 🚀 useEffect start');

    if (!containerRef.current || !canvasRef.current) {
      console.warn('[ThreeCoalAnimation] ⚠️ Missing refs');
      return;
    }

    console.log('[ThreeCoalAnimation] ✅ Refs validated');

    // Viewport setup
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Three.js scene setup
    const scene = new THREE.Scene();
    scene.background = null; // Transparent

    // Orthographic camera
    const aspect = W / H;
    const frustumSize = 10;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: false // Faster
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    console.log('[ThreeCoalAnimation] ✅ Scene created', { W, H, aspect, frustumSize });

    // Map bounding box to world coordinates
    const bottleCenterX = boundingBox.x + boundingBox.width / 2;
    const bottleBottomY = boundingBox.y + boundingBox.height;
    const worldX = (bottleCenterX - 0.5) * frustumSize * aspect;
    const worldY = (0.5 - bottleBottomY) * frustumSize;
    const boxWidth = boundingBox.width * frustumSize * aspect;
    const boxHeight = boundingBox.height * frustumSize;

    console.log('[ThreeCoalAnimation] 📍 Position', { worldX, worldY, boxWidth, boxHeight });

    // Particle system
    const particleCount = 500; // More particles for fuller effect
    const particles: CoalParticle[] = [];

    // Three.js particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const opacities = new Float32Array(particleCount);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    // Shader material for coal particles
    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying float vOpacity;

        void main() {
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vOpacity;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Dark coal color with some variation
          vec3 coalColor = vec3(0.1, 0.1, 0.1);
          gl_FragColor = vec4(coalColor, vOpacity * (1.0 - dist * 2.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: worldX + (Math.random() - 0.5) * boxWidth * 0.8,
        y: worldY + boxHeight + Math.random() * 2,
        vx: (Math.random() - 0.5) * 0.05,
        vy: -0.5 - Math.random() * 0.5, // Falling speed
        size: 0.05 + Math.random() * 0.1,
        opacity: 0.8 + Math.random() * 0.2,
        settled: false
      });
    }

    console.log('[ThreeCoalAnimation] ✅ Created', particleCount, 'particles');

    // Animation state
    const startTime = performance.now();
    let animationComplete = false;

    // Animation loop
    const animate = () => {
      const currentTime = performance.now();
      const elapsed = (currentTime - startTime) / 1000;

      // Phase transitions
      if (elapsed < 3) {
        setPhase('falling');
      } else if (elapsed < 4) {
        setPhase('stable');
      } else if (elapsed < 6) {
        setPhase('scattering');
      } else if (!animationComplete) {
        setPhase('complete');
        animationComplete = true;
        callbackRef.current?.();
      }

      // Update particles based on phase
      particles.forEach((p, i) => {
        if (elapsed < 3) {
          // FALLING PHASE: Particles fall and accumulate
          if (!p.settled) {
            p.vy += -0.02; // Gravity
            p.x += p.vx;
            p.y += p.vy * 0.016; // Delta time ~16ms

            // Hit ground
            if (p.y <= worldY + p.size) {
              p.y = worldY + p.size;
              p.vy = 0;
              p.vx *= 0.9;
              p.settled = true;
            }

            // Keep in bounds
            const leftWall = worldX - boxWidth / 2;
            const rightWall = worldX + boxWidth / 2;
            if (p.x < leftWall) p.x = leftWall;
            if (p.x > rightWall) p.x = rightWall;
          }
        } else if (elapsed >= 3 && elapsed < 4) {
          // STABLE PHASE: Gentle settling
          if (!p.settled && p.y > worldY) {
            p.y -= 0.01;
            if (p.y <= worldY + p.size) {
              p.y = worldY + p.size;
              p.settled = true;
            }
          }
        } else if (elapsed >= 4) {
          // SCATTERING PHASE: Explosion outward
          if (p.settled) {
            p.settled = false;
            const centerDist = Math.abs(p.x - worldX);
            const direction = p.x > worldX ? 1 : -1;
            p.vx = direction * (0.5 + Math.random() * 0.5);
            p.vy = 1 + Math.random() * 1.5;
          }
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;
          p.vy -= 0.05; // Gravity
          p.opacity *= 0.99; // Fade out
        }

        // Update Three.js buffer
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = 0; // Always Z=0 (2D)
        sizes[i] = p.size * 100;
        opacities[i] = p.opacity;
      });

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;
      geometry.attributes.opacity.needsUpdate = true;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    console.log('[ThreeCoalAnimation] 🎬 Starting animation loop');
    animate();

    // Resize handler
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const newAspect = width / height;

      camera.left = -frustumSize * newAspect / 2;
      camera.right = frustumSize * newAspect / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      console.log('[ThreeCoalAnimation] 🧹 Cleanup');
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []); // Empty deps - run once

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ zIndex: 10, pointerEvents: 'none' }}
      />

      {/* Debug overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-xs font-mono" style={{ zIndex: 20 }}>
        <div>Phase: {phase}</div>
        <div>Animation: Coal Dust (2D)</div>
      </div>

      {/* Phase indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full text-sm font-medium shadow-lg" style={{ zIndex: 20 }}>
        {phase === 'falling' && '⬇️ Coal dust falling...'}
        {phase === 'stable' && '✨ Coal settled'}
        {phase === 'scattering' && '💥 Scattering...'}
        {phase === 'complete' && '✅ Complete'}
      </div>
    </div>
  );
}
