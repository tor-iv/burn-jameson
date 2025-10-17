"use client";

import { useEffect, useRef } from "react";

interface EnhancedFireAnimationProps {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  type: 'ember' | 'ash' | 'smoke';
  opacity: number;
  rotation?: number;
  rotationSpeed?: number;
}

export default function EnhancedFireAnimation({ boundingBox, imageUrl }: EnhancedFireAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fireCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationTimeRef = useRef(0);

  useEffect(() => {
    if (!fireCanvasRef.current || !particlesCanvasRef.current || !containerRef.current) return;

    const fireCanvas = fireCanvasRef.current;
    const particlesCanvas = particlesCanvasRef.current;
    const fctx = fireCanvas.getContext('2d')!;
    const pctx = particlesCanvas.getContext('2d')!;

    // ENHANCED CONFIG - Following ANIMATION_VISION.md
    const CFG = {
      // Timing (adjusted for faster, complete burn-through)
      totalDuration: 6.0, // 6 seconds total - slightly longer to ensure full burn
      heatUpDuration: 0.3, // 0-5% (quick heat-up)
      ignitionDuration: 0.5, // 5-15% (faster ignition)
      activeBurnDuration: 3.0, // 15-65% (longer active burn for full coverage)
      structuralFailDuration: 1.5, // 65-90% (extended peak)
      collapseDuration: 0.4, // 90-96% (quick collapse)
      embersDuration: 0.3, // 96-100% (brief fade)

      // Burn behavior (MUCH FASTER)
      burnSpeed: 120, // px/sec - 3x faster for aggressive burn
      stopFromTop: -20, // Continue past top to ensure full bottle coverage

      // Fire appearance
      edgeNoiseScale: 0.022,
      edgeRagged: 26,
      fieldScale: 0.42,
      octaves: 4,
      noiseAmp: 1.1,
      riseSpeed: 0.05,
      lateralFlow: 0.025,
      curlBend: 0.65,
      edgeSharpness: 1.55,
      baseHeat: 0.18,
      crownBoost: 0.35,
      wind: 2,

      // Particle rates (increased for more dramatic effect)
      emberRate: 45, // More embers for realism
      ashRate: 60, // More ash particles
      smokeRate: 30, // Add smoke particles

      // Zones (following vision doc)
      coreZone: 1.0, // Bottle silhouette (will be exact bottle)
      auraZone: 1.8, // 180% for flames
      atmosphereZone: 2.5, // 250% for smoke
      particleZone: 4.0, // Unlimited - particles can travel far
    };

    // Enhanced color ramp with more color temperature stages
    const RAMP: Array<[number, [number, number, number, number]]> = [
      [0.00, [0, 0, 0, 0]], // Transparent
      [0.08, [61, 40, 23, 30]], // Dark brown scorch (#3D2817)
      [0.15, [92, 61, 46, 80]], // Brown scorch (#5C3D2E)
      [0.30, [140, 65, 25, 140]], // Orange glow starts
      [0.45, [255, 107, 53, 185]], // Ember orange (#FF6B35)
      [0.60, [255, 140, 66, 220]], // Bright orange (#FF8C42)
      [0.75, [255, 183, 0, 240]], // Flame yellow (#FFB700)
      [0.88, [255, 200, 87, 250]], // Hot yellow (#FFC857)
      [0.95, [255, 244, 230, 255]], // Hot white (#FFF4E6)
      [1.00, [255, 255, 255, 255]] // Blue-white flash
    ];

    const fieldCanvas = document.createElement('canvas');
    const fctxField = fieldCanvas.getContext('2d', { willReadFrequently: true })!;
    let fieldW = 0, fieldH = 0;

    const W = () => fireCanvas.clientWidth;
    const H = () => fireCanvas.clientHeight;

    let frontY = 0;
    const particles: Particle[] = [];

    // Helper functions
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    function hash(x: number, y: number, seed = 1337) {
      let n = x * 374761393 + y * 668265263 + seed * 1442695040;
      n = (n ^ (n >>> 13)) * 1274126177;
      return ((n ^ (n >>> 16)) & 0xfffffff) / 0xfffffff;
    }

    function vnoise(x: number, y: number, seed: number) {
      const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
    }

    function fbm(x: number, y: number, t: number, oct: number, amp: number) {
      let f = 0, a = amp, s = 1;
      for (let i = 0; i < oct; i++) {
        const n = vnoise(x * s + t * 0.37, y * s - t * 0.19, 1234 + i) * 2 - 1;
        f += n * a;
        a *= 0.53;
        s *= 1.9;
      }
      return f;
    }

    function curl(x: number, y: number, t: number) {
      const e = 0.7;
      const n1 = fbm(x + e, y, t, 2, 1) - fbm(x - e, y, t, 2, 1);
      const n2 = fbm(x, y + e, t, 2, 1) - fbm(x, y - e, t, 2, 1);
      return { x: n2 * 0.5, y: -n1 * 0.5 };
    }

    function rampLookup(stops: typeof RAMP, val: number) {
      const v = clamp(val, 0, 1);
      for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0]) {
          const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
          const u = (v - t0) / (t1 - t0);
          return [
            c0[0] * (1 - u) + c1[0] * u,
            c0[1] * (1 - u) + c1[1] * u,
            c0[2] * (1 - u) + c1[2] * u,
            c0[3] * (1 - u) + c1[3] * u
          ].map(Math.round);
        }
      }
      return stops[stops.length - 1][1];
    }

    // Get animation stage based on time
    function getAnimationStage(time: number): {
      stage: number;
      progress: number;
      name: string;
    } {
      const total = CFG.totalDuration;
      let t = Math.min(time, total);

      if (t < CFG.heatUpDuration) {
        return { stage: 1, progress: t / CFG.heatUpDuration, name: 'heat-up' };
      }
      t -= CFG.heatUpDuration;

      if (t < CFG.ignitionDuration) {
        return { stage: 2, progress: t / CFG.ignitionDuration, name: 'ignition' };
      }
      t -= CFG.ignitionDuration;

      if (t < CFG.activeBurnDuration) {
        return { stage: 3, progress: t / CFG.activeBurnDuration, name: 'active-burn' };
      }
      t -= CFG.activeBurnDuration;

      if (t < CFG.structuralFailDuration) {
        return { stage: 4, progress: t / CFG.structuralFailDuration, name: 'structural-fail' };
      }
      t -= CFG.structuralFailDuration;

      if (t < CFG.collapseDuration) {
        return { stage: 5, progress: t / CFG.collapseDuration, name: 'collapse' };
      }
      t -= CFG.collapseDuration;

      return { stage: 6, progress: t / CFG.embersDuration, name: 'embers' };
    }

    // Resize and setup
    function resize() {
      const rect = containerRef.current!.getBoundingClientRect();

      // Fallback: If container has no size, don't set up canvases
      if (rect.width === 0 || rect.height === 0) {
        console.warn('[EnhancedFireAnimation] Container has zero size, skipping canvas setup');
        return;
      }

      const dpr = Math.max(1, window.devicePixelRatio || 1);

      for (const c of [fireCanvas, particlesCanvas]) {
        c.width = Math.floor(rect.width * dpr);
        c.height = Math.floor(rect.height * dpr);
        c.style.width = rect.width + 'px';
        c.style.height = rect.height + 'px';
        c.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      fieldW = Math.max(64, Math.floor(rect.width * CFG.fieldScale));
      fieldH = Math.max(64, Math.floor(rect.height * CFG.fieldScale));
      fieldCanvas.width = fieldW;
      fieldCanvas.height = fieldH;

      // Start fire from the very bottom
      frontY = H();

      // Debug logging
      console.log('[EnhancedFireAnimation] Canvas sized:', {
        width: rect.width,
        height: rect.height,
        dpr,
        canvasWidth: fireCanvas.width,
        canvasHeight: fireCanvas.height
      });
    }

    // Draw fire field with stage-aware intensity
    function drawFire(now: number) {
      const t = now * 0.001;
      const stage = getAnimationStage(animationTimeRef.current);
      const w = fieldW, h = fieldH;
      const id = fctxField.getImageData(0, 0, w, h), data = id.data, frontField = frontY * CFG.fieldScale;

      // Intensity multiplier based on stage
      let stageIntensity = 1.0;
      if (stage.stage === 1) {
        // Heat-up: Gradual build
        stageIntensity = 0.3 + stage.progress * 0.4;
      } else if (stage.stage === 2) {
        // Ignition: Ramping up
        stageIntensity = 0.7 + stage.progress * 0.3;
      } else if (stage.stage === 3 || stage.stage === 4) {
        // Active burn / structural fail: Peak intensity
        stageIntensity = 1.0 + stage.progress * 0.2;
      } else if (stage.stage === 5) {
        // Collapse: Still intense but starting to fade
        stageIntensity = 1.2 - stage.progress * 0.3;
      } else {
        // Embers: Fading
        stageIntensity = 0.9 - stage.progress * 0.6;
      }

      for (let j = 0; j < h; j++) {
        const yWorld = j / CFG.fieldScale;
        let base = 1 - Math.max(0, (yWorld - (frontY - 8)) / (H() * 0.55));
        base = Math.max(0, base);

        for (let i = 0; i < w; i++) {
          const idx = (j * w + i) * 4;
          const xWorld = i / CFG.fieldScale;
          const xc = (xWorld / W()) * 2 - 1;

          // Stronger center concentration for bottle area
          const crown = 1 - Math.pow(Math.abs(xc), 2.2);
          const centerBoost = 1 + CFG.crownBoost * 1.5 * crown;

          const sx = i * 0.018 + t * CFG.lateralFlow;
          const sy = (h - j) * 0.02 + t * CFG.riseSpeed;
          const cr = curl(sx * 1.1, sy * 1.1, t);
          const n = fbm(sx + cr.x * CFG.curlBend, sy + cr.y * CFG.curlBend, t, CFG.octaves, CFG.noiseAmp);

          let v = CFG.baseHeat + base * (0.85 + 0.15 * Math.sin(t * 2.1)) + n * 0.35;
          v *= centerBoost;
          v *= stageIntensity;

          const mask = j > frontField ? 1 : Math.max(0, 1 - (frontField - j) / (h * 0.06));
          v *= mask;
          v = Math.max(0, Math.min(1, Math.pow(Math.max(0, v), CFG.edgeSharpness)));

          const [r, g, b, a] = rampLookup(RAMP, v);
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = a;
        }
      }

      fctxField.putImageData(id, 0, 0);
      fctx.clearRect(0, 0, W(), H());
      fctx.imageSmoothingEnabled = true;
      fctx.imageSmoothingQuality = 'high';
      fctx.drawImage(fieldCanvas, 0, 0, W(), H());
    }

    // Enhanced particle spawning with multiple types
    function spawnParticles(dt: number) {
      const stage = getAnimationStage(animationTimeRef.current);
      const w = W();

      // Adjust spawn rates based on stage
      let rateMultiplier = 1.0;
      if (stage.stage === 1) rateMultiplier = 0.2; // Few particles during heat-up
      else if (stage.stage === 2) rateMultiplier = 0.5; // Building up
      else if (stage.stage === 3 || stage.stage === 4) rateMultiplier = 1.5; // Peak chaos
      else if (stage.stage === 5) rateMultiplier = 2.0; // Collapse burst
      else rateMultiplier = 0.3; // Dying down

      const eN = CFG.emberRate * dt * rateMultiplier;
      const aN = CFG.ashRate * dt * rateMultiplier;
      const sN = CFG.smokeRate * dt * rateMultiplier;

      // Spawn embers (fall with gravity after initial burst)
      for (let i = 0; i < eN; i++) {
        particles.push({
          x: rand(w * 0.2, w * 0.8),
          y: frontY + rand(-10, 10),
          vx: rand(-20, 20) + CFG.wind * 0.6,
          vy: -rand(80, 150), // Initial upward burst
          age: 0,
          life: rand(0.8, 1.6),
          size: rand(1.5, 3.5),
          type: 'ember',
          opacity: rand(0.7, 1.0),
        });
      }

      // Spawn ash (rises with convection)
      for (let i = 0; i < aN; i++) {
        particles.push({
          x: rand(w * 0.15, w * 0.85),
          y: frontY + rand(-5, 15),
          vx: rand(-15, 15) + CFG.wind * 0.2,
          vy: -rand(20, 50), // Rises slower than embers
          age: 0,
          life: rand(1.5, 3.0),
          size: rand(1.0, 2.5),
          type: 'ash',
          opacity: rand(0.4, 0.7),
          rotation: rand(0, Math.PI * 2),
          rotationSpeed: rand(-3, 3),
        });
      }

      // Spawn smoke (rises and expands)
      for (let i = 0; i < sN; i++) {
        particles.push({
          x: rand(w * 0.3, w * 0.7),
          y: frontY + rand(-20, 5),
          vx: rand(-8, 8) + CFG.wind * 0.3,
          vy: -rand(15, 35), // Rises gently
          age: 0,
          life: rand(2.0, 4.0),
          size: rand(8, 18),
          type: 'smoke',
          opacity: rand(0.2, 0.4),
        });
      }
    }

    // Enhanced particle rendering with realistic physics
    function drawParticles(dt: number) {
      pctx.clearRect(0, 0, W(), H());

      // Update and draw all particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;

        // Remove dead particles
        if (p.age > p.life) {
          particles.splice(i, 1);
          continue;
        }

        const lifeFraction = p.age / p.life;

        // Physics based on particle type
        if (p.type === 'ember') {
          // Embers: arc up then fall with gravity
          p.vy += 120 * dt; // Gravity
          p.vx *= 0.98; // Air resistance
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          // Draw ember
          pctx.save();
          pctx.globalCompositeOperation = 'lighter';
          const alpha = p.opacity * (1 - lifeFraction * lifeFraction);

          // Glow
          const gradient = pctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          gradient.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(255, 140, 50, ${alpha * 0.6})`);
          gradient.addColorStop(1, `rgba(255, 100, 30, 0)`);
          pctx.fillStyle = gradient;
          pctx.beginPath();
          pctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          pctx.fill();

          // Core
          pctx.fillStyle = `rgba(255, 230, 180, ${alpha})`;
          pctx.beginPath();
          pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          pctx.fill();
          pctx.restore();

        } else if (p.type === 'ash') {
          // Ash: rises with turbulence, spins
          p.vy -= 5 * dt; // Slight upward acceleration (convection)
          p.vx += CFG.wind * 0.03 * dt + rand(-2, 2) * dt; // Turbulence
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
            p.rotation += p.rotationSpeed * dt;
          }

          // Draw ash particle
          pctx.save();
          pctx.translate(p.x, p.y);
          if (p.rotation !== undefined) pctx.rotate(p.rotation);
          pctx.globalAlpha = p.opacity * (1 - lifeFraction);
          pctx.fillStyle = '#4A4A4A'; // Ash gray
          pctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          pctx.restore();

        } else if (p.type === 'smoke') {
          // Smoke: rises, expands, dissipates
          p.vy -= 3 * dt; // Gentle rise
          p.vx += CFG.wind * 0.05 * dt + rand(-1, 1) * dt; // Drift
          p.size += 5 * dt; // Expand
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          // Draw smoke
          pctx.save();
          const smokeAlpha = p.opacity * (1 - lifeFraction) * (1 - lifeFraction);
          const gradient = pctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          const darkness = Math.max(0.15, 0.4 - lifeFraction * 0.25); // Darker when young
          gradient.addColorStop(0, `rgba(${darkness * 100}, ${darkness * 100}, ${darkness * 100}, ${smokeAlpha})`);
          gradient.addColorStop(0.6, `rgba(${darkness * 150}, ${darkness * 150}, ${darkness * 150}, ${smokeAlpha * 0.3})`);
          gradient.addColorStop(1, `rgba(100, 100, 100, 0)`);
          pctx.fillStyle = gradient;
          pctx.beginPath();
          pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          pctx.fill();
          pctx.restore();
        }
      }
    }

    // Main loop
    let last = 0;
    let animationId: number;

    function tick(now: number) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      animationTimeRef.current += dt;

      // Burn progress (non-linear based on stage)
      const stage = getAnimationStage(animationTimeRef.current);
      let burnSpeedMultiplier = 1.0;
      if (stage.stage === 1) burnSpeedMultiplier = 0.5; // Quick heat-up
      else if (stage.stage === 2) burnSpeedMultiplier = 1.0; // Steady ignition
      else if (stage.stage === 3) burnSpeedMultiplier = 1.8; // Fast burn
      else if (stage.stage === 4) burnSpeedMultiplier = 2.2; // Peak chaos - very fast
      else if (stage.stage === 5) burnSpeedMultiplier = 2.5; // Rapid collapse
      else burnSpeedMultiplier = 0.2; // Slow fade

      frontY -= CFG.burnSpeed * dt * burnSpeedMultiplier;
      if (frontY < CFG.stopFromTop) frontY = CFG.stopFromTop;

      drawFire(now);
      spawnParticles(dt);
      drawParticles(dt);

      animationId = requestAnimationFrame(tick);
    }

    resize();
    frontY = H();
    animationId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [boundingBox, imageUrl]);

  // Use ORIGINAL bounding box for positioning - no expansion needed
  // The overflow: visible allows effects to naturally extend beyond bounds
  const containerStyle = {
    position: "absolute" as const,
    left: `${boundingBox.x * 100}%`,
    top: `${boundingBox.y * 100}%`,
    width: `${boundingBox.width * 100}%`,
    height: `${boundingBox.height * 100}%`,
    pointerEvents: "none" as const,
    zIndex: 10,
    overflow: "visible", // Critical: allows particles/fire to extend beyond bottle
  };

  return (
    <>
      {/* Fire animation container */}
      <div ref={containerRef} style={containerStyle}>
        {/* Particles layer (above fire, unrestricted) */}
        <canvas
          ref={particlesCanvasRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            pointerEvents: "none",
          }}
        />

        {/* Fire layer (with heat shimmer) */}
        <canvas
          ref={fireCanvasRef}
          className="heat"
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            filter: "url(#heat-wobble)",
          }}
        />

        {/* SVG filter for heat shimmer */}
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id="heat-wobble">
            <feTurbulence type="fractalNoise" baseFrequency="0.9 0.07" numOctaves={2} seed={7} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      </div>
    </>
  );
}
