-- NOai 002: moderation (reports, blocks, strikes)
-- Supabase SQL Editor에서 통째로 실행

-- ============================================
-- TABLES
-- ============================================

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

-- posts에 모더레이션 컬럼
alter table public.posts add column if not exists report_count int default 0;
alter table public.posts add column if not exists hidden_by_reports boolean default false;

-- ============================================
-- INDEXES
-- ============================================

create index if not exists reports_post_idx on public.reports(post_id);
create index if not exists blocks_blocker_idx on public.blocks(blocker_id);
create index if not exists blocks_blocked_idx on public.blocks(blocked_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- report 누적 시 posts.report_count 증가, 3회 시 자동 숨김
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

  -- 게시물 작성자에게도 strike 누적
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

-- block 누적 시 blocked 사용자에게 strike
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

-- ============================================
-- RLS
-- ============================================

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
