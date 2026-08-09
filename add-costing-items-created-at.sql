-- Add created_at column to costing_items for ordering
-- Run this in Supabase SQL Editor

ALTER TABLE costing_items
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
