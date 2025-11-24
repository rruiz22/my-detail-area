-- Migration: Populate avatar_seed for existing users
-- Date: 2025-10-25
-- Description: Assigns random but deterministic avatar seeds (beam-1 to beam-25)
--              to all users that don't have an avatar_seed configured

-- Function to generate deterministic seed based on user ID
CREATE OR REPLACE FUNCTION generate_avatar_seed(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  seed_number INTEGER;
BEGIN
  -- Generate number 1-25 based on UUID hash
  seed_number := (
    ('x' || substring(user_uuid::text, 1, 8))::bit(32)::bigint % 25
  ) + 1;

  RETURN 'beam-' || seed_number::text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update users without avatar_seed
UPDATE profiles
SET
  avatar_seed = generate_avatar_seed(id),
  avatar_variant = 'beam',
  updated_at = NOW()
WHERE (avatar_seed IS NULL OR avatar_seed = '')
  AND id IS NOT NULL;

-- Report results
DO $$
DECLARE
  total_updated INTEGER;
  total_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM profiles;
  SELECT COUNT(*) INTO total_updated FROM profiles WHERE avatar_seed IS NOT NULL;

  RAISE NOTICE 'Avatar Seeds Population Complete';
  RAISE NOTICE '  Total profiles: %', total_profiles;
  RAISE NOTICE '  Profiles with seeds: %', total_updated;
  RAISE NOTICE '  Profiles without seeds: %', total_profiles - total_updated;
END $$;

-- Verify distribution (should be roughly equal across all 25 seeds)
SELECT
  avatar_seed,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM profiles
WHERE avatar_seed IS NOT NULL
GROUP BY avatar_seed
ORDER BY avatar_seed;

-- Add helpful comment
COMMENT ON COLUMN profiles.avatar_seed IS 'Avatar style seed (beam-1 to beam-25) - determines which boring-avatars variant to use';
COMMENT ON COLUMN profiles.avatar_variant IS 'Avatar variant type - currently only "beam" is supported';

-- Optional: Drop the temporary function if not needed for future use
-- DROP FUNCTION IF EXISTS generate_avatar_seed(UUID);
