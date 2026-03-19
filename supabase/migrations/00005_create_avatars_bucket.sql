-- =============================================================
-- Migration: 00005_create_avatars_bucket.sql
-- Description: Create the avatars storage bucket with public
--              read access and owner-scoped write policies.
-- =============================================================

-- ----- Bucket Creation -----

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB in bytes
  array['image/jpeg', 'image/png', 'image/webp']
);

-- ----- RLS Policies on storage.objects -----

-- Anyone (including anonymous visitors) can view avatars.
-- The bucket is public so direct URL access works, but this policy
-- is still required for the Storage API's list/download endpoints.
create policy avatars_select_policy
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

-- Authenticated users can upload an avatar into their own folder.
-- Expected path: {user_id}/avatar.{ext}
create policy avatars_insert_policy
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Authenticated users can overwrite their own avatar (needed for upsert).
create policy avatars_update_policy
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Authenticated users can delete their own avatar.
create policy avatars_delete_policy
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
