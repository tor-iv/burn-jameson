"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

interface CameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  scansCount?: number;
}

export default function CameraScanner({
  onScanSuccess,
  onClose,
  scansCount = 0,
}: CameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    scanner
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success callback
          setIsScanning(true);
          onScanSuccess(decodedText);
          // Stop scanner after successful scan
          scanner.stop().catch(console.error);
        },
        (errorMessage) => {
          // Error callback - we can ignore these as they happen frequently
          // Only log actual errors, not "No QR code found" messages
        }
      )
      .catch((err) => {
        console.error("Camera error:", err);
        setError("Unable to access camera. Please check permissions.");
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScanSuccess]);

  const handleClose = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(console.error);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Exit Button */}
      <button
        onClick={handleClose}
        className="absolute top-6 left-6 z-50 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center tap-target hover:bg-white/30 transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Camera View */}
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* QR Scanner Container */}
        <div id="qr-reader" className="w-full max-w-md" />

        {/* Scanning Indicator */}
        {!error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="relative">
              {/* Pulsing circle */}
              <div className="w-64 h-64 rounded-full border-4 border-whiskey-amber animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-56 h-56 rounded-full border-2 border-whiskey-amber/50" />
              </div>
            </div>
          </div>
        )}

        {/* Instruction Text */}
        <div className="absolute top-32 left-0 right-0 text-center px-6">
          <p className="text-white text-lg font-medium drop-shadow-lg">
            {isScanning
              ? "🔥 Scanning..."
              : "Point camera at any Jameson advertisement"}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="bg-red-500/90 backdrop-blur-sm rounded-xl p-6 max-w-md">
              <p className="text-white text-center font-medium">{error}</p>
              <p className="text-white/80 text-sm text-center mt-2">
                Please enable camera permissions in your browser settings.
              </p>
            </div>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-charcoal/80 backdrop-blur-sm py-6 px-6">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="text-white font-medium">
              Ads Burned: {scansCount} 🔥
            </div>
            <button
              onClick={handleClose}
              className="text-whiskey-amber font-medium hover:text-whiskey-light transition-colors"
            >
              View My Coupons
            </button>
          </div>
        </div>

        {/* Dark gradient vignette */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent via-transparent to-black/50" />
      </div>
    </div>
  );
}
