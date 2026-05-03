-- ============================================================
-- 004_notifications.sql
-- 통합 알림: 묵례(bow) / 댓글 / 팔로우 / DM
-- triggers from reactions, comments, follows, messages.
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

-- ------------------------------------------------------------
-- RLS — 사용자는 자기 알림만 읽고/지움. INSERT는 trigger만 (no policy).
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------

-- bow (reaction)
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

-- comment
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

-- follow
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

-- message
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
