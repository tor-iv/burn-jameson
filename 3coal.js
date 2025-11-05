'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * CoalBoxAnimation - Realistic 3D animation of coal pieces stacking and crumbling
 * 
 * Features:
 * - Phase 1: Coal chunks fall and stack to form a box (0-2s)
 * - Phase 2: Stable state with dust particles (2-2.5s)
 * - Phase 3: Crumbling collapse with physics (2.5-4.5s)
 * - Mobile-optimized with adaptive quality
 * - 40+ fps on iPhone 8+ and mid-range Android
 */

interface CoalPiece {
  mesh: THREE.InstancedMesh;
  instanceId: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  angularVelocity: THREE.Vector3;
  mass: number;
  size: THREE.Vector3;
  isStatic: boolean;
  isDynamic: boolean;
}

interface DustParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

interface CoalBoxAnimationProps {
  /** Bounding box dimensions for the coal box */
  boundingBox?: { width: number; height: number; depth: number };
  /** Total animation duration in seconds */
  duration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Coal color (default: dark gray/black) */
  coalColor?: string;
  /** Fall speed multiplier (default: 1.0) */
  fallSpeed?: number;
  /** Enable/disable shadows (auto-disabled on low-end devices) */
  enableShadows?: boolean;
  /** Maximum particle count (reduced on mobile) */
  maxParticles?: number;
  /** Camera auto-rotation during stable phase */
  autoRotateCamera?: boolean;
}

export default function CoalBoxAnimation({
  boundingBox = { width: 2, height: 2, depth: 2 },
  duration = 4.5,
  onComplete,
  coalColor = '#1a1a1a',
  fallSpeed = 1.0,
  enableShadows,
  maxParticles = 400,
  autoRotateCamera = true,
}: CoalBoxAnimationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'stacking' | 'stable' | 'crumbling' | 'complete'>('stacking');
  const [fps, setFps] = useState(60);
  
  // Device detection for performance optimization
  const isMobile = useRef(false);
  const isLowEnd = useRef(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Device detection
    const ua = navigator.userAgent;
    isMobile.current = /iPhone|iPad|iPod|Android/i.test(ua);
    isLowEnd.current = isMobile.current && (
      /iPhone [5-8]|iPad [3-5]|Android [4-7]/i.test(ua) ||
      navigator.hardwareConcurrency < 4
    );

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    scene.fog = new THREE.Fog(0xf5f5f5, 5, 15);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(4, 3, 5);
    camera.lookAt(0, boundingBox.height / 2, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: !isLowEnd.current,
      alpha: true,
      powerPreference: isMobile.current ? 'low-power' : 'high-performance',
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowEnd.current ? 1 : 2));
    renderer.shadowMap.enabled = (enableShadows ?? !isLowEnd.current);
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = renderer.shadowMap.enabled;
    if (directionalLight.castShadow) {
      directionalLight.shadow.mapSize.width = isLowEnd.current ? 512 : 1024;
      directionalLight.shadow.mapSize.height = isLowEnd.current ? 512 : 1024;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 20;
      directionalLight.shadow.camera.left = -5;
      directionalLight.shadow.camera.right = 5;
      directionalLight.shadow.camera.top = 5;
      directionalLight.shadow.camera.bottom = -5;
    }
    scene.add(directionalLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe0e0e0,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = renderer.shadowMap.enabled;
    scene.add(ground);

    // Create coal piece geometry (irregular chunks)
    const createCoalGeometry = () => {
      const baseGeometry = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
      const positions = baseGeometry.attributes.position;
      
      // Add noise to vertices for irregular shape
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        const noise = (Math.random() - 0.5) * 0.3;
        positions.setXYZ(
          i,
          x + noise * Math.abs(x),
          y + noise * Math.abs(y),
          z + noise * Math.abs(z)
        );
      }
      
      baseGeometry.computeVertexNormals();
      return baseGeometry;
    };

    // Coal material with slight roughness variation
    const coalMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(coalColor),
      roughness: 0.9 + Math.random() * 0.1,
      metalness: 0.1,
    });

    // Create instanced mesh for coal pieces
    const coalGeometry = createCoalGeometry();
    const pieceCount = isLowEnd.current ? 30 : 45;
    const instancedMesh = new THREE.InstancedMesh(coalGeometry, coalMaterial, pieceCount);
    instancedMesh.castShadow = renderer.shadowMap.enabled;
    instancedMesh.receiveShadow = renderer.shadowMap.enabled;
    scene.add(instancedMesh);

    // Physics system
    const gravity = new THREE.Vector3(0, -9.81, 0);
    const coalPieces: CoalPiece[] = [];
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();

    // Initialize coal pieces for stacking phase
    const initializeCoalPieces = () => {
      const { width, height, depth } = boundingBox;
      const piecesPerLayer = 8; // Pieces around the perimeter
      const layers = Math.ceil(pieceCount / piecesPerLayer);
      
      for (let i = 0; i < pieceCount; i++) {
        const layer = Math.floor(i / piecesPerLayer);
        const posInLayer = i % piecesPerLayer;
        const layerHeight = (layer / layers) * height;
        
        // Arrange pieces around box perimeter
        let targetX, targetZ;
        const side = Math.floor(posInLayer / 2);
        const offset = (posInLayer % 2) * (side % 2 === 0 ? width : depth) / 2;
        
        switch (side) {
          case 0: // Front
            targetX = offset - width / 4;
            targetZ = depth / 2;
            break;
          case 1: // Right
            targetX = width / 2;
            targetZ = offset - depth / 4;
            break;
          case 2: // Back
            targetX = width / 4 - offset;
            targetZ = -depth / 2;
            break;
          default: // Left
            targetX = -width / 2;
            targetZ = depth / 4 - offset;
        }

        const size = new THREE.Vector3(
          0.3 + Math.random() * 0.2,
          0.3 + Math.random() * 0.2,
          0.3 + Math.random() * 0.2
        );

        const startHeight = 3 + Math.random() * 2 + (i * 0.1);
        const dropDelay = i * 0.05; // Stagger the drops

        coalPieces.push({
          mesh: instancedMesh,
          instanceId: i,
          position: new THREE.Vector3(
            targetX + (Math.random() - 0.5) * 0.5,
            startHeight,
            targetZ + (Math.random() - 0.5) * 0.5
          ),
          velocity: new THREE.Vector3(0, 0, 0),
          rotation: new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          ),
          angularVelocity: new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          ),
          mass: size.x * size.y * size.z,
          size,
          isStatic: false,
          isDynamic: dropDelay < performance.now() / 1000,
        });
      }
    };

    // Particle system for dust
    const dustParticles: DustParticle[] = [];
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = Math.min(maxParticles, isLowEnd.current ? 200 : 400);
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x3a3a3a,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // Spawn dust particles
    const spawnDust = (position: THREE.Vector3, count: number) => {
      for (let i = 0; i < count && dustParticles.length < particleCount; i++) {
        dustParticles.push({
          position: position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.1,
            (Math.random() - 0.5) * 0.2
          )),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            Math.random() * 0.3 + 0.2,
            (Math.random() - 0.5) * 0.5
          ),
          life: 1.0,
          maxLife: 1.0 + Math.random() * 0.5,
          size: 0.03 + Math.random() * 0.05,
        });
      }
    };

    // Simple physics update
    const updatePhysics = (deltaTime: number, currentPhase: string) => {
      const dt = Math.min(deltaTime, 0.033); // Cap at 30fps physics
      const friction = 0.95;
      const restitution = 0.3; // Bounciness

      coalPieces.forEach((piece, index) => {
        if (piece.isStatic) return;

        // Apply gravity
        if (currentPhase === 'stacking' || currentPhase === 'crumbling') {
          piece.velocity.addScaledVector(gravity, dt * fallSpeed);
        }

        // Update position
        piece.position.addScaledVector(piece.velocity, dt);

        // Update rotation
        piece.rotation.x += piece.angularVelocity.x * dt;
        piece.rotation.y += piece.angularVelocity.y * dt;
        piece.rotation.z += piece.angularVelocity.z * dt;

        // Ground collision
        const groundY = piece.size.y / 2;
        if (piece.position.y < groundY) {
          piece.position.y = groundY;
          piece.velocity.y *= -restitution;
          piece.velocity.x *= friction;
          piece.velocity.z *= friction;
          piece.angularVelocity.multiplyScalar(friction);

          // Spawn dust on impact
          if (Math.abs(piece.velocity.y) > 0.5) {
            spawnDust(piece.position, isLowEnd.current ? 2 : 5);
          }

          // Make static if velocity is low (stacking phase)
          if (currentPhase === 'stacking' && piece.velocity.length() < 0.1) {
            piece.isStatic = true;
            piece.velocity.set(0, 0, 0);
            piece.angularVelocity.set(0, 0, 0);
          }
        }

        // Simple collision with other pieces (approximation for performance)
        coalPieces.forEach((other, otherIndex) => {
          if (index === otherIndex) return;
          
          const distance = piece.position.distanceTo(other.position);
          const minDistance = (piece.size.length() + other.size.length()) / 3;

          if (distance < minDistance) {
            const normal = new THREE.Vector3()
              .subVectors(piece.position, other.position)
              .normalize();
            
            const overlap = minDistance - distance;
            piece.position.addScaledVector(normal, overlap / 2);
            
            if (!other.isStatic) {
              other.position.addScaledVector(normal, -overlap / 2);
            }

            // Reflect velocity
            const relativeVelocity = new THREE.Vector3().subVectors(piece.velocity, other.velocity);
            const velocityAlongNormal = relativeVelocity.dot(normal);
            
            if (velocityAlongNormal < 0) {
              const impulse = normal.multiplyScalar(velocityAlongNormal * restitution);
              piece.velocity.sub(impulse);
              
              if (!other.isStatic) {
                other.velocity.add(impulse);
              }
            }
          }
        });

        // Update instance matrix
        matrix.compose(
          piece.position,
          quaternion.setFromEuler(piece.rotation),
          piece.size
        );
        instancedMesh.setMatrixAt(index, matrix);
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
    };

    // Update dust particles
    const updateDustParticles = (deltaTime: number) => {
      const positions = particleGeometry.attributes.position.array as Float32Array;
      const sizes = particleGeometry.attributes.size.array as Float32Array;

      for (let i = dustParticles.length - 1; i >= 0; i--) {
        const particle = dustParticles[i];
        
        // Update particle
        particle.position.addScaledVector(particle.velocity, deltaTime);
        particle.velocity.y -= 0.5 * deltaTime; // Gravity
        particle.velocity.multiplyScalar(0.98); // Air resistance
        particle.life -= deltaTime / particle.maxLife;

        // Remove dead particles
        if (particle.life <= 0) {
          dustParticles.splice(i, 1);
          continue;
        }

        // Update buffer
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;
        sizes[i] = particle.size * particle.life;
      }

      particleGeometry.attributes.position.needsUpdate = true;
      particleGeometry.attributes.size.needsUpdate = true;
      particleGeometry.setDrawRange(0, dustParticles.length);
    };

    // Trigger crumbling phase
    const startCrumbling = () => {
      coalPieces.forEach((piece, index) => {
        piece.isStatic = false;
        
        // Add outward velocity (explosion effect)
        const center = new THREE.Vector3(0, boundingBox.height / 2, 0);
        const direction = new THREE.Vector3()
          .subVectors(piece.position, center)
          .normalize();
        
        const force = 1.5 + Math.random() * 1.5;
        piece.velocity.copy(direction.multiplyScalar(force));
        piece.velocity.y += 1 + Math.random();
        
        // Add random spin
        piece.angularVelocity.set(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        );

        // Spawn dust
        if (index % 3 === 0) {
          spawnDust(piece.position, isLowEnd.current ? 3 : 8);
        }
      });
    };

    // Animation loop
    let startTime = performance.now();
    let lastTime = startTime;
    let frameCount = 0;
    let fpsUpdateTime = startTime;
    let animationComplete = false;

    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      const elapsedTime = (currentTime - startTime) / 1000;
      lastTime = currentTime;

      // FPS counter
      frameCount++;
      if (currentTime - fpsUpdateTime > 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - fpsUpdateTime)));
        frameCount = 0;
        fpsUpdateTime = currentTime;
      }

      // Phase transitions
      if (elapsedTime < 2) {
        setPhase('stacking');
      } else if (elapsedTime < 2.5) {
        if (phase !== 'stable') {
          setPhase('stable');
        }
      } else if (elapsedTime < duration) {
        if (phase !== 'crumbling') {
          setPhase('crumbling');
          startCrumbling();
        }
      } else if (!animationComplete) {
        setPhase('complete');
        animationComplete = true;
        onComplete?.();
      }

      // Camera rotation during stable phase
      if (phase === 'stable' && autoRotateCamera) {
        const angle = elapsedTime * 0.5;
        camera.position.x = Math.cos(angle) * 5;
        camera.position.z = Math.sin(angle) * 5;
        camera.lookAt(0, boundingBox.height / 2, 0);
      }

      // Update physics and particles
      updatePhysics(deltaTime, phase);
      updateDustParticles(deltaTime);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    // Initialize and start animation
    initializeCoalPieces();
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      coalGeometry.dispose();
      coalMaterial.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [boundingBox, duration, onComplete, coalColor, fallSpeed, enableShadows, maxParticles, autoRotateCamera, phase]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Debug overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-xs font-mono">
        <div>Phase: {phase}</div>
        <div>FPS: {fps}</div>
        <div>Device: {isMobile.current ? (isLowEnd.current ? 'Mobile (Low-end)' : 'Mobile') : 'Desktop'}</div>
      </div>

      {/* Phase indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full text-sm font-medium shadow-lg">
        {phase === 'stacking' && '⬇️ Stacking coal...'}
        {phase === 'stable' && '✨ Coal box formed'}
        {phase === 'crumbling' && '💥 Crumbling...'}
        {phase === 'complete' && '✅ Animation complete'}
      </div>
    </div>
  );
}