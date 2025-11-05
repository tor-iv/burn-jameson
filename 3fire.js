'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BottleBurnAnimationProps {
  boundingBox: BoundingBox;
  isActive?: boolean;
  intensity?: number;
  onBurnComplete?: () => void;
}

export function BottleBurnAnimation({
  boundingBox,
  isActive = false,
  intensity = 1.0,
  onBurnComplete
}: BottleBurnAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<any>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) return;

    // Key insight: Canvas is LARGER than bounding box
    // Particles are free to move beyond the bottle rectangle
    const expandedWidth = boundingBox.width * 2;
    const expandedHeight = boundingBox.height * 1.5;

    const scene = new THREE.Scene();
    
    // Orthographic camera for 2D overlay
    const camera = new THREE.OrthographicCamera(
      -expandedWidth / 2,
      expandedWidth / 2,
      expandedHeight / 2,
      -expandedHeight / 2,
      0.1,
      1000
    );
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer.setSize(expandedWidth, expandedHeight);
    renderer.setClearColor(0x000000, 0);

    const canvas = renderer.domElement;
    canvas.style.position = 'absolute';
    // Position canvas so bottle is in center, but canvas extends beyond
    canvas.style.left = `${boundingBox.x - expandedWidth / 2}px`;
    canvas.style.top = `${boundingBox.y - expandedHeight / 2}px`;
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1000';

    containerRef.current.appendChild(canvas);

    // Create particles
    const bottleRadius = boundingBox.width / 4;
    const bottleHeight = boundingBox.height;
    const emberCount = 8000;
    const smokeCount = 3000;

    // Ember particles
    const emberGeometry = new THREE.BufferGeometry();
    const emberPositions = new Float32Array(emberCount * 3);
    const emberVelocities = new Float32Array(emberCount * 3);
    const emberSizes = new Float32Array(emberCount);
    const emberPhases = new Float32Array(emberCount);
    const emberTypes = new Float32Array(emberCount);

    for (let i = 0; i < emberCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const heightPos = Math.random() * bottleHeight * 0.8 - bottleHeight * 0.4;
      const radiusVar = bottleRadius * (0.7 + Math.random() * 0.5);

      emberPositions[i3] = Math.cos(angle) * radiusVar;
      emberPositions[i3 + 1] = heightPos;
      emberPositions[i3 + 2] = Math.sin(angle) * radiusVar * 0.3;

      emberVelocities[i3] = (Math.random() - 0.5) * 1.0;
      emberVelocities[i3 + 1] = 0.5 + Math.random() * 1.5;
      emberVelocities[i3 + 2] = (Math.random() - 0.5) * 0.5;

      emberSizes[i] = 2 + Math.random() * 6;
      emberPhases[i] = Math.random() * Math.PI * 2;
      emberTypes[i] = Math.random() > 0.85 ? 1.0 : 0.0;
    }

    emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    emberGeometry.setAttribute('velocity', new THREE.BufferAttribute(emberVelocities, 3));
    emberGeometry.setAttribute('size', new THREE.BufferAttribute(emberSizes, 1));
    emberGeometry.setAttribute('phase', new THREE.BufferAttribute(emberPhases, 1));
    emberGeometry.setAttribute('aType', new THREE.BufferAttribute(emberTypes, 1));

    const emberMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: intensity },
        burnProgress: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        attribute vec3 velocity;
        attribute float aType;
        
        uniform float time;
        uniform float intensity;
        uniform float burnProgress;
        
        varying float vPhase;
        varying vec3 vPosition;
        varying float vType;
        varying float vBurnFactor;
        
        void main() {
          vPhase = phase;
          vPosition = position;
          vType = aType;
          
          vec3 pos = position;
          
          float burnHeight = (burnProgress * 2.0 - 1.0) * ${bottleHeight * 0.5};
          vBurnFactor = smoothstep(burnHeight - 100.0, burnHeight + 100.0, pos.y);
          
          float activeZone = 1.0 - smoothstep(burnHeight - 50.0, burnHeight + 50.0, abs(pos.y - burnHeight));
          float flicker = sin(time * 10.0 + phase) * 3.0 * activeZone;
          pos.x += flicker * intensity;
          pos.z += cos(time * 10.0 + phase) * 3.0 * intensity * activeZone;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * intensity * (0.8 + burnProgress * 0.2);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying float vPhase;
        varying vec3 vPosition;
        varying float vType;
        varying float vBurnFactor;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          if (vBurnFactor > 0.8) discard;
          
          float heightFade = 1.0 - smoothstep(${-bottleHeight * 0.5}, ${bottleHeight * 0.6}, vPosition.y);
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.5;
          alpha *= heightFade * (1.0 - vBurnFactor);
          
          vec3 finalColor;
          if (vType > 0.5) {
            float brightness = 1.0 - dist * 0.8;
            finalColor = vec3(1.0, 0.3 + brightness * 0.2, 0.0) * (0.9 + brightness * 0.3);
          } else {
            float heightMix = (vPosition.y + ${bottleHeight * 0.5}) / ${bottleHeight * 1.5};
            vec3 orange = vec3(0.9, 0.25, 0.0);
            vec3 yellow = vec3(1.0, 0.65, 0.05);
            finalColor = mix(orange, yellow, heightMix) * 0.7;
          }
          
          float flicker = 0.85 + sin(time * 6.0 + vPhase) * 0.15;
          finalColor *= flicker;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const embers = new THREE.Points(emberGeometry, emberMaterial);
    scene.add(embers);

    // Smoke particles
    const smokeGeometry = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeVelocities = new Float32Array(smokeCount * 3);
    const smokeSizes = new Float32Array(smokeCount);
    const smokePhases = new Float32Array(smokeCount);
    const smokeLifetimes = new Float32Array(smokeCount);

    for (let i = 0; i < smokeCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * bottleRadius * 1.8;
      const heightPos = Math.random() * bottleHeight * 0.6 - bottleHeight * 0.3;

      smokePositions[i3] = Math.cos(angle) * radius;
      smokePositions[i3 + 1] = heightPos;
      smokePositions[i3 + 2] = Math.sin(angle) * radius * 0.3;

      smokeVelocities[i3] = (Math.random() - 0.5) * 1.5;
      smokeVelocities[i3 + 1] = 0.5 + Math.random() * 1.0;
      smokeVelocities[i3 + 2] = (Math.random() - 0.5) * 1.5;

      smokeSizes[i] = 5 + Math.random() * 15;
      smokePhases[i] = Math.random() * Math.PI * 2;
      smokeLifetimes[i] = Math.random();
    }

    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    smokeGeometry.setAttribute('velocity', new THREE.BufferAttribute(smokeVelocities, 3));
    smokeGeometry.setAttribute('size', new THREE.BufferAttribute(smokeSizes, 1));
    smokeGeometry.setAttribute('phase', new THREE.BufferAttribute(smokePhases, 1));
    smokeGeometry.setAttribute('lifetime', new THREE.BufferAttribute(smokeLifetimes, 1));

    const smokeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        burnProgress: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        uniform float time;
        uniform float burnProgress;
        varying vec3 vPosition;
        varying float vLifetime;
        attribute float lifetime;
        
        void main() {
          vLifetime = lifetime;
          vPosition = position;
          vec3 pos = position;
          float drift = sin(time + phase) * 5.0 * (position.y / 200.0);
          pos.x += drift;
          pos.z += cos(time + phase) * 5.0 * (position.y / 200.0);
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float expansion = 1.0 + (position.y / 200.0) * 2.0;
          gl_PointSize = size * expansion * burnProgress;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float burnProgress;
        varying vec3 vPosition;
        varying float vLifetime;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.3;
          float heightFade = 1.0 - smoothstep(100.0, 500.0, vPosition.y);
          alpha *= heightFade * vLifetime * burnProgress;
          
          gl_FragColor = vec4(0.1, 0.1, 0.1, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
    scene.add(smoke);

    // Animation
    let time = 0;
    let burnProgress = 0;
    const clock = new THREE.Clock();

    function animate() {
      const delta = clock.getDelta();
      time += delta;

      if (isActive && burnProgress < 1) {
        burnProgress = Math.min(1, burnProgress + delta * 0.3);
        
        if (burnProgress >= 1 && onBurnComplete) {
          onBurnComplete();
        }
      }

      // Update embers
      const positions = emberGeometry.attributes.position.array as Float32Array;
      const velocities = emberGeometry.attributes.velocity.array as Float32Array;

      for (let i = 0; i < emberCount; i++) {
        const i3 = i * 3;

        if (burnProgress > 0.1) {
          positions[i3] += velocities[i3] * intensity * burnProgress;
          positions[i3 + 1] += velocities[i3 + 1] * intensity * burnProgress;
          positions[i3 + 2] += velocities[i3 + 2] * intensity * burnProgress;

          positions[i3] += Math.sin(time * 5 + i * 0.1) * 0.2;
          positions[i3 + 2] += Math.cos(time * 5 + i * 0.1) * 0.2;
        }

        if (positions[i3 + 1] > bottleHeight * 0.6) {
          const angle = Math.random() * Math.PI * 2;
          const heightPos = Math.random() * bottleHeight * 0.8 - bottleHeight * 0.4;
          const radius = bottleRadius * (0.7 + Math.random() * 0.5);

          positions[i3] = Math.cos(angle) * radius;
          positions[i3 + 1] = heightPos;
          positions[i3 + 2] = Math.sin(angle) * radius * 0.3;
        }
      }

      emberGeometry.attributes.position.needsUpdate = true;
      emberMaterial.uniforms.time.value = time;
      emberMaterial.uniforms.intensity.value = intensity;
      emberMaterial.uniforms.burnProgress.value = burnProgress;

      // Update smoke
      if (burnProgress > 0.3) {
        const smokePos = smokeGeometry.attributes.position.array as Float32Array;
        const smokeVel = smokeGeometry.attributes.velocity.array as Float32Array;
        const lifetimes = smokeGeometry.attributes.lifetime.array as Float32Array;

        for (let i = 0; i < smokeCount; i++) {
          const i3 = i * 3;

          smokePos[i3] += smokeVel[i3];
          smokePos[i3 + 1] += smokeVel[i3 + 1];
          smokePos[i3 + 2] += smokeVel[i3 + 2];

          lifetimes[i] += delta * 0.1;

          if (smokePos[i3 + 1] > bottleHeight * 0.8 || lifetimes[i] > 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * bottleRadius * 1.8;

            smokePos[i3] = Math.cos(angle) * radius;
            smokePos[i3 + 1] = Math.random() * 50 - bottleHeight * 0.3;
            smokePos[i3 + 2] = Math.sin(angle) * radius * 0.3;

            lifetimes[i] = 0;
          }
        }

        smokeGeometry.attributes.position.needsUpdate = true;
        smokeGeometry.attributes.lifetime.needsUpdate = true;
      }

      smokeMaterial.uniforms.time.value = time;
      smokeMaterial.uniforms.burnProgress.value = burnProgress;

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    effectRef.current = { renderer, scene, camera };

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      emberGeometry.dispose();
      emberMaterial.dispose();
      smokeGeometry.dispose();
      smokeMaterial.dispose();
      renderer.dispose();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [boundingBox, isActive, intensity, onBurnComplete]);

  return <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }} />;
}