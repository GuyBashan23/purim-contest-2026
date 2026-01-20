-- Enable Realtime for entries table
-- This allows the Live Wall to receive real-time updates when new photos are uploaded
-- Run this in Supabase Dashboard → SQL Editor

-- Add entries table to supabase_realtime publication
-- This enables real-time subscriptions for INSERT, UPDATE, DELETE events
ALTER PUBLICATION supabase_realtime
  ADD TABLE public.entries;

-- Set replica identity to FULL (optional but recommended)
-- This ensures we receive complete row data in UPDATE/DELETE events
-- For INSERT events, this is not strictly necessary but good practice
ALTER TABLE public.entries
  REPLICA IDENTITY FULL;

-- Verify the table is added (this will show in the results)
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'entries';

-- Expected result: Should return one row with schemaname='public', tablename='entries'
