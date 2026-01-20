# Vercel Deployment Guide - J&J Purim Contest App

## ✅ Pre-Deployment Status

**Build Status:** The build will show errors during local build due to missing environment variables. This is **NORMAL** and expected. The app will work correctly once environment variables are configured in Vercel.

## 📋 Environment Variables Checklist

Copy these **exact** variables from your `.env.local` to Vercel:

### Required Variables:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Your Supabase project URL
   - Format: `https://xxxxx.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Your Supabase anonymous/public key
   - Found in: Supabase Dashboard → Settings → API

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Your Supabase service role key (for admin operations)
   - ⚠️ **Keep this secret!** Never expose in client-side code
   - Found in: Supabase Dashboard → Settings → API

4. **ADMIN_PASSWORD**
   - Password for admin dashboard access
   - Choose a strong password

## 🚀 Deployment Steps

### Option 1: Vercel CLI (Recommended - Fastest)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project directory**:
   ```bash
   cd "/Users/tagbox-mini/Library/CloudStorage/OneDrive-טאגבוקס/Dev Projects/PURIM 3.1"
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project? → **No** (first time) or **Yes** (updates)
   - Project name? → `purim-contest` (or your choice)
   - Directory? → `./` (current directory)
   - Override settings? → **No**

5. **Add Environment Variables**:
   After initial deployment, add your environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add ADMIN_PASSWORD
   ```
   
   Or add them via Vercel Dashboard:
   - Go to your project → Settings → Environment Variables
   - Add each variable for **Production**, **Preview**, and **Development**

6. **Redeploy** (to apply env vars):
   ```bash
   vercel --prod
   ```

### Option 2: Git Integration (Recommended for CI/CD)

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Go to [vercel.com](https://vercel.com)** and sign in

3. **Click "Add New Project"**

4. **Import your repository**

5. **Configure Project**:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

6. **Add Environment Variables**:
   - Before deploying, click "Environment Variables"
   - Add all 4 variables listed above
   - Select environments: Production, Preview, Development

7. **Click "Deploy"**

## ✅ Post-Deployment Verification Checklist

Once your app is live, verify these:

### 1. **Homepage Loads**
   - Visit your Vercel URL (e.g., `https://purim-contest.vercel.app`)
   - Should see J&J branding and upload form

### 2. **Supabase Connection**
   - Try uploading a test image
   - Check Supabase Dashboard → Storage → `costumes` bucket
   - Image should appear there

### 3. **Database Access**
   - Check Supabase Dashboard → Table Editor
   - Verify `entries` table is accessible
   - Test entry should appear after upload

### 4. **Admin Dashboard**
   - Visit `/admin`
   - Enter admin password
   - Should see phase control buttons

### 5. **Real-time Updates**
   - Open two browser windows
   - Upload entry in one window
   - Should see update in real-time (if using real-time features)

### 6. **Storage Bucket Permissions**
   - Verify `costumes` bucket is **public** for reads
   - In Supabase: Storage → Policies → `costumes`
   - Should have: "Public Access" enabled

## 🔧 Troubleshooting

### Build Errors in Vercel

**Error:** "Your project's URL and Key are required"
- **Solution:** Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel environment variables

**Error:** "Module not found" or import errors
- **Solution:** Ensure `package.json` has all dependencies and run `npm install` locally first

### Runtime Errors

**Error:** Images not loading
- **Solution:** Check Supabase Storage bucket permissions (must be public)
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct

**Error:** Admin actions not working
- **Solution:** Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check `ADMIN_PASSWORD` matches what you're entering

### Supabase Setup Reminders

Before deploying, ensure:

1. ✅ Database migration has been run (`supabase/migrations/001_initial_schema.sql`)
2. ✅ Storage bucket `costumes` exists and is public
3. ✅ RLS policies are enabled
4. ✅ Initial `contest_state` row exists (created by migration)

## 📝 Quick Command Reference

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (first time)
vercel

# Deploy to production
vercel --prod

# View deployments
vercel ls

# View logs
vercel logs
```

## 🎯 Expected Deployment Time

- **First deployment:** 2-3 minutes
- **Subsequent updates:** 1-2 minutes
- **With environment variables:** Add 1 minute for configuration

---

**Ready to deploy?** Run `vercel` now! 🚀
