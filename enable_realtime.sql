-- ========================================
-- הפעלת Realtime לטבלת entries
-- ========================================
-- העתק את כל הקוד הזה והדבק אותו ב-Supabase Dashboard → SQL Editor
-- לחץ Run (או Cmd/Ctrl + Enter)
-- ========================================

-- שלב 1: וודא שה-publication קיים (אם לא, צור אותו)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
    RAISE NOTICE 'Created supabase_realtime publication';
  ELSE
    RAISE NOTICE 'supabase_realtime publication already exists';
  END IF;
END $$;

-- שלב 2: הוסף את טבלת entries ל-publication (אם לא קיים)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.entries;
    RAISE NOTICE 'Added entries table to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'entries table already in supabase_realtime publication';
  END IF;
END $$;

-- שלב 3: הגדר replica identity ל-FULL (חשוב!)
-- זה מוודא שאנחנו מקבלים את כל הנתונים בעדכונים
ALTER TABLE public.entries
  REPLICA IDENTITY FULL;

-- שלב 4: בדיקה - האם הטבלה נוספה ל-publication?
-- אם הכל תקין, תראה שורה אחת עם: schemaname='public', tablename='entries'
SELECT 
  schemaname,
  tablename,
  '✅ Realtime enabled!' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'entries';

-- שלב 5: בדיקת Replica Identity
SELECT 
  schemaname,
  relname as table_name,
  CASE relreplident
    WHEN 'd' THEN 'DEFAULT (only primary key)'
    WHEN 'n' THEN 'NOTHING (no replication)'
    WHEN 'f' THEN 'FULL ✅ (all columns - recommended)'
    WHEN 'i' THEN 'INDEX (specific index)'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE relname = 'entries' AND nspname = 'public';

-- ========================================
-- אחרי שהרצת את הקוד:
-- 1. פתח את דף /live בדפדפן
-- 2. בדוק בקונסול: "✅ Successfully subscribed to real-time updates!"
-- 3. העלה תמונה ממכשיר אחר - אמור לראות עדכון מיידי!
-- ========================================
