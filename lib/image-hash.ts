/**
 * Simple image hashing for duplicate detection
 * Creates a hash of the image to detect if the same image has been uploaded before
 */

export async function hashImage(imageBlob: Blob): Promise<string> {
  try {
    // Convert blob to array buffer
    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Use SubtleCrypto API for hashing (available in browser)
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (error) {
    console.error('Error hashing image:', error);
    // Return a timestamp-based fallback if hashing fails
    return `fallback_${Date.now()}`;
  }
}

/**
 * Get client IP address (best effort)
 * Note: This works in API routes, not client-side
 */
export async function getClientIP(): Promise<string> {
  try {
    // This only works server-side in API routes
    // For client-side, we'll use a fallback
    const response = await fetch('/api/get-ip');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}
