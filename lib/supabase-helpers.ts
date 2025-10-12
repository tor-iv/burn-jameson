import { supabase, BottleScan, Receipt } from './supabase';
import { hashImage } from './image-hash';

/**
 * Upload bottle image to Supabase Storage and create scan record
 */
export async function saveBottleScan(
  sessionId: string,
  imageBlob: Blob,
  detectedBrand: string,
  confidence: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate image hash for duplicate detection
    const imageHash = await hashImage(imageBlob);

    // Check for duplicate
    const { data: duplicates } = await supabase
      .from('bottle_scans')
      .select('id')
      .eq('image_hash', imageHash)
      .limit(1);

    if (duplicates && duplicates.length > 0) {
      return {
        success: false,
        error: 'This bottle has already been scanned'
      };
    }

    // Upload image to storage
    const fileName = `${sessionId}-bottle.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('bottle-images')
      .upload(fileName, imageBlob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return {
        success: false,
        error: 'Failed to upload image'
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('bottle-images')
      .getPublicUrl(fileName);

    // Insert scan record
    const { error: insertError } = await supabase
      .from('bottle_scans')
      .insert({
        session_id: sessionId,
        bottle_image: publicUrl,
        detected_brand: detectedBrand,
        confidence,
        image_hash: imageHash,
        ip_address: 'client', // Will be updated server-side if needed
        user_agent: navigator.userAgent,
        status: 'pending_receipt'
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return {
        success: false,
        error: 'Failed to save scan'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('saveBottleScan error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload receipt image and save receipt record
 */
export async function saveReceipt(
  sessionId: string,
  receiptImage: Blob,
  paypalEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate image type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const unsupportedButCommon = ['image/heic', 'image/heif'];

    if (unsupportedButCommon.includes(receiptImage.type)) {
      return {
        success: false,
        error: 'iPhone HEIC format not supported. On iPhone: Settings > Camera > Formats > Select "Most Compatible"'
      };
    }

    if (!validTypes.includes(receiptImage.type)) {
      return {
        success: false,
        error: `Invalid image format (${receiptImage.type}). Please upload JPG, PNG, or WebP.`
      };
    }

    // Validate image size (max 10MB)
    if (receiptImage.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'Image too large. Maximum size is 10MB.'
      };
    }

    // Validate minimum size (100KB to ensure real photo)
    if (receiptImage.size < 100 * 1024) {
      return {
        success: false,
        error: 'Image too small. Please take a clear photo of your receipt.'
      };
    }

    // Verify bottle scan exists
    const { data: bottleScan } = await supabase
      .from('bottle_scans')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (!bottleScan) {
      return {
        success: false,
        error: 'Invalid session'
      };
    }

    // Check if receipt already submitted
    const { data: existingReceipt } = await supabase
      .from('receipts')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (existingReceipt) {
      return {
        success: false,
        error: 'Receipt already submitted for this session'
      };
    }

    // Upload receipt image
    const fileName = `${sessionId}-receipt.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('receipt-images')
      .upload(fileName, receiptImage, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Receipt upload error:', uploadError);
      return {
        success: false,
        error: 'Failed to upload receipt'
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('receipt-images')
      .getPublicUrl(fileName);

    // Insert receipt record
    const { error: insertError } = await supabase
      .from('receipts')
      .insert({
        session_id: sessionId,
        image_url: publicUrl,
        paypal_email: paypalEmail,
        status: 'pending',
        rebate_amount: 5.00
      });

    if (insertError) {
      console.error('Receipt insert error:', insertError);
      return {
        success: false,
        error: 'Failed to save receipt'
      };
    }

    // Update bottle scan status
    await supabase
      .from('bottle_scans')
      .update({ status: 'completed' })
      .eq('session_id', sessionId);

    return { success: true };
  } catch (error) {
    console.error('saveReceipt error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check rate limit for bottle scans
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 3,
  windowHours: number = 24
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  try {
    const windowMs = windowHours * 60 * 60 * 1000;
    const since = new Date(Date.now() - windowMs).toISOString();

    const { data, error } = await supabase
      .from('bottle_scans')
      .select('id')
      .eq('ip_address', identifier)
      .gte('scanned_at', since);

    if (error) {
      console.error('Rate limit check error:', error);
      return {
        allowed: true, // Allow on error
        remaining: limit,
        error: error.message
      };
    }

    const count = data?.length || 0;
    const remaining = Math.max(0, limit - count);

    return {
      allowed: count < limit,
      remaining
    };
  } catch (error) {
    console.error('checkRateLimit error:', error);
    return {
      allowed: true, // Allow on error
      remaining: limit,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate session for receipt upload
 */
export async function validateSession(sessionId: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    // Check if bottle scan exists
    const { data: bottleScan, error: scanError } = await supabase
      .from('bottle_scans')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (scanError || !bottleScan) {
      return {
        valid: false,
        error: 'Session not found'
      };
    }

    // Check if scan is recent (within 24 hours)
    const scanAge = Date.now() - new Date(bottleScan.scanned_at).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (scanAge > maxAge) {
      return {
        valid: false,
        error: 'Session expired (older than 24 hours)'
      };
    }

    // Check if receipt already submitted
    const { data: receipt } = await supabase
      .from('receipts')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (receipt) {
      return {
        valid: false,
        error: 'Receipt already submitted for this session'
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('validateSession error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
