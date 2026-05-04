-- ============================================================
-- 006_profile_avatars.sql
-- Public profile avatar uploads.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

drop policy if exists "avatars storage read" on storage.objects;
drop policy if exists "avatars storage upload" on storage.objects;
drop policy if exists "avatars storage delete" on storage.objects;
create policy "avatars storage read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars storage upload" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "avatars storage delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
