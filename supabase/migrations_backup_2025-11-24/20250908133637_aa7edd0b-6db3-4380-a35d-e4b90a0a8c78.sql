-- Add Service-specific fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS po TEXT,
ADD COLUMN IF NOT EXISTS ro TEXT, 
ADD COLUMN IF NOT EXISTS tag TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.orders.po IS 'Purchase Order number for service orders';
COMMENT ON COLUMN public.orders.ro IS 'Repair Order number for service orders';
COMMENT ON COLUMN public.orders.tag IS 'Service tag/identifier for service orders';