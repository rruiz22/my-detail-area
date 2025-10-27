import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

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

    console.log('Starting thumbnail generation for:', filePath);

    const { data: fullLogo, error: downloadError } = await supabase.storage
      .from('dealership-logos')
      .download(filePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw downloadError;
    }

    const arrayBuffer = await fullLogo.arrayBuffer();
    const originalSize = arrayBuffer.byteLength;
    console.log('Downloaded:', (originalSize / 1024).toFixed(2), 'KB');

    const image = await Image.decode(new Uint8Array(arrayBuffer));
    console.log('Original dimensions:', image.width, 'x', image.height);

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

    if (image.width > maxThumbSize || image.height > maxThumbSize) {
      image.resize(thumbWidth, thumbHeight);
      console.log('Resized to:', thumbWidth, 'x', thumbHeight);
    }

    const thumbnail = await image.encodeJPEG(70);
    const thumbnailSize = thumbnail.byteLength;
    console.log('Thumbnail size:', (thumbnailSize / 1024).toFixed(2), 'KB');
    console.log('Size reduction:', ((1 - thumbnailSize / originalSize) * 100).toFixed(1), '%');

    const thumbPath = filePath.replace(/(\.[^.]+)$/, '_thumb$1');
    console.log('Thumbnail path:', thumbPath);

    const { error: uploadError } = await supabase.storage
      .from('dealership-logos')
      .upload(thumbPath, thumbnail, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Thumbnail uploaded successfully');

    const { data: thumbUrlData } = supabase.storage
      .from('dealership-logos')
      .getPublicUrl(thumbPath);

    console.log('Thumbnail URL:', thumbUrlData.publicUrl);

    const { error: updateError } = await supabase
      .from('dealerships')
      .update({ thumbnail_logo_url: thumbUrlData.publicUrl })
      .eq('id', dealershipId);

    if (updateError) {
      console.error('DB update error:', updateError);
      throw updateError;
    }

    console.log('Thumbnail complete - Database updated');

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
    console.error('Thumbnail error:', error.message);

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
