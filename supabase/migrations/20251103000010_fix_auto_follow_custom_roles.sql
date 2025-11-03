-- ============================================================================
-- FIX AUTO-FOLLOW TO USE user_custom_role_assignments
-- ============================================================================
-- The previous trigger was looking in dealer_memberships.custom_role_id
-- which is for system roles (dealer_id = NULL).
-- Custom roles are in user_custom_role_assignments table.
-- ============================================================================

BEGIN;

-- Updated function to correctly query user_custom_role_assignments
CREATE OR REPLACE FUNCTION auto_add_order_creator_as_follower()
RETURNS TRIGGER AS $$
DECLARE
  v_module TEXT;
  v_role_record RECORD;
  v_user_record RECORD;
BEGIN
  -- =========================================================================
  -- PART 1: Add creator as follower (existing logic)
  -- =========================================================================
  IF NEW.created_by IS NOT NULL THEN
    BEGIN
      INSERT INTO entity_followers (
        entity_type,
        entity_id,
        user_id,
        dealer_id,
        follow_type,
        notification_level,
        followed_at,
        followed_by,
        is_active,
        auto_added_reason
      ) VALUES (
        'order',
        NEW.id,
        NEW.created_by,
        NEW.dealer_id,
        'creator',
        'important',
        NOW(),
        NEW.created_by,
        true,
        'Order creator'
      )
      ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING;

      RAISE LOG '[AutoFollow] Added creator % as follower for order %', NEW.created_by, NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[AutoFollow] Failed to add creator follower for order %: %', NEW.id, SQLERRM;
    END;
  ELSE
    RAISE WARNING '[AutoFollow] Order % created without created_by field', NEW.id;
  END IF;

  -- =========================================================================
  -- PART 1.5: Add assigned user as follower (FOR SALES/SERVICE)
  -- =========================================================================
  IF NEW.assigned_contact_id IS NOT NULL THEN
    BEGIN
      INSERT INTO entity_followers (
        entity_type,
        entity_id,
        user_id,
        dealer_id,
        follow_type,
        notification_level,
        followed_at,
        followed_by,
        is_active,
        auto_added_reason
      ) VALUES (
        'order',
        NEW.id,
        NEW.assigned_contact_id,
        NEW.dealer_id,
        'assigned',
        'all',
        NOW(),
        COALESCE(NEW.created_by, NEW.assigned_contact_id),
        true,
        'Assigned to order'
      )
      ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING;

      RAISE LOG '[AutoFollow] Added assigned user % as follower for order %', NEW.assigned_contact_id, NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[AutoFollow] Failed to add assigned follower for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- =========================================================================
  -- PART 2: Add role-based auto-followers (FIXED TO USE CORRECT TABLE)
  -- =========================================================================
  IF NEW.dealer_id IS NOT NULL THEN
    BEGIN
      -- Map order_type to module
      v_module := CASE NEW.order_type
        WHEN 'sales' THEN 'sales_orders'
        WHEN 'service' THEN 'service_orders'
        WHEN 'recon' THEN 'recon_orders'
        WHEN 'carwash' THEN 'car_wash'
        ELSE NULL
      END;

      IF v_module IS NOT NULL THEN
        RAISE LOG '[AutoFollow] Processing role-based auto-follow for module % in dealer %', v_module, NEW.dealer_id;

        -- Get roles configured for auto-follow in this module
        FOR v_role_record IN
          SELECT DISTINCT jsonb_array_elements_text(recipients->'roles') as role_id
          FROM dealer_notification_rules
          WHERE dealer_id = NEW.dealer_id
            AND module = v_module
            AND auto_follow_enabled = true
            AND enabled = true
        LOOP
          RAISE LOG '[AutoFollow] Found role % configured for auto-follow in module %', v_role_record.role_id, v_module;

          -- ✅ FIX: Get active users with this role from user_custom_role_assignments
          FOR v_user_record IN
            SELECT
              ucra.user_id,
              dcr.display_name as role_name,
              dcr.role_name as role_internal_name
            FROM user_custom_role_assignments ucra
            INNER JOIN dealer_custom_roles dcr ON dcr.id = ucra.custom_role_id
            WHERE ucra.dealer_id = NEW.dealer_id
              AND ucra.custom_role_id = v_role_record.role_id::uuid
              AND ucra.is_active = true
          LOOP
            BEGIN
              -- Add user as follower
              INSERT INTO entity_followers (
                entity_type,
                entity_id,
                user_id,
                dealer_id,
                follow_type,
                notification_level,
                followed_at,
                followed_by,
                is_active,
                auto_added_reason
              ) VALUES (
                'order',
                NEW.id,
                v_user_record.user_id,
                NEW.dealer_id,
                'auto_role',
                'all',  -- Role-based followers get all notifications
                NOW(),
                NEW.created_by,
                true,
                'Auto-follow: ' || COALESCE(v_user_record.role_name, v_user_record.role_internal_name, 'Unknown role')
              )
              ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING;

              RAISE LOG '[AutoFollow] ✅ Added user % (role: %) as follower for order %',
                v_user_record.user_id, v_user_record.role_name, NEW.id;
            EXCEPTION
              WHEN OTHERS THEN
                RAISE WARNING '[AutoFollow] Failed to add role-based follower % for order %: %',
                  v_user_record.user_id, NEW.id, SQLERRM;
            END;
          END LOOP;

          -- Log if no users found with this role
          IF NOT FOUND THEN
            RAISE LOG '[AutoFollow] ⚠️ No active users found with role % in dealer %',
              v_role_record.role_id, NEW.dealer_id;
          END IF;
        END LOOP;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[AutoFollow] Role-based auto-follow failed for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'AUTO-FOLLOW TRIGGER FIXED TO USE user_custom_role_assignments';
  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ✓ Changed query from dealer_memberships to user_custom_role_assignments';
  RAISE NOTICE '  ✓ This fixes the issue where custom roles were not being auto-followed';
  RAISE NOTICE '  ✓ Added better logging to debug future issues';
  RAISE NOTICE '';
  RAISE NOTICE 'How to test:';
  RAISE NOTICE '  1. Enable auto_follow_enabled for a custom role in dealer_notification_rules';
  RAISE NOTICE '  2. Create a new order';
  RAISE NOTICE '  3. Check entity_followers table for the user with that role';
  RAISE NOTICE '  4. Check PostgreSQL logs for [AutoFollow] messages';
  RAISE NOTICE '======================================================================';
END $$;
