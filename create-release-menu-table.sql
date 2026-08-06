-- Create release_menu table
-- Run this in Supabase SQL Editor to enable "Available Meals" per release date

CREATE TABLE IF NOT EXISTS release_menu (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_date DATE NOT NULL,
  menu_item_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(release_date, menu_item_name)
);

-- Enable RLS (optional, but recommended)
ALTER TABLE release_menu ENABLE ROW LEVEL SECURITY;

-- Allow all operations (matching existing tables)
CREATE POLICY "Allow all on release_menu" ON release_menu FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_release_menu_date ON release_menu(release_date);
