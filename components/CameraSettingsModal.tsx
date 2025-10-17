"use client";

import { X, Settings, RefreshCw } from "lucide-react";
import { getCameraSettingsInstructions, openDeviceSettings, requestCameraPermission } from "@/lib/camera-settings-helper";
import { useState, useEffect } from "react";

interface CameraSettingsModalProps {
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export default function CameraSettingsModal({ onClose, onPermissionGranted }: CameraSettingsModalProps) {
  const [instructions, setInstructions] = useState(getCameraSettingsInstructions());
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Update instructions on mount (client-side only)
    setInstructions(getCameraSettingsInstructions());
  }, []);

  const handleOpenSettings = () => {
    openDeviceSettings();
  };

  const handleTryAgain = async () => {
    setIsRetrying(true);
    const granted = await requestCameraPermission();
    setIsRetrying(false);

    if (granted) {
      onPermissionGranted?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="bg-charcoal rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-cream/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-cream" />
          </button>
          <h2 className="text-2xl font-bold text-cream pr-12">
            Enable Camera Access
          </h2>
          <p className="text-cream/70 text-sm mt-2">
            {instructions.platformName}
          </p>
        </div>

        {/* Instructions */}
        <div className="p-6 space-y-4">
          <p className="text-cream/90 text-sm mb-4">
            Follow these steps to enable camera permissions:
          </p>

          {instructions.steps.map((step, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-whiskey-amber/20 border-2 border-whiskey-amber flex items-center justify-center">
                <span className="text-whiskey-amber font-bold text-sm">
                  {index + 1}
                </span>
              </div>
              <p className="text-cream/90 text-sm pt-1 leading-relaxed">
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-2 space-y-3">
          {instructions.canOpenSettings && (
            <button
              onClick={handleOpenSettings}
              className="w-full py-3 px-4 bg-whiskey-amber hover:bg-whiskey-light text-charcoal font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Settings className="w-5 h-5" />
              Open Settings
            </button>
          )}

          <button
            onClick={handleTryAgain}
            disabled={isRetrying}
            className="w-full py-3 px-4 bg-cream/10 hover:bg-cream/20 text-cream font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Requesting...' : 'Request Permission Again'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 text-cream/70 hover:text-cream font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

        {/* Help Text */}
        <div className="px-6 pb-6">
          <p className="text-cream/50 text-xs text-center">
            After enabling permissions, tap "Request Permission Again" or refresh the page.
          </p>
        </div>
      </div>
    </div>
  );
}
