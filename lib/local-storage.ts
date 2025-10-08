import { generateCouponCode } from "./generate-coupon";

export interface LocalScan {
  id: string;
  qrCode: string;
  scannedAt: string;
  couponCode: string;
}

const SCANS_KEY = "keepersHeart_scans";

/**
 * Get all scans from localStorage
 */
export function getScans(): LocalScan[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(SCANS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading scans from localStorage:", error);
    return [];
  }
}

/**
 * Save a new scan to localStorage
 */
export function saveScan(qrCode: string): LocalScan {
  const newScan: LocalScan = {
    id: crypto.randomUUID(),
    qrCode,
    scannedAt: new Date().toISOString(),
    couponCode: generateCouponCode(),
  };

  try {
    const scans = getScans();
    scans.push(newScan);
    localStorage.setItem(SCANS_KEY, JSON.stringify(scans));
    return newScan;
  } catch (error) {
    console.error("Error saving scan to localStorage:", error);
    throw error;
  }
}

/**
 * Get a specific scan by ID
 */
export function getScanById(id: string): LocalScan | null {
  const scans = getScans();
  return scans.find((scan) => scan.id === id) || null;
}

/**
 * Get the count of scans
 */
export function getScansCount(): number {
  return getScans().length;
}

/**
 * Clear all scans (for testing/debugging)
 */
export function clearScans(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SCANS_KEY);
}
