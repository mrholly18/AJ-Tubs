-- Update old menu item names in release_menu table to new names
-- Run this in Supabase SQL Editor to fix existing data

UPDATE release_menu
SET menu_item_name = 'Baked Macaroni'
WHERE menu_item_name = 'Mac and Cheese';

UPDATE release_menu
SET menu_item_name = 'Graham Balls - 4pcs'
WHERE menu_item_name = 'Graham Balls';
