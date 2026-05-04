-- ============================================================
-- 007_chat_threads_avatar.sql
-- Include profile avatar in DM thread list RPC.
-- ============================================================

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
