-- =============================================================
-- Migration: 00020_create_group_covers_bucket.sql
-- Description: Create the group-covers storage bucket with
--              public read access and admin-scoped write policies.
-- =============================================================

-- ----- Bucket Creation -----

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-covers',
  'group-covers',
  true,
  2097152,  -- 2 MB in bytes
  array['image/jpeg', 'image/png', 'image/webp']
);

-- ----- RLS Policies on storage.objects -----

-- Anyone (including anonymous visitors) can view group covers.
-- The bucket is public so direct URL access works, but this policy
-- is still required for the Storage API's list/download endpoints.
create policy group_covers_select_policy
  on storage.objects
  for select
  to public
  using (bucket_id = 'group-covers');

-- Group admins can upload a cover image into their group's folder.
-- Expected path: {groupId}/cover.{ext}
create policy group_covers_insert_policy
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'group-covers'
    and public.is_group_admin((storage.foldername(name))[1]::uuid)
  );

-- Group admins can overwrite their group's cover image (needed for upsert).
create policy group_covers_update_policy
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'group-covers'
    and public.is_group_admin((storage.foldername(name))[1]::uuid)
  );

-- Group admins can delete their group's cover image.
create policy group_covers_delete_policy
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'group-covers'
    and public.is_group_admin((storage.foldername(name))[1]::uuid)
  );
