"use client";

import { useEffect, useRef } from "react";

interface BurnToCoalAnimationProps {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
  detectedBrand?: string | null;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  type: 'ember' | 'ash';
  opacity: number;
}

export default function BurnToCoalAnimation({
  boundingBox,
  imageUrl,
  onComplete
}: BurnToCoalAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationTimeRef = useRef(0);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    // Load bottle image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    imageRef.current = img;

    const CFG = {
      totalDuration: 6.0, // 6 seconds total
      burnDuration: 2.0, // 0-33% burn phase
      charDuration: 1.5, // 33-58% charring phase
      emberDuration: 1.5, // 58-83% ember glow phase
      revealDuration: 1.0, // 83-100% Keeper's Heart reveal

      emberRate: 60,
      ashRate: 40,
      emberGlowIntensity: 0.6,
    };

    let W = 0, H = 0;
    let frontY = 0;
    const particles: Particle[] = [];

    function resize() {
      if (!canvas || !containerRef.current) return;
      W = containerRef.current.clientWidth;
      H = containerRef.current.clientHeight;
      canvas.width = W;
      canvas.height = H;
      frontY = H;
    }

    function getPhase(t: number): 'burn' | 'char' | 'ember' | 'reveal' | 'done' {
      if (t < CFG.burnDuration) return 'burn';
      if (t < CFG.burnDuration + CFG.charDuration) return 'char';
      if (t < CFG.burnDuration + CFG.charDuration + CFG.emberDuration) return 'ember';
      if (t < CFG.totalDuration) return 'reveal';
      return 'done';
    }

    function drawBottle(t: number) {
      if (!imageRef.current || !imageRef.current.complete) return;

      const phase = getPhase(t);

      // Convert normalized bounding box to pixel coordinates
      const boxX = boundingBox.x * W;
      const boxY = boundingBox.y * H;
      const boxW = boundingBox.width * W;
      const boxH = boundingBox.height * H;

      ctx.save();

      // Clip to bounding box region
      ctx.beginPath();
      ctx.rect(boxX, boxY, boxW, boxH);
      ctx.clip();

      // Draw original bottle image
      ctx.drawImage(imageRef.current, 0, 0, W, H);

      // BURN PHASE: Progressive darkening from bottom up
      if (phase === 'burn') {
        const burnProgress = t / CFG.burnDuration;
        const burnHeight = boxH * burnProgress;

        // Create gradient overlay from bottom
        const gradient = ctx.createLinearGradient(
          boxX + boxW / 2,
          boxY + boxH,
          boxX + boxW / 2,
          boxY + boxH - burnHeight
        );
        gradient.addColorStop(0, 'rgba(20, 10, 5, 0.9)'); // Dark brown/black at bottom
        gradient.addColorStop(0.3, 'rgba(40, 25, 15, 0.8)');
        gradient.addColorStop(0.6, 'rgba(80, 50, 30, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent at top

        ctx.fillStyle = gradient;
        ctx.fillRect(boxX, boxY + boxH - burnHeight, boxW, burnHeight);

        // Add flame edge at burn front
        frontY = boxY + boxH - burnHeight;

        // Draw flickering flame edge
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FF8C42';
        ctx.strokeStyle = '#FF6B35';
        ctx.lineWidth = 3;
        ctx.beginPath();

        for (let x = boxX; x < boxX + boxW; x += 5) {
          const flicker = Math.sin(t * 10 + x * 0.1) * 5;
          const y = frontY + flicker;
          if (x === boxX) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // CHAR PHASE: Fully darkened with texture
      if (phase === 'char' || phase === 'ember') {
        // Full charcoal black overlay
        ctx.fillStyle = 'rgba(15, 10, 10, 0.95)';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Add charcoal texture (random dark spots)
        for (let i = 0; i < 100; i++) {
          const px = boxX + Math.random() * boxW;
          const py = boxY + Math.random() * boxH;
          const size = Math.random() * 3 + 1;
          const darkness = Math.random() * 0.3;

          ctx.fillStyle = `rgba(${darkness * 50}, ${darkness * 40}, ${darkness * 35}, 0.5)`;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // EMBER PHASE: Add glowing orange edges
      if (phase === 'ember') {
        const emberT = (t - CFG.burnDuration - CFG.charDuration) / CFG.emberDuration;
        const glowIntensity = CFG.emberGlowIntensity * (1 - emberT * 0.5); // Fade out slowly

        // Draw glowing edges
        ctx.shadowBlur = 30;
        ctx.shadowColor = `rgba(255, 107, 53, ${glowIntensity})`;
        ctx.strokeStyle = `rgba(255, 107, 53, ${glowIntensity * 0.8})`;
        ctx.lineWidth = 2;

        // Left edge
        ctx.beginPath();
        ctx.moveTo(boxX, boxY);
        ctx.lineTo(boxX, boxY + boxH);
        ctx.stroke();

        // Right edge
        ctx.beginPath();
        ctx.moveTo(boxX + boxW, boxY);
        ctx.lineTo(boxX + boxW, boxY + boxH);
        ctx.stroke();

        // Top edge
        ctx.beginPath();
        ctx.moveTo(boxX, boxY);
        ctx.lineTo(boxX + boxW, boxY);
        ctx.stroke();

        // Bottom edge
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + boxH);
        ctx.lineTo(boxX + boxW, boxY + boxH);
        ctx.stroke();

        // Add pulsing ember spots
        const emberCount = 15;
        for (let i = 0; i < emberCount; i++) {
          const seed = i * 12.345;
          const px = boxX + (Math.sin(seed) * 0.5 + 0.5) * boxW;
          const py = boxY + (Math.cos(seed * 1.7) * 0.5 + 0.5) * boxH;
          const pulse = Math.sin(t * 3 + seed) * 0.5 + 0.5;
          const size = (3 + pulse * 2) * (1 - emberT * 0.5);

          ctx.shadowBlur = 15;
          ctx.shadowColor = `rgba(255, 140, 66, ${glowIntensity * pulse})`;
          ctx.fillStyle = `rgba(255, 107, 53, ${glowIntensity * pulse})`;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.shadowBlur = 0;
      }

      // REVEAL PHASE: Charcoal crumbles away revealing Keeper's Heart
      if (phase === 'reveal' || phase === 'done') {
        const revealT = phase === 'done' ? 1 : (t - CFG.burnDuration - CFG.charDuration - CFG.emberDuration) / CFG.revealDuration;

        // Crumble away from top to bottom
        const crumbleHeight = boxH * revealT;

        // Draw Keeper's Heart bottle underneath (amber/gold gradient)
        ctx.save();
        ctx.beginPath();
        ctx.rect(boxX, boxY, boxW, crumbleHeight);
        ctx.clip();

        const keepersGradient = ctx.createLinearGradient(
          boxX + boxW / 2,
          boxY,
          boxX + boxW / 2,
          boxY + boxH
        );
        keepersGradient.addColorStop(0, '#92400e'); // Amber-900
        keepersGradient.addColorStop(0.3, '#b45309'); // Amber-800
        keepersGradient.addColorStop(0.5, '#d97706'); // Amber-700
        keepersGradient.addColorStop(0.7, '#f59e0b'); // Amber-600
        keepersGradient.addColorStop(1, '#d97706'); // Amber-700

        ctx.fillStyle = keepersGradient;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Draw bottle shape
        const capW = boxW * 0.4;
        const capH = boxH * 0.08;
        const capX = boxX + (boxW - capW) / 2;
        const capY = boxY;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(capX, capY, capW, capH);

        // Bottle neck
        const neckW = boxW * 0.3;
        const neckH = boxH * 0.12;
        const neckX = boxX + (boxW - neckW) / 2;
        const neckY = capY + capH;
        const neckGrad = ctx.createLinearGradient(neckX, neckY, neckX, neckY + neckH);
        neckGrad.addColorStop(0, '#92400e');
        neckGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = neckGrad;
        ctx.fillRect(neckX, neckY, neckW, neckH);

        // Label area
        const labelY = boxY + boxH * 0.35;
        const labelH = boxH * 0.25;
        ctx.fillStyle = '#fef3c7'; // Amber-100
        ctx.fillRect(boxX + boxW * 0.15, labelY, boxW * 0.7, labelH);

        // "Keeper's Heart" text
        ctx.fillStyle = '#78350f';
        ctx.font = `bold ${Math.floor(boxH * 0.05)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("Keeper's", boxX + boxW / 2, labelY + labelH * 0.35);
        ctx.fillText("Heart", boxX + boxW / 2, labelY + labelH * 0.65);

        ctx.restore();

        // Draw remaining charcoal above reveal line with crumbling effect
        if (revealT < 1) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(boxX, boxY + crumbleHeight, boxW, boxH - crumbleHeight);
          ctx.clip();

          // Charcoal texture
          ctx.fillStyle = 'rgba(15, 10, 10, 0.95)';
          ctx.fillRect(boxX, boxY, boxW, boxH);

          for (let i = 0; i < 100; i++) {
            const px = boxX + Math.random() * boxW;
            const py = boxY + Math.random() * boxH;
            const size = Math.random() * 3 + 1;
            const darkness = Math.random() * 0.3;

            ctx.fillStyle = `rgba(${darkness * 50}, ${darkness * 40}, ${darkness * 35}, 0.5)`;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
          }

          // Crumbling edge effect
          ctx.strokeStyle = `rgba(255, 107, 53, ${0.3 * (1 - revealT)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let x = boxX; x < boxX + boxW; x += 5) {
            const crumble = Math.sin(t * 8 + x * 0.2) * 3;
            const y = boxY + crumbleHeight + crumble;
            if (x === boxX) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();

          ctx.restore();
        }
      }

      ctx.restore();
    }

    function spawnParticles(dt: number, t: number) {
      const phase = getPhase(t);
      if (phase === 'done' || phase === 'reveal') return; // Stop spawning during reveal

      const boxX = boundingBox.x * W;
      const boxW = boundingBox.width * W;

      // Spawn embers during burn phase
      if (phase === 'burn') {
        const emberCount = CFG.emberRate * dt;
        for (let i = 0; i < emberCount; i++) {
          if (Math.random() < emberCount % 1) {
            particles.push({
              x: boxX + Math.random() * boxW,
              y: frontY,
              vx: (Math.random() - 0.5) * 30,
              vy: -Math.random() * 50 - 30,
              age: 0,
              life: Math.random() * 1.5 + 0.5,
              size: Math.random() * 3 + 2,
              type: 'ember',
              opacity: 1,
            });
          }
        }
      }

      // Spawn ash during char phase
      if (phase === 'char') {
        const ashCount = CFG.ashRate * dt;
        for (let i = 0; i < ashCount; i++) {
          if (Math.random() < ashCount % 1) {
            particles.push({
              x: boxX + Math.random() * boxW,
              y: (boundingBox.y + boundingBox.height * 0.5) * H + Math.random() * 50,
              vx: (Math.random() - 0.5) * 20,
              vy: -Math.random() * 30 - 10,
              age: 0,
              life: Math.random() * 2 + 1,
              size: Math.random() * 4 + 1,
              type: 'ash',
              opacity: 1,
            });
          }
        }
      }

      // Fewer embers during ember phase
      if (phase === 'ember') {
        const emberCount = CFG.emberRate * 0.3 * dt;
        for (let i = 0; i < emberCount; i++) {
          if (Math.random() < emberCount % 1) {
            particles.push({
              x: boxX + Math.random() * boxW,
              y: (boundingBox.y + boundingBox.height) * H,
              vx: (Math.random() - 0.5) * 20,
              vy: -Math.random() * 30 - 10,
              age: 0,
              life: Math.random() * 1 + 0.5,
              size: Math.random() * 2 + 1,
              type: 'ember',
              opacity: 0.8,
            });
          }
        }
      }
    }

    function drawParticles(dt: number) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;

        if (p.age >= p.life) {
          particles.splice(i, 1);
          continue;
        }

        const lifeFraction = p.age / p.life;
        p.opacity = 1 - lifeFraction;
        p.vy += 20 * dt; // Gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        ctx.save();

        if (p.type === 'ember') {
          // Glowing ember particle
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          gradient.addColorStop(0, `rgba(255, 140, 66, ${p.opacity})`);
          gradient.addColorStop(0.5, `rgba(255, 107, 53, ${p.opacity * 0.6})`);
          gradient.addColorStop(1, 'rgba(255, 107, 53, 0)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Ash particle (gray/black)
          const grayValue = 60 + Math.random() * 40;
          ctx.fillStyle = `rgba(${grayValue}, ${grayValue}, ${grayValue}, ${p.opacity * 0.8})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // Main animation loop
    let last = 0;
    let animationId: number;

    function tick(now: number) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      animationTimeRef.current += dt;

      // Clear canvas
      ctx.clearRect(0, 0, W, H);

      // Draw bottle with effects
      drawBottle(animationTimeRef.current);

      // Spawn and draw particles
      spawnParticles(dt, animationTimeRef.current);
      drawParticles(dt);

      // Check if animation is complete
      if (animationTimeRef.current >= CFG.totalDuration) {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete?.();
        }
        // Keep drawing final frame
      }

      animationId = requestAnimationFrame(tick);
    }

    // Start animation when image loads
    img.onload = () => {
      resize();
      animationId = requestAnimationFrame(tick);
    };

    // Handle resize
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [boundingBox, imageUrl, onComplete]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  );
}
