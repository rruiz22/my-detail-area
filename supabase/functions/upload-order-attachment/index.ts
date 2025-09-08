import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  orderId: string;
  fileName: string;
  fileData: string; // base64 encoded
  mimeType: string;
  fileSize: number;
  description?: string;
  uploadContext?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Upload attachment request received');
    
    const { orderId, fileName, fileData, mimeType, fileSize, description, uploadContext = 'general' }: UploadRequest = await req.json();

    // Validate required fields
    if (!orderId || !fileName || !fileData || !mimeType || !fileSize) {
      console.error('Missing required fields');
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: orderId, fileName, fileData, mimeType, fileSize' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has permission to upload to this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, dealer_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert base64 to binary
    const fileBuffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
    
    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop() || '';
    const uniqueFileName = `${orderId}/${timestamp}-${fileName}`;
    
    console.log('Uploading file to storage:', uniqueFileName);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('order-attachments')
      .upload(uniqueFileName, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(JSON.stringify({ 
        error: 'Failed to upload file to storage',
        details: uploadError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('File uploaded successfully, creating database record');

    // Create attachment record in database
    const { data: attachment, error: dbError } = await supabase
      .from('order_attachments')
      .insert({
        order_id: orderId,
        file_name: fileName,
        file_path: uniqueFileName,
        file_size: fileSize,
        mime_type: mimeType,
        uploaded_by: user.id,
        upload_context: uploadContext,
        description: description || null
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('order-attachments')
        .remove([uniqueFileName]);
        
      return new Response(JSON.stringify({ 
        error: 'Failed to create attachment record',
        details: dbError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Attachment created successfully:', attachment.id);

    return new Response(JSON.stringify({ 
      attachment,
      message: 'File uploaded successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in upload-order-attachment:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});