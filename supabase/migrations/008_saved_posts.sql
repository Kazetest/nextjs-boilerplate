-- ============================================================
-- 008_saved_posts.sql
-- Private saved/bookmarked posts.
-- ============================================================

create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists saved_posts_user_recent_idx
  on public.saved_posts (user_id, created_at desc);

alter table public.saved_posts enable row level security;

drop policy if exists "saved posts select own" on public.saved_posts;
drop policy if exists "saved posts insert own" on public.saved_posts;
drop policy if exists "saved posts delete own" on public.saved_posts;
create policy "saved posts select own"
  on public.saved_posts for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "saved posts insert own"
  on public.saved_posts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy "saved posts delete own"
  on public.saved_posts for delete
  to authenticated
  using ((select auth.uid()) = user_id);
