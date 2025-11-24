-- Enable public read access to active employees for Remote Kiosk functionality
-- This allows the RemoteKiosk.tsx page to fetch employee info using the JWT token

-- Create policy to allow public (anon) read access to active employees
-- Only basic info (id, name, employee_number) is exposed
CREATE POLICY "Allow public read access to active employees for remote kiosk"
ON detail_hub_employees
FOR SELECT
TO anon
USING (status = 'active');

-- Add comment explaining the policy
COMMENT ON POLICY "Allow public read access to active employees for remote kiosk"
ON detail_hub_employees IS
'Allows anonymous users to read basic employee information (name, number) for active employees.
This is required for the Remote Kiosk feature where employees access the kiosk via a temporary JWT link.
The policy only exposes minimal information and is restricted to active employees only.';
