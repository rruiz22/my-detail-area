-- Fix status constraint and add custom order number
-- Drop the existing status check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new status check constraint with correct values
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

-- Add custom order number column
ALTER TABLE public.orders ADD COLUMN custom_order_number TEXT;

-- Create sequence for custom order numbers starting at 10000
CREATE SEQUENCE IF NOT EXISTS custom_order_seq START 10000;

-- Function to generate custom order number
CREATE OR REPLACE FUNCTION generate_custom_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'SALES-' || LPAD(nextval('custom_order_seq')::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Update existing orders with custom order numbers
UPDATE public.orders 
SET custom_order_number = generate_custom_order_number()
WHERE custom_order_number IS NULL;

-- Set default for future orders
ALTER TABLE public.orders ALTER COLUMN custom_order_number SET DEFAULT generate_custom_order_number();

-- Update existing orders to use correct status values
UPDATE public.orders SET status = 'pending' WHERE status = 'Pending';
UPDATE public.orders SET status = 'in_progress' WHERE status IN ('In Progress', 'In Process');  
UPDATE public.orders SET status = 'completed' WHERE status = 'Complete';
UPDATE public.orders SET status = 'cancelled' WHERE status = 'Cancelled';