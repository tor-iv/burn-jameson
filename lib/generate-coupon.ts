/**
 * Generates a unique coupon code in the format: KH-A7D9F2E1
 */
export function generateCouponCode(): string {
  const prefix = 'KH-';
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return prefix + random;
}

/**
 * Validates a coupon code format
 */
export function isValidCouponCode(code: string): boolean {
  return /^KH-[A-Z0-9]{8}$/.test(code);
}
