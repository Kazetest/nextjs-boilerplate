-- ============================================================
-- 005_stories.sql
-- 24h stories: active human moments + seen state.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  image_path text not null,
  caption text check (caption is null or char_length(caption) <= 180),
  caption_keystrokes jsonb,
  exif_data jsonb,
  ai_score float,
  hidden_by_reports boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create index if not exists stories_active_idx
  on public.stories (expires_at desc, created_at desc)
  where hidden_by_reports = false;

create index if not exists stories_author_active_idx
  on public.stories (author_id, expires_at desc, created_at desc)
  where hidden_by_reports = false;

create index if not exists story_views_viewer_idx
  on public.story_views (viewer_id, viewed_at desc);

alter table public.stories enable row level security;
alter table public.story_views enable row level security;

drop policy if exists "stories read active" on public.stories;
create policy "stories read active"
  on public.stories for select
  to authenticated
  using (hidden_by_reports = false and expires_at > now());

drop policy if exists "stories insert own" on public.stories;
create policy "stories insert own"
  on public.stories for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

drop policy if exists "stories update own" on public.stories;
create policy "stories update own"
  on public.stories for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

drop policy if exists "stories delete own" on public.stories;
create policy "stories delete own"
  on public.stories for delete
  to authenticated
  using ((select auth.uid()) = author_id);

drop policy if exists "story views insert own" on public.story_views;
create policy "story views insert own"
  on public.story_views for insert
  to authenticated
  with check ((select auth.uid()) = viewer_id);

drop policy if exists "story views update own" on public.story_views;
create policy "story views update own"
  on public.story_views for update
  to authenticated
  using ((select auth.uid()) = viewer_id)
  with check ((select auth.uid()) = viewer_id);

drop policy if exists "story views read own_or_author" on public.story_views;
create policy "story views read own_or_author"
  on public.story_views for select
  to authenticated
  using (
    (select auth.uid()) = viewer_id
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.author_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public)
values ('stories', 'stories', true)
on conflict do nothing;

drop policy if exists "stories storage read" on storage.objects;
drop policy if exists "stories storage upload" on storage.objects;
drop policy if exists "stories storage delete" on storage.objects;
create policy "stories storage read" on storage.objects
  for select using (bucket_id = 'stories');
create policy "stories storage upload" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'stories'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
create policy "stories storage delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'stories'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
