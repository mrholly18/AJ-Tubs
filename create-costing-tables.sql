-- Food Costing Tables
-- Run this in Supabase SQL Editor

-- Master ingredient list
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price_paid NUMERIC(10,2) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'piece',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Costing sheets (one per tub type)
CREATE TABLE IF NOT EXISTS costings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  batch_size INTEGER NOT NULL DEFAULT 1,
  markup_percent NUMERIC(5,2) NOT NULL DEFAULT 120,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ingredients used in each costing
CREATE TABLE IF NOT EXISTS costing_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  costing_id UUID REFERENCES costings(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  amount_used NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'piece'
);

-- Enable RLS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE costings ENABLE ROW LEVEL SECURITY;
ALTER TABLE costing_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations
CREATE POLICY "Allow all on ingredients" ON ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on costings" ON costings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on costing_items" ON costing_items FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_costing_items_costing_id ON costing_items(costing_id);
CREATE INDEX IF NOT EXISTS idx_costing_items_ingredient_id ON costing_items(ingredient_id);
