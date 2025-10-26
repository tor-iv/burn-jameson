"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, DollarSign, Zap, Package, Info } from "lucide-react";
import {
  getAnimationMode,
  setAnimationMode,
  getAvailableModes,
  getAnimationConfig,
  type AnimationMode,
  type AnimationModeConfig,
  getAnimationMetadata,
  getDevicePerformanceTier,
  getRecommendedAnimationMode,
} from "@/lib/animation-manager";

interface AnimationModeSwitcherProps {
  onClose: () => void;
  isOpen: boolean;
}

export default function AnimationModeSwitcher({
  onClose,
  isOpen,
}: AnimationModeSwitcherProps) {
  const [currentMode, setCurrentMode] = useState<AnimationMode>('enhanced-fire');
  const [selectedMode, setSelectedMode] = useState<AnimationMode>('enhanced-fire');
  const [availableModes, setAvailableModes] = useState<AnimationMode[]>([]);
  const [devicePerformance, setDevicePerformance] = useState<'high' | 'medium' | 'low'>('medium');
  const [recommendedMode, setRecommendedMode] = useState<AnimationMode>('enhanced-fire');

  useEffect(() => {
    // Load current settings
    const mode = getAnimationMode();
    setCurrentMode(mode);
    setSelectedMode(mode);
    setAvailableModes(getAvailableModes());
    setDevicePerformance(getDevicePerformanceTier());
    setRecommendedMode(getRecommendedAnimationMode());
  }, [isOpen]);

  const handleSelectMode = (mode: AnimationMode) => {
    setSelectedMode(mode);
  };

  const handleSave = () => {
    setAnimationMode(selectedMode);
    setCurrentMode(selectedMode);

    // Show confirmation
    console.log('[ANIMATION SWITCHER] Saved mode:', selectedMode);

    // Close after short delay
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleCancel = () => {
    setSelectedMode(currentMode); // Reset to current
    onClose();
  };

  const getPerformanceColor = (performance: 'high' | 'medium' | 'low') => {
    switch (performance) {
      case 'high':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-red-500';
    }
  };

  const getPerformanceBadge = (performance: 'high' | 'medium' | 'low') => {
    switch (performance) {
      case 'high':
        return 'bg-green-500/20 text-green-500 border-green-500';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500';
      case 'low':
        return 'bg-red-500/20 text-red-500 border-red-500';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[80vh] bg-charcoal rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-2xl font-bold text-cream">Animation Mode</h2>
                <p className="text-sm text-cream/60 mt-1">
                  Choose how bottles burn and transform
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-cream" />
              </button>
            </div>

            {/* Device Info */}
            <div className="px-6 py-3 bg-whiskey-amber/10 border-b border-whiskey-amber/20 flex items-center gap-2">
              <Info className="w-4 h-4 text-whiskey-amber" />
              <span className="text-sm text-whiskey-amber">
                Device Performance: <strong className="capitalize">{devicePerformance}</strong>
                {' '}- Recommended: <strong>{getAnimationConfig(recommendedMode).name}</strong>
              </span>
            </div>

            {/* Animation Modes List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {availableModes.map((mode) => {
                const config = getAnimationConfig(mode);
                const isSelected = selectedMode === mode;
                const isCurrent = currentMode === mode;
                const isRecommended = recommendedMode === mode;

                return (
                  <motion.button
                    key={mode}
                    onClick={() => handleSelectMode(mode)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-whiskey-amber bg-whiskey-amber/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {/* Title Row */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-cream">
                            {config.name}
                          </h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-500 rounded border border-green-500">
                              Current
                            </span>
                          )}
                          {isRecommended && !isCurrent && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-500 rounded border border-blue-500">
                              Recommended
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-cream/70 mb-3">
                          {config.description}
                        </p>

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {/* Performance */}
                          <div className="flex items-center gap-1">
                            <Zap className={`w-3.5 h-3.5 ${getPerformanceColor(config.performance)}`} />
                            <span className="text-cream/60 capitalize">{config.performance} Performance</span>
                          </div>

                          {/* Duration */}
                          <div className="flex items-center gap-1">
                            <span className="text-cream/60">~{(config.estimatedDuration / 1000).toFixed(1)}s</span>
                          </div>

                          {/* Cost */}
                          {config.costPerUse > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5 text-yellow-500" />
                              <span className="text-yellow-500">${config.costPerUse.toFixed(2)}/use</span>
                            </div>
                          )}

                          {/* Requires Assets */}
                          {config.requiresAssets && (
                            <div className="flex items-center gap-1">
                              <Package className="w-3.5 h-3.5 text-cream/40" />
                              <span className="text-cream/40">Requires {
                                config.id.includes('ai-morph') ? 'API' :
                                config.id === 'video-morph' ? 'Videos' :
                                config.id === 'lottie' ? 'JSON' : 'Assets'
                              }</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-whiskey-amber border-whiskey-amber'
                            : 'border-white/30'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-charcoal" />}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex items-center justify-between gap-4">
              <button
                onClick={handleCancel}
                className="px-6 py-3 rounded-lg border-2 border-white/20 text-cream font-medium hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={selectedMode === currentMode}
                className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                  selectedMode === currentMode
                    ? 'bg-white/10 text-cream/40 cursor-not-allowed'
                    : 'bg-whiskey-amber text-charcoal hover:bg-whiskey-light'
                }`}
              >
                {selectedMode === currentMode ? 'No Changes' : 'Save & Apply'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to easily integrate animation switcher into any component
 *
 * Usage:
 * ```tsx
 * const { openAnimationSwitcher, AnimationSwitcherModal } = useAnimationSwitcher();
 *
 * return (
 *   <>
 *     <button onClick={openAnimationSwitcher}>Change Animation</button>
 *     <AnimationSwitcherModal />
 *   </>
 * );
 * ```
 */
export function useAnimationSwitcher() {
  const [isOpen, setIsOpen] = useState(false);

  const openAnimationSwitcher = () => setIsOpen(true);
  const closeAnimationSwitcher = () => setIsOpen(false);

  const AnimationSwitcherModal = () => (
    <AnimationModeSwitcher isOpen={isOpen} onClose={closeAnimationSwitcher} />
  );

  return {
    isOpen,
    openAnimationSwitcher,
    closeAnimationSwitcher,
    AnimationSwitcherModal,
  };
}
