-- ============================================================
-- NOai 전체 DB 셋업 — Supabase SQL Editor에 통째로 붙여넣고 Run.
-- 모든 문장은 idempotent (if not exists / drop ... if exists). 여러 번 실행해도 안전.
--
-- 적용 순서:
--   schema.sql                  — profiles / posts / comments / follows / reactions / invites / handle_new_user trigger / storage
--   002_moderation.sql          — reports / blocks / user_strikes / hidden_by_reports + report_count + 트리거
--   003_messages.sql            — messages 1:1 DM + RLS + list_chat_threads RPC
--   004_notifications.sql       — notifications 통합 + reactions/comments/follows/messages 트리거
--   005_stories.sql             — 24시간 스토리 + 조회 이력 + storage bucket
--   006_profile_avatars.sql     — 프로필 아바타 storage bucket
--   007_chat_threads_avatar.sql — DM thread RPC avatar_url
--   008_saved_posts.sql         — private saved/bookmarked posts
--
-- 적용 후 noai.kr/debug 에서 모든 테이블 ✓ 확인.
-- ============================================================

-- ============================================================
-- schema.sql
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  image_path text not null,
  caption text not null,
  caption_keystrokes jsonb,
  exif_data jsonb,
  ai_score float,
  is_flagged boolean default false,
  origin_type text not null check (origin_type in ('original', 'inspired_by_user', 'overseas_meme')),
  origin_post_id uuid references public.posts(id) on delete set null,
  origin_creator_username text,
  origin_label text,
  view_count int default 0,
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  body text not null check (length(body) <= 140),
  keystrokes jsonb,
  created_at timestamptz default now()
);

create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

create table if not exists public.reactions (
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

create table if not exists public.invites (
  code text primary key,
  inviter_id uuid references public.profiles(id) on delete set null,
  invitee_email text,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists posts_author_idx on public.posts(author_id);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists posts_origin_idx on public.posts(origin_post_id) where origin_post_id is not null;
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.reactions enable row level security;
alter table public.invites enable row level security;

drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
create policy "profiles insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update" on public.profiles for update using (auth.uid() = id);

drop policy if exists "posts read" on public.posts;
drop policy if exists "posts insert" on public.posts;
drop policy if exists "posts update" on public.posts;
drop policy if exists "posts delete" on public.posts;
create policy "posts read" on public.posts for select using (true);
create policy "posts insert" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts update" on public.posts for update using (auth.uid() = author_id);
create policy "posts delete" on public.posts for delete using (auth.uid() = author_id);

drop policy if exists "comments read" on public.comments;
drop policy if exists "comments insert" on public.comments;
drop policy if exists "comments delete" on public.comments;
create policy "comments read" on public.comments for select using (true);
create policy "comments insert" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments delete" on public.comments for delete using (auth.uid() = author_id);

drop policy if exists "follows read" on public.follows;
drop policy if exists "follows insert" on public.follows;
drop policy if exists "follows delete" on public.follows;
create policy "follows read" on public.follows for select using (true);
create policy "follows insert" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows delete" on public.follows for delete using (auth.uid() = follower_id);

drop policy if exists "reactions read" on public.reactions;
drop policy if exists "reactions insert" on public.reactions;
drop policy if exists "reactions delete" on public.reactions;
create policy "reactions read" on public.reactions for select using (true);
create policy "reactions insert" on public.reactions for insert with check (auth.uid() = user_id);
create policy "reactions delete" on public.reactions for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'user_' || substr(new.id::text, 1, 8));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict do nothing;

drop policy if exists "posts storage read" on storage.objects;
drop policy if exists "posts storage upload" on storage.objects;
drop policy if exists "posts storage delete" on storage.objects;
create policy "posts storage read" on storage.objects for select using (bucket_id = 'posts');
create policy "posts storage upload" on storage.objects for insert with check (
  bucket_id = 'posts' and auth.role() = 'authenticated'
);
create policy "posts storage delete" on storage.objects for delete using (
  bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================
-- 002_moderation.sql
-- ============================================================

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references public.posts(id) on delete cascade not null,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null check (reason in ('ai_suspect', 'origin_missing', 'spam_hate', 'other')),
  detail text,
  created_at timestamptz default now(),
  unique (post_id, reporter_id)
);

create table if not exists public.blocks (
  blocker_id uuid references public.profiles(id) on delete cascade not null,
  blocked_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.user_strikes (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  block_count int default 0,
  report_count int default 0,
  last_struck_at timestamptz,
  is_suspended boolean default false
);

alter table public.posts add column if not exists report_count int default 0;
alter table public.posts add column if not exists hidden_by_reports boolean default false;

create index if not exists reports_post_idx on public.reports(post_id);
create index if not exists blocks_blocker_idx on public.blocks(blocker_id);
create index if not exists blocks_blocked_idx on public.blocks(blocked_id);

create or replace function public.handle_new_report()
returns trigger as $$
declare
  new_count int;
  post_author uuid;
begin
  update public.posts
  set report_count = report_count + 1,
      hidden_by_reports = (report_count + 1) >= 3
  where id = new.post_id
  returning report_count, author_id into new_count, post_author;

  if new_count >= 3 then
    insert into public.user_strikes (user_id, report_count, last_struck_at)
    values (post_author, 1, now())
    on conflict (user_id) do update
      set report_count = public.user_strikes.report_count + 1,
          last_struck_at = now();
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_report_created on public.reports;
create trigger on_report_created
after insert on public.reports
for each row execute procedure public.handle_new_report();

create or replace function public.handle_new_block()
returns trigger as $$
declare
  block_total int;
begin
  select count(*) into block_total from public.blocks where blocked_id = new.blocked_id;

  if block_total >= 3 then
    insert into public.user_strikes (user_id, block_count, last_struck_at)
    values (new.blocked_id, block_total, now())
    on conflict (user_id) do update
      set block_count = excluded.block_count,
          last_struck_at = now();
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_block_created on public.blocks;
create trigger on_block_created
after insert on public.blocks
for each row execute procedure public.handle_new_block();

alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.user_strikes enable row level security;

drop policy if exists "reports insert self" on public.reports;
drop policy if exists "reports read self" on public.reports;
create policy "reports insert self" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "reports read self" on public.reports
  for select using (auth.uid() = reporter_id);

drop policy if exists "blocks insert self" on public.blocks;
drop policy if exists "blocks delete self" on public.blocks;
drop policy if exists "blocks read self" on public.blocks;
create policy "blocks insert self" on public.blocks
  for insert with check (auth.uid() = blocker_id);
create policy "blocks delete self" on public.blocks
  for delete using (auth.uid() = blocker_id);
create policy "blocks read self" on public.blocks
  for select using (auth.uid() = blocker_id);

drop policy if exists "strikes read self" on public.user_strikes;
create policy "strikes read self" on public.user_strikes
  for select using (auth.uid() = user_id);

-- ============================================================
-- 003_messages.sql
-- ============================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint messages_self_check check (sender_id <> recipient_id)
);

create index if not exists messages_pair_idx on public.messages (
  least(sender_id, recipient_id),
  greatest(sender_id, recipient_id),
  created_at desc
);

create index if not exists messages_recipient_unread_idx
  on public.messages (recipient_id)
  where read = false;

alter table public.messages enable row level security;

drop policy if exists "messages_select_own_threads" on public.messages;
create policy "messages_select_own_threads"
  on public.messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "messages_insert_as_sender" on public.messages;
create policy "messages_insert_as_sender"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and sender_id <> recipient_id
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = recipient_id and b.blocked_id = sender_id)
         or (b.blocker_id = sender_id and b.blocked_id = recipient_id)
    )
  );

drop policy if exists "messages_update_mark_read" on public.messages;
create policy "messages_update_mark_read"
  on public.messages for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "messages_delete_own_sent" on public.messages;
create policy "messages_delete_own_sent"
  on public.messages for delete
  using (sender_id = auth.uid());

drop function if exists public.list_chat_threads();

create function public.list_chat_threads()
returns table (
  other_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_url text,
  last_message text,
  last_at timestamptz,
  last_from_me boolean,
  unread_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  pairs as (
    select
      case when sender_id = (select uid from me) then recipient_id else sender_id end as other_id,
      id, body, sender_id, recipient_id, read, created_at,
      row_number() over (
        partition by case when sender_id = (select uid from me) then recipient_id else sender_id end
        order by created_at desc
      ) as rn
    from public.messages
    where sender_id = (select uid from me) or recipient_id = (select uid from me)
  ),
  unread as (
    select sender_id as other_id, count(*) as cnt
    from public.messages
    where recipient_id = (select uid from me) and read = false
    group by sender_id
  )
  select
    p.other_id,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    p.body,
    p.created_at,
    (p.sender_id = (select uid from me)) as last_from_me,
    coalesce(u.cnt, 0) as unread_count
  from pairs p
  left join public.profiles pr on pr.id = p.other_id
  left join unread u on u.other_id = p.other_id
  where p.rn = 1
  order by p.created_at desc;
$$;

grant execute on function public.list_chat_threads() to authenticated;

-- ============================================================
-- 004_notifications.sql
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('bow','comment','follow','message')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_recent_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read = false;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete
  using (user_id = auth.uid());

create or replace function public.notify_on_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is null or post_author = new.user_id then return new; end if;
  insert into public.notifications(user_id, actor_id, kind, post_id)
    values (post_author, new.user_id, 'bow', new.post_id);
  return new;
end $$;

drop trigger if exists reactions_notify on public.reactions;
create trigger reactions_notify
  after insert on public.reactions
  for each row execute function public.notify_on_reaction();

create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is null or post_author = new.author_id then return new; end if;
  insert into public.notifications(user_id, actor_id, kind, post_id, comment_id)
    values (post_author, new.author_id, 'comment', new.post_id, new.id);
  return new;
end $$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.follower_id = new.following_id then return new; end if;
  insert into public.notifications(user_id, actor_id, kind)
    values (new.following_id, new.follower_id, 'follow');
  return new;
end $$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, actor_id, kind, message_id)
    values (new.recipient_id, new.sender_id, 'message', new.id);
  return new;
end $$;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- ============================================================
-- 005_stories.sql
-- ============================================================

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

-- ============================================================
-- 006_profile_avatars.sql
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

-- ============================================================
-- 008_saved_posts.sql
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

-- ============================================================
-- 끝. noai.kr/debug 에서 모든 테이블 ✓ 확인 후 OAuth 동선 검증.
-- ============================================================
