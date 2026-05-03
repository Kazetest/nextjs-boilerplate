-- ============================================================
-- 003_messages.sql
-- 1:1 DM 기본 — 텍스트만, realtime 없이 폴링.
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

-- 양방향 대화 조회용: (작은쪽, 큰쪽, created_at desc)
create index if not exists messages_pair_idx on public.messages (
  least(sender_id, recipient_id),
  greatest(sender_id, recipient_id),
  created_at desc
);

-- unread count용 partial index
create index if not exists messages_recipient_unread_idx
  on public.messages (recipient_id)
  where read = false;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
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
    -- 차단 관계면 거부 (양방향)
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

-- ------------------------------------------------------------
-- 대화 스레드 목록 RPC
-- 각 1:1 페어별로 최신 메시지 1건 + 미읽음 수
-- ------------------------------------------------------------
create or replace function public.list_chat_threads()
returns table (
  other_id uuid,
  other_username text,
  other_display_name text,
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
