# ⚠️ URGENT: Apply Profile Avatars Storage Bucket Migration

## Error

```text
POST https://swfnnrpzpkdypbrzmgnr.supabase.co/storage/v1/object/profile-avatars/... 400 (Bad Request)
❌ Upload error: StorageApiError: Bucket not found
```

## Solution

The `profile-avatars` storage bucket doesn't exist yet. You need to create it manually.

## 📋 Instructions (2 Steps)

### Step 1: Create the Bucket via SQL

1. Go to Supabase Dashboard: `https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr`
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste this SQL:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
```

5. Click **Run** (or press Ctrl+Enter)

### Step 2: Create Storage Policies via Dashboard

Since policies require special permissions, you need to create them in the UI:

1. Go to **Storage** → **profile-avatars** bucket
2. Click on **Policies** tab
3. Click **New Policy**
4. Create these 4 policies:

#### Policy 1: Public Read Access

- **Policy Name**: `Public Access for Profile Avatars`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **USING expression**:

```sql
bucket_id = 'profile-avatars'
```

#### Policy 2: Users Can Upload

- **Policy Name**: `Users can upload own avatar`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:

```sql
bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text
```

#### Policy 3: Users Can Update

- **Policy Name**: `Users can update own avatar`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**:

```sql
bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text
```

#### Policy 4: Users Can Delete

- **Policy Name**: `Users can delete own avatar`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:

```sql
bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text
```

## ✅ Verification

After applying both steps, test by:

1. Go to Profile page in your app
2. Click on your avatar
3. Try uploading a photo
4. Should upload successfully now

## 📁 What This Creates

- ✅ Storage bucket `profile-avatars` (public read, 5MB limit)
- ✅ RLS policy: Public can view avatars
- ✅ RLS policy: Users can upload their own avatar
- ✅ RLS policy: Users can update their own avatar
- ✅ RLS policy: Users can delete their own avatar

## Storage Structure

```text
profile-avatars/
  └── {user_id}/
      └── avatar_{timestamp}.png
```

Each user can only access their own folder.

## 🔍 Troubleshooting

If you still get errors:

1. Verify bucket exists: Go to Storage tab, should see `profile-avatars`
2. Verify policies: Click on bucket → Policies tab, should see 4 policies
3. Check browser console for specific error messages
4. Try refreshing the page after creating policies
