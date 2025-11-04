/**
 * Animation Manager
 * Detects device performance capabilities to determine appropriate animation tier
 */

import { detectPlatform } from './camera-settings-helper';

export type PerformanceTier = 'high' | 'medium' | 'low';

/**
 * Detect device performance tier based on platform, memory, and CPU
 *
 * Returns:
 * - 'high': iOS devices, or devices with 8GB+ RAM
 * - 'medium': Devices with 4-8GB RAM or 4+ CPU cores
 * - 'low': All other devices
 */
export function getDevicePerformanceTier(): PerformanceTier {
  // Server-side rendering fallback
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return 'medium';
  }

  // iOS devices generally have good performance - default to high
  const platform = detectPlatform();
  if (platform === 'ios-safari' || platform === 'ios-chrome') {
    console.log('[Performance] iOS device detected - tier: high');
    return 'high';
  }

  // Check available device memory (Chrome/Edge only)
  // @ts-ignore - deviceMemory is not in TypeScript definitions yet
  const deviceMemory = navigator.deviceMemory;

  if (deviceMemory) {
    console.log(`[Performance] Device memory: ${deviceMemory}GB`);

    if (deviceMemory >= 8) {
      return 'high';
    } else if (deviceMemory >= 4) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Check CPU cores as fallback
  const cores = navigator.hardwareConcurrency;

  if (cores) {
    console.log(`[Performance] CPU cores: ${cores}`);

    if (cores >= 8) {
      return 'high';
    } else if (cores >= 4) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Desktop browsers default to medium
  if (platform === 'desktop') {
    console.log('[Performance] Desktop browser - tier: medium');
    return 'medium';
  }

  // Conservative default for unknown devices
  console.log('[Performance] Unknown device - tier: low');
  return 'low';
}

/**
 * Check if device supports WebGL
 */
export function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * Get recommended animation settings based on performance tier
 */
export function getAnimationSettings(tier: PerformanceTier) {
  switch (tier) {
    case 'high':
      return {
        useWebGL: true,
        particleCount: 1000,
        enableShadows: true,
        enablePostProcessing: true,
        targetFPS: 60,
      };

    case 'medium':
      return {
        useWebGL: false,
        particleCount: 500,
        enableShadows: false,
        enablePostProcessing: false,
        targetFPS: 30,
      };

    case 'low':
      return {
        useWebGL: false,
        particleCount: 200,
        enableShadows: false,
        enablePostProcessing: false,
        targetFPS: 24,
      };
  }
}
