import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

/**
 * Edge Function: Generate Dealership Logo Thumbnail
 *
 * Purpose: Generate optimized 400x400px thumbnails for dealership logos
 * Pattern: Identical to vehicle-media thumbnail generation (Get Ready module)
 *
 * Input:
 *   - filePath: Full logo path in storage (e.g., "123/logo_1234567890.jpg")
 *   - dealershipId: Dealership ID for DB update
 *
 * Output:
 *   - Uploads thumbnail to storage with "_thumb" suffix
 *   - Updates dealership.thumbnail_logo_url in database
 *   - Returns thumbnail URL and compression stats
 *
 * Example:
 *   Input:  "123/logo_1234567890.jpg" (200KB)
 *   Output: "123/logo_1234567890_thumb.jpg" (~25KB, 87% reduction)
 */

serve(async (req) => {
  try {
    const { filePath, dealershipId } = await req.json();

    if (!filePath || !dealershipId) {
      throw new Error('filePath and dealershipId are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🏢 [Logo Thumbnail] Starting generation for:', filePath);
    console.log('📍 [Logo Thumbnail] Dealership ID:', dealershipId);

    // ========================================================================
    // STEP 1: Download full logo from storage
    // ========================================================================
    const { data: fullLogo, error: downloadError } = await supabase.storage
      .from('dealership-logos')
      .download(filePath);

    if (downloadError) {
      console.error('❌ Download error:', downloadError);
      throw downloadError;
    }

    // ========================================================================
    // STEP 2: Convert to ArrayBuffer and measure size
    // ========================================================================
    const arrayBuffer = await fullLogo.arrayBuffer();
    const originalSize = arrayBuffer.byteLength;
    console.log('📥 Downloaded:', (originalSize / 1024).toFixed(2), 'KB');

    // ========================================================================
    // STEP 3: Decode image using imagescript
    // ========================================================================
    const image = await Image.decode(new Uint8Array(arrayBuffer));
    console.log('📐 Original dimensions:', image.width, 'x', image.height);

    // ========================================================================
    // STEP 4: Calculate thumbnail dimensions (400px max, maintain aspect ratio)
    // ========================================================================
    const maxThumbSize = 400;
    let thumbWidth: number;
    let thumbHeight: number;

    if (image.width > image.height) {
      // Landscape orientation
      thumbWidth = Math.min(image.width, maxThumbSize);
      thumbHeight = Math.round((image.height / image.width) * thumbWidth);
    } else {
      // Portrait or square orientation
      thumbHeight = Math.min(image.height, maxThumbSize);
      thumbWidth = Math.round((image.width / image.height) * thumbHeight);
    }

    // ========================================================================
    // STEP 5: Resize image if needed
    // ========================================================================
    if (image.width > maxThumbSize || image.height > maxThumbSize) {
      image.resize(thumbWidth, thumbHeight);
      console.log('📐 Resized to:', thumbWidth, 'x', thumbHeight);
    }

    // ========================================================================
    // STEP 6: Encode to JPEG with 70% quality (optimized for thumbnails)
    // ========================================================================
    const thumbnail = await image.encodeJPEG(70);
    const thumbnailSize = thumbnail.byteLength;
    console.log('📊 Thumbnail size:', (thumbnailSize / 1024).toFixed(2), 'KB');
    console.log('✅ Size reduction:', ((1 - thumbnailSize / originalSize) * 100).toFixed(1), '%');

    // ========================================================================
    // STEP 7: Generate thumbnail path (add "_thumb" before extension)
    // ========================================================================
    const thumbPath = filePath.replace(/(\.[^.]+)$/, '_thumb$1');
    console.log('📝 Thumbnail path:', thumbPath);

    // ========================================================================
    // STEP 8: Upload thumbnail to storage
    // ========================================================================
    const { error: uploadError } = await supabase.storage
      .from('dealership-logos')
      .upload(thumbPath, thumbnail, {
        contentType: 'image/jpeg',
        upsert: true // Allow overwriting if thumbnail already exists
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    console.log('📤 Thumbnail uploaded successfully');

    // ========================================================================
    // STEP 9: Get public URL for thumbnail
    // ========================================================================
    const { data: thumbUrlData } = supabase.storage
      .from('dealership-logos')
      .getPublicUrl(thumbPath);

    console.log('🔗 Thumbnail URL:', thumbUrlData.publicUrl);

    // ========================================================================
    // STEP 10: Update dealership record with thumbnail URL
    // ========================================================================
    const { error: updateError } = await supabase
      .from('dealerships')
      .update({ thumbnail_logo_url: thumbUrlData.publicUrl })
      .eq('id', dealershipId);

    if (updateError) {
      console.error('❌ DB update error:', updateError);
      throw updateError;
    }

    console.log('✅ [Logo Thumbnail] Complete - Database updated');

    // ========================================================================
    // SUCCESS RESPONSE
    // ========================================================================
    return new Response(
      JSON.stringify({
        success: true,
        thumbnailPath: thumbPath,
        thumbnailUrl: thumbUrlData.publicUrl,
        originalSize,
        thumbnailSize,
        reduction: ((1 - thumbnailSize / originalSize) * 100).toFixed(1) + '%'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error: any) {
    console.error('❌ [Logo Thumbnail] Error:', error.message);

    // ========================================================================
    // ERROR RESPONSE
    // ========================================================================
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        success: false
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});
