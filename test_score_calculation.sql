-- Test score calculation
-- Run this to check if scores are being calculated correctly

-- Check current votes and scores
SELECT 
  e.id,
  e.costume_title,
  e.total_score as current_score_in_db,
  COUNT(v.id) as vote_count,
  COALESCE(SUM(v.points), 0) as calculated_score,
  CASE 
    WHEN e.total_score != COALESCE(SUM(v.points), 0) THEN '❌ MISMATCH'
    ELSE '✅ OK'
  END as status
FROM entries e
LEFT JOIN votes v ON v.entry_id = e.id
GROUP BY e.id, e.costume_title, e.total_score
ORDER BY e.total_score DESC
LIMIT 10;

-- Check all votes for a specific entry (replace with actual entry_id)
-- SELECT 
--   v.id,
--   v.voter_phone,
--   v.points,
--   v.phase,
--   v.created_at
-- FROM votes v
-- WHERE v.entry_id = 'YOUR_ENTRY_ID_HERE'
-- ORDER BY v.created_at DESC;
