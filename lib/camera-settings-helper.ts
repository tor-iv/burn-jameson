/**
 * Camera Settings Helper
 * Provides platform-specific instructions for enabling camera permissions
 */

export type Platform = 'ios-safari' | 'ios-chrome' | 'android-chrome' | 'android-other' | 'desktop' | 'unknown';

export interface CameraSettingsInstructions {
  platform: Platform;
  platformName: string;
  steps: string[];
  canOpenSettings: boolean;
  settingsUrl?: string;
}

/**
 * Detect the user's platform and browser
 */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua);

  if (isIOS) {
    return isSafari ? 'ios-safari' : 'ios-chrome';
  }

  if (isAndroid) {
    return isChrome ? 'android-chrome' : 'android-other';
  }

  return 'desktop';
}

/**
 * Get platform-specific instructions for enabling camera permissions
 */
export function getCameraSettingsInstructions(): CameraSettingsInstructions {
  const platform = detectPlatform();

  switch (platform) {
    case 'ios-safari':
      return {
        platform,
        platformName: 'iOS Safari',
        canOpenSettings: false,
        steps: [
          'Open your iPhone Settings app',
          'Scroll down and tap "Safari"',
          'Tap "Camera"',
          'Select "Ask" or "Allow"',
          'Return to this page and refresh',
        ],
      };

    case 'ios-chrome':
      return {
        platform,
        platformName: 'iOS Chrome',
        canOpenSettings: false,
        steps: [
          'Open your iPhone Settings app',
          'Scroll down and tap "Chrome"',
          'Enable "Camera" access',
          'Return to this page and refresh',
        ],
      };

    case 'android-chrome':
      return {
        platform,
        platformName: 'Android Chrome',
        canOpenSettings: true,
        settingsUrl: 'app-settings:',
        steps: [
          'Tap the "Open Settings" button below',
          'Find "Permissions" or "Site settings"',
          'Tap "Camera"',
          'Select "Allow"',
          'Return to this page',
        ],
      };

    case 'android-other':
      return {
        platform,
        platformName: 'Android Browser',
        canOpenSettings: false,
        steps: [
          'Open your phone Settings app',
          'Tap "Apps" or "Applications"',
          'Find your browser app',
          'Tap "Permissions"',
          'Enable "Camera" access',
          'Return to this page and refresh',
        ],
      };

    case 'desktop':
      return {
        platform,
        platformName: 'Desktop Browser',
        canOpenSettings: false,
        steps: [
          'Click the lock/info icon in the address bar',
          'Find "Camera" permissions',
          'Change to "Allow"',
          'Refresh this page',
        ],
      };

    default:
      return {
        platform,
        platformName: 'Your Device',
        canOpenSettings: false,
        steps: [
          'Open your device Settings',
          'Find browser permissions',
          'Enable Camera access',
          'Refresh this page',
        ],
      };
  }
}

/**
 * Attempt to open device settings (Android only)
 */
export function openDeviceSettings(): void {
  const { canOpenSettings, settingsUrl } = getCameraSettingsInstructions();

  if (canOpenSettings && settingsUrl) {
    // Android Chrome supports opening app settings
    window.location.href = settingsUrl;
  }
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    // Permission granted - stop the stream
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Camera permission denied:', error);
    return false;
  }
}

/**
 * Check current camera permission status (if supported)
 */
export async function checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    // Check if Permissions API is available
    if (!navigator.permissions) return 'unknown';

    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return result.state as 'granted' | 'denied' | 'prompt';
  } catch (error) {
    // Permissions API not supported or query failed
    return 'unknown';
  }
}
