"use client";

import { useEffect, useRef, useState } from "react";

interface VideoStreamProps {
  onFrame?: (imageBlob: Blob) => void;
  onError?: (error: Error) => void;
  facingMode?: "user" | "environment";
}

export default function VideoStream({
  onFrame,
  onError,
  facingMode = "environment",
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }
      } catch (err) {
        const error = err as Error;
        setError(error.message);
        onError?.(error);
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, onError]);

  const captureFrame = () => {
    if (!videoRef.current || !isStreaming) return null;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg", 0.85);
    });
  };

  // Expose captureFrame to parent via ref
  useEffect(() => {
    if (onFrame && isStreaming) {
      const interval = setInterval(async () => {
        const blob = await captureFrame();
        if (blob) {
          onFrame(blob);
        }
      }, 2000); // Capture every 2 seconds

      return () => clearInterval(interval);
    }
  }, [onFrame, isStreaming]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-charcoal text-cream">
        <div className="text-center p-6">
          <p className="text-lg mb-4">Camera Error</p>
          <p className="text-sm text-cream/70">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
    </div>
  );
}
