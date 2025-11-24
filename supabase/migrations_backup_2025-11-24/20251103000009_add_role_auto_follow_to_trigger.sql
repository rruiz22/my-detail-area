-- ============================================================================
-- ADD ROLE-BASED AUTO-FOLLOW TO ORDER CREATION TRIGGER
-- ============================================================================
-- Extends the existing order creation trigger to automatically add users
-- with configured roles as followers based on dealer_notification_rules
-- ============================================================================

BEGIN;

-- Updated function to add creator, assigned user, AND role-based auto-followers
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
  -- PART 1.5: Add assigned user as follower (NEW FOR SALES/SERVICE)
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
  -- PART 2: Add role-based auto-followers (NEW LOGIC)
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
        RAISE LOG '[AutoFollow] Processing role-based auto-follow for module %', v_module;

        -- Get roles configured for auto-follow in this module
        FOR v_role_record IN
          SELECT DISTINCT jsonb_array_elements_text(recipients->'roles') as role_id
          FROM dealer_notification_rules
          WHERE dealer_id = NEW.dealer_id
            AND module = v_module
            AND auto_follow_enabled = true
            AND enabled = true
        LOOP
          RAISE LOG '[AutoFollow] Found role % configured for auto-follow', v_role_record.role_id;

          -- Get active users with this role in this dealer
          FOR v_user_record IN
            SELECT dm.user_id, dcr.display_name as role_name
            FROM dealer_memberships dm
            INNER JOIN dealer_custom_roles dcr ON dcr.id = dm.custom_role_id
            WHERE dm.dealer_id = NEW.dealer_id
              AND dm.custom_role_id = v_role_record.role_id::uuid
              AND dm.is_active = true
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
                'Auto-follow: ' || COALESCE(v_user_record.role_name, 'Unknown role')
              )
              ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING;

              RAISE LOG '[AutoFollow] Added user % (role: %) as follower', v_user_record.user_id, v_user_record.role_name;
            EXCEPTION
              WHEN OTHERS THEN
                RAISE WARNING '[AutoFollow] Failed to add role-based follower % for order %: %',
                  v_user_record.user_id, NEW.id, SQLERRM;
            END;
          END LOOP;
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
  RAISE NOTICE 'ROLE-BASED AUTO-FOLLOW ADDED TO ORDER CREATION TRIGGER';
  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ✓ Updated auto_add_order_creator_as_follower function';
  RAISE NOTICE '  ✓ Added logic to process dealer_notification_rules';
  RAISE NOTICE '  ✓ Users with roles configured for auto-follow will be added as followers';
  RAISE NOTICE '';
  RAISE NOTICE 'How it works:';
  RAISE NOTICE '  1. When an order is created, the trigger runs';
  RAISE NOTICE '  2. Creator is added as follower (existing)';
  RAISE NOTICE '  3. Roles with auto_follow_enabled=true in dealer_notification_rules are queried';
  RAISE NOTICE '  4. Users with those roles are automatically added as followers';
  RAISE NOTICE '  5. They will receive notifications based on their preferences';
  RAISE NOTICE '======================================================================';
END $$;
