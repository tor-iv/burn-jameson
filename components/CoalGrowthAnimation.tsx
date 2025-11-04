'use client';

import { useEffect, useRef, useState } from 'react';

interface CoalGrowthAnimationProps {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
  segmentationMask?: string;
  detectedBrand?: string | null;
  aspectRatio?: number | null;
  onComplete?: () => void;
  morphedImageUrl?: string | null;
  onRequestMorph?: () => void;
  onBurnComplete?: () => void;
}

interface CoalPieceShape {
  angle: number;
  radius: number;
}

class CoalPiece {
  baseX: number;
  baseY: number;
  startTime: number;
  growthDuration: number;
  size: number;
  rotation: number;
  currentSize: number;
  shape: CoalPieceShape[];
  crumbleStartTime: number | null;
  crumbleDuration: number;
  fallVelocity: number;
  currentY: number;
  opacity: number;
  color: { r: number; g: number; b: number };
  emberIntensity: number;
  emberPhase: number;

  constructor(x: number, y: number, startTime: number) {
    this.baseX = x;
    this.baseY = y;
    this.startTime = startTime;
    this.growthDuration = 800 + Math.random() * 400;
    this.size = 15 + Math.random() * 25;
    this.rotation = Math.random() * Math.PI * 2;
    this.currentSize = 0;
    this.shape = this.generateShape();
    this.crumbleStartTime = null;
    this.crumbleDuration = 600 + Math.random() * 400;
    this.fallVelocity = 0;
    this.currentY = y;
    this.opacity = 1;

    const darkness = Math.floor(Math.random() * 15 + 5);
    this.color = {
      r: darkness + Math.floor(Math.random() * 10),
      g: darkness,
      b: darkness,
    };

    this.emberIntensity = Math.random();
    this.emberPhase = Math.random() * Math.PI * 2;
  }

  generateShape(): CoalPieceShape[] {
    const points: CoalPieceShape[] = [];
    const numPoints = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radiusVariation = 0.7 + Math.random() * 0.6;
      points.push({ angle: angle, radius: radiusVariation });
    }
    return points;
  }

  updateGrowth(currentTime: number): void {
    const elapsed = currentTime - this.startTime;
    if (elapsed < 0) {
      this.currentSize = 0;
      return;
    }

    if (elapsed < this.growthDuration) {
      const progress = elapsed / this.growthDuration;
      const eased = 1 - Math.pow(1 - progress, 3);
      this.currentSize = this.size * eased;
    } else {
      this.currentSize = this.size;
    }
  }

  updateCrumble(currentTime: number): void {
    if (this.crumbleStartTime === null) return;

    const elapsed = currentTime - this.crumbleStartTime;
    if (elapsed < 0) return;

    if (elapsed < this.crumbleDuration) {
      const progress = elapsed / this.crumbleDuration;
      this.fallVelocity += 0.3;
      this.currentY += this.fallVelocity;
      this.opacity = 1 - progress;
      this.currentSize = this.size * (1 - progress * 0.3);
    } else {
      this.opacity = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D, phase: string, phaseProgress: number, animationTime: number): void {
    if (this.currentSize <= 0 || this.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.baseX, this.currentY);
    ctx.rotate(this.rotation + (phase === 'crumble' ? phaseProgress * 2 : 0));

    ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
    ctx.beginPath();
    this.shape.forEach((point, i) => {
      const x = Math.cos(point.angle) * point.radius * this.currentSize;
      const y = Math.sin(point.angle) * point.radius * this.currentSize;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fill();

    const numSpots = Math.floor(this.currentSize / 8);
    for (let i = 0; i < numSpots; i++) {
      const angle = (i * 2.4) % (Math.PI * 2);
      const dist = (this.currentSize * 0.3) * ((i * 0.7) % 1);
      const spotX = Math.cos(angle) * dist;
      const spotY = Math.sin(angle) * dist;
      const spotSize = 1 + Math.random() * 2;

      ctx.fillStyle = `rgba(0, 0, 0, 0.4)`;
      ctx.beginPath();
      ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    if (phase === 'ember') {
      const time = animationTime / 1000;
      const pulse = Math.sin(time * 3 + this.emberPhase) * 0.5 + 0.5;
      const glowIntensity = this.emberIntensity * pulse * (1 - phaseProgress * 0.5);

      if (glowIntensity > 0.3) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(255, 107, 53, ${glowIntensity * 0.6})`;
        ctx.strokeStyle = `rgba(255, 107, 53, ${glowIntensity * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        this.shape.forEach((point, i) => {
          const x = Math.cos(point.angle) * point.radius * this.currentSize;
          const y = Math.sin(point.angle) * point.radius * this.currentSize;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  type: string;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: { r: number; g: number; b: number };

  constructor(x: number, y: number, type: string) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = type === 'ember' ? -Math.random() * 2 - 1 : -Math.random() * 0.5;
    this.life = type === 'ember' ? Math.random() * 1 + 0.5 : Math.random() * 1.5 + 1;
    this.maxLife = this.life;
    this.size = type === 'ember' ? Math.random() * 2 + 1 : Math.random() * 1.5 + 0.5;

    if (type === 'ember') {
      this.color = {
        r: 255,
        g: Math.floor(Math.random() * 33 + 107),
        b: Math.floor(Math.random() * 19 + 53),
      };
    } else {
      const gray = Math.floor(Math.random() * 30 + 40);
      this.color = { r: gray, g: gray, b: gray };
    }
  }

  update(dt: number): void {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05;
    this.life -= dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const opacity = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${opacity * 0.6})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    if (this.type === 'ember') {
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

export default function CoalGrowthAnimation({
  boundingBox,
  imageUrl,
  segmentationMask,
  onComplete,
  onBurnComplete,
}: CoalGrowthAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const animationTimeRef = useRef(0);
  const coalPiecesRef = useRef<CoalPiece[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const hasCompletedRef = useRef(false);
  const burnCompleteRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const ANIMATION_DURATION = 6000; // 6 seconds

  useEffect(() => {
    console.log('[CoalGrowthAnimation] 🎬 Component mounted');
    console.log('[CoalGrowthAnimation] 📦 Props:', {
      boundingBox,
      hasSegmentationMask: !!segmentationMask,
      imageUrl: imageUrl.substring(0, 50) + '...',
    });

    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      console.error('[CoalGrowthAnimation] ❌ Missing canvas or container refs');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[CoalGrowthAnimation] ❌ Failed to get 2D context');
      return;
    }

    // Set canvas size
    const updateCanvasSize = () => {
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    updateCanvasSize();
    console.log('[CoalGrowthAnimation] ✅ Canvas initialized:', canvas.width, 'x', canvas.height);
    window.addEventListener('resize', updateCanvasSize);

    // Calculate target area from bounding box
    const targetArea = {
      x: boundingBox.x * canvas.width,
      y: boundingBox.y * canvas.height,
      width: boundingBox.width * canvas.width,
      height: boundingBox.height * canvas.height,
    };
    console.log('[CoalGrowthAnimation] 📏 Target area:', targetArea);

    // Initialize coal pieces
    const initializeCoalPieces = () => {
      coalPiecesRef.current = [];
      const rows = Math.ceil(targetArea.height / 25);
      const cols = Math.ceil(targetArea.width / 25);
      const growthPhase = 2000;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = targetArea.x + (col * 25) + 12.5 + (Math.random() - 0.5) * 10;
          const y = targetArea.y + (row * 25) + 12.5 + (Math.random() - 0.5) * 10;

          const bottomRow = rows - row - 1;
          const delay = (bottomRow / rows) * growthPhase + Math.random() * 300;

          coalPiecesRef.current.push(new CoalPiece(x, y, delay));
        }
      }
    };

    initializeCoalPieces();
    console.log('[CoalGrowthAnimation] ⚫ Initialized', coalPiecesRef.current.length, 'coal pieces');
    setIsReady(true);

    // Track phase transitions for logging
    let lastLoggedPhase = '';

    // Animation loop
    const animate = () => {
      const deltaTime = 16;
      animationTimeRef.current += deltaTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const totalProgress = Math.min(animationTimeRef.current / ANIMATION_DURATION, 1);
      let currentPhase = '';
      let phaseProgress = 0;

      if (totalProgress < 0.42) {
        currentPhase = 'growth';
        phaseProgress = totalProgress / 0.42;
        coalPiecesRef.current.forEach((piece) => piece.updateGrowth(animationTimeRef.current));

        if (Math.random() < 0.3) {
          const piece = coalPiecesRef.current[Math.floor(Math.random() * coalPiecesRef.current.length)];
          if (piece && piece.currentSize > 5) {
            particlesRef.current.push(new Particle(piece.baseX, piece.currentY, 'ember'));
          }
        }
      } else if (totalProgress < 0.58) {
        currentPhase = 'char';
        phaseProgress = (totalProgress - 0.42) / 0.17;
        coalPiecesRef.current.forEach((piece) => piece.updateGrowth(animationTimeRef.current));

        if (Math.random() < 0.2) {
          const piece = coalPiecesRef.current[Math.floor(Math.random() * coalPiecesRef.current.length)];
          if (piece) {
            particlesRef.current.push(new Particle(piece.baseX, piece.currentY, 'ash'));
          }
        }
      } else if (totalProgress < 0.83) {
        currentPhase = 'ember';
        phaseProgress = (totalProgress - 0.58) / 0.25;
        coalPiecesRef.current.forEach((piece) => piece.updateGrowth(animationTimeRef.current));

        if (Math.random() < 0.15) {
          const piece = coalPiecesRef.current[Math.floor(Math.random() * coalPiecesRef.current.length)];
          if (piece) {
            particlesRef.current.push(new Particle(piece.baseX, piece.currentY, 'ember'));
          }
        }

        // Trigger burn complete callback at 60% of this phase (around 3.6s)
        if (!burnCompleteRef.current && phaseProgress > 0.6 && onBurnComplete) {
          console.log('[CoalGrowthAnimation] 🔥 Triggering onBurnComplete callback');
          burnCompleteRef.current = true;
          onBurnComplete();
        }
      } else if (totalProgress < 1) {
        currentPhase = 'crumble';
        phaseProgress = (totalProgress - 0.83) / 0.17;

        const crumblePhaseTime = animationTimeRef.current - (ANIMATION_DURATION * 0.83);
        coalPiecesRef.current.forEach((piece) => {
          if (piece.crumbleStartTime === null) {
            const rowDelay = ((piece.baseY - targetArea.y) / targetArea.height) * 1000;
            if (crumblePhaseTime >= rowDelay) {
              piece.crumbleStartTime = animationTimeRef.current;
            }
          }
          piece.updateCrumble(animationTimeRef.current);
        });

        if (Math.random() < 0.4) {
          const piece = coalPiecesRef.current[Math.floor(Math.random() * coalPiecesRef.current.length)];
          if (piece && piece.crumbleStartTime !== null) {
            particlesRef.current.push(new Particle(piece.baseX, piece.currentY, 'dust'));
          }
        }
      } else {
        // Animation complete
        if (!hasCompletedRef.current && onComplete) {
          console.log('[CoalGrowthAnimation] ✅ Animation complete - triggering onComplete callback');
          hasCompletedRef.current = true;
          onComplete();
        }
        particlesRef.current = [];
        return; // Stop animation
      }

      // Log phase transitions
      if (currentPhase && currentPhase !== lastLoggedPhase) {
        console.log(`[CoalGrowthAnimation] 🎭 Phase transition: ${lastLoggedPhase || 'start'} → ${currentPhase} (${Math.round(totalProgress * 100)}%)`);
        lastLoggedPhase = currentPhase;
      }

      // Draw coal pieces
      coalPiecesRef.current.forEach((piece) => piece.draw(ctx, currentPhase, phaseProgress, animationTimeRef.current));

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      particlesRef.current.forEach((p) => {
        p.update(deltaTime / 1000);
        p.draw(ctx);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    console.log('[CoalGrowthAnimation] ▶️ Starting animation loop');
    animate();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [boundingBox, onComplete, onBurnComplete]);

  // Calculate container style with masking
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  };

  if (segmentationMask) {
    containerStyle.maskImage = `url(${segmentationMask})`;
    containerStyle.WebkitMaskImage = `url(${segmentationMask})`;
    containerStyle.maskSize = 'contain';
    containerStyle.WebkitMaskSize = 'contain';
    containerStyle.maskRepeat = 'no-repeat';
    containerStyle.WebkitMaskRepeat = 'no-repeat';
    containerStyle.maskPosition = 'center';
    containerStyle.WebkitMaskPosition = 'center';
  }

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className="coal-growth-animation"
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
