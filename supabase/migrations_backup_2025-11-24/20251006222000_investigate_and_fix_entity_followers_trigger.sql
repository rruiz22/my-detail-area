-- Investigation and Fix for entity_followers foreign key error
-- The issue: Something is auto-inserting into entity_followers using created_by_group_id
-- instead of created_by (user.id)

-- Step 1: List all triggers on the orders table
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== TRIGGERS ON ORDERS TABLE ===';
  FOR r IN
    SELECT tgname, proname, prosrc
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'orders'::regclass
  LOOP
    RAISE NOTICE 'Trigger: % | Function: %', r.tgname, r.proname;
    RAISE NOTICE 'Source: %', r.prosrc;
    RAISE NOTICE '---';
  END LOOP;
END $$;

-- Step 2: Search for any function that inserts into entity_followers
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== FUNCTIONS THAT REFERENCE entity_followers ===';
  FOR r IN
    SELECT proname, prosrc
    FROM pg_proc
    WHERE prosrc ILIKE '%entity_followers%'
  LOOP
    RAISE NOTICE 'Function: %', r.proname;
    RAISE NOTICE 'Source: %', SUBSTRING(r.prosrc, 1, 500);
    RAISE NOTICE '---';
  END LOOP;
END $$;

-- Step 3: If the trigger is found, this will disable it temporarily
-- Uncomment once we identify the problematic trigger
-- DROP TRIGGER IF EXISTS auto_add_creator_follower ON orders;

-- Step 4: Create a CORRECT trigger that uses created_by instead of created_by_group_id
CREATE OR REPLACE FUNCTION auto_add_order_creator_as_follower()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if created_by field exists and is not null
  IF NEW.created_by IS NOT NULL THEN
    BEGIN
      -- Insert creator as follower
      INSERT INTO entity_followers (
        entity_type,
        entity_id,
        user_id,  -- ✅ Use created_by (user.id), NOT created_by_group_id
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
        NEW.created_by,  -- ✅ CORRECT: Use the user's UUID
        NEW.dealer_id,
        'creator',
        'important',
        NOW(),
        NEW.created_by,
        true,
        'Order creator'
      )
      ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING;  -- Avoid duplicates

      RAISE LOG 'Added creator follower for order % (user: %)', NEW.id, NEW.created_by;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the order creation
        RAISE WARNING 'Failed to add creator follower for order %: %', NEW.id, SQLERRM;
    END;
  ELSE
    RAISE WARNING 'Order % created without created_by field', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Create trigger (will replace any existing one)
DROP TRIGGER IF EXISTS auto_add_order_creator_follower ON orders;
CREATE TRIGGER auto_add_order_creator_follower
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_order_creator_as_follower();

COMMENT ON FUNCTION auto_add_order_creator_as_follower() IS 'Automatically adds the order creator as a follower using created_by (user.id), not created_by_group_id (role.id)';
