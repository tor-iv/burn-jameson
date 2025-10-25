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

/**
 * Mock bottle detection response for test mode
 * This creates a realistic detection response that will trigger the Keeper's Heart morph
 *
 * IMPORTANT: Uses a LARGE bounding box (80% of image) to capture hand/bottle
 * regardless of where user positions their hand in the frame.
 * This ensures proper bottle placement even when hand is off-center.
 */
export function getMockDetectionResponse() {
  // LARGE bounding box covering 80% of image (10% margin on all sides)
  // This captures the hand/bottle wherever user positions it
  const mockBoundingBox = {
    x: 0.1,     // 10% from left edge
    y: 0.1,     // 10% from top edge
    width: 0.8,  // 80% of image width (was 0.4 - too narrow)
    height: 0.8, // 80% of image height (was 0.7)
  };

  return {
    detected: true,
    brand: 'Test Mode - Keeper\'s Heart',
    confidence: 1.0,
    boundingBox: {
      vertices: [
        { x: 0.1, y: 0.1 },  // Top-left
        { x: 0.9, y: 0.1 },  // Top-right
        { x: 0.9, y: 0.9 },  // Bottom-right
        { x: 0.1, y: 0.9 },  // Bottom-left
      ]
    },
    normalizedBoundingBox: mockBoundingBox,
    expandedBoundingBox: {
      x: 0.05,    // 5% margin (expanded from 10%)
      y: 0.05,    // 5% margin
      width: 0.9,  // 90% coverage (expanded from 80%)
      height: 0.9, // 90% coverage
    },
    aspectRatio: 1.75, // Typical bottle height/width ratio
    segmentationMask: null,
    hasBottle: true,
    hasWhiskey: true,
    labels: ['Bottle', 'Whiskey', 'Test Mode'],
    detectedText: 'TEST MODE',
    validated: true,
    _debug: {
      testMode: true,
      logoCount: 0,
      textAnnotationCount: 0,
      localizedObjectCount: 1,
      bottleObjectScore: 1.0,
      hasSegmentationMask: false,
      aspectRatio: '1.75',
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
