-- Fix: Add supermanager role to remote_kiosk_tokens DELETE policy
-- Problem: Supermanagers cannot delete tokens despite having membership
-- Root cause: DELETE policy only allows dealer_admin, system_admin, admin
-- Solution: Add supermanager to allowed roles list

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Admins can delete tokens" ON remote_kiosk_tokens;

-- Recreate DELETE policy with supermanager included
CREATE POLICY "Admins can delete tokens"
  ON remote_kiosk_tokens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      JOIN profiles p ON p.id = dm.user_id
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = remote_kiosk_tokens.dealership_id
        AND dm.is_active = true
        AND p.role IN ('dealer_admin', 'system_admin', 'admin', 'supermanager')  -- ✅ Added supermanager
    )
  );

-- Verification comment:
-- This aligns DELETE policy with INSERT/UPDATE policies which already include supermanager
-- INSERT policy (line 149): dealer_admin, dealer_manager, system_admin, admin, manager, supermanager
-- UPDATE policy (line 165): dealer_admin, dealer_manager, system_admin, admin, manager, supermanager
-- DELETE policy (now): dealer_admin, system_admin, admin, supermanager
