-- ============================================================================
-- Migration: Create get_chat_effective_permissions function
-- ============================================================================
-- Purpose: Calculate effective permissions by merging multiple sources
-- Priority: custom capabilities > role template > group permissions > level defaults
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chat_effective_permissions(
  p_user_id UUID,
  p_conversation_id UUID,
  p_dealer_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant_level chat_permission_level;
  v_custom_capabilities JSONB;
  v_template_capabilities JSONB;
  v_template_level chat_permission_level;
  v_group_permissions JSONB;
  v_effective_permissions JSONB;
  v_user_group_name TEXT;
  v_participant_active BOOLEAN;
BEGIN
  -- =========================================================================
  -- STEP 1: Get participant's permission level and custom capabilities
  -- =========================================================================
  SELECT
    cp.permission_level,
    cp.capabilities,
    cp.is_active,
    dg.name
  INTO
    v_participant_level,
    v_custom_capabilities,
    v_participant_active,
    v_user_group_name
  FROM public.chat_participants cp
  LEFT JOIN public.dealer_memberships dm
    ON dm.user_id = cp.user_id
    AND dm.dealer_id = p_dealer_id
    AND dm.is_active = true
  LEFT JOIN public.dealer_membership_groups dmg
    ON dmg.membership_id = dm.id
  LEFT JOIN public.dealer_groups dg
    ON dg.id = dmg.group_id
    AND dg.is_active = true
  WHERE cp.user_id = p_user_id
    AND cp.conversation_id = p_conversation_id
  ORDER BY dg.name -- If user is in multiple groups, take first alphabetically
  LIMIT 1;

  -- If no participant record or participant is inactive, return no access
  IF v_participant_level IS NULL OR v_participant_active IS FALSE THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'level', 'none',
      'source', 'no_participant_record',
      'capabilities', jsonb_build_object(
        'messages', jsonb_build_object(
          'send_text', false,
          'send_voice', false,
          'send_files', false,
          'edit_own', false,
          'delete_own', false,
          'delete_others', false
        ),
        'participants', jsonb_build_object(
          'invite_users', false,
          'remove_users', false,
          'change_permissions', false
        ),
        'conversation', jsonb_build_object(
          'update_settings', false,
          'archive', false,
          'delete', false
        )
      )
    );
  END IF;

  -- If permission level is 'none', return no access regardless of capabilities
  IF v_participant_level = 'none' THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'level', 'none',
      'source', 'permission_level_none',
      'capabilities', jsonb_build_object(
        'messages', jsonb_build_object(
          'send_text', false,
          'send_voice', false,
          'send_files', false,
          'edit_own', false,
          'delete_own', false,
          'delete_others', false
        ),
        'participants', jsonb_build_object(
          'invite_users', false,
          'remove_users', false,
          'change_permissions', false
        ),
        'conversation', jsonb_build_object(
          'update_settings', false,
          'archive', false,
          'delete', false
        )
      )
    );
  END IF;

  -- =========================================================================
  -- STEP 2: Get template capabilities from dealer_role_chat_templates
  -- =========================================================================
  IF v_user_group_name IS NOT NULL THEN
    SELECT
      drct.default_capabilities,
      drct.default_permission_level
    INTO
      v_template_capabilities,
      v_template_level
    FROM public.dealer_role_chat_templates drct
    WHERE drct.dealer_id = p_dealer_id
      AND drct.role_name = v_user_group_name
    LIMIT 1;
  END IF;

  -- =========================================================================
  -- STEP 3: Build default capabilities based on permission level
  -- =========================================================================
  v_effective_permissions := CASE v_participant_level
    -- ADMIN: Full control over everything
    WHEN 'admin' THEN jsonb_build_object(
      'messages', jsonb_build_object(
        'send_text', true,
        'send_voice', true,
        'send_files', true,
        'edit_own', true,
        'delete_own', true,
        'delete_others', true
      ),
      'participants', jsonb_build_object(
        'invite_users', true,
        'remove_users', true,
        'change_permissions', true
      ),
      'conversation', jsonb_build_object(
        'update_settings', true,
        'archive', true,
        'delete', true
      )
    )

    -- MODERATE: Can moderate messages and manage participants
    WHEN 'moderate' THEN jsonb_build_object(
      'messages', jsonb_build_object(
        'send_text', true,
        'send_voice', true,
        'send_files', true,
        'edit_own', true,
        'delete_own', true,
        'delete_others', true
      ),
      'participants', jsonb_build_object(
        'invite_users', true,
        'remove_users', true,
        'change_permissions', false
      ),
      'conversation', jsonb_build_object(
        'update_settings', true,
        'archive', true,
        'delete', false
      )
    )

    -- WRITE: Full messaging capabilities
    WHEN 'write' THEN jsonb_build_object(
      'messages', jsonb_build_object(
        'send_text', true,
        'send_voice', true,
        'send_files', true,
        'edit_own', true,
        'delete_own', true,
        'delete_others', false
      ),
      'participants', jsonb_build_object(
        'invite_users', false,
        'remove_users', false,
        'change_permissions', false
      ),
      'conversation', jsonb_build_object(
        'update_settings', false,
        'archive', false,
        'delete', false
      )
    )

    -- RESTRICTED_WRITE: Text only, no files or voice
    WHEN 'restricted_write' THEN jsonb_build_object(
      'messages', jsonb_build_object(
        'send_text', true,
        'send_voice', false,
        'send_files', false,
        'edit_own', true,
        'delete_own', true,
        'delete_others', false
      ),
      'participants', jsonb_build_object(
        'invite_users', false,
        'remove_users', false,
        'change_permissions', false
      ),
      'conversation', jsonb_build_object(
        'update_settings', false,
        'archive', false,
        'delete', false
      )
    )

    -- READ: View only, no actions
    WHEN 'read' THEN jsonb_build_object(
      'messages', jsonb_build_object(
        'send_text', false,
        'send_voice', false,
        'send_files', false,
        'edit_own', false,
        'delete_own', false,
        'delete_others', false
      ),
      'participants', jsonb_build_object(
        'invite_users', false,
        'remove_users', false,
        'change_permissions', false
      ),
      'conversation', jsonb_build_object(
        'update_settings', false,
        'archive', false,
        'delete', false
      )
    )

    -- NONE or default: No access
    ELSE jsonb_build_object(
      'messages', jsonb_build_object(
        'send_text', false,
        'send_voice', false,
        'send_files', false,
        'edit_own', false,
        'delete_own', false,
        'delete_others', false
      ),
      'participants', jsonb_build_object(
        'invite_users', false,
        'remove_users', false,
        'change_permissions', false
      ),
      'conversation', jsonb_build_object(
        'update_settings', false,
        'archive', false,
        'delete', false
      )
    )
  END;

  -- =========================================================================
  -- STEP 4: Merge capabilities (Priority: custom > template > level defaults)
  -- =========================================================================
  RETURN jsonb_build_object(
    'has_access', true,
    'level', v_participant_level,
    'user_group', v_user_group_name,
    'source', CASE
      WHEN v_custom_capabilities IS NOT NULL THEN 'custom_override'
      WHEN v_template_capabilities IS NOT NULL THEN 'role_template'
      ELSE 'level_default'
    END,
    'capabilities', COALESCE(
      v_custom_capabilities,      -- Priority 1: Custom overrides
      v_template_capabilities,    -- Priority 2: Role template
      v_effective_permissions     -- Priority 3: Level defaults
    )
  );
END;
$$;

-- ============================================================================
-- GRANT EXECUTE to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_chat_effective_permissions(UUID, UUID, BIGINT)
  TO authenticated;

-- ============================================================================
-- FUNCTION DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.get_chat_effective_permissions(UUID, UUID, BIGINT) IS
'Returns effective chat permissions for a user in a conversation.

Parameters:
  - p_user_id: UUID of the user
  - p_conversation_id: UUID of the conversation
  - p_dealer_id: ID of the dealership

Returns JSONB:
{
  "has_access": boolean,
  "level": "none" | "read" | "restricted_write" | "write" | "moderate" | "admin",
  "user_group": "group_name" | null,
  "source": "custom_override" | "role_template" | "level_default" | "no_participant_record",
  "capabilities": {
    "messages": { ... },
    "participants": { ... },
    "conversation": { ... }
  }
}

Permission priority (highest to lowest):
1. chat_participants.capabilities (custom per-conversation overrides)
2. dealer_role_chat_templates.default_capabilities (role templates)
3. Permission level defaults (based on chat_permission_level)

Example usage:
SELECT get_chat_effective_permissions(
  ''550e8400-e29b-41d4-a716-446655440000''::UUID,  -- user_id
  ''660e8400-e29b-41d4-a716-446655440000''::UUID,  -- conversation_id
  5                                                 -- dealer_id
);';

-- ============================================================================
-- TESTING EXAMPLES
-- ============================================================================
--
-- Test 1: User with custom capabilities (highest priority)
-- Should return custom_override as source
--
-- Test 2: User with role template (no custom capabilities)
-- Should return role_template as source
--
-- Test 3: User with neither custom nor template
-- Should return level_default as source
--
-- Test 4: User not in conversation
-- Should return has_access: false
--
-- Test 5: User with permission_level = 'none'
-- Should return has_access: false regardless of capabilities
-- ============================================================================
