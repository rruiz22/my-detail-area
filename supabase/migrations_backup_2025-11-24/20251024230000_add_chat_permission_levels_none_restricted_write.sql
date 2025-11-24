-- ============================================================================
-- Migration: Add 'none' and 'restricted_write' to chat_permission_level ENUM
-- ============================================================================
-- Purpose: Extend existing ENUM to support granular permission levels
-- - none: Banned/No access users
-- - restricted_write: Users who can only send text (no files/voice)
-- ============================================================================

-- Add new values to existing ENUM
ALTER TYPE chat_permission_level ADD VALUE IF NOT EXISTS 'none';
ALTER TYPE chat_permission_level ADD VALUE IF NOT EXISTS 'restricted_write';

-- Update ENUM documentation
COMMENT ON TYPE chat_permission_level IS
'Permission levels for chat participants:
- none: No access (banned users, temporary restrictions)
- read: View messages only
- restricted_write: Send text messages only (no files, voice, or attachments)
- write: Full messaging capabilities (text, files, voice)
- moderate: Moderation + participant management
- admin: Full administrative control (settings, deletion, permissions)';

-- ============================================================================
-- IMPORTANT: This migration is BACKWARD COMPATIBLE
-- Existing data will not be affected
-- Default permission level remains 'write' for new participants
-- ============================================================================
