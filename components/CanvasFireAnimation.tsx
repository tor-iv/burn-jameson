"use client";

import { useEffect, useRef } from "react";

interface CanvasFireAnimationProps {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
}

export default function CanvasFireAnimation({ boundingBox, imageUrl }: CanvasFireAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fireCanvasRef = useRef<HTMLCanvasElement>(null);
  const paperCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fireCanvasRef.current || !paperCanvasRef.current || !containerRef.current) return;

    const fireCanvas = fireCanvasRef.current;
    const paperCanvas = paperCanvasRef.current;
    const fctx = fireCanvas.getContext('2d')!;
    const pctx = paperCanvas.getContext('2d')!;

    // CONFIG - from fire.html (MODIFIED: optimized for 10-second burn from bottom to top)
    const CFG = {
      paperColor: '#f3f0e7',
      paperFibers: 0.18,
      paperShadow: 0.35,
      burnSpeed: 40,  // Optimized: ~400px in 10 seconds (40 px/sec)
      stopFromTop: 0,  // Stop at the TOP of the bounding box (0 instead of 40)
      edgeNoiseScale: 0.022,
      edgeRagged: 26,
      fieldScale: 0.42,
      octaves: 4,
      noiseAmp: 1.1,
      riseSpeed: 0.05,  // Slower for dramatic effect
      lateralFlow: 0.025,  // Gentler side-to-side movement
      curlBend: 0.65,
      edgeSharpness: 1.55,
      baseHeat: 0.18,
      crownBoost: 0.35,
      wind: 2,  // Subtler wind effect
      emberRate: 25,  // LESS: reduced for cleaner effect
      ashRate: 40,  // LESS: reduced for cleaner effect
    };

    const RAMP: Array<[number, [number, number, number, number]]> = [
      [0.00, [0, 0, 0, 0]],
      [0.15, [35, 8, 0, 40]],
      [0.30, [110, 25, 6, 115]],
      [0.55, [220, 110, 25, 185]],
      [0.78, [255, 205, 70, 235]],
      [0.93, [255, 245, 210, 255]],
      [1.00, [255, 255, 255, 255]]
    ];

    const fieldCanvas = document.createElement('canvas');
    const fctxField = fieldCanvas.getContext('2d', { willReadFrequently: true })!;
    let fieldW = 0, fieldH = 0;

    const W = () => fireCanvas.clientWidth;
    const H = () => fireCanvas.clientHeight;

    let frontY = 0;
    const embers: any[] = [], ashes: any[] = [];

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

    function noise1D(x: number, scale: number) {
      const i = Math.floor(x * scale), f = x * scale - i;
      const h = (n: number) => {
        const t = Math.sin((n * 127.1 + 311.7) * 43758.5453) * 43758.5453;
        return t - Math.floor(t);
      };
      const a = h(i), b = h(i + 1), s = f * f * (3 - 2 * f);
      return a * (1 - s) + b * s;
    }

    // Resize and setup
    function resize() {
      const rect = containerRef.current!.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      for (const c of [fireCanvas, paperCanvas]) {
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

      drawFreshPaper();
      // Start fire from the very bottom of the bounding box
      frontY = H();
    }

    function drawFreshPaper() {
      // NO PAPER BACKGROUND - just keep transparent/clear
      const w = W(), h = H();
      pctx.clearRect(0, 0, w, h);
      // That's it! No paper texture, no background - just transparent
    }

    // No paper to burn - just keep this function empty for compatibility
    function eraseUpTo(front: number) {
      // Not needed - no paper background
    }

    // Draw fire field (concentrated in center for bottle effect)
    function drawFire(now: number) {
      const t = now * 0.001, w = fieldW, h = fieldH;
      const id = fctxField.getImageData(0, 0, w, h), data = id.data, frontField = frontY * CFG.fieldScale;

      for (let j = 0; j < h; j++) {
        const yWorld = j / CFG.fieldScale;
        let base = 1 - Math.max(0, (yWorld - (frontY - 8)) / (H() * 0.55));
        base = Math.max(0, base);

        for (let i = 0; i < w; i++) {
          const idx = (j * w + i) * 4, xWorld = i / CFG.fieldScale, xc = (xWorld / W()) * 2 - 1;
          // Stronger center concentration for bottle area
          const crown = 1 - Math.pow(Math.abs(xc), 2.2), centerBoost = 1 + CFG.crownBoost * 1.5 * crown;
          const sx = i * 0.018 + t * CFG.lateralFlow, sy = (h - j) * 0.02 + t * CFG.riseSpeed, cr = curl(sx * 1.1, sy * 1.1, t);
          const n = fbm(sx + cr.x * CFG.curlBend, sy + cr.y * CFG.curlBend, t, CFG.octaves, CFG.noiseAmp);
          let v = CFG.baseHeat + base * (0.85 + 0.15 * Math.sin(t * 2.1)) + n * 0.35;
          v *= centerBoost;
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

    // Particles
    function spawn(dt: number) {
      const eN = CFG.emberRate * dt, aN = CFG.ashRate * dt;
      for (let i = 0; i < eN; i++) embers.push({ x: rand(16, W() - 16), y: frontY + rand(-6, 6), r: rand(1.2, 2.4), vx: rand(-12, 12) + CFG.wind * 0.6, vy: -rand(60, 120), age: 0, life: rand(0.7, 1.4) });
      for (let i = 0; i < aN; i++) ashes.push({ x: rand(16, W() - 16), y: frontY + rand(-2, 8), w: rand(1.2, 2.2), h: rand(0.6, 1.6), vx: rand(-18, 8) + CFG.wind * 0.15, vy: rand(12, 34), spin: rand(-6, 6), a: rand(0.45, 0.85), age: 0, life: rand(1.0, 2.0) });
    }

    function drawParticles(dt: number) {
      // Embers
      fctx.save();
      fctx.globalCompositeOperation = 'lighter';
      fctx.fillStyle = 'rgba(255,200,140,0.92)';
      for (let i = embers.length - 1; i >= 0; i--) {
        const s = embers[i];
        s.age += dt;
        if (s.age > s.life || s.y + s.r < -10) {
          embers.splice(i, 1);
          continue;
        }
        s.vy += -6 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        fctx.beginPath();
        fctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        fctx.fill();
      }
      fctx.restore();

      // Ashes
      fctx.save();
      for (let i = ashes.length - 1; i >= 0; i--) {
        const a = ashes[i];
        a.age += dt;
        if (a.age > a.life || a.y > H() + 10) {
          ashes.splice(i, 1);
          continue;
        }
        a.vx += CFG.wind * 0.02 * dt;
        a.vy += 26 * dt;
        a.spin += 0.8 * dt;
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        fctx.save();
        fctx.translate(a.x, a.y);
        fctx.rotate(a.spin * 0.1);
        fctx.globalAlpha = a.a * (1 - a.age / a.life);
        fctx.fillStyle = 'rgba(110,110,110,0.85)';
        fctx.fillRect(-a.w / 2, -a.h / 2, a.w, a.h);
        fctx.restore();
      }
      fctx.restore();
    }

    // Main loop
    let last = 0;
    let animationId: number;

    function tick(now: number) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;

      frontY -= CFG.burnSpeed * dt;
      if (frontY < CFG.stopFromTop) frontY = CFG.stopFromTop;

      drawFire(now);
      eraseUpTo(frontY);
      spawn(dt);
      drawParticles(dt);

      animationId = requestAnimationFrame(tick);
    }

    resize();
    // Start fire from the bottom
    frontY = H();
    animationId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Position fire animation ONLY over the bounding box
  const containerStyle = {
    position: "absolute" as const,
    left: `${boundingBox.x * 100}%`,
    top: `${boundingBox.y * 100}%`,
    width: `${boundingBox.width * 100}%`,
    height: `${boundingBox.height * 100}%`,
    pointerEvents: "none" as const,
    zIndex: 10,
    overflow: "hidden",
  };

  return (
    <div ref={containerRef} style={containerStyle}>
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
      <canvas
        ref={paperCanvasRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
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
  );
}
