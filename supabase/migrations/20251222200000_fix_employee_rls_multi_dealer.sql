-- Fix RLS: Allow viewing employees with active assignments in multi-dealer scenarios
-- Resolves issue where employees assigned to multiple dealerships are not visible
-- in kiosks of their assigned (non-primary) dealerships
--
-- Example case: Lamartine Borge
--   - Primary dealership: 11 (Audi Natick)
--   - Active assignment: 17 (Bernardi Volvo)
--   - Before fix: Kiosk at dealer 17 could not see Lamartine
--   - After fix: Kiosk at dealer 17 can see Lamartine via assignment

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view employees from their dealerships" ON detail_hub_employees;

-- Create new policy that includes assignments
CREATE POLICY "Users can view employees from their dealerships or assignments"
  ON detail_hub_employees
  FOR SELECT
  USING (
    -- System admins can see all employees
    is_global_system_admin(auth.uid()) OR

    -- Users can see employees from their primary dealership
    dealership_id IN (
      SELECT dm.dealer_id
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
    ) OR

    -- Users can see employees with active assignments to their dealerships
    EXISTS (
      SELECT 1
      FROM detail_hub_employee_assignments dea
      JOIN dealer_memberships dm ON dm.dealer_id = dea.dealership_id
      WHERE dea.employee_id = detail_hub_employees.id
        AND dea.status = 'active'
        AND dm.user_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Users can view employees from their dealerships or assignments" ON detail_hub_employees IS
  'Allows users to view employees who either have their dealership as primary, or have an active assignment to their dealership. This enables multi-dealer employee scenarios.';
