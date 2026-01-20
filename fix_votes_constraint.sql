-- URGENT FIX: Remove old votes_voter_phone_phase_key constraint
-- Run this directly in Supabase SQL Editor to fix the voting issue

-- Step 1: Drop the old constraint that blocks multiple votes per phase
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_voter_phone_phase_key;

-- Step 2: Verify it's gone (should return 0 rows)
SELECT conname, conkey 
FROM pg_constraint 
WHERE conrelid = 'votes'::regclass 
  AND contype = 'u' 
  AND conname LIKE '%voter_phone%phase%'
  AND conname NOT LIKE '%points%';

-- Step 3: Ensure the correct constraint exists
-- First, drop it if it exists (to avoid conflicts)
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_voter_phone_points_phase_key;

-- Then create it
ALTER TABLE votes ADD CONSTRAINT votes_voter_phone_points_phase_key 
  UNIQUE(voter_phone, points, phase);

-- Step 4: Verify the correct constraint exists
SELECT conname, conkey 
FROM pg_constraint 
WHERE conrelid = 'votes'::regclass 
  AND contype = 'u' 
  AND conname = 'votes_voter_phone_points_phase_key';

-- Expected result: Should show votes_voter_phone_points_phase_key with 3 columns
