-- Security Fixes Migration
-- Addresses critical RLS policy vulnerabilities

-- 1. Note: entries_insert and votes_insert policies remain permissive
-- because this is a public contest. Security is enforced via:
--   - Server-side validation in app/actions/contest.ts
--   - Database constraints (UNIQUE, CHECK, FOREIGN KEY)
--   - Database triggers (prevent_self_vote)
--
-- The policies are kept as-is because:
--   - Entries: Public contest, anyone can submit (server validates uniqueness)
--   - Votes: Public contest, anyone can vote (server validates all rules)
-- -- If you want to restrict to authenticated users only, change these policies:
-- CREATE POLICY "entries_insert" ON entries FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Add UPDATE policy for entries (admin-only via service role, no direct RLS)
-- Regular users should NOT be able to update entries
-- This is handled by service role client in admin actions
-- We explicitly deny UPDATE to prevent accidental exposure
CREATE POLICY "entries_update_deny" ON entries
  FOR UPDATE
  USING (false);  -- Deny all updates via RLS (admin uses service role)

-- 5. Add DELETE policy for entries (admin-only)
CREATE POLICY "entries_delete_deny" ON entries
  FOR DELETE
  USING (false);  -- Deny all deletes via RLS (admin uses service role)

-- 6. Add UPDATE policy for votes (deny - votes should be immutable)
CREATE POLICY "votes_update_deny" ON votes
  FOR UPDATE
  USING (false);  -- Votes are immutable

-- 7. Add DELETE policy for votes (admin-only)
CREATE POLICY "votes_delete_deny" ON votes
  FOR DELETE
  USING (false);  -- Deny all deletes via RLS (admin uses service role)

-- 8. Add function to validate vote points server-side (defense in depth)
CREATE OR REPLACE FUNCTION validate_vote_points(points INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN points IN (1, 8, 10, 12);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Add trigger to prevent self-voting (defense in depth)
-- This checks if voter_phone matches the entry owner's phone
CREATE OR REPLACE FUNCTION prevent_self_vote()
RETURNS TRIGGER AS $$
DECLARE
  entry_phone TEXT;
BEGIN
  -- Get the phone number of the entry owner
  SELECT phone INTO entry_phone
  FROM entries
  WHERE id = NEW.entry_id;

  -- Prevent self-voting
  IF entry_phone = NEW.voter_phone THEN
    RAISE EXCEPTION 'Cannot vote for your own entry';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_prevent_self_vote ON votes;
CREATE TRIGGER trigger_prevent_self_vote
  BEFORE INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_vote();

-- 10. Add function to check if voting phase is active
-- This will be called from server-side code, but we add it here for reference
CREATE OR REPLACE FUNCTION is_voting_phase_active()
RETURNS BOOLEAN AS $$
DECLARE
  current_phase TEXT;
BEGIN
  SELECT current_phase INTO current_phase
  FROM app_settings
  LIMIT 1;

  RETURN current_phase IN ('VOTING', 'FINALS');
END;
$$ LANGUAGE plpgsql STABLE;

-- Note: The actual phase check should be done in server-side code
-- because we need to check app_settings, not contest_state
-- This function is provided for potential future use
