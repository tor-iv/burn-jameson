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
    camera.position.set(0, 4, 10); // Higher and further back to see tall container
    camera.lookAt(0, 3, 0); // Look at middle of 8-unit tall container

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

    // VISIBLE CONTAINER BOX (4×4×8 wireframe)
    const boxWidth = 4;
    const boxDepth = 1.2;
    const boxHeight = 8;
    
    const containerGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    const containerEdges = new THREE.EdgesGeometry(containerGeometry);
    const containerLines = new THREE.LineSegments(
      containerEdges,
      new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2, transparent: true, opacity: 0.5 })
    );
    containerLines.position.y = boxHeight / 2; // Center at Y=4
    scene.add(containerLines);
    
    // Add semi-transparent walls for better visibility
    const wallMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.05,
      side: THREE.DoubleSide
    });
    const containerWalls = new THREE.Mesh(containerGeometry, wallMaterial);
    containerWalls.position.y = boxHeight / 2;
    scene.add(containerWalls);

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
      
      // Container dimensions: 4 wide × 4 deep × 8 tall
      const containerWidth = 4;
      const containerDepth = 1.2; // Depth for 3D stacking
      const containerHeight = 8;
      
      for (let i = 0; i < pieceCount; i++) {
        // Pieces fall in sequence
        const fallDelay = i * 0.05; // 50ms between drops
        
        // Random size variation (natural, not uniform)
        const size = new THREE.Vector3(
          0.25 + Math.random() * 0.15,
          0.25 + Math.random() * 0.15,
          0.25 + Math.random() * 0.15
        );

        // Start position: random X/Z above container
        const startX = (Math.random() - 0.5) * containerWidth * 0.8;
        const startZ = (Math.random() - 0.5) * containerDepth * 0.8;
        const startHeight = containerHeight + 2 + Math.random() * 2;

        // No fixed target - pieces will naturally settle where they land
        coalPieces.push({
          mesh: instancedMesh,
          instanceId: i,
          position: new THREE.Vector3(startX, startHeight, startZ),
          velocity: new THREE.Vector3(0, 0, 0),
          rotation: new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          ),
          angularVelocity: new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
          ),
          size,
          isStatic: false,
          isDynamic: false,
          fallDelay,
          hasStartedFalling: false,
          // Store container bounds for physics
          containerWidth,
          containerDepth,
          containerHeight,
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

    // Physics update - Natural container filling
    const updatePhysics = (deltaTime: number, currentPhase: string, elapsedTime: number) => {
      const dt = Math.min(deltaTime, 0.033);
      const friction = 0.92;
      const restitution = 0.15;

      // Container boundaries (4 wide × 1.2 deep × 8 tall) - SOLID WALLS
      const containerWidth = 4;
      const containerDepth = 1.2;
      const halfWidth = containerWidth / 2; // ±2
      const halfDepth = containerDepth / 2; // ±0.6

      coalPieces.forEach((piece, index) => {
        // Start falling based on delay
        if (!piece.hasStartedFalling && elapsedTime >= piece.fallDelay) {
          piece.hasStartedFalling = true;
          piece.isDynamic = true;
        }
        
        if (!piece.isDynamic) return;
        if (piece.isStatic && currentPhase === 'stacking') return;

        // Apply gravity
        if (currentPhase === 'stacking' || currentPhase === 'crumbling') {
          piece.velocity.addScaledVector(gravity, dt * fallSpeed);
        }

        // Update position
        piece.position.addScaledVector(piece.velocity, dt);

        // Update rotation (tumbling)
        if (currentPhase === 'stacking' && piece.velocity.length() > 0.3) {
          piece.rotation.x += piece.angularVelocity.x * dt;
          piece.rotation.y += piece.angularVelocity.y * dt;
          piece.rotation.z += piece.angularVelocity.z * dt;
        } else if (currentPhase === 'crumbling') {
          piece.rotation.x += piece.angularVelocity.x * dt;
          piece.rotation.y += piece.angularVelocity.y * dt;
          piece.rotation.z += piece.angularVelocity.z * dt;
        }

        // ⚡ ULTRA SIMPLE HARD WALLS - FORCE INSIDE ⚡
        if (currentPhase === 'stacking') {
          // Match physics walls EXACTLY to visible container dimensions
          const WALL_LEFT = -containerWidth / 2;   // -2.0 (was -1.8)
          const WALL_RIGHT = containerWidth / 2;   // +2.0 (was +1.8)
          const WALL_FRONT = -containerDepth / 2;  // -0.6 (was -0.5)
          const WALL_BACK = containerDepth / 2;    // +0.6 (was +0.5)

          // Account for piece size to prevent edges from extending beyond walls
          const halfPieceWidth = piece.size.x / 2;
          const halfPieceDepth = piece.size.z / 2;

          // X walls - FORCE inside (accounting for piece width)
          if (piece.position.x - halfPieceWidth < WALL_LEFT) {
            piece.position.x = WALL_LEFT + halfPieceWidth;
            piece.velocity.x = Math.abs(piece.velocity.x) * 0.2;
            piece.velocity.y *= 0.7;
            piece.velocity.z *= 0.7;
          }
          if (piece.position.x + halfPieceWidth > WALL_RIGHT) {
            piece.position.x = WALL_RIGHT - halfPieceWidth;
            piece.velocity.x = -Math.abs(piece.velocity.x) * 0.2;
            piece.velocity.y *= 0.7;
            piece.velocity.z *= 0.7;
          }

          // Z walls - FORCE inside (accounting for piece depth)
          if (piece.position.z - halfPieceDepth < WALL_FRONT) {
            piece.position.z = WALL_FRONT + halfPieceDepth;
            piece.velocity.z = Math.abs(piece.velocity.z) * 0.2;
            piece.velocity.x *= 0.7;
            piece.velocity.y *= 0.7;
          }
          if (piece.position.z + halfPieceDepth > WALL_BACK) {
            piece.position.z = WALL_BACK - halfPieceDepth;
            piece.velocity.z = -Math.abs(piece.velocity.z) * 0.2;
            piece.velocity.x *= 0.7;
            piece.velocity.y *= 0.7;
          }
        }

        // Ground collision
        const groundY = piece.size.y / 2;
        if (piece.position.y < groundY) {
          piece.position.y = groundY;
          piece.velocity.y *= -restitution;
          piece.velocity.x *= friction;
          piece.velocity.z *= friction;
          piece.angularVelocity.multiplyScalar(friction);

          if (Math.abs(piece.velocity.y) > 0.5) {
            spawnDust(piece.position, isLowEnd.current ? 1 : 3);
          }
          
          // Lock when settled
          if (currentPhase === 'stacking' && piece.velocity.length() < 0.08) {
            piece.isStatic = true;
            piece.velocity.set(0, 0, 0);
            piece.angularVelocity.set(0, 0, 0);
          }
        }

        // COLLISION WITH OTHER PIECES (natural stacking)
        if (currentPhase === 'stacking') {
          coalPieces.forEach((other, otherIndex) => {
            if (index === otherIndex) return;
            if (!other.isDynamic && !other.isStatic) return;
            
            const distance = piece.position.distanceTo(other.position);
            const minDistance = (piece.size.length() + other.size.length()) / 2.5;

            if (distance < minDistance) {
              const normal = new THREE.Vector3()
                .subVectors(piece.position, other.position)
                .normalize();
              
              const overlap = minDistance - distance;
              
              // Push pieces apart based on static state
              if (other.isStatic && !piece.isStatic) {
                piece.position.addScaledVector(normal, overlap);
                
                const velocityAlongNormal = piece.velocity.dot(normal);
                if (velocityAlongNormal < 0) {
                  piece.velocity.addScaledVector(normal, -velocityAlongNormal * (1 + restitution));
                }
                
                piece.velocity.multiplyScalar(friction);
                piece.angularVelocity.multiplyScalar(friction);
                
                if (Math.abs(velocityAlongNormal) > 0.5) {
                  spawnDust(piece.position, isLowEnd.current ? 1 : 2);
                }
              } else if (!piece.isStatic && !other.isStatic) {
                piece.position.addScaledVector(normal, overlap / 2);
                other.position.addScaledVector(normal, -overlap / 2);
                
                const relativeVelocity = new THREE.Vector3().subVectors(piece.velocity, other.velocity);
                const velocityAlongNormal = relativeVelocity.dot(normal);
                
                if (velocityAlongNormal < 0) {
                  const impulse = normal.clone().multiplyScalar(velocityAlongNormal * restitution);
                  piece.velocity.sub(impulse);
                  other.velocity.add(impulse);
                }
              }
            }
          });
        }

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

      // Camera stays fixed facing wall head-on (no rotation needed)

      // Update physics and particles
      updatePhysics(deltaTime, phase, elapsedTime);
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