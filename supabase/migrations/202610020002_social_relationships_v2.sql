create table if not exists public.mutual_relationships (
  id uuid primary key default gen_random_uuid(),
  character_one_id uuid not null references public.characters(id) on delete cascade,
  character_two_id uuid not null references public.characters(id) on delete cascade,
  status text not null check (status in ('acquaintance', 'friend', 'close_friend', 'dating', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_reason text check (ended_reason in ('manual', 'death')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (character_one_id < character_two_id)
);

create unique index if not exists mutual_relationships_pair_active_idx
on public.mutual_relationships(character_one_id, character_two_id)
where ended_at is null;

create table if not exists public.social_requests (
  id uuid primary key default gen_random_uuid(),
  source_character_id uuid not null references public.characters(id) on delete cascade,
  target_character_id uuid not null references public.characters(id) on delete cascade,
  type text not null check (type in ('friend', 'close_friend', 'dating')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (source_character_id <> target_character_id)
);

create unique index if not exists social_requests_unique_pending_idx
on public.social_requests(source_character_id, target_character_id, type)
where status = 'pending';

create table if not exists public.relationship_history_events (
  id uuid primary key default gen_random_uuid(),
  character_one_id uuid not null references public.characters(id) on delete cascade,
  character_two_id uuid not null references public.characters(id) on delete cascade,
  event_type text not null,
  summary text not null,
  created_at timestamptz not null default now(),
  check (character_one_id < character_two_id)
);

create index if not exists relationship_history_pair_idx
on public.relationship_history_events(character_one_id, character_two_id, created_at desc);

create unique index if not exists relationship_history_first_met_unique_idx
on public.relationship_history_events(character_one_id, character_two_id, event_type)
where event_type = 'first_met';

create table if not exists public.social_notifications (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  kind text not null,
  body text not null,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists social_notifications_character_unread_idx
on public.social_notifications(character_id, read_at, created_at desc);

create table if not exists public.character_blocks (
  blocker_character_id uuid not null references public.characters(id) on delete cascade,
  blocked_character_id uuid not null references public.characters(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_character_id, blocked_character_id),
  check (blocker_character_id <> blocked_character_id)
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_character_id uuid not null references public.characters(id) on delete cascade,
  target_type text not null check (target_type in ('character', 'direct_message', 'forum_post')),
  target_id uuid not null,
  reason text not null check (reason in ('harassment', 'spam', 'inappropriate_content', 'impersonation', 'other')),
  details text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists content_reports_reporter_idx
on public.content_reports(reporter_character_id, created_at desc);

create table if not exists public.social_privacy_settings (
  character_id uuid primary key references public.characters(id) on delete cascade,
  dm_policy text not null default 'everyone' check (dm_policy in ('everyone', 'friends', 'nobody')),
  interaction_policy text not null default 'everyone' check (interaction_policy in ('everyone', 'friends', 'nobody')),
  romantic_request_policy text not null default 'eligible' check (romantic_request_policy in ('eligible', 'friends', 'nobody')),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_relationship_credits (
  source_character_id uuid not null references public.characters(id) on delete cascade,
  target_character_id uuid not null references public.characters(id) on delete cascade,
  credit_date date not null,
  created_at timestamptz not null default now(),
  primary key (source_character_id, target_character_id, credit_date)
);

drop trigger if exists mutual_relationships_set_updated_at on public.mutual_relationships;
create trigger mutual_relationships_set_updated_at
before update on public.mutual_relationships
for each row execute function public.set_updated_at();

drop trigger if exists privacy_set_updated_at on public.social_privacy_settings;
create trigger privacy_set_updated_at
before update on public.social_privacy_settings
for each row execute function public.set_updated_at();

alter table public.mutual_relationships enable row level security;
alter table public.social_requests enable row level security;
alter table public.relationship_history_events enable row level security;
alter table public.social_notifications enable row level security;
alter table public.character_blocks enable row level security;
alter table public.content_reports enable row level security;
alter table public.social_privacy_settings enable row level security;
alter table public.message_relationship_credits enable row level security;

create or replace function public.ordered_pair(a uuid, b uuid, out first_id uuid, out second_id uuid)
language plpgsql
immutable
as $$
begin
  if a < b then
    first_id := a;
    second_id := b;
  else
    first_id := b;
    second_id := a;
  end if;
end;
$$;

create or replace function public.are_mutual_status(a uuid, b uuid, wanted_status text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mutual_relationships mr
    where mr.character_one_id = least(a, b)
      and mr.character_two_id = greatest(a, b)
      and mr.status = wanted_status
      and mr.ended_at is null
  );
$$;

create or replace function public.are_friends_or_better(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mutual_relationships mr
    where mr.character_one_id = least(a, b)
      and mr.character_two_id = greatest(a, b)
      and mr.status in ('friend', 'close_friend', 'dating')
      and mr.ended_at is null
  );
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.character_blocks cb
    where (cb.blocker_character_id = a and cb.blocked_character_id = b)
       or (cb.blocker_character_id = b and cb.blocked_character_id = a)
  );
$$;

create or replace function public.create_social_notification(target_character_id uuid, notification_kind text, notification_body text, link_path text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.social_notifications(character_id, kind, body, link_path)
  values (target_character_id, notification_kind, notification_body, link_path);
end;
$$;

create or replace function public.ensure_acquaintance(a uuid, b uuid, summary text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if a = b then
    return;
  end if;

  insert into public.mutual_relationships(character_one_id, character_two_id, status)
  values (least(a, b), greatest(a, b), 'acquaintance')
  on conflict (character_one_id, character_two_id) where ended_at is null
  do nothing;

  insert into public.relationship_history_events(character_one_id, character_two_id, event_type, summary)
  values (least(a, b), greatest(a, b), 'first_met', summary)
  on conflict do nothing;
end;
$$;

drop policy if exists "mutual relationships involved read" on public.mutual_relationships;
create policy "mutual relationships involved read"
on public.mutual_relationships for select
to authenticated
using (public.owns_character(character_one_id) or public.owns_character(character_two_id));

drop policy if exists "social requests involved read" on public.social_requests;
create policy "social requests involved read"
on public.social_requests for select
to authenticated
using (public.owns_character(source_character_id) or public.owns_character(target_character_id));

drop policy if exists "relationship history involved read" on public.relationship_history_events;
create policy "relationship history involved read"
on public.relationship_history_events for select
to authenticated
using (public.owns_character(character_one_id) or public.owns_character(character_two_id));

drop policy if exists "notifications owner read" on public.social_notifications;
create policy "notifications owner read"
on public.social_notifications for select
to authenticated
using (public.owns_character(character_id));

drop policy if exists "notifications owner update" on public.social_notifications;
create policy "notifications owner update"
on public.social_notifications for update
to authenticated
using (public.owns_character(character_id))
with check (public.owns_character(character_id));

drop policy if exists "blocks owner read" on public.character_blocks;
create policy "blocks owner read"
on public.character_blocks for select
to authenticated
using (public.owns_character(blocker_character_id));

drop policy if exists "reports reporter insert" on public.content_reports;
create policy "reports reporter insert"
on public.content_reports for insert
to authenticated
with check (public.owns_character(reporter_character_id));

drop policy if exists "privacy public read" on public.social_privacy_settings;
create policy "privacy public read"
on public.social_privacy_settings for select
to authenticated
using (true);

drop policy if exists "privacy owner write" on public.social_privacy_settings;
create policy "privacy owner write"
on public.social_privacy_settings for all
to authenticated
using (public.owns_character(character_id))
with check (public.owns_character(character_id));

create or replace function public.can_send_dm(source_character_id uuid, target_character_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  policy text;
begin
  if public.is_blocked_between(source_character_id, target_character_id) then
    return false;
  end if;

  select coalesce(dm_policy, 'everyone') into policy
  from public.social_privacy_settings
  where character_id = target_character_id;

  policy := coalesce(policy, 'everyone');

  return policy = 'everyone'
    or (policy = 'friends' and public.are_friends_or_better(source_character_id, target_character_id));
end;
$$;

drop policy if exists "direct messages participant update read state" on public.direct_messages;

create or replace function public.mark_conversation_read(conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_character_id uuid;
begin
  select c.id into my_character_id
  from public.characters c
  join public.conversation_participants cp on cp.character_id = c.id
  where c.owner_user_id = auth.uid()
    and cp.conversation_id = mark_conversation_read.conversation_id
  limit 1;

  if my_character_id is null then
    raise exception 'Not a conversation participant.';
  end if;

  update public.direct_messages
  set read_at = now()
  where direct_messages.conversation_id = mark_conversation_read.conversation_id
    and sender_character_id <> my_character_id
    and read_at is null;
end;
$$;

create or replace function public.can_send_interaction(source_character_id uuid, target_character_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  policy text;
begin
  if public.is_blocked_between(source_character_id, target_character_id) then
    return false;
  end if;

  select coalesce(interaction_policy, 'everyone') into policy
  from public.social_privacy_settings
  where character_id = target_character_id;

  policy := coalesce(policy, 'everyone');

  return policy = 'everyone'
    or (policy = 'friends' and public.are_friends_or_better(source_character_id, target_character_id));
end;
$$;

create or replace function public.can_send_romantic_request(source_character_id uuid, target_character_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  policy text;
  source_birth int;
  target_birth int;
begin
  if public.is_blocked_between(source_character_id, target_character_id) then
    return false;
  end if;

  select coalesce(romantic_request_policy, 'eligible') into policy
  from public.social_privacy_settings
  where character_id = target_character_id;

  policy := coalesce(policy, 'eligible');

  if policy = 'nobody' then
    return false;
  end if;

  if policy = 'friends' and not public.are_friends_or_better(source_character_id, target_character_id) then
    return false;
  end if;

  select birth_year into source_birth from public.characters where id = source_character_id;
  select birth_year into target_birth from public.characters where id = target_character_id;

  -- V1 has no server-authoritative fictional game clock yet. Because characters
  -- begin as teens, enforce conservative fictional birth-year compatibility.
  if abs(source_birth - target_birth) > 2 then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.apply_relationship_decay(source_character_id uuid, target_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  last_interaction timestamptz;
  active_status text;
  decay_amount int := 1;
begin
  select max(created_at) into last_interaction
  from public.social_interactions
  where source_character_id = apply_relationship_decay.source_character_id
    and target_character_id = apply_relationship_decay.target_character_id;

  if last_interaction is null or last_interaction > now() - interval '30 days' then
    return;
  end if;

  select status into active_status
  from public.mutual_relationships
  where character_one_id = least(source_character_id, target_character_id)
    and character_two_id = greatest(source_character_id, target_character_id)
    and ended_at is null;

  if active_status in ('close_friend', 'dating') then
    decay_amount := 0;
  end if;

  if decay_amount > 0 then
    update public.character_relationships
    set familiarity = greatest(0, familiarity - decay_amount),
        updated_at = now()
    where character_relationships.source_character_id = apply_relationship_decay.source_character_id
      and character_relationships.target_character_id = apply_relationship_decay.target_character_id;
  end if;
end;
$$;

create or replace function public.send_social_request(target_character_id uuid, request_type text)
returns public.social_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  source_character public.characters%rowtype;
  target_character public.characters%rowtype;
  current_relationship public.character_relationships%rowtype;
  interaction_count int;
  inserted_request public.social_requests%rowtype;
begin
  select * into source_character
  from public.characters
  where owner_user_id = auth.uid() and is_deceased = false
  order by updated_at desc
  limit 1;

  if source_character.id is null then raise exception 'No active character found.'; end if;

  select * into target_character from public.characters where id = target_character_id and is_deceased = false;
  if target_character.id is null then raise exception 'Target character is not active.'; end if;
  if source_character.id = target_character.id then raise exception 'Cannot request yourself.'; end if;
  if public.is_blocked_between(source_character.id, target_character.id) then raise exception 'This character is blocked.'; end if;

  select * into current_relationship
  from public.character_relationships
  where source_character_id = source_character.id and target_character_id = target_character.id;

  if request_type = 'friend' and coalesce(current_relationship.familiarity, 0) < 15 then
    raise exception 'You need more familiarity before becoming friends.';
  end if;

  if request_type = 'close_friend' then
    if not public.are_mutual_status(source_character.id, target_character.id, 'friend') then
      raise exception 'You must be friends first.';
    end if;
    select count(*) into interaction_count
    from public.social_interactions
    where ((source_character_id = source_character.id and target_character_id = target_character.id)
      or (source_character_id = target_character.id and target_character_id = source_character.id));
    if interaction_count < 8 or coalesce(current_relationship.friendship, 0) < 55 then
      raise exception 'Close friendship needs more history.';
    end if;
  end if;

  if request_type = 'dating' and (
    coalesce(current_relationship.familiarity, 0) < 25
    or not public.can_send_romantic_request(source_character.id, target_character.id)
  ) then
    raise exception 'Dating request is not currently available.';
  end if;

  insert into public.social_requests(source_character_id, target_character_id, type)
  values (source_character.id, target_character.id, request_type)
  returning * into inserted_request;

  perform public.create_social_notification(
    target_character.id,
    'social_request',
    source_character.first_name || ' ' || source_character.last_name || ' sent you a ' || request_type || ' request.',
    '/social'
  );

  perform public.ensure_acquaintance(source_character.id, target_character.id, 'They met through a social request.');

  return inserted_request;
end;
$$;

create or replace function public.respond_social_request(request_id uuid, response text)
returns public.social_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.social_requests%rowtype;
  source_character public.characters%rowtype;
  target_character public.characters%rowtype;
  new_status text;
  event_summary text;
begin
  select * into request_row from public.social_requests where id = request_id and status = 'pending';
  if request_row.id is null then raise exception 'Pending request not found.'; end if;
  if not public.owns_character(request_row.target_character_id) then raise exception 'Only the target can respond.'; end if;
  if response not in ('accepted', 'declined') then raise exception 'Invalid response.'; end if;

  select * into source_character from public.characters where id = request_row.source_character_id;
  select * into target_character from public.characters where id = request_row.target_character_id and is_deceased = false;
  if target_character.id is null or source_character.is_deceased then raise exception 'Character is not active.'; end if;

  update public.social_requests
  set status = response, responded_at = now()
  where id = request_id
  returning * into request_row;

  if response = 'accepted' then
    new_status := case request_row.type
      when 'friend' then 'friend'
      when 'close_friend' then 'close_friend'
      when 'dating' then 'dating'
    end;
    event_summary := source_character.first_name || ' and ' || target_character.first_name || ' became ' || replace(new_status, '_', ' ') || '.';

    insert into public.mutual_relationships(character_one_id, character_two_id, status)
    values (least(source_character.id, target_character.id), greatest(source_character.id, target_character.id), new_status)
    on conflict (character_one_id, character_two_id) where ended_at is null
    do update set status = excluded.status, started_at = now(), updated_at = now();

    insert into public.relationship_history_events(character_one_id, character_two_id, event_type, summary)
    values (least(source_character.id, target_character.id), greatest(source_character.id, target_character.id), new_status || '_started', event_summary);
  else
    event_summary := target_character.first_name || ' declined the ' || request_row.type || ' request.';
  end if;

  perform public.create_social_notification(source_character.id, 'request_' || response, event_summary, '/social');
  return request_row;
end;
$$;

create or replace function public.end_mutual_relationship(other_character_id uuid, end_reason text default 'manual')
returns public.mutual_relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  source_character public.characters%rowtype;
  other_character public.characters%rowtype;
  relationship_row public.mutual_relationships%rowtype;
begin
  select * into source_character
  from public.characters
  where owner_user_id = auth.uid() and is_deceased = false
  order by updated_at desc
  limit 1;
  if source_character.id is null then raise exception 'No active character found.'; end if;
  select * into other_character from public.characters where id = other_character_id;

  update public.mutual_relationships
  set status = 'ended', ended_at = now(), ended_reason = end_reason, updated_at = now()
  where character_one_id = least(source_character.id, other_character_id)
    and character_two_id = greatest(source_character.id, other_character_id)
    and ended_at is null
  returning * into relationship_row;

  if relationship_row.id is null then raise exception 'Active relationship not found.'; end if;

  insert into public.relationship_history_events(character_one_id, character_two_id, event_type, summary)
  values (
    least(source_character.id, other_character_id),
    greatest(source_character.id, other_character_id),
    'relationship_ended',
    source_character.first_name || ' ended the relationship with ' || coalesce(other_character.first_name, 'this character') || '.'
  );

  update public.character_relationships
  set friendship = greatest(0, friendship - 8),
      romantic_interest = greatest(0, romantic_interest - 12),
      updated_at = now()
  where source_character_id = source_character.id and target_character_id = other_character_id;

  perform public.create_social_notification(other_character_id, 'relationship_ended', source_character.first_name || ' ended a relationship with you.', '/social');
  return relationship_row;
end;
$$;

create or replace function public.block_character(target_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  source_character_id uuid;
begin
  select id into source_character_id
  from public.characters
  where owner_user_id = auth.uid() and is_deceased = false
  order by updated_at desc
  limit 1;
  if source_character_id is null then raise exception 'No active character found.'; end if;
  insert into public.character_blocks(blocker_character_id, blocked_character_id)
  values (source_character_id, target_character_id)
  on conflict do nothing;
end;
$$;

create or replace function public.submit_content_report(target_type text, target_id uuid, reason text, details text default '')
returns public.content_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  reporter_id uuid;
  report_row public.content_reports%rowtype;
begin
  select id into reporter_id
  from public.characters
  where owner_user_id = auth.uid() and is_deceased = false
  order by updated_at desc
  limit 1;
  if reporter_id is null then raise exception 'No active character found.'; end if;
  insert into public.content_reports(reporter_character_id, target_type, target_id, reason, details)
  values (reporter_id, target_type, target_id, reason, details)
  returning * into report_row;
  return report_row;
end;
$$;

create or replace function public.update_social_privacy(dm_policy text, interaction_policy text, romantic_request_policy text)
returns public.social_privacy_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  source_character_id uuid;
  settings_row public.social_privacy_settings%rowtype;
begin
  select id into source_character_id
  from public.characters
  where owner_user_id = auth.uid() and is_deceased = false
  order by updated_at desc
  limit 1;
  if source_character_id is null then raise exception 'No active character found.'; end if;
  insert into public.social_privacy_settings(character_id, dm_policy, interaction_policy, romantic_request_policy)
  values (source_character_id, dm_policy, interaction_policy, romantic_request_policy)
  on conflict (character_id)
  do update set
    dm_policy = excluded.dm_policy,
    interaction_policy = excluded.interaction_policy,
    romantic_request_policy = excluded.romantic_request_policy,
    updated_at = now()
  returning * into settings_row;
  return settings_row;
end;
$$;

create or replace function public.mark_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  source_character_id uuid;
begin
  select id into source_character_id
  from public.characters
  where owner_user_id = auth.uid() and is_deceased = false
  order by updated_at desc
  limit 1;
  update public.social_notifications
  set read_at = now()
  where character_id = source_character_id and read_at is null;
end;
$$;

create or replace function public.apply_message_relationship_credit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  select cp.character_id into target_id
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.character_id <> new.sender_character_id
  limit 1;

  if target_id is null then
    return new;
  end if;

  if public.is_blocked_between(new.sender_character_id, target_id) then
    raise exception 'Message blocked.';
  end if;

  if not public.can_send_dm(new.sender_character_id, target_id) then
    raise exception 'Recipient does not accept this message.';
  end if;

  insert into public.message_relationship_credits(source_character_id, target_character_id, credit_date)
  values (new.sender_character_id, target_id, current_date)
  on conflict do nothing;

  if found then
    insert into public.character_relationships(source_character_id, target_character_id, familiarity, friendship, romantic_interest)
    values (new.sender_character_id, target_id, 1, 1, 0)
    on conflict (source_character_id, target_character_id)
    do update set
      familiarity = least(100, public.character_relationships.familiarity + 1),
      friendship = least(100, public.character_relationships.friendship + 1),
      updated_at = now();
  end if;

  perform public.ensure_acquaintance(new.sender_character_id, target_id, 'They started a conversation.');
  return new;
end;
$$;

drop trigger if exists direct_messages_relationship_credit on public.direct_messages;
create trigger direct_messages_relationship_credit
before insert on public.direct_messages
for each row execute function public.apply_message_relationship_credit();

create or replace function public.get_or_create_direct_conversation(other_character_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  my_character_id uuid;
  existing_conversation_id uuid;
  new_conversation_id uuid;
begin
  select id into my_character_id
  from public.characters
  where owner_user_id = auth.uid()
    and is_deceased = false
  order by updated_at desc
  limit 1;

  if my_character_id is null then raise exception 'No active character found.'; end if;
  if my_character_id = other_character_id then raise exception 'Cannot message yourself.'; end if;
  if public.is_blocked_between(my_character_id, other_character_id) then raise exception 'This character is blocked.'; end if;
  if not public.can_send_dm(my_character_id, other_character_id) then raise exception 'Recipient does not accept DMs from you.'; end if;
  if not exists (select 1 from public.characters where id = other_character_id and is_deceased = false) then
    raise exception 'Target character is not active.';
  end if;

  select cp1.conversation_id into existing_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
  where cp1.character_id = my_character_id and cp2.character_id = other_character_id
  limit 1;

  if existing_conversation_id is not null then return existing_conversation_id; end if;

  insert into public.conversations default values returning id into new_conversation_id;
  insert into public.conversation_participants (conversation_id, character_id)
  values (new_conversation_id, my_character_id), (new_conversation_id, other_character_id);
  perform public.ensure_acquaintance(my_character_id, other_character_id, 'They started a conversation.');
  return new_conversation_id;
end;
$$;

create or replace function public.perform_social_interaction(target_character_id uuid, interaction_action text)
returns public.social_interactions
language plpgsql
security definer
set search_path = public
as $$
declare
  source_character public.characters%rowtype;
  target_character public.characters%rowtype;
  recent_same_count integer;
  familiarity_delta integer := 0;
  friendship_delta integer := 0;
  romantic_delta integer := 0;
  divisor integer := 1;
  event_text text;
  inserted_interaction public.social_interactions%rowtype;
begin
  select * into source_character
  from public.characters
  where owner_user_id = auth.uid() and is_deceased = false
  order by updated_at desc
  limit 1;
  if source_character.id is null then raise exception 'No active character found.'; end if;
  select * into target_character from public.characters where id = target_character_id and is_deceased = false;
  if target_character.id is null then raise exception 'Target character is not active.'; end if;
  if source_character.id = target_character.id then raise exception 'Cannot interact with yourself.'; end if;
  if not public.can_send_interaction(source_character.id, target_character.id) then raise exception 'Interaction is not allowed.'; end if;

  if exists (
    select 1 from public.social_interactions
    where source_character_id = source_character.id
      and target_character_id = target_character.id
      and created_at > now() - interval '10 minutes'
  ) then raise exception 'Interaction cooldown is still active.'; end if;

  case interaction_action
    when 'wave' then familiarity_delta := 2;
    when 'smile' then familiarity_delta := 2; friendship_delta := 1;
    when 'wink' then familiarity_delta := 1; romantic_delta := 2;
    when 'hug' then familiarity_delta := 1; friendship_delta := 2; romantic_delta := 1;
    when 'hold_hands' then
      if not public.are_mutual_status(source_character.id, target_character.id, 'dating') then raise exception 'Hold hands requires dating.'; end if;
      familiarity_delta := 1; friendship_delta := 1; romantic_delta := 2;
    when 'give_flowers' then familiarity_delta := 1; friendship_delta := 2; romantic_delta := 2;
    when 'ask_date' then raise exception 'Use dating requests.';
    when 'blow_kiss' then familiarity_delta := 1; romantic_delta := 4;
    when 'compliment' then familiarity_delta := 1; friendship_delta := 2; romantic_delta := 1;
    when 'joke' then familiarity_delta := 1; friendship_delta := 2;
    when 'flirt' then familiarity_delta := 1; romantic_delta := 3;
    else raise exception 'Unknown interaction.';
  end case;

  select count(*) into recent_same_count
  from public.social_interactions
  where source_character_id = source_character.id
    and target_character_id = target_character.id
    and action = interaction_action
    and created_at > now() - interval '7 days';

  if recent_same_count >= 3 then divisor := 2; end if;
  if recent_same_count >= 8 then divisor := 4; end if;

  familiarity_delta := ceil(familiarity_delta::numeric / divisor);
  friendship_delta := floor(friendship_delta::numeric / divisor);
  romantic_delta := floor(romantic_delta::numeric / divisor);

  insert into public.character_relationships(source_character_id, target_character_id, familiarity, friendship, romantic_interest)
  values (source_character.id, target_character.id, familiarity_delta, friendship_delta, romantic_delta)
  on conflict (source_character_id, target_character_id)
  do update set
    familiarity = least(100, public.character_relationships.familiarity + excluded.familiarity),
    friendship = least(100, public.character_relationships.friendship + excluded.friendship),
    romantic_interest = least(100, public.character_relationships.romantic_interest + excluded.romantic_interest),
    updated_at = now();

  perform public.apply_relationship_decay(source_character.id, target_character.id);
  perform public.ensure_acquaintance(source_character.id, target_character.id, 'They met through an interaction.');

  event_text := source_character.first_name || ' ' || source_character.last_name || ' ' ||
    case interaction_action
      when 'wave' then 'waved at'
      when 'smile' then 'smiled at'
      when 'wink' then 'winked at'
      when 'hug' then 'hugged'
      when 'hold_hands' then 'held hands with'
      when 'give_flowers' then 'gave flowers to'
      when 'blow_kiss' then 'blew a kiss to'
      when 'compliment' then 'complimented'
      when 'joke' then 'joked with'
      when 'flirt' then 'flirted with'
    end || ' ' || target_character.first_name || ' ' || target_character.last_name || '.';

  insert into public.social_interactions(source_character_id, target_character_id, action, event_text)
  values (source_character.id, target_character.id, interaction_action, event_text)
  returning * into inserted_interaction;

  return inserted_interaction;
end;
$$;
