'use client'

import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { BurnAnimationProps } from '@/types/animations'

/**
 * Three.js WebGL particle-based burning effect
 * Uses GPU-accelerated shaders for realistic fire and smoke particles
 */
export default function ThreeFireAnimation({
  boundingBox,
  imageUrl,
  onBurnComplete
}: BurnAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const callbackRef = useRef(onBurnComplete)

  // Update callback ref when it changes (but don't re-run effect)
  callbackRef.current = onBurnComplete

  console.log('[ThreeFireAnimation] 🎬 Component mounted (Three.js WebGL mode)', {
    boundingBox,
    hasCallback: !!onBurnComplete
  })

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) {
      console.warn('[ThreeFireAnimation] ⚠️ Missing refs, exiting')
      return
    }

    const container = containerRef.current
    const canvas = canvasRef.current

    // Use full viewport dimensions for canvas
    const W = window.innerWidth
    const H = window.innerHeight

    console.log('[ThreeFireAnimation] 📐 Setting up Three.js scene (full-screen)', { W, H, boundingBox })

    // ===== THREE.JS SETUP =====
    const scene = new THREE.Scene()

    // Orthographic camera to match full viewport
    const aspect = W / H
    const frustumSize = 10 // Larger frustum for full-screen coverage
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    )
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true, // Transparent background
      antialias: true
    })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0) // Fully transparent

    // ===== BURNING EFFECT CLASS =====
    class BurningEffect {
      scene: THREE.Scene
      camera: THREE.Camera
      options: any
      time: number
      embers: THREE.Points | null
      smoke: THREE.Points | null
      intensity: number
      burnProgress: number
      isBurning: boolean
      burnSpeed: number

      constructor(scene: THREE.Scene, camera: THREE.Camera, options: any = {}) {
        this.scene = scene
        this.camera = camera
        this.options = {
          radius: options.radius || 0.8,
          height: options.height || 4,
          emberCount: options.emberCount || 3000,
          smokeCount: options.smokeCount || 2000,
          intensity: options.intensity || 1.0,
          ...options
        }

        this.time = 0
        this.embers = null
        this.smoke = null
        this.intensity = this.options.intensity
        this.burnProgress = 0
        this.isBurning = false
        this.burnSpeed = 0.24  // Reduced from 0.3 to match 25% slowdown (0.3 * 0.8 = 0.24)

        this.init()
      }

      createEmberParticles() {
        const geometry = new THREE.BufferGeometry()
        const positions = new Float32Array(this.options.emberCount * 3)
        const velocities = new Float32Array(this.options.emberCount * 3)
        const sizes = new Float32Array(this.options.emberCount)
        const phases = new Float32Array(this.options.emberCount)
        const types = new Float32Array(this.options.emberCount)

        for (let i = 0; i < this.options.emberCount; i++) {
          const i3 = i * 3

          const angle = Math.random() * Math.PI * 2
          const heightPos = Math.random() * this.options.height * 0.8
          const radius = this.options.radius * (0.7 + Math.random() * 0.5)

          positions[i3] = Math.cos(angle) * radius
          positions[i3 + 1] = heightPos
          positions[i3 + 2] = Math.sin(angle) * radius

          const upwardSpeed = 0.008 + Math.random() * 0.02
          const outwardSpeed = (Math.random() - 0.5) * 0.015
          velocities[i3] = outwardSpeed
          velocities[i3 + 1] = upwardSpeed
          velocities[i3 + 2] = outwardSpeed

          sizes[i] = 1 + Math.random() * 4
          phases[i] = Math.random() * Math.PI * 2
          types[i] = Math.random() > 0.85 ? 1.0 : 0.0
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
        geometry.setAttribute('aType', new THREE.BufferAttribute(types, 1))

        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            intensity: { value: this.intensity },
            burnProgress: { value: 0 },
            fireHeight: { value: this.options.height }
          },
          vertexShader: `
            attribute float size;
            attribute float phase;
            attribute vec3 velocity;
            attribute float aType;

            uniform float time;
            uniform float intensity;
            uniform float burnProgress;
            uniform float fireHeight;

            varying float vPhase;
            varying vec3 vPosition;
            varying float vType;
            varying float vBurnFactor;

            void main() {
              vPhase = phase;
              vPosition = position;
              vType = aType;

              vec3 pos = position;

              float burnHeight = burnProgress * fireHeight;
              vBurnFactor = smoothstep(burnHeight - 0.5, burnHeight + 0.5, pos.y);

              float activeZone = 1.0 - smoothstep(burnHeight - 0.3, burnHeight + 0.3, abs(pos.y - burnHeight));
              float flicker = sin(time * 10.0 + phase) * 0.05 * activeZone;
              pos.x += flicker * intensity;
              pos.z += cos(time * 10.0 + phase) * 0.05 * intensity * activeZone;

              vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

              float finalSize = size * intensity * (0.8 + burnProgress * 0.2);
              gl_PointSize = finalSize * (300.0 / -mvPosition.z);

              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            uniform float time;
            uniform float intensity;
            uniform float burnProgress;
            uniform float fireHeight;

            varying float vPhase;
            varying vec3 vPosition;
            varying float vType;
            varying float vBurnFactor;

            void main() {
              vec2 center = gl_PointCoord - vec2(0.5);
              float dist = length(center);

              if (dist > 0.5) discard;
              if (vBurnFactor > 0.8) discard;

              float heightFade = 1.0 - smoothstep(0.0, fireHeight, vPosition.y);
              float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.3; // Reduced from 0.5 for lighter fire
              alpha *= heightFade;

              float burnIntensity = 1.0 - vBurnFactor;
              alpha *= burnIntensity;

              vec3 finalColor;
              if (vType > 0.5) {
                float brightness = 1.0 - dist * 0.8;
                finalColor = vec3(1.0, 0.3 + brightness * 0.2, 0.0) * (0.9 + brightness * 0.3);
              } else {
                float heightMix = vPosition.y / 3.5;
                vec3 orange = vec3(0.9, 0.25, 0.0);
                vec3 yellow = vec3(1.0, 0.65, 0.05);
                finalColor = mix(orange, yellow, heightMix) * 0.7;
              }

              float flicker = 0.85 + sin(time * 6.0 + vPhase) * 0.15;
              finalColor *= flicker;

              float core = (1.0 - dist * 4.0) * 0.15;
              if (core > 0.0) finalColor += vec3(core);

              gl_FragColor = vec4(finalColor, alpha);
            }
          `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })

        this.embers = new THREE.Points(geometry, material)
        this.scene.add(this.embers)
      }

      init() {
        this.createEmberParticles()
      }

      update(delta: number) {
        this.time += delta

        if (this.isBurning) {
          this.burnProgress = Math.min(1, this.burnProgress + delta * this.burnSpeed)
        }

        // Update ember particles
        if (this.embers) {
          const emberPositions = this.embers.geometry.attributes.position.array as Float32Array
          const emberVelocities = this.embers.geometry.attributes.velocity.array as Float32Array

          for (let i = 0; i < this.options.emberCount; i++) {
            const i3 = i * 3

            if (this.burnProgress > 0.1) {
              emberPositions[i3] += emberVelocities[i3] * this.intensity * this.burnProgress
              emberPositions[i3 + 1] += emberVelocities[i3 + 1] * this.intensity * this.burnProgress
              emberPositions[i3 + 2] += emberVelocities[i3 + 2] * this.intensity * this.burnProgress

              emberPositions[i3] += Math.sin(this.time * 5 + i * 0.1) * 0.003
              emberPositions[i3 + 2] += Math.cos(this.time * 5 + i * 0.1) * 0.003
            }

            if (emberPositions[i3 + 1] > this.options.height * 0.9) {
              const angle = Math.random() * Math.PI * 2
              const heightPos = Math.random() * this.options.height * 0.8
              const radius = this.options.radius * (0.7 + Math.random() * 0.5)

              emberPositions[i3] = Math.cos(angle) * radius
              emberPositions[i3 + 1] = heightPos
              emberPositions[i3 + 2] = Math.sin(angle) * radius
            }
          }

          this.embers.geometry.attributes.position.needsUpdate = true
          ;(this.embers.material as THREE.ShaderMaterial).uniforms.time.value = this.time
          ;(this.embers.material as THREE.ShaderMaterial).uniforms.intensity.value = this.intensity
          ;(this.embers.material as THREE.ShaderMaterial).uniforms.burnProgress.value = this.burnProgress
        }
      }

      startBurn() {
        this.isBurning = true
        this.burnProgress = 0
      }

      dispose() {
        if (this.embers) {
          this.embers.geometry.dispose()
          ;(this.embers.material as THREE.Material).dispose()
          this.scene.remove(this.embers)
        }
      }
    }

    // Calculate bottle height in world units
    const bottleHeightNormalized = boundingBox.height // 0-1 range
    const bottleHeightWorld = bottleHeightNormalized * frustumSize // Convert to world space
    const fireHeight = bottleHeightWorld * 1.5 // Fire extends 1.5x bottle height

    console.log('[ThreeFireAnimation] 📏 Calculated fire height', {
      bottleHeightNormalized,
      bottleHeightWorld,
      fireHeight,
      frustumSize
    })

    // ===== CREATE BURNING EFFECT =====
    const burning = new BurningEffect(scene, camera, {
      radius: 0.8,
      height: fireHeight,  // Dynamic height based on bottle size
      emberCount: 1500,  // Reduced from 3000 for less dense fire
      intensity: 0.6     // Reduced from 1.0 for dimmer effect
    })

    // Convert bounding box to Three.js world coordinates
    // Bounding box is in normalized 0-1 coordinates, need to convert to world space
    const bottleCenterX = boundingBox.x + boundingBox.width / 2  // Horizontal center
    const bottleBottomY = boundingBox.y + boundingBox.height     // Bottom edge (fire starts here)

    // Map to Three.js world space (centered at origin, Y-up)
    // frustumSize is 10, so world coords range from -5 to +5 in Y, and proportionally in X
    const worldX = (bottleCenterX - 0.5) * frustumSize * aspect
    const worldY = (0.5 - bottleBottomY) * frustumSize // Flip Y (DOM is Y-down, Three.js is Y-up)

    console.log('[ThreeFireAnimation] 🎯 Positioning particles at bottle bottom', {
      boundingBox,
      bottleBottom: { x: bottleCenterX, y: bottleBottomY },
      worldPosition: { x: worldX, y: worldY }
    })

    // Position particle systems at bottle location
    if (burning.embers) {
      burning.embers.position.set(worldX, worldY, 0)
    }

    burning.startBurn()

    console.log('[ThreeFireAnimation] 🔥 Starting Three.js burn animation')

    // ===== ANIMATION LOOP =====
    const duration = 7.5  // Slowed down by 25% (from 6s) to allow morph preload
    const startTime = Date.now()
    let lastTime = startTime

    function animate() {
      const now = Date.now()
      const delta = (now - lastTime) / 1000
      lastTime = now
      const elapsed = (now - startTime) / 1000

      burning.update(delta)
      renderer.render(scene, camera)

      if (elapsed >= duration) {
        console.log('[ThreeFireAnimation] ✅ Animation complete, calling callback')
        if (callbackRef.current) {
          callbackRef.current()
        }
        return
      }

      animationId = requestAnimationFrame(animate)
    }

    let animationId = requestAnimationFrame(animate)

    // ===== CLEANUP =====
    return () => {
      console.log('[ThreeFireAnimation] 🧹 Cleaning up Three.js resources')
      cancelAnimationFrame(animationId)
      burning.dispose()
      renderer.dispose()
    }
  }, []) // Empty deps - runs once on mount

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0, // Full-screen overlay
        pointerEvents: 'none',
        zIndex: 10
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  )
}
