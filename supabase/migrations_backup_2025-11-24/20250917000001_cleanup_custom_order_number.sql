-- Migration: Remove custom_order_number column and cleanup
-- This migration removes the legacy custom_order_number column since order_number is the primary field

-- Step 1: Update any remaining references to use order_number
UPDATE public.orders
SET order_number = COALESCE(order_number, custom_order_number)
WHERE order_number IS NULL AND custom_order_number IS NOT NULL;

-- Step 2: Drop the custom_order_number column
ALTER TABLE public.orders DROP COLUMN IF EXISTS custom_order_number;

-- Step 3: Add location fields for order creation tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS created_location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS created_location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS created_location_address TEXT;

-- Step 4: Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_orders_location
ON public.orders(created_location_lat, created_location_lng)
WHERE created_location_lat IS NOT NULL AND created_location_lng IS NOT NULL;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN public.orders.created_location_lat IS 'Latitude where order was created';
COMMENT ON COLUMN public.orders.created_location_lng IS 'Longitude where order was created';
COMMENT ON COLUMN public.orders.created_location_address IS 'Human-readable address where order was created';

-- Step 6: Update any functions that might reference custom_order_number
-- This ensures Edge Functions also use order_number consistently

-- Step 7: Update auto QR generation trigger to use order_number instead of custom_order_number
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

  -- Log the QR generation attempt (use order_number instead of custom_order_number)
  RAISE LOG 'Auto-generating QR for order: % (ID: %)', COALESCE(NEW.order_number, NEW.id), NEW.id;

  -- Call the Edge Function asynchronously to generate QR code
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
      ),
      body := jsonb_build_object(
        'orderId', NEW.id,
        'orderNumber', COALESCE(NEW.order_number, NEW.id::text),
        'dealerId', NEW.dealer_id,
        'regenerate', false,
        'auto_generated', true
      )
    );

  RAISE LOG 'QR generation request sent for order: %', COALESCE(NEW.order_number, NEW.id);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the order creation
    RAISE WARNING 'Failed to auto-generate QR for order %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger with updated function
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_insert ON public.orders;
CREATE TRIGGER trigger_auto_generate_qr_on_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_qr_on_order_insert();

-- Note: This migration cleans up legacy custom_order_number usage,
-- adds location tracking capabilities, and fixes auto QR generation trigger