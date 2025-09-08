-- Temporarily allow all authenticated users to create orders for testing
DROP POLICY IF EXISTS "Users can insert orders in their dealer groups" ON orders;

CREATE POLICY "Temporary: Allow authenticated users to create orders" 
ON orders FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Also allow all authenticated users to select orders for testing  
DROP POLICY IF EXISTS "Users can view accessible orders" ON orders;

CREATE POLICY "Temporary: Allow authenticated users to view orders" 
ON orders FOR SELECT 
TO authenticated 
USING (true);

-- Allow updates for testing
DROP POLICY IF EXISTS "Users can update orders with proper permissions" ON orders;

CREATE POLICY "Temporary: Allow authenticated users to update orders" 
ON orders FOR UPDATE 
TO authenticated 
USING (true);

-- Set default dealer_id if not provided
ALTER TABLE orders ALTER COLUMN dealer_id SET DEFAULT 5;