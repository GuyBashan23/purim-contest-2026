# Migration Instructions

## Running the Database Migration

The app requires the `app_settings` table to be created in your Supabase database. Follow these steps:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/002_app_settings.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify the table was created by checking the **Table Editor** - you should see `app_settings` table

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're in the project root
cd /path/to/PURIM-3.1

# Link to your Supabase project (if not already linked)
supabase link --project-ref jqmrfuoszvmjsrgjzdlf

# Run the migration
supabase db push
```

### Verification

After running the migration, you should:

1. See the `app_settings` table in your Supabase dashboard
2. The table should have one row with:
   - `current_phase`: 'UPLOAD'
   - `voting_start_time`: null
3. The console errors about `app_settings` 404 should disappear
4. The app will now use Supabase for phase management instead of the fallback

### Troubleshooting

**If you see 404 errors:**
- The migration hasn't been run yet
- The app will automatically fall back to using `TARGET_DATE` from `lib/config.ts`
- This is fine for development, but you should run the migration for production

**If you see permission errors:**
- Make sure RLS (Row Level Security) policies are set correctly
- The migration includes policies for public read access
- Admin writes use the service role key (server-side only)

### Initial Setup

After running the migration, you can set the initial phase via the admin dashboard:

1. Navigate to `/admin/dashboard`
2. Enter your admin password
3. Use the phase control buttons to manage the contest
