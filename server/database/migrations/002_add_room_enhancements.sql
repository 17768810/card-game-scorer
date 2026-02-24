-- Migration: Add room enhancements
-- Description: Add password protection, custom player count, and overflow settings
-- Date: 2026-02-16

-- Add password protection columns
ALTER TABLE rooms ADD COLUMN password_hash TEXT DEFAULT NULL;
ALTER TABLE rooms ADD COLUMN is_password_protected BOOLEAN NOT NULL DEFAULT 0;

-- Add flexible player count columns
ALTER TABLE rooms ADD COLUMN allow_overflow BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN custom_max_players INTEGER DEFAULT NULL;

-- Note: Existing rooms will have NULL password_hash (no password)
-- and allow_overflow = 0 (strict player count enforcement)
-- custom_max_players = NULL means use game type default
