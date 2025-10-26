"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import VideoStream from "@/components/video-stream";
import { X, Info, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSessionId, saveSession } from "@/lib/session-manager";
import { saveBottleScan } from "@/lib/supabase-helpers";
import { isTestModeEnabled, disableTestMode, getMockDetectionResponse } from "@/lib/debug-mode";

interface HandBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ScanPage() {
  const router = useRouter();
  const [confidence, setConfidence] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // NEW: Hand detection state
  const [handDetectionAttempts, setHandDetectionAttempts] = useState(0);
  const [handPosition, setHandPosition] = useState<HandBoundingBox | null>(null);
  const [handDetectionStatus, setHandDetectionStatus] = useState<'searching' | 'found' | 'fallback'>('searching');

  useEffect(() => {
    // Check if test mode is enabled
    setTestMode(isTestModeEnabled());

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
      let data;

      // TEST MODE: Intelligent hand detection + mock response
      if (testMode) {
        console.log('[SCAN PAGE - TEST MODE] 🧪 Test mode active');

        // STEP 1: Try hand detection for first 3 attempts (if we don't have a hand position yet)
        if (handDetectionAttempts < 3 && !handPosition) {
          console.log(`[SCAN PAGE - TEST MODE] 🤚 Hand detection attempt ${handDetectionAttempts + 1}/3`);
          setHandDetectionStatus('searching');

          try {
            const formData = new FormData();
            formData.append("image", imageBlob);

            const handResponse = await fetch("/api/detect-hand", {
              method: "POST",
              body: formData,
            });

            if (handResponse.ok) {
              const handData = await handResponse.json();

              if (handData.handDetected && !handData.fallbackUsed) {
                // Hand found! Store position and stop searching
                console.log('[SCAN PAGE - TEST MODE] ✅ Hand detected!', handData.handBoundingBox);
                setHandPosition(handData.handBoundingBox);
                setHandDetectionStatus('found');
                // Don't increment attempts - we found it!
              } else {
                // No hand found, increment attempts
                console.log(`[SCAN PAGE - TEST MODE] ⚠️  No hand found (attempt ${handDetectionAttempts + 1}/3)`);
                setHandDetectionAttempts(handDetectionAttempts + 1);

                // If we've exhausted attempts, use fallback
                if (handDetectionAttempts + 1 >= 3) {
                  console.log('[SCAN PAGE - TEST MODE] 📍 Using fallback position after 3 attempts');
                  setHandDetectionStatus('fallback');
                }
              }
            } else {
              // Hand detection API failed, increment attempts
              setHandDetectionAttempts(handDetectionAttempts + 1);
            }
          } catch (handError) {
            console.error('[SCAN PAGE - TEST MODE] ❌ Hand detection error:', handError);
            setHandDetectionAttempts(handDetectionAttempts + 1);
          }

          // Don't proceed to bottle detection yet - we're still looking for hand
          setIsDetecting(false);
          return;
        }

        // STEP 2: Generate mock response with hand position (or fallback if no hand found)
        console.log('[SCAN PAGE - TEST MODE] 🎯 Generating mock response with position:', handPosition || 'fallback');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
        data = getMockDetectionResponse(handPosition);

      } else {
        // NORMAL MODE: Call real detection API
        const formData = new FormData();
        formData.append("image", imageBlob);

        const response = await fetch("/api/detect-bottle", {
          method: "POST",
          body: formData,
        });

        data = await response.json();
      }

      // In test mode, always detect; in normal mode, check confidence
      const shouldProceed = testMode || (data.detected && data.confidence > 0.75);

      if (shouldProceed) {
        // Bottle detected! Create session and save to Supabase
        const sessionId = generateSessionId();
        saveSession(sessionId);

        // Convert blob to base64 for storage
        const reader = new FileReader();
        reader.onloadend = async () => {
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
          // Store brand and aspect ratio for brand-specific shape selection
          if (data.brand) {
            sessionStorage.setItem(`bottle_brand_${sessionId}`, data.brand);
          }
          if (data.aspectRatio !== null && data.aspectRatio !== undefined) {
            sessionStorage.setItem(`bottle_aspect_ratio_${sessionId}`, data.aspectRatio.toString());
          }
          // Store segmentation mask if available
          if (data.segmentationMask) {
            sessionStorage.setItem(
              `bottle_segmentation_mask_${sessionId}`,
              data.segmentationMask
            );
            console.log('[SCAN PAGE] 🎭 Stored segmentation mask in sessionStorage');
          }

          // NEW: Start Gemini preload immediately after detection (before navigation)
          console.log('[SCAN PAGE] 🚀 Starting Gemini preload immediately after detection');
          const morphEnabled = sessionStorage.getItem('morph_enabled');
          if (morphEnabled === null || morphEnabled === 'true') {
            // Call Gemini API to preload transformed image
            fetch('/api/morph-bottle-simple', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image: base64Image,
                boundingBox: data.expandedBoundingBox || data.normalizedBoundingBox,
              }),
            })
              .then(async (response) => {
                if (response.ok) {
                  const morphData = await response.json();
                  console.log('[SCAN PAGE] ✅ Gemini preload complete! Storing in sessionStorage');
                  sessionStorage.setItem(
                    `preloaded_morph_${sessionId}`,
                    morphData.transformedImage
                  );
                } else {
                  console.error('[SCAN PAGE] ❌ Gemini preload failed:', await response.text());
                }
              })
              .catch((err) => {
                console.error('[SCAN PAGE] ❌ Gemini preload error:', err);
              });
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
        // Update confidence meter (only in normal mode)
        if (!testMode) {
          setConfidence(Math.round(data.confidence * 100));
        }
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

  const handleDisableTestMode = () => {
    disableTestMode();
    setTestMode(false);
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
      {/* Test Mode Badge - Shows hand detection status */}
      {testMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
          <div className={`${
            handDetectionStatus === 'searching' ? 'bg-orange-500 animate-pulse' :
            handDetectionStatus === 'found' ? 'bg-green-500' :
            'bg-yellow-500'
          } text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg transition-colors`}>
            {handDetectionStatus === 'searching' && (
              <>🤚 LOOKING FOR HAND... ({handDetectionAttempts + 1}/3)</>
            )}
            {handDetectionStatus === 'found' && (
              <>✅ HAND FOUND! HOLD STEADY</>
            )}
            {handDetectionStatus === 'fallback' && (
              <>📍 READY - TAKE PHOTO</>
            )}
            <button
              onClick={handleDisableTestMode}
              className="ml-1 hover:opacity-70 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
            testMode
              ? handDetectionStatus === 'searching'
                ? "border-orange-500 shadow-lg shadow-orange-500/50 animate-pulse"
                : handDetectionStatus === 'found'
                ? "border-green-500 shadow-lg shadow-green-500/50"
                : "border-yellow-500 shadow-lg shadow-yellow-500/50"
              : confidence > 75
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
            {testMode
              ? handDetectionStatus === 'searching'
                ? `🤚 Looking for hand... (${handDetectionAttempts + 1}/3)`
                : handDetectionStatus === 'found'
                ? "✅ Hand found! Position your photo"
                : "📍 Ready to scan"
              : confidence < 30
              ? "Looking for bottle..."
              : confidence >= 30 && confidence < 75
              ? `Scanning... ${confidence}%`
              : "✓ Jameson detected!"}
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-32 left-0 right-0 z-10 text-center px-6">
        <p className="text-white text-lg font-medium drop-shadow-lg">
          {testMode
            ? handDetectionStatus === 'searching'
              ? "Show your hand to the camera"
              : "Ready - take your photo!"
            : "Point at Jameson bottle label"}
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
