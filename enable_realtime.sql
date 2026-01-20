-- ========================================
-- הפעלת Realtime לטבלת entries
-- ========================================
-- העתק את כל הקוד הזה והדבק אותו ב-Supabase Dashboard → SQL Editor
-- לחץ Run (או Cmd/Ctrl + Enter)
-- ========================================

-- הוסף את טבלת entries ל-publication של Realtime
-- זה מאפשר לעדכונים בזמן אמת להגיע ל-Live Wall
ALTER PUBLICATION supabase_realtime
  ADD TABLE public.entries;

-- הגדר replica identity ל-FULL (מומלץ)
-- זה מוודא שאנחנו מקבלים את כל הנתונים בעדכונים
ALTER TABLE public.entries
  REPLICA IDENTITY FULL;

-- בדיקה: האם הטבלה נוספה ל-publication?
-- אם הכל תקין, תראה שורה אחת עם: schemaname='public', tablename='entries'
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'entries';

-- ========================================
-- אחרי שהרצת את הקוד:
-- 1. פתח את דף /live בדפדפן
-- 2. בדוק בקונסול: "✅ Successfully subscribed to real-time updates!"
-- 3. העלה תמונה ממכשיר אחר - אמור לראות עדכון מיידי!
-- ========================================
