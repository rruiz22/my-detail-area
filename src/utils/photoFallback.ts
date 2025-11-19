/**
 * Photo Fallback Utilities
 *
 * Handles manual photo capture when face recognition fails or is unavailable.
 * Photos are uploaded to Supabase Storage and attached to time entries for supervisor review.
 *
 * Use Cases:
 * - Face recognition disabled/unavailable
 * - Face detection failed (poor lighting, multiple faces, etc.)
 * - Employee preference for manual verification
 * - Backup method for kiosk failures
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPES
// =====================================================

export interface PhotoCaptureResult {
  success: boolean;
  photoUrl?: string;
  storageError?: string;
}

export interface CapturedPhotoData {
  imageData: string; // base64
  timestamp: number;
  employeeId?: string;
  dealershipId?: number;
}

// =====================================================
// STORAGE CONFIGURATION
// =====================================================

const STORAGE_BUCKET = 'time-clock-photos'; // Supabase Storage bucket
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

// =====================================================
// PHOTO CAPTURE
// =====================================================

/**
 * Capture a photo from video element
 * Similar to face detection capture but without AI processing
 */
export function capturePhotoFromVideo(
  videoElement: HTMLVideoElement,
  quality: number = 0.85
): string | null {
  if (!videoElement) return null;

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Draw video frame
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Add timestamp watermark (bottom-right corner)
  const timestamp = new Date().toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(canvas.width - 220, canvas.height - 40, 210, 30);

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.fillText(timestamp, canvas.width - 210, canvas.height - 18);

  // Convert to base64 JPEG
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Validate photo data before upload
 */
function validatePhoto(imageData: string): { valid: boolean; error?: string } {
  // Check if it's a data URL
  if (!imageData.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid image format' };
  }

  // Extract MIME type
  const mimeMatch = imageData.match(/data:([^;]+);/);
  if (!mimeMatch) {
    return { valid: false, error: 'Cannot determine image type' };
  }

  const mimeType = mimeMatch[1];
  if (!ALLOWED_FORMATS.includes(mimeType)) {
    return { valid: false, error: `Format ${mimeType} not allowed. Use JPEG, PNG, or WebP.` };
  }

  // Estimate file size (base64 is ~1.37x original size)
  const base64Length = imageData.split(',')[1].length;
  const estimatedSize = (base64Length * 3) / 4;

  if (estimatedSize > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large (~${(estimatedSize / 1024 / 1024).toFixed(2)}MB). Max 5MB.` };
  }

  return { valid: true };
}

/**
 * Convert base64 to Blob for upload
 */
function base64ToBlob(base64: string): Blob | null {
  try {
    const parts = base64.split(',');
    if (parts.length !== 2) return null;

    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const binaryString = atob(parts[1]);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: mime });
  } catch (error) {
    console.error('Failed to convert base64 to Blob:', error);
    return null;
  }
}

// =====================================================
// SUPABASE STORAGE
// =====================================================

/**
 * Upload photo to Supabase Storage
 *
 * @param imageData - Base64 encoded image
 * @param metadata - Optional metadata for file naming/organization
 * @returns Photo URL or error
 */
export async function uploadPhotoToStorage(
  imageData: string,
  metadata?: {
    employeeId?: string;
    dealershipId?: number;
    action?: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  }
): Promise<PhotoCaptureResult> {
  // Validate photo
  const validation = validatePhoto(imageData);
  if (!validation.valid) {
    return {
      success: false,
      storageError: validation.error
    };
  }

  // Convert to Blob
  const blob = base64ToBlob(imageData);
  if (!blob) {
    return {
      success: false,
      storageError: 'Failed to process image data'
    };
  }

  try {
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueId = crypto.randomUUID().substring(0, 8);
    const dealerPrefix = metadata?.dealershipId ? `dealer-${metadata.dealershipId}` : 'unknown-dealer';
    const employeePrefix = metadata?.employeeId ? `emp-${metadata.employeeId}` : 'unknown-emp';
    const action = metadata?.action || 'manual';

    const filename = `${dealerPrefix}/${employeePrefix}/${timestamp}_${action}_${uniqueId}.jpg`;

    console.log(`📸 Uploading photo to storage: ${filename}`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: false, // Don't overwrite existing files
        cacheControl: '3600' // Cache for 1 hour
      });

    if (error) {
      console.error('❌ Storage upload failed:', error);
      return {
        success: false,
        storageError: error.message
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    console.log(`✅ Photo uploaded successfully: ${urlData.publicUrl}`);

    return {
      success: true,
      photoUrl: urlData.publicUrl
    };

  } catch (error) {
    console.error('❌ Upload error:', error);
    return {
      success: false,
      storageError: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete photo from storage (for cleanup/GDPR compliance)
 */
export async function deletePhotoFromStorage(photoUrl: string): Promise<boolean> {
  try {
    // Extract path from URL
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === STORAGE_BUCKET);

    if (bucketIndex === -1) {
      console.error('Invalid photo URL - cannot extract path');
      return false;
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    console.log(`🗑️ Deleting photo from storage: ${filePath}`);

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('❌ Storage delete failed:', error);
      return false;
    }

    console.log('✅ Photo deleted successfully');
    return true;

  } catch (error) {
    console.error('❌ Delete error:', error);
    return false;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if Storage bucket exists (for setup validation)
 */
export async function checkStorageBucketExists(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET);

    if (error) {
      console.warn(`⚠️ Storage bucket "${STORAGE_BUCKET}" not found:`, error.message);
      console.warn('📝 Create bucket with: supabase storage create-bucket time-clock-photos --public');
      return false;
    }

    console.log(`✅ Storage bucket "${STORAGE_BUCKET}" exists:`, data);
    return true;
  } catch (error) {
    console.error('❌ Error checking storage bucket:', error);
    return false;
  }
}

/**
 * Get photo size estimate from base64
 */
export function getPhotoSizeEstimate(imageData: string): number {
  const base64Length = imageData.split(',')[1]?.length || 0;
  return (base64Length * 3) / 4; // Bytes
}

/**
 * Format photo size for display
 */
export function formatPhotoSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Check if photo URL is valid (not expired, accessible)
 */
export async function validatePhotoUrl(photoUrl: string): Promise<boolean> {
  try {
    const response = await fetch(photoUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Photo URL validation failed:', error);
    return false;
  }
}

// =====================================================
// SETUP INSTRUCTIONS
// =====================================================

/**
 * Instructions for setting up Supabase Storage bucket
 *
 * Run this SQL in Supabase SQL Editor:
 *
 * -- Create storage bucket for time clock photos
 * INSERT INTO storage.buckets (id, name, public)
 * VALUES ('time-clock-photos', 'time-clock-photos', true);
 *
 * -- Set bucket policies (public read, authenticated write)
 * CREATE POLICY "Public can view photos"
 * ON storage.objects FOR SELECT
 * TO public
 * USING (bucket_id = 'time-clock-photos');
 *
 * CREATE POLICY "Authenticated users can upload photos"
 * ON storage.objects FOR INSERT
 * TO authenticated
 * WITH CHECK (bucket_id = 'time-clock-photos');
 *
 * CREATE POLICY "Users can delete their dealership photos"
 * ON storage.objects FOR DELETE
 * TO authenticated
 * USING (
 *   bucket_id = 'time-clock-photos' AND
 *   auth.uid() IN (
 *     SELECT user_id FROM dealer_memberships WHERE is_active = true
 *   )
 * );
 */
export const STORAGE_SETUP_INSTRUCTIONS = `
To setup Storage bucket, run in Supabase SQL Editor:

-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('time-clock-photos', 'time-clock-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
CREATE POLICY "Public can view time clock photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'time-clock-photos');

-- Authenticated write policy
CREATE POLICY "Authenticated can upload time clock photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'time-clock-photos');

-- Delete policy (dealership-scoped)
CREATE POLICY "Users can delete their dealership time clock photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'time-clock-photos' AND
  auth.uid() IN (
    SELECT user_id FROM dealer_memberships WHERE is_active = true
  )
);
`;
