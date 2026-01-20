-- Verify and fix score calculation
-- Run this in Supabase SQL Editor to check if scores are being calculated correctly

-- Step 1: Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'votes'::regclass
  AND tgname = 'trigger_update_entry_score';

-- Step 2: Check current scores vs calculated scores
SELECT 
  e.id,
  e.costume_title,
  e.total_score as current_score,
  COALESCE(SUM(v.points), 0) as calculated_score,
  CASE 
    WHEN e.total_score != COALESCE(SUM(v.points), 0) THEN '❌ MISMATCH'
    ELSE '✅ OK'
  END as status
FROM entries e
LEFT JOIN votes v ON v.entry_id = e.id
GROUP BY e.id, e.costume_title, e.total_score
ORDER BY e.total_score DESC;

-- Step 3: Recalculate all scores (fix any mismatches)
UPDATE entries
SET total_score = (
  SELECT COALESCE(SUM(points), 0)
  FROM votes
  WHERE votes.entry_id = entries.id
);

-- Step 4: Verify trigger function exists and is correct
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc
WHERE proname = 'update_entry_score';

-- Step 5: Test the trigger by checking recent vote activity
SELECT 
  v.id,
  v.entry_id,
  v.points,
  v.created_at,
  e.costume_title,
  e.total_score
FROM votes v
JOIN entries e ON e.id = v.entry_id
ORDER BY v.created_at DESC
LIMIT 10;
