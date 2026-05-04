-- NOai schema v0.1
-- Supabase SQL Editor에서 통째로 실행

create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

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

create table if not exists public.stories (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  image_path text not null,
  caption text check (caption is null or char_length(caption) <= 180),
  caption_keystrokes jsonb,
  exif_data jsonb,
  ai_score float,
  hidden_by_reports boolean default false,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours') not null
);

create table if not exists public.story_views (
  story_id uuid references public.stories(id) on delete cascade not null,
  viewer_id uuid references public.profiles(id) on delete cascade not null,
  viewed_at timestamptz default now(),
  primary key (story_id, viewer_id)
);

create table if not exists public.saved_posts (
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- ============================================
-- INDEXES
-- ============================================

create index if not exists posts_author_idx on public.posts(author_id);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists posts_origin_idx on public.posts(origin_post_id) where origin_post_id is not null;
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists stories_active_idx on public.stories(expires_at desc, created_at desc) where hidden_by_reports = false;
create index if not exists stories_author_active_idx on public.stories(author_id, expires_at desc, created_at desc) where hidden_by_reports = false;
create index if not exists saved_posts_user_recent_idx on public.saved_posts(user_id, created_at desc);

-- ============================================
-- RLS
-- ============================================

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.reactions enable row level security;
alter table public.invites enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.saved_posts enable row level security;

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

drop policy if exists "stories read active" on public.stories;
drop policy if exists "stories insert own" on public.stories;
drop policy if exists "stories update own" on public.stories;
drop policy if exists "stories delete own" on public.stories;
create policy "stories read active" on public.stories for select using (hidden_by_reports = false and expires_at > now());
create policy "stories insert own" on public.stories for insert with check (auth.uid() = author_id);
create policy "stories update own" on public.stories for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "stories delete own" on public.stories for delete using (auth.uid() = author_id);

drop policy if exists "story views insert own" on public.story_views;
drop policy if exists "story views update own" on public.story_views;
drop policy if exists "story views read own_or_author" on public.story_views;
create policy "story views insert own" on public.story_views for insert with check (auth.uid() = viewer_id);
create policy "story views update own" on public.story_views for update using (auth.uid() = viewer_id) with check (auth.uid() = viewer_id);
create policy "story views read own_or_author" on public.story_views for select using (
  auth.uid() = viewer_id
  or exists (
    select 1 from public.stories s
    where s.id = story_id and s.author_id = auth.uid()
  )
);

drop policy if exists "saved posts select own" on public.saved_posts;
drop policy if exists "saved posts insert own" on public.saved_posts;
drop policy if exists "saved posts delete own" on public.saved_posts;
create policy "saved posts select own" on public.saved_posts for select using (auth.uid() = user_id);
create policy "saved posts insert own" on public.saved_posts for insert with check (auth.uid() = user_id);
create policy "saved posts delete own" on public.saved_posts for delete using (auth.uid() = user_id);

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================

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

-- ============================================
-- STORAGE
-- ============================================

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

insert into storage.buckets (id, name, public)
values ('stories', 'stories', true)
on conflict do nothing;

drop policy if exists "stories storage read" on storage.objects;
drop policy if exists "stories storage upload" on storage.objects;
drop policy if exists "stories storage delete" on storage.objects;
create policy "stories storage read" on storage.objects for select using (bucket_id = 'stories');
create policy "stories storage upload" on storage.objects for insert with check (
  bucket_id = 'stories' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "stories storage delete" on storage.objects for delete using (
  bucket_id = 'stories' and auth.uid()::text = (storage.foldername(name))[1]
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

drop policy if exists "avatars storage read" on storage.objects;
drop policy if exists "avatars storage upload" on storage.objects;
drop policy if exists "avatars storage delete" on storage.objects;
create policy "avatars storage read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars storage upload" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "avatars storage delete" on storage.objects for delete using (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
