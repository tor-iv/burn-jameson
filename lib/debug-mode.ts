/**
 * Test Mode Utilities
 * Password-protected debug mode for testing bottle morph animations without real bottle detection
 */

const TEST_MODE_KEY = 'kh_test_mode';
const TEST_PASSWORD = 'bob';

/**
 * Check if test mode is currently enabled
 */
export function isTestModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(TEST_MODE_KEY) === 'true';
}

/**
 * Enable test mode with password verification
 * @param password - The password to verify
 * @returns true if password is correct and test mode enabled
 */
export function enableTestMode(password: string): boolean {
  if (password === TEST_PASSWORD) {
    sessionStorage.setItem(TEST_MODE_KEY, 'true');
    return true;
  }
  return false;
}

/**
 * Disable test mode
 */
export function disableTestMode(): void {
  sessionStorage.removeItem(TEST_MODE_KEY);
}

/**
 * Toggle test mode (requires password if enabling)
 * @param password - Required when enabling
 * @returns new test mode state
 */
export function toggleTestMode(password?: string): boolean {
  const currentState = isTestModeEnabled();

  if (currentState) {
    disableTestMode();
    return false;
  } else {
    if (password) {
      return enableTestMode(password);
    }
    return false;
  }
}

interface NormalizedBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detection mode for test mode scanning
 */
export type DetectionMode = 'can' | 'hand';

/**
 * Object type for test mode detection
 */
export type TestObjectType = 'hand' | 'can' | 'sparkling' | null;

/**
 * Mock bottle detection response for test mode with optional hand positioning
 *
 * This creates a realistic detection response that will trigger the Keeper's Heart morph.
 *
 * NEW: Supports hand-focused positioning!
 * - If handBoundingBox provided: Places bottle at hand location (from hand detection API)
 * - If no handBoundingBox: Uses default center-lower position (realistic bottle placement)
 *
 * @param handBoundingBox - Optional hand position from /api/detect-hand (normalized 0-1 coords)
 * @param mode - Detection mode ('can' or 'hand') - affects fallback behavior
 * @returns Mock detection response with realistic bottle dimensions
 */
export function getMockDetectionResponse(
  handBoundingBox?: NormalizedBoundingBox | null,
  mode: DetectionMode = 'can'
) {
  // Calculate bottle position based on hand detection or use default
  let bottlePosition: NormalizedBoundingBox;

  if (handBoundingBox && !isNaN(handBoundingBox.x)) {
    // Hand detected! Position bottle at hand location
    // Adjust dimensions to be bottle-shaped (narrower, taller)
    const handCenterX = handBoundingBox.x + handBoundingBox.width / 2;
    const handCenterY = handBoundingBox.y + handBoundingBox.height / 2;

    // Bottle dimensions: narrower than hand, similar height
    const bottleWidth = Math.min(0.30, handBoundingBox.width * 0.8); // Max 30% of screen
    const bottleHeight = Math.min(0.50, handBoundingBox.height * 1.1); // Slightly taller than hand

    bottlePosition = {
      x: Math.max(0, Math.min(handCenterX - bottleWidth / 2, 1 - bottleWidth)),
      y: Math.max(0, Math.min(handCenterY - bottleHeight / 2, 1 - bottleHeight)),
      width: bottleWidth,
      height: bottleHeight,
    };

    console.log('[TEST MODE] 🤚 Using hand-detected position:', bottlePosition);
  } else {
    // No hand detected - use default center-lower position
    // This is where someone would typically hold a bottle in frame
    bottlePosition = {
      x: 0.35,  // 35% from left (center-ish)
      y: 0.45,  // 45% from top (lower-center, hand-holding area)
      width: 0.30,  // 30% width (realistic bottle width)
      height: 0.45, // 45% height (medium bottle, not too tall)
    };

    console.log('[TEST MODE] 📍 Using default center-lower position:', bottlePosition);
  }

  // Create expanded bounding box (20% expansion, matching real detection)
  const centerX = bottlePosition.x + bottlePosition.width / 2;
  const centerY = bottlePosition.y + bottlePosition.height / 2;
  const expandedWidth = bottlePosition.width * 1.20;
  const expandedHeight = bottlePosition.height * 1.20;

  const expandedBox = {
    x: Math.max(0, Math.min(centerX - expandedWidth / 2, 1 - expandedWidth)),
    y: Math.max(0, Math.min(centerY - expandedHeight / 2, 1 - expandedHeight)),
    width: Math.min(expandedWidth, 1),
    height: Math.min(expandedHeight, 1),
  };

  // Create vertices for boundingBox (pixel coordinates will be calculated by client)
  const vertices = [
    { x: bottlePosition.x, y: bottlePosition.y },  // Top-left
    { x: bottlePosition.x + bottlePosition.width, y: bottlePosition.y },  // Top-right
    { x: bottlePosition.x + bottlePosition.width, y: bottlePosition.y + bottlePosition.height },  // Bottom-right
    { x: bottlePosition.x, y: bottlePosition.y + bottlePosition.height },  // Bottom-left
  ];

  // Determine object type based on mode
  const objectType: TestObjectType = mode === 'hand' ? 'hand' : (handBoundingBox ? 'can' : null);

  return {
    detected: true,
    brand: `Test Mode - ${mode === 'hand' ? 'Hand' : 'Can/Sparkling'}`,
    confidence: 1.0,
    boundingBox: {
      vertices,
    },
    normalizedBoundingBox: bottlePosition,
    expandedBoundingBox: expandedBox,
    aspectRatio: bottlePosition.height / bottlePosition.width, // Actual aspect ratio
    segmentationMask: null,
    hasBottle: true,
    hasWhiskey: mode !== 'hand', // Hands don't have whiskey
    labels: mode === 'hand' ? ['Hand', 'Test Mode'] : ['Can', 'Bottle', 'Test Mode'],
    detectedText: `TEST MODE - ${mode.toUpperCase()}`,
    objectType, // NEW: Include object type for scanning page
    validated: true,
    _debug: {
      testMode: true,
      detectionMode: mode,
      handDetected: !!handBoundingBox,
      logoCount: 0,
      textAnnotationCount: 0,
      localizedObjectCount: 1,
      bottleObjectScore: 1.0,
      hasSegmentationMask: false,
      aspectRatio: (bottlePosition.height / bottlePosition.width).toFixed(2),
    }
  };
}

/**
 * Generate a mock session ID for test receipts
 * Format: kh-test-{timestamp}-{uuid}
 */
export function generateTestSessionId(): string {
  const timestamp = Date.now();
  const uuid = Math.random().toString(36).substring(2, 15);
  return `kh-test-${timestamp}-${uuid}`;
}

/**
 * Mock receipt data for PayPal API testing
 * Creates a complete receipt + bottle scan pair for admin testing
 */
export function getMockReceiptData() {
  const sessionId = generateTestSessionId();
  const testPaypalEmail = 'test-receipt@paypal.com';

  return {
    sessionId,
    bottleScan: {
      session_id: sessionId,
      detected_brand: 'Test Mode - Jameson',
      confidence: 1.0,
      bottle_image: 'https://via.placeholder.com/400x600/1a1a1a/f5f5dc?text=Test+Bottle',
      status: 'completed',
      image_hash: `test-bottle-${sessionId}`,
    },
    receipt: {
      session_id: sessionId,
      receipt_image: 'https://via.placeholder.com/400x600/1a1a1a/f5f5dc?text=Test+Receipt',
      paypal_email: testPaypalEmail,
      status: 'pending',
      rebate_amount: 5.0,
      image_hash: `test-receipt-${sessionId}`,
    }
  };
}
