-- Delete one sent cloud and its dependent records.
-- Safe to run multiple times.

create or replace function public.delete_my_crush_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_user_id uuid;
begin
  select sender_user_id
    into v_sender_user_id
  from public.crush_posts
  where id = p_post_id;

  if v_sender_user_id is null then
    raise exception 'cloud_not_found';
  end if;

  if v_sender_user_id <> auth.uid() then
    raise exception 'not_allowed';
  end if;

  delete from public.chat_messages
  where chat_room_id in (
    select id
    from public.chat_rooms
    where crush_post_id = p_post_id
  );

  delete from public.chat_rooms
  where crush_post_id = p_post_id;

  delete from public.sender_cloud_check_picks
  where crush_post_id = p_post_id;

  delete from public.cloud_views
  where crush_post_id = p_post_id;

  delete from public.claims
  where crush_post_id = p_post_id;

  delete from public.crush_posts
  where id = p_post_id
    and sender_user_id = auth.uid();
end;
$$;

revoke all on function public.delete_my_crush_post(uuid) from public;
grant execute on function public.delete_my_crush_post(uuid) to authenticated;
