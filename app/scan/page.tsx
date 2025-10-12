"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import VideoStream from "@/components/video-stream";
import { X, Info, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSessionId, saveSession } from "@/lib/session-manager";
import { saveBottleScan } from "@/lib/supabase-helpers";

export default function ScanPage() {
  const router = useRouter();
  const [confidence, setConfidence] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    // Show manual override button after 10 seconds
    const timer = setTimeout(() => {
      setShowManualOverride(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleFrame = async (imageBlob: Blob) => {
    if (isDetecting) return;

    setIsDetecting(true);

    try {
      const formData = new FormData();
      formData.append("image", imageBlob);

      const response = await fetch("/api/detect-bottle", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.detected && data.confidence > 0.75) {
        // Bottle detected! Create session and save to Supabase
        const sessionId = generateSessionId();
        saveSession(sessionId);

        // Convert blob to base64 for storage
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Image = reader.result as string;

          // Store captured image and bounding box in sessionStorage
          sessionStorage.setItem(`bottle_image_${sessionId}`, base64Image);
          if (data.boundingBox) {
            sessionStorage.setItem(
              `bottle_bbox_${sessionId}`,
              JSON.stringify(data.boundingBox)
            );
          }
          if (data.normalizedBoundingBox) {
            sessionStorage.setItem(
              `bottle_bbox_normalized_${sessionId}`,
              JSON.stringify(data.normalizedBoundingBox)
            );
          }
          if (data.expandedBoundingBox) {
            sessionStorage.setItem(
              `bottle_bbox_expanded_${sessionId}`,
              JSON.stringify(data.expandedBoundingBox)
            );
          }
        };
        reader.readAsDataURL(imageBlob);

        // Save bottle scan to Supabase
        const result = await saveBottleScan(
          sessionId,
          imageBlob,
          data.brand || 'Jameson Irish Whiskey',
          data.confidence
        );

        if (!result.success) {
          console.error('Failed to save bottle scan:', result.error);
          // Still proceed to animation even if save fails
        }

        router.push(`/scanning/${sessionId}`);
      } else {
        // Update confidence meter
        setConfidence(Math.round(data.confidence * 100));
      }
    } catch (error) {
      console.error("Detection error:", error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleManualOverride = () => {
    const sessionId = generateSessionId();
    saveSession(sessionId);
    router.push(`/scanning/${sessionId}`);
  };

  const handleUploadPhoto = () => {
    // TODO: Implement file upload fallback
    alert("Photo upload coming soon!");
  };

  if (cameraError) {
    return (
      <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl mb-4">📷</div>
          <h2 className="text-2xl font-bold text-cream">Camera Needed</h2>
          <p className="text-cream/70">
            To scan bottles, allow camera access in your browser settings
          </p>
          <div className="space-y-3 pt-4">
            <Button size="lg" variant="outline" className="w-full">
              Open Settings
            </Button>
            <div className="text-cream/50 text-sm">Or upload a photo:</div>
            <Button
              size="lg"
              variant="ghost"
              onClick={handleUploadPhoto}
              className="w-full"
            >
              <Upload className="w-5 h-5 mr-2" />
              Choose File
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={() => router.push("/intro")}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors">
          <Info className="w-6 h-6" />
        </button>
      </div>

      {/* Video Feed */}
      <div className="absolute inset-0">
        <VideoStream
          onFrame={handleFrame}
          onError={() => setCameraError(true)}
          facingMode="environment"
        />
      </div>

      {/* Detection Frame Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-72 h-96 border-4 rounded-3xl transition-all duration-300 ${
            confidence > 75
              ? "border-green-500 shadow-lg shadow-green-500/50"
              : confidence > 30
              ? "border-yellow-500 animate-pulse"
              : "border-white/50"
          }`}
        />
      </div>

      {/* Confidence Meter */}
      <div className="absolute top-24 left-0 right-0 z-10 text-center">
        <div className="inline-block bg-black/60 backdrop-blur-sm rounded-full px-6 py-3">
          <p className="text-white text-lg font-semibold">
            {confidence < 30 && "Looking for bottle..."}
            {confidence >= 30 && confidence < 75 && `Scanning... ${confidence}%`}
            {confidence >= 75 && "✓ Jameson detected!"}
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-32 left-0 right-0 z-10 text-center px-6">
        <p className="text-white text-lg font-medium drop-shadow-lg">
          Point at Jameson bottle label
        </p>
      </div>

      {/* Manual Override Button */}
      {showManualOverride && (
        <div className="absolute bottom-16 left-0 right-0 z-10 px-6">
          <Button
            onClick={handleManualOverride}
            variant="outline"
            size="lg"
            className="w-full bg-black/60 backdrop-blur-sm border-white/50 text-white hover:bg-black/80"
          >
            Having trouble? Upload photo
          </Button>
        </div>
      )}
    </div>
  );
}
