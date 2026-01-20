# הוראות הגדרה - Purim Contest App

## ✅ שלב 1: יצירת קובץ .env.local

צור קובץ `.env.local` בתיקיית הפרויקט עם התוכן הבא:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jqmrfuoszvmjsrgjzdlf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbXJmdW9zenZtanNyZ2p6ZGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjgzOTgsImV4cCI6MjA4NDUwNDM5OH0.PxuGTdR8SnqaMKhLMqTv65zz3UR49BpcksG9Pl9P1KA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbXJmdW9zenZtanNyZ2p6ZGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODkyODM5OCwiZXhwIjoyMDg0NTA0Mzk4fQ.2L_abdhlQhhrTCh0hjYaC0flKTMAcpZIe_z-ogc67Zk
ADMIN_PASSWORD=purim2026
```

## ✅ שלב 2: הרצת המיגרציה ב-Supabase

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard/project/jqmrfuoszvmjsrgjzdlf)
2. לחץ על **SQL Editor** בתפריט השמאלי
3. לחץ על **New Query**
4. העתק את כל התוכן מהקובץ `supabase/migrations/001_initial_schema.sql`
5. הדבק ב-SQL Editor
6. לחץ **Run** (או Ctrl/Cmd + Enter)

## ✅ שלב 3: יצירת Storage Bucket

1. ב-Supabase Dashboard, לחץ על **Storage** בתפריט השמאלי
2. לחץ על **New bucket**
3. שם ה-bucket: `costumes`
4. סמן ✅ **Public bucket** (חשוב מאוד!)
5. לחץ **Create bucket**

## ✅ שלב 4: בדיקת החיבור

הרץ את הפקודה הבאה כדי לבדוק שהכל עובד:

```bash
npm run dev
```

ואז פתח בדפדפן: `http://localhost:3000`

## 📝 הערות חשובות

- **סיסמת Admin:** `purim2026` (ניתן לשנות ב-`.env.local`)
- **Project Name:** purim 3.3
- **Project URL:** https://jqmrfuoszvmjsrgjzdlf.supabase.co

## 🚀 לאחר ההגדרה

לאחר שסיימת את כל השלבים:
1. האפליקציה תהיה זמינה ב-`http://localhost:3000`
2. תוכל לפרוס ל-Vercel לפי ההוראות ב-`DEPLOYMENT.md`
