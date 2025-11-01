/**
 * Animation Manager
 *
 * Centralized system for managing multiple animation modes in the Burn That Ad app.
 * Allows switching between different burn/morph animation implementations with
 * persistent storage and fallback handling.
 */

export type AnimationMode =
  | 'enhanced-fire'      // Canvas particle system with brand-specific shapes (DEFAULT)
  | 'three-shader'       // Three.js shader-based burn effect
  | 'framer-flames'      // Framer Motion simple flame animation
  | 'lottie'             // Lottie JSON-based animation
  | 'ai-morph-full'      // Gemini API 8-frame morph sequence ($0.31 per use)
  | 'ai-morph-simple'    // Gemini API 1-frame crossfade ($0.04 per use)
  | 'video-morph'        // Video-based morph (requires video assets)
  | 'burn-to-coal'       // Burn effect ending with charred coal/ash appearance
  | 'spin-reveal'        // 360° rotation revealing Keeper's Heart at the end
  | 'melt-down';         // Competitor bottle melts downward like wax or ice

export interface AnimationModeConfig {
  id: AnimationMode;
  name: string;
  description: string;
  component: string; // Component file name
  estimatedDuration: number; // milliseconds
  costPerUse: number; // USD
  performance: 'high' | 'medium' | 'low'; // Mobile performance impact
  requiresAssets: boolean; // Requires external assets (videos, Lottie JSON, API)
  enabled: boolean; // Can be disabled via env var
}

/**
 * Animation mode configurations
 */
export const ANIMATION_MODES: Record<AnimationMode, AnimationModeConfig> = {
  'enhanced-fire': {
    id: 'enhanced-fire',
    name: 'Enhanced Fire',
    description: 'Canvas-based particle system with brand-specific bottle shapes. Best visual quality.',
    component: 'EnhancedFireAnimation',
    estimatedDuration: 6000,
    costPerUse: 0,
    performance: 'high',
    requiresAssets: false,
    enabled: true,
  },
  'three-shader': {
    id: 'three-shader',
    name: 'Three.js Shader',
    description: 'WebGL shader-based burn effect with paper-like burn-through.',
    component: 'ThreeBurnAnimation',
    estimatedDuration: 5000,
    costPerUse: 0,
    performance: 'medium',
    requiresAssets: false,
    enabled: true,
  },
  'framer-flames': {
    id: 'framer-flames',
    name: 'Framer Flames',
    description: 'Simple Framer Motion flame animation. Lightweight and fast.',
    component: 'burn-animation',
    estimatedDuration: 2500,
    costPerUse: 0,
    performance: 'high',
    requiresAssets: false,
    enabled: true,
  },
  'lottie': {
    id: 'lottie',
    name: 'Lottie Animation',
    description: 'JSON-based Lottie animation player. Requires fire-burn.json asset.',
    component: 'LottieBurnAnimation',
    estimatedDuration: 3000,
    costPerUse: 0,
    performance: 'high',
    requiresAssets: true,
    enabled: true,
  },
  'ai-morph-full': {
    id: 'ai-morph-full',
    name: 'AI Morph (8 Frames)',
    description: 'Gemini API generates 8 intermediate frames for smooth morph. Expensive but high quality.',
    component: 'BottleMorphAnimation',
    estimatedDuration: 8000, // 5s generation + 3s animation
    costPerUse: 0.31,
    performance: 'medium',
    requiresAssets: true, // Requires Gemini API
    enabled: !!process.env.GEMINI_API_KEY,
  },
  'ai-morph-simple': {
    id: 'ai-morph-simple',
    name: 'AI Morph (Simple)',
    description: 'Gemini API generates single transformed frame with crossfade. Fast and cheap.',
    component: 'SimpleBottleMorph',
    estimatedDuration: 8000, // 4.8s burn (60%) + 3.2s morph (40%) - allows fire to complete naturally
    costPerUse: 0.04,
    performance: 'high',
    requiresAssets: true, // Requires Gemini API
    enabled: !!process.env.GEMINI_API_KEY,
  },
  'video-morph': {
    id: 'video-morph',
    name: 'Video Morph',
    description: 'Pre-rendered video animations (melt → reform). Requires video assets per brand.',
    component: 'VideoMorphAnimation',
    estimatedDuration: 5000,
    costPerUse: 0,
    performance: 'high',
    requiresAssets: true, // Requires video files
    enabled: false, // Disabled until videos are available
  },
  'burn-to-coal': {
    id: 'burn-to-coal',
    name: 'Burn to Coal',
    description: 'Bottle burns into charred coal, then crumbles to reveal Keeper\'s Heart underneath.',
    component: 'BurnToCoalAnimation',
    estimatedDuration: 6000,
    costPerUse: 0,
    performance: 'high',
    requiresAssets: false,
    enabled: true,
  },
  'spin-reveal': {
    id: 'spin-reveal',
    name: 'Spin Reveal',
    description: '360° rotation animation revealing Keeper\'s Heart bottle at the end. Smooth and elegant.',
    component: 'SpinRevealAnimation',
    estimatedDuration: 4000,
    costPerUse: 0,
    performance: 'high',
    requiresAssets: false,
    enabled: true,
  },
  'melt-down': {
    id: 'melt-down',
    name: 'Melt Down',
    description: 'Competitor bottle melts downward like wax or ice with dripping effects. Satisfying destruction.',
    component: 'MeltDownAnimation',
    estimatedDuration: 4500,
    costPerUse: 0,
    performance: 'medium',
    requiresAssets: false,
    enabled: true,
  },
};

/**
 * Default animation mode (can be overridden by env var)
 * Changed to 'ai-morph-simple' to enable bottle morph transformation
 */
const DEFAULT_MODE: AnimationMode =
  (process.env.NEXT_PUBLIC_DEFAULT_ANIMATION_MODE as AnimationMode) || 'ai-morph-simple';

/**
 * LocalStorage key for persisting animation mode preference
 */
const STORAGE_KEY = 'kh_animation_mode';

/**
 * Get available animation modes (filter out disabled modes)
 */
export function getAvailableModes(): AnimationMode[] {
  return Object.values(ANIMATION_MODES)
    .filter(mode => mode.enabled)
    .map(mode => mode.id);
}

/**
 * Get current animation mode from localStorage or default
 *
 * @returns Current animation mode
 */
export function getAnimationMode(): AnimationMode {
  // Server-side: return default
  if (typeof window === 'undefined') {
    return DEFAULT_MODE;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidAnimationMode(stored)) {
      const mode = stored as AnimationMode;
      // Check if mode is still enabled
      if (ANIMATION_MODES[mode].enabled) {
        return mode;
      }
    }
  } catch (error) {
    console.warn('[ANIMATION MANAGER] Failed to read from localStorage:', error);
  }

  return DEFAULT_MODE;
}

/**
 * Set animation mode and persist to localStorage
 *
 * @param mode - Animation mode to set
 */
export function setAnimationMode(mode: AnimationMode): void {
  if (!isValidAnimationMode(mode)) {
    console.error(`[ANIMATION MANAGER] Invalid animation mode: ${mode}`);
    return;
  }

  if (!ANIMATION_MODES[mode].enabled) {
    console.error(`[ANIMATION MANAGER] Animation mode disabled: ${mode}`);
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, mode);
    console.log(`[ANIMATION MANAGER] ✅ Set animation mode: ${mode}`);
  } catch (error) {
    console.error('[ANIMATION MANAGER] Failed to save to localStorage:', error);
  }
}

/**
 * Get configuration for a specific animation mode
 *
 * @param mode - Animation mode
 * @returns Mode configuration
 */
export function getAnimationConfig(mode: AnimationMode): AnimationModeConfig {
  return ANIMATION_MODES[mode];
}

/**
 * Get configuration for current animation mode
 *
 * @returns Current mode configuration
 */
export function getCurrentAnimationConfig(): AnimationModeConfig {
  return ANIMATION_MODES[getAnimationMode()];
}

/**
 * Check if animation mode requires two-phase rendering (burn + morph)
 *
 * @param mode - Animation mode
 * @returns True if mode uses two-phase animation
 */
export function isTwoPhaseAnimation(mode: AnimationMode): boolean {
  return mode === 'ai-morph-full' || mode === 'ai-morph-simple' || mode === 'video-morph';
}

/**
 * Check if current mode requires two-phase rendering
 *
 * @returns True if current mode uses two-phase animation
 */
export function isCurrentModeTwoPhase(): boolean {
  return isTwoPhaseAnimation(getAnimationMode());
}

/**
 * Reset animation mode to default
 */
export function resetAnimationMode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log(`[ANIMATION MANAGER] ✅ Reset to default mode: ${DEFAULT_MODE}`);
  } catch (error) {
    console.error('[ANIMATION MANAGER] Failed to reset:', error);
  }
}

/**
 * Type guard to check if string is valid animation mode
 *
 * @param value - Value to check
 * @returns True if value is valid animation mode
 */
function isValidAnimationMode(value: string): value is AnimationMode {
  return value in ANIMATION_MODES;
}

/**
 * Get total estimated cost for a scan (burn + morph if applicable)
 *
 * @param mode - Animation mode (optional, uses current if not provided)
 * @returns Total estimated cost in USD
 */
export function getEstimatedCost(mode?: AnimationMode): number {
  const animMode = mode || getAnimationMode();
  const config = ANIMATION_MODES[animMode];

  // Two-phase animations might combine fire + morph
  // For now, return just the morph cost (fire is always free)
  return config.costPerUse;
}

/**
 * Get performance tier for device-specific animation selection
 *
 * @returns 'high' | 'medium' | 'low' based on device capabilities
 */
export function getDevicePerformanceTier(): 'high' | 'medium' | 'low' {
  if (typeof window === 'undefined') return 'medium';

  // Check for performance hints
  const isLowEnd =
    // @ts-ignore - Check for deviceMemory (Chrome only)
    (navigator.deviceMemory && navigator.deviceMemory < 4) ||
    // @ts-ignore - Check for hardwareConcurrency
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);

  if (isLowEnd) return 'low';

  // Check for iOS - generally high performance
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) return 'high';

  // Default to medium for unknown devices
  return 'medium';
}

/**
 * Get recommended animation mode for current device
 *
 * @returns Recommended animation mode based on device performance
 */
export function getRecommendedAnimationMode(): AnimationMode {
  const tier = getDevicePerformanceTier();
  const availableModes = getAvailableModes();

  // Low-end devices: prefer lightweight animations
  if (tier === 'low') {
    if (availableModes.includes('framer-flames')) return 'framer-flames';
    if (availableModes.includes('lottie')) return 'lottie';
  }

  // High-end devices: prefer best visual quality
  if (tier === 'high') {
    if (availableModes.includes('enhanced-fire')) return 'enhanced-fire';
    if (availableModes.includes('ai-morph-simple')) return 'ai-morph-simple';
  }

  // Medium-tier or fallback
  return DEFAULT_MODE;
}

/**
 * Export animation mode metadata for analytics/debugging
 */
export function getAnimationMetadata() {
  return {
    currentMode: getAnimationMode(),
    currentConfig: getCurrentAnimationConfig(),
    availableModes: getAvailableModes(),
    devicePerformance: getDevicePerformanceTier(),
    recommendedMode: getRecommendedAnimationMode(),
    allModes: ANIMATION_MODES,
  };
}
