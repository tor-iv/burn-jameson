'use client';

import { useEffect, useRef, useState } from 'react';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MorphFrame {
  percent: number;
  imageData: string; // base64 data URL
}

interface BottleMorphAnimationProps {
  capturedImage: string; // base64 data URL of the original photo
  boundingBox?: BoundingBox;
  onComplete?: () => void;
  useThreeFrameMode?: boolean; // If true, only generate 3 frames (cheaper)
  duration?: number; // Animation duration in milliseconds (default: 3000)
}

export default function BottleMorphAnimation({
  capturedImage,
  boundingBox,
  onComplete,
  useThreeFrameMode = false,
  duration = 3000,
}: BottleMorphAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<MorphFrame[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cost, setCost] = useState(0);
  const animationFrameRef = useRef<number>();

  // Generate morph frames
  useEffect(() => {
    let isCancelled = false;

    async function generateFrames() {
      try {
        setIsGenerating(true);
        setError(null);

        // Define which frames to generate
        const framePercentages = useThreeFrameMode
          ? [0, 50, 100] // 3-frame mode: $0.12 per conversion
          : [0, 15, 30, 45, 60, 75, 90, 100]; // 8-frame mode: $0.31 per conversion

        console.log(`Generating ${framePercentages.length} morph frames...`);

        // Generate all frames in parallel for speed
        const framePromises = framePercentages.map(async (percent) => {
          const response = await fetch('/api/morph-bottle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: capturedImage,
              boundingBox,
              morphPercent: percent,
              useThreeFrameMode,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate frame');
          }

          const data = await response.json();
          return {
            percent,
            imageData: data.image,
          };
        });

        // Wait for all frames with progress tracking
        const generatedFrames: MorphFrame[] = [];
        for (let i = 0; i < framePromises.length; i++) {
          const frame = await framePromises[i];
          if (isCancelled) return;

          generatedFrames.push(frame);
          setProgress(((i + 1) / framePromises.length) * 100);
        }

        // Sort frames by percentage to ensure proper order
        generatedFrames.sort((a, b) => a.percent - b.percent);

        console.log(`Generated ${generatedFrames.length} frames successfully`);
        setFrames(generatedFrames);
        setCost(framePercentages.length * 0.039);
        setIsGenerating(false);

      } catch (err) {
        if (isCancelled) return;
        console.error('Frame generation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate frames');
        setIsGenerating(false);
      }
    }

    generateFrames();

    return () => {
      isCancelled = true;
    };
  }, [capturedImage, boundingBox, useThreeFrameMode]);

  // Animate the morph sequence
  useEffect(() => {
    if (isGenerating || frames.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = Date.now();
    const frameDuration = duration / (frames.length - 1);
    let currentFrameIndex = 0;
    let nextFrameIndex = 1;

    // Preload all images
    const loadedImages = frames.map((frame) => {
      const img = new Image();
      img.src = frame.imageData;
      return img;
    });

    // Wait for all images to load
    Promise.all(
      loadedImages.map(
        (img) =>
          new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // Continue even if one fails
          })
      )
    ).then(() => {
      // Set canvas size to match first image
      if (loadedImages[0].complete) {
        canvas.width = loadedImages[0].naturalWidth;
        canvas.height = loadedImages[0].naturalHeight;
      }

      // Animation loop
      function animate() {
        const elapsed = Date.now() - startTime;
        const totalProgress = elapsed / duration;

        if (totalProgress >= 1) {
          // Animation complete - show final frame
          if (ctx && loadedImages[loadedImages.length - 1].complete) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(loadedImages[loadedImages.length - 1], 0, 0, canvas.width, canvas.height);
          }
          if (onComplete) onComplete();
          return;
        }

        // Calculate which frames to blend
        const frameFloat = totalProgress * (frames.length - 1);
        currentFrameIndex = Math.floor(frameFloat);
        nextFrameIndex = Math.min(currentFrameIndex + 1, frames.length - 1);
        const frameBlend = frameFloat - currentFrameIndex;

        if (!ctx) return;

        // Draw current frame
        if (loadedImages[currentFrameIndex].complete) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1 - frameBlend;
          ctx.drawImage(loadedImages[currentFrameIndex], 0, 0, canvas.width, canvas.height);
        }

        // Blend in next frame
        if (loadedImages[nextFrameIndex].complete && nextFrameIndex !== currentFrameIndex) {
          ctx.globalAlpha = frameBlend;
          ctx.drawImage(loadedImages[nextFrameIndex], 0, 0, canvas.width, canvas.height);
        }

        ctx.globalAlpha = 1;

        animationFrameRef.current = requestAnimationFrame(animate);
      }

      animate();
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [frames, isGenerating, duration, onComplete]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {isGenerating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/80">
          <div className="text-white text-center space-y-4 p-8">
            <div className="text-2xl font-bold">Transforming Bottle...</div>
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm text-gray-300">
              Generating AI frames: {Math.round(progress)}%
            </div>
            <div className="text-xs text-gray-400">
              {useThreeFrameMode ? '3 frames ($0.12)' : '8 frames ($0.31)'}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/90">
          <div className="text-white text-center space-y-4 p-8">
            <div className="text-2xl font-bold text-red-500">Error</div>
            <div className="text-sm">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{ display: isGenerating || error ? 'none' : 'block' }}
      />

      {!isGenerating && !error && (
        <div className="absolute bottom-4 right-4 text-xs text-white/60 bg-black/50 px-3 py-1 rounded">
          Cost: ${cost.toFixed(2)}
        </div>
      )}
    </div>
  );
}
