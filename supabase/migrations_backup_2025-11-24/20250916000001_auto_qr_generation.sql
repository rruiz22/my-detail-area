-- Migration: Auto QR Generation on Order Creation
-- This migration creates a trigger that automatically generates QR codes and short links
-- when new orders are created, eliminating the need for manual "Generate QR" clicks

-- Function to automatically generate QR code after order creation
CREATE OR REPLACE FUNCTION auto_generate_qr_on_order_insert()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  app_url TEXT;
BEGIN
  -- Get the app URL for the Edge Function call
  app_url := COALESCE(
    current_setting('app.base_url', true),
    'https://my-detail-area.lovable.app'
  );

  function_url := app_url || '/functions/v1/generate-qr-shortlink';

  -- Log the QR generation attempt
  RAISE LOG 'Auto-generating QR for order: % (ID: %)', NEW.custom_order_number, NEW.id;

  -- Call the Edge Function asynchronously to generate QR code
  -- Using pg_net extension for HTTP calls
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
      ),
      body := jsonb_build_object(
        'orderId', NEW.id,
        'orderNumber', COALESCE(NEW.custom_order_number, NEW.id::text),
        'dealerId', NEW.dealer_id,
        'regenerate', false,
        'auto_generated', true
      )
    );

  RAISE LOG 'QR generation request sent for order: %', NEW.custom_order_number;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the order creation
    RAISE WARNING 'Failed to auto-generate QR for order %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic QR generation on INSERT
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_insert ON public.orders;
CREATE TRIGGER trigger_auto_generate_qr_on_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_qr_on_order_insert();

-- Function to retry QR generation for orders without QR codes
CREATE OR REPLACE FUNCTION retry_qr_generation_for_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  order_record RECORD;
  function_url TEXT;
  app_url TEXT;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM public.orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Check if QR already exists
  IF order_record.qr_code_url IS NOT NULL AND order_record.short_link IS NOT NULL THEN
    RAISE NOTICE 'Order % already has QR code', order_record.custom_order_number;
    RETURN true;
  END IF;

  -- Get the app URL for the Edge Function call
  app_url := COALESCE(
    current_setting('app.base_url', true),
    'https://my-detail-area.lovable.app'
  );

  function_url := app_url || '/functions/v1/generate-qr-shortlink';

  -- Call Edge Function to generate QR
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
      ),
      body := jsonb_build_object(
        'orderId', order_record.id,
        'orderNumber', COALESCE(order_record.custom_order_number, order_record.id::text),
        'dealerId', order_record.dealer_id,
        'regenerate', false,
        'retry_generation', true
      )
    );

  RAISE LOG 'QR retry generation request sent for order: %', order_record.custom_order_number;
  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to retry QR generation for order %: %', p_order_id, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to batch process orders without QR codes
CREATE OR REPLACE FUNCTION batch_generate_missing_qr_codes()
RETURNS TABLE(
  order_id UUID,
  order_number TEXT,
  success BOOLEAN
) AS $$
DECLARE
  order_record RECORD;
  generation_success BOOLEAN;
BEGIN
  -- Find orders without QR codes
  FOR order_record IN
    SELECT id, custom_order_number, dealer_id
    FROM public.orders
    WHERE (qr_code_url IS NULL OR short_link IS NULL)
    AND created_at >= (now() - interval '30 days') -- Only recent orders
    ORDER BY created_at DESC
    LIMIT 100 -- Process in batches
  LOOP
    -- Try to generate QR for each order
    generation_success := retry_qr_generation_for_order(order_record.id);

    -- Return result
    order_id := order_record.id;
    order_number := order_record.custom_order_number;
    success := generation_success;
    RETURN NEXT;

    -- Small delay to avoid overwhelming the API
    PERFORM pg_sleep(0.1);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add column to track QR generation status
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS qr_generation_status TEXT DEFAULT 'pending'
CHECK (qr_generation_status IN ('pending', 'generating', 'completed', 'failed'));

-- Add column to track QR generation attempts
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS qr_generation_attempts INTEGER DEFAULT 0;

-- Add column to track last QR generation attempt
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS qr_last_attempt_at TIMESTAMP WITH TIME ZONE;

-- Function to update QR generation status
CREATE OR REPLACE FUNCTION update_qr_generation_status(
  p_order_id UUID,
  p_status TEXT,
  p_increment_attempts BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.orders
  SET
    qr_generation_status = p_status,
    qr_generation_attempts = CASE
      WHEN p_increment_attempts THEN qr_generation_attempts + 1
      ELSE qr_generation_attempts
    END,
    qr_last_attempt_at = CASE
      WHEN p_increment_attempts THEN now()
      ELSE qr_last_attempt_at
    END,
    updated_at = now()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create index for QR generation status queries
CREATE INDEX IF NOT EXISTS idx_orders_qr_generation_status
ON public.orders(qr_generation_status)
WHERE qr_generation_status IN ('pending', 'failed');

-- Grant necessary permissions for trigger function
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON FUNCTION net.http_post TO postgres;