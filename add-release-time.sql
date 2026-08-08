-- Add release time column to release_dates table
-- Run this in Supabase SQL Editor to enable precise cutoff times

ALTER TABLE release_dates ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '17:00';

-- Update existing release dates with a sensible default (5:00 PM)
UPDATE release_dates SET time = '17:00' WHERE time IS NULL;
