-- Add created_by field to orders table to track which user created the order
-- This is separate from created_by_group_id which tracks the group/role

-- Add the column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

-- Comment to explain the field
COMMENT ON COLUMN orders.created_by IS 'UUID of the user who created this order (from auth.users)';
COMMENT ON COLUMN orders.created_by_group_id IS 'UUID of the group/role the user belonged to when creating this order';
