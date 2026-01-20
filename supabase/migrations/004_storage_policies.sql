-- Storage Policies Migration
-- Creates Storage Policies for the 'costumes' bucket
-- These policies allow uploads via service role and public reads

-- Note: Storage bucket must be created manually in Supabase Dashboard first:
-- Storage → New bucket → name: "costumes" → Public bucket: ✅

-- Enable RLS on storage.objects (if not already enabled)
-- This is usually enabled by default, but we ensure it

-- Policy 1: Allow authenticated users to upload (actually we use service role)
-- But we'll also allow public uploads for the contest
CREATE POLICY IF NOT EXISTS "Allow public uploads to costumes bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'costumes' AND
  (storage.foldername(name))[1] IS NOT NULL
);

-- Policy 2: Allow public reads from costumes bucket
CREATE POLICY IF NOT EXISTS "Allow public reads from costumes bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'costumes');

-- Policy 3: Allow service role full access (this should work by default, but explicit is better)
-- Note: Service role bypasses RLS, so these policies are mainly for regular users

-- Alternative approach: If the above doesn't work, we can create a policy that allows uploads
-- based on file naming pattern (phone number format)
CREATE POLICY IF NOT EXISTS "Allow uploads with phone number pattern"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'costumes' AND
  name ~ '^[0-9]{10}-[0-9]+\.(jpg|jpeg|png|webp)$'
);

-- For service role access, it should bypass RLS entirely
-- But if issues persist, ensure the bucket exists and is configured correctly
