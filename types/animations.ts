/**
 * Shared animation type definitions for the animation switcher system
 */

/**
 * Bounding box in normalized coordinates (0-1)
 * Used for positioning animations over detected bottles
 */
export interface NormalizedBoundingBox {
  x: number;      // Left position (0-1)
  y: number;      // Top position (0-1)
  width: number;  // Width (0-1)
  height: number; // Height (0-1)
}

/**
 * Standard props for burn animations
 * All burn animations should accept these props
 */
export interface BurnAnimationProps {
  boundingBox: NormalizedBoundingBox;
  imageUrl: string; // base64 data URL or public URL
  onBurnComplete?: () => void; // Optional callback when burn completes
}

/**
 * Standard props for morph animations
 * All morph animations should accept these props
 */
export interface MorphAnimationProps {
  capturedImage: string;          // base64 data URL of original bottle
  boundingBox?: NormalizedBoundingBox; // Optional bounding box (not all morphs use it)
  onComplete?: () => void;        // Callback when animation finishes
  duration?: number;              // Duration in milliseconds (default varies by animation)
  preloadedImage?: string | null; // Optional preloaded transformed image for faster display
}

/**
 * Animation type options
 */
export type AnimationType = 'fire' | 'coal' | '3fire';

/**
 * Animation metadata
 */
export interface AnimationMetadata {
  name: string;
  description: string;
  burnDuration: number; // milliseconds
  morphDuration: number; // milliseconds
}
