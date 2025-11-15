'use client';

/**
 * AnimationSwitcher - Dynamically loads the correct animation based on environment config
 *
 * This component acts as a wrapper that:
 * 1. Reads the animation type from environment variable
 * 2. Dynamically imports the correct animation component
 * 3. Passes through all props while handling loading states
 * 4. Preserves all timing and callback logic
 */

import dynamic from 'next/dynamic';
import { getAnimationType } from '@/lib/animation-config';
import { BurnAnimationProps, MorphAnimationProps } from '@/types/animations';

// Animation type ('burn' or 'morph')
type AnimationMode = 'burn' | 'morph';

// Combined props type
type AnimationSwitcherProps = {
  mode: AnimationMode;
} & (BurnAnimationProps | MorphAnimationProps);

/**
 * Module-level cache to prevent recreating dynamic imports on every render
 * This ensures React sees the same component reference and doesn't unmount/remount
 */
const burnAnimationCache = new Map<string, ReturnType<typeof loadBurnAnimation>>();
const morphAnimationCache = new Map<string, ReturnType<typeof loadMorphAnimation>>();

/**
 * Dynamically import burn animations based on type
 */
const loadBurnAnimation = (animationType: string) => {
  switch (animationType) {
    case 'fire':
      return dynamic(() => import('./EnhancedFireAnimation').catch(err => {
        console.error('[AnimationSwitcher] ❌ Failed to load EnhancedFireAnimation:', err);
        throw err;
      }), {
        ssr: false,
        loading: () => <div className="text-white text-center">Loading fire animation...</div>,
      });
    case 'coal':
      console.log('[AnimationSwitcher] 📦 Requesting dynamic import of CoalGrowthAnimation...');
      return dynamic(() => import('./CoalGrowthAnimation').then(mod => {
        console.log('[AnimationSwitcher] ✅ CoalGrowthAnimation module loaded successfully');
        return mod;
      }).catch(err => {
        console.error('[AnimationSwitcher] ❌ Failed to load CoalGrowthAnimation:', err);
        console.error('[AnimationSwitcher] 🔄 Falling back to EnhancedFireAnimation');
        return import('./EnhancedFireAnimation');
      }), {
        ssr: false,
        loading: () => {
          console.log('[AnimationSwitcher] ⏳ Coal animation loading...');
          return <div className="text-white text-center">Loading coal animation...</div>;
        },
      });
    case '3fire':
      return dynamic(() => import('./ThreeFireAnimation').catch(err => {
        console.error('[AnimationSwitcher] ❌ Failed to load ThreeFireAnimation:', err);
        console.error('[AnimationSwitcher] 🔄 Falling back to EnhancedFireAnimation');
        return import('./EnhancedFireAnimation');
      }), {
        ssr: false,
        loading: () => <div className="text-white text-center">Loading 3D fire animation...</div>,
      });
    case '3coal':
      return dynamic(() => import('./ThreeCoalAnimation').catch(err => {
        console.error('[AnimationSwitcher] ❌ Failed to load ThreeCoalAnimation:', err);
        console.error('[AnimationSwitcher] 🔄 Falling back to EnhancedFireAnimation');
        return import('./EnhancedFireAnimation');
      }), {
        ssr: false,
        loading: () => <div className="text-white text-center">Loading 3D coal animation...</div>,
      });
    case 'spin':
      return dynamic(() => import('./SpinRevealAnimation').catch(err => {
        console.error('[AnimationSwitcher] ❌ Failed to load SpinRevealAnimation:', err);
        console.error('[AnimationSwitcher] 🔄 Falling back to EnhancedFireAnimation');
        return import('./EnhancedFireAnimation');
      }), {
        ssr: false,
        loading: () => <div className="text-white text-center">Loading spin animation...</div>,
      });
    default:
      console.log('[AnimationSwitcher] ⚠️ Unknown animation type, falling back to fire');
      // Fallback to fire
      return dynamic(() => import('./EnhancedFireAnimation').catch(err => {
        console.error('[AnimationSwitcher] ❌ Failed to load fallback animation:', err);
        throw err;
      }), {
        ssr: false,
        loading: () => <div className="text-white text-center">Loading animation...</div>,
      });
  }
};

/**
 * Dynamically import morph animations
 * Note: Currently both fire and coal use the same morph (SimpleBottleMorph)
 * but this allows for different morphs in the future
 */
const loadMorphAnimation = (animationType: string) => {
  // Both animation types currently use the same morph
  // In the future, you could have different morphs per type:
  // switch (animationType) {
  //   case 'fire': return import('./SimpleBottleMorph');
  //   case 'coal': return import('./CoalBottleMorph');
  // }

  return dynamic(() => import('./SimpleBottleMorph'), {
    ssr: false,
    loading: () => <div className="text-white text-center">Loading transformation...</div>,
  });
};

/**
 * Get cached burn animation component (prevents remounting on re-render)
 */
const getCachedBurnAnimation = (animationType: string) => {
  if (!burnAnimationCache.has(animationType)) {
    burnAnimationCache.set(animationType, loadBurnAnimation(animationType));
  }
  return burnAnimationCache.get(animationType)!;
};

/**
 * Get cached morph animation component (prevents remounting on re-render)
 */
const getCachedMorphAnimation = (animationType: string) => {
  if (!morphAnimationCache.has(animationType)) {
    morphAnimationCache.set(animationType, loadMorphAnimation(animationType));
  }
  return morphAnimationCache.get(animationType)!;
};

/**
 * AnimationSwitcher Component
 *
 * Usage:
 * - Burn: <AnimationSwitcher mode="burn" boundingBox={box} imageUrl={url} />
 * - Morph: <AnimationSwitcher mode="morph" capturedImage={img} preloadedImage={morphed} onComplete={callback} />
 */
export default function AnimationSwitcher(props: AnimationSwitcherProps) {
  const animationType = getAnimationType();
  const { mode, ...animationProps } = props;

  console.log('[AnimationSwitcher] 🎬 Component mounted', {
    mode,
    animationType,
    envVar: process.env.NEXT_PUBLIC_ANIMATION_TYPE,
    propsKeys: Object.keys(animationProps),
  });

  if (mode === 'burn') {
    console.log('[AnimationSwitcher] 🔥 Loading burn animation:', animationType);
    const BurnAnimation = getCachedBurnAnimation(animationType);
    console.log('[AnimationSwitcher] ✅ Burn animation component loaded, rendering...');
    return <BurnAnimation {...(animationProps as BurnAnimationProps)} />;
  } else if (mode === 'morph') {
    console.log('[AnimationSwitcher] 🔄 Loading morph animation:', animationType);
    const MorphAnimation = getCachedMorphAnimation(animationType);
    console.log('[AnimationSwitcher] ✅ Morph animation component loaded, rendering...');
    return <MorphAnimation {...(animationProps as MorphAnimationProps)} />;
  }

  console.log('[AnimationSwitcher] ⚠️ No mode matched, returning null');
  return null;
}
