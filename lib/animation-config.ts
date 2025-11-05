/**
 * Animation configuration system
 * Allows switching between different animation sets via environment variable
 */

import { AnimationType, AnimationMetadata } from '@/types/animations';

/**
 * Animation metadata for each type
 */
export const ANIMATION_CONFIGS: Record<AnimationType, AnimationMetadata> = {
  fire: {
    name: 'Fire Burn',
    description: 'Classic fire burn effect with embers and smoke particles',
    burnDuration: 6000,  // 6 seconds
    morphDuration: 2000, // 2 seconds
  },
  coal: {
    name: 'Coal Growth',
    description: 'Coal growth and charring effect with ember particles',
    burnDuration: 6000,  // 6 seconds
    morphDuration: 2000, // 2 seconds
  },
  '3fire': {
    name: 'Three.js Fire',
    description: 'WebGL burning paper with volumetric fire and heat distortion',
    burnDuration: 6000,  // 6 seconds
    morphDuration: 2000, // 2 seconds
  },
};

/**
 * Get the current animation type from environment variable
 * Defaults to 'fire' if not set or invalid
 */
export function getAnimationType(): AnimationType {
  const envType = process.env.NEXT_PUBLIC_ANIMATION_TYPE?.toLowerCase();

  // Validate that it's a valid animation type
  if (envType === 'fire' || envType === 'coal' || envType === '3fire') {
    return envType;
  }

  // Default to fire
  return 'fire';
}

/**
 * Get metadata for the current animation type
 */
export function getAnimationMetadata(): AnimationMetadata {
  const type = getAnimationType();
  return ANIMATION_CONFIGS[type];
}

/**
 * Get metadata for a specific animation type
 */
export function getAnimationMetadataForType(type: AnimationType): AnimationMetadata {
  return ANIMATION_CONFIGS[type];
}
