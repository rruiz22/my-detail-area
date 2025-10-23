import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

serve(async (req) => {
  try {
    const { filePath, vehicleId } = await req.json();

    if (!filePath) {
      throw new Error('filePath is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🖼️ [Thumbnail] Starting generation for:', filePath);

    // 1. Download full image (800KB) from storage
    const { data: fullImage, error: downloadError } = await supabase.storage
      .from('vehicle-media')
      .download(filePath);

    if (downloadError) {
      console.error('❌ Download error:', downloadError);
      throw downloadError;
    }

    // 2. Convert to ArrayBuffer
    const arrayBuffer = await fullImage.arrayBuffer();
    const originalSize = arrayBuffer.byteLength;
    console.log('📥 Downloaded:', (originalSize / 1024 / 1024).toFixed(2), 'MB');

    // 3. Decode image using imagescript
    const image = await Image.decode(new Uint8Array(arrayBuffer));
    console.log('📐 Original dimensions:', image.width, 'x', image.height);

    // 4. Calculate thumbnail dimensions (max 400px)
    const maxThumbSize = 400;
    let thumbWidth: number;
    let thumbHeight: number;

    if (image.width > image.height) {
      thumbWidth = Math.min(image.width, maxThumbSize);
      thumbHeight = Math.round((image.height / image.width) * thumbWidth);
    } else {
      thumbHeight = Math.min(image.height, maxThumbSize);
      thumbWidth = Math.round((image.width / image.height) * thumbHeight);
    }

    // 5. Resize image
    if (image.width > maxThumbSize || image.height > maxThumbSize) {
      image.resize(thumbWidth, thumbHeight);
      console.log('📐 Resized to:', thumbWidth, 'x', thumbHeight);
    }

    // 6. Encode to JPEG with 70% quality
    const thumbnail = await image.encodeJPEG(70);
    const thumbnailSize = thumbnail.byteLength;
    console.log('📊 Thumbnail size:', (thumbnailSize / 1024).toFixed(2), 'KB');
    console.log('✅ Reduction:', ((1 - thumbnailSize / originalSize) * 100).toFixed(1), '%');

    // 7. Generate thumbnail path
    const thumbPath = filePath.replace(/(\.[^.]+)$/, '_thumb$1');

    // 8. Upload thumbnail to storage
    const { error: uploadError } = await supabase.storage
      .from('vehicle-media')
      .upload(thumbPath, thumbnail, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    console.log('📤 Thumbnail uploaded:', thumbPath);

    // 9. Update DB record with thumbnail path
    const { error: updateError } = await supabase
      .from('vehicle_media')
      .update({ thumbnail_path: thumbPath })
      .eq('file_path', filePath);

    if (updateError) {
      console.error('❌ DB update error:', updateError);
      throw updateError;
    }

    console.log('✅ [Thumbnail] Generation complete');

    return new Response(
      JSON.stringify({
        success: true,
        thumbnailPath: thumbPath,
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
    console.error('❌ [Thumbnail] Error:', error.message);
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

