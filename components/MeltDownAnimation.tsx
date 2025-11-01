"use client";

import { useEffect, useRef } from "react";

interface MeltDownAnimationProps {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
  onComplete?: () => void;
}

interface Drip {
  x: number;
  y: number;
  vy: number;
  length: number;
  width: number;
  opacity: number;
  life: number;
  age: number;
}

export default function MeltDownAnimation({
  boundingBox,
  imageUrl,
  onComplete
}: MeltDownAnimationProps) {
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
      totalDuration: 4.5, // 4.5 seconds total
      meltStartDelay: 0.5, // Start melting after 0.5s
      meltDuration: 3.5, // Melting phase
      fadeDuration: 0.5, // Final fade

      dripRate: 40, // Drips per second
      meltSpeed: 80, // Pixels per second
    };

    let W = 0, H = 0;
    let meltY = 0; // Current melt line (top of melted area)
    const drips: Drip[] = [];

    function resize() {
      if (!canvas || !containerRef.current) return;
      W = containerRef.current.clientWidth;
      H = containerRef.current.clientHeight;
      canvas.width = W;
      canvas.height = H;

      // Start melt line at top of bounding box
      meltY = boundingBox.y * H;
    }

    function getPhase(t: number): 'wait' | 'melt' | 'fade' | 'done' {
      if (t < CFG.meltStartDelay) return 'wait';
      if (t < CFG.meltStartDelay + CFG.meltDuration) return 'melt';
      if (t < CFG.totalDuration) return 'fade';
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

      // Draw full original bottle image as background
      ctx.drawImage(imageRef.current, 0, 0, W, H);

      if (phase === 'wait') {
        // No melting yet, just show original
        ctx.restore();
        return;
      }

      // Calculate melt progress
      let meltProgress = 0;
      if (phase === 'melt') {
        meltProgress = (t - CFG.meltStartDelay) / CFG.meltDuration;
        meltY = boxY + boxH * meltProgress;
      } else if (phase === 'fade' || phase === 'done') {
        meltProgress = 1;
        meltY = boxY + boxH;
      }

      // Clip and draw Keeper's Heart bottle revealed underneath
      // For now, use amber/gold color as placeholder
      ctx.save();
      ctx.beginPath();
      ctx.rect(boxX, meltY, boxW, boxY + boxH - meltY);
      ctx.clip();

      // Draw Keeper's Heart placeholder (amber/gold gradient)
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

      // Draw bottle shape outline
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;

      // Bottle cap
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

      // Draw melting edge effect (wavy, drippy edge)
      if (phase === 'melt') {
        ctx.save();
        ctx.beginPath();

        // Create wavy melt line
        const waveCount = 20;
        for (let i = 0; i <= waveCount; i++) {
          const x = boxX + (i / waveCount) * boxW;
          const waveOffset = Math.sin(t * 4 + i * 0.5) * 8 + Math.sin(t * 2 + i) * 5;
          const y = meltY + waveOffset;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Style the melt edge
        ctx.strokeStyle = `rgba(217, 119, 6, 0.8)`; // Amber-700 with transparency
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(217, 119, 6, 0.5)';
        ctx.stroke();

        // Add glow effect
        ctx.strokeStyle = `rgba(245, 158, 11, 0.6)`; // Amber-600
        ctx.lineWidth = 6;
        ctx.shadowBlur = 15;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Fade out effect in final phase
      if (phase === 'fade') {
        const fadeProgress = (t - CFG.meltStartDelay - CFG.meltDuration) / CFG.fadeDuration;
        ctx.globalAlpha = 1 - fadeProgress * 0.3; // Slight fade only
      }

      ctx.restore();
    }

    function spawnDrips(dt: number, t: number) {
      const phase = getPhase(t);
      if (phase !== 'melt') return;

      const boxX = boundingBox.x * W;
      const boxW = boundingBox.width * W;

      const dripCount = CFG.dripRate * dt;
      for (let i = 0; i < dripCount; i++) {
        if (Math.random() < dripCount % 1) {
          drips.push({
            x: boxX + Math.random() * boxW,
            y: meltY,
            vy: Math.random() * 50 + 30, // Falling speed
            length: Math.random() * 20 + 10,
            width: Math.random() * 3 + 2,
            opacity: Math.random() * 0.5 + 0.5,
            life: Math.random() * 2 + 1,
            age: 0,
          });
        }
      }
    }

    function drawDrips(dt: number) {
      for (let i = drips.length - 1; i >= 0; i--) {
        const drip = drips[i];
        drip.age += dt;

        if (drip.age >= drip.life) {
          drips.splice(i, 1);
          continue;
        }

        // Update position
        drip.y += drip.vy * dt;
        drip.vy += 200 * dt; // Gravity

        // Fade out as it ages
        const lifeFraction = drip.age / drip.life;
        const currentOpacity = drip.opacity * (1 - lifeFraction);

        // Draw drip
        ctx.save();

        // Gradient drip
        const gradient = ctx.createLinearGradient(
          drip.x,
          drip.y,
          drip.x,
          drip.y + drip.length
        );

        // Sample color from original image at drip location
        // For simplicity, use a semi-transparent dark color
        gradient.addColorStop(0, `rgba(80, 60, 40, ${currentOpacity * 0.8})`);
        gradient.addColorStop(0.5, `rgba(60, 45, 30, ${currentOpacity})`);
        gradient.addColorStop(1, `rgba(40, 30, 20, 0)`);

        ctx.fillStyle = gradient;

        // Draw elongated drip shape
        ctx.beginPath();
        ctx.ellipse(
          drip.x,
          drip.y,
          drip.width / 2,
          drip.length / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Add teardrop tip
        ctx.beginPath();
        ctx.arc(drip.x, drip.y + drip.length / 2, drip.width / 2, 0, Math.PI * 2);
        ctx.fill();

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

      // Draw bottle with melt effect
      drawBottle(animationTimeRef.current);

      // Spawn and draw drips
      spawnDrips(dt, animationTimeRef.current);
      drawDrips(dt);

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
