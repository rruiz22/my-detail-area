-- ============================================================================
-- Migration: Enhanced Work Items Status System - ENUM Addition ONLY
-- Description: Add new ENUM values using direct ALTER TYPE commands
-- Author: Claude Code
-- Date: 2025-01-23
-- Version: 1.3.0 (Simplified ENUM Addition)
-- ============================================================================
--
-- CRITICAL: This script ONLY adds ENUM values
-- Run this FIRST, then run the data migration script separately
--
-- This approach uses direct ALTER TYPE commands outside of DO blocks
-- to ensure PostgreSQL properly commits the ENUM values
-- ============================================================================

-- Add 'awaiting_approval' - must be first in the sequence
ALTER TYPE work_item_status ADD VALUE IF NOT EXISTS 'awaiting_approval' BEFORE 'pending';

-- Add 'rejected' - after pending
ALTER TYPE work_item_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'pending';

-- Add 'ready' - after rejected
ALTER TYPE work_item_status ADD VALUE IF NOT EXISTS 'ready' AFTER 'rejected';

-- Add 'scheduled' - after ready
ALTER TYPE work_item_status ADD VALUE IF NOT EXISTS 'scheduled' AFTER 'ready';

-- Add 'on_hold' - after in_progress
ALTER TYPE work_item_status ADD VALUE IF NOT EXISTS 'on_hold' AFTER 'in_progress';

-- Add 'blocked' - after on_hold
ALTER TYPE work_item_status ADD VALUE IF NOT EXISTS 'blocked' AFTER 'on_hold';

-- Add 'cancelled' - after completed
ALTER TYPE work_item_status ADD VALUE IF NOT EXISTS 'cancelled' AFTER 'completed';

-- ============================================================================
-- END - ENUM VALUES ADDED
-- ============================================================================
--
-- NEXT STEP: Run this script, wait for commit, then run Part 2
-- ============================================================================
