-- Migration: Force remove old votes_voter_phone_phase_key constraint
-- This is a critical fix - the old constraint blocks Eurovision-style voting
-- Run this migration if migration 012 didn't work or wasn't run

-- Method 1: Try to drop by exact name (most common case)
DO $$
BEGIN
    ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_voter_phone_phase_key;
    RAISE NOTICE 'Attempted to drop votes_voter_phone_phase_key';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop votes_voter_phone_phase_key: %', SQLERRM;
END $$;

-- Method 2: Find and drop any constraint with voter_phone and phase (2 columns only)
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'votes'::regclass
          AND contype = 'u'
          AND array_length(conkey, 1) = 2
          AND EXISTS (
            SELECT 1 FROM pg_attribute 
            WHERE attrelid = 'votes'::regclass 
            AND attname = 'voter_phone' 
            AND attnum = ANY(conkey)
          )
          AND EXISTS (
            SELECT 1 FROM pg_attribute 
            WHERE attrelid = 'votes'::regclass 
            AND attname = 'phase' 
            AND attnum = ANY(conkey)
          )
          AND NOT EXISTS (
            SELECT 1 FROM pg_attribute 
            WHERE attrelid = 'votes'::regclass 
            AND attname = 'entry_id' 
            AND attnum = ANY(conkey)
          )
          AND NOT EXISTS (
            SELECT 1 FROM pg_attribute 
            WHERE attrelid = 'votes'::regclass 
            AND attname = 'points' 
            AND attnum = ANY(conkey)
          )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE votes DROP CONSTRAINT %I', constraint_rec.conname);
            RAISE NOTICE 'Dropped constraint: %', constraint_rec.conname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not drop constraint %: %', constraint_rec.conname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Method 3: List all unique constraints on votes table for debugging
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    RAISE NOTICE '=== Current unique constraints on votes table ===';
    FOR constraint_rec IN
        SELECT conname, conkey
        FROM pg_constraint
        WHERE conrelid = 'votes'::regclass
          AND contype = 'u'
    LOOP
        RAISE NOTICE 'Constraint: % (columns: %)', constraint_rec.conname, constraint_rec.conkey;
    END LOOP;
    RAISE NOTICE '=== End of constraints list ===';
END $$;

-- Ensure the correct constraint exists: UNIQUE(voter_phone, points, phase)
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'votes'::regclass
          AND contype = 'u'
          AND conname = 'votes_voter_phone_points_phase_key'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        RAISE NOTICE 'Creating votes_voter_phone_points_phase_key constraint...';
        BEGIN
            ALTER TABLE votes ADD CONSTRAINT votes_voter_phone_points_phase_key 
              UNIQUE(voter_phone, points, phase);
            RAISE NOTICE 'Successfully created votes_voter_phone_points_phase_key';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not create votes_voter_phone_points_phase_key: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Constraint votes_voter_phone_points_phase_key already exists';
    END IF;
END $$;
