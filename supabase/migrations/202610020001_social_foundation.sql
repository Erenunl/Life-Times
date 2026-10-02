create extension if not exists pgcrypto;

create table if not exists public.characters (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  profile_image_url text,
  city_id text not null,
  life_stage text not null check (life_stage in ('high-school')),
  education_status text not null,
  biography text not null default '',
  birth_year integer not null,
  birth_month integer not null check (birth_month between 1 and 12),
  birth_day integer not null check (birth_day between 1 and 30),
  is_deceased boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, character_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_character_id uuid not null references public.characters(id) on delete restrict,
  mode text not null check (mode in ('ic', 'ooc')),
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.social_interactions (
  id uuid primary key default gen_random_uuid(),
  source_character_id uuid not null references public.characters(id) on delete restrict,
  target_character_id uuid not null references public.characters(id) on delete restrict,
  action text not null check (action in ('wave', 'smile', 'wink', 'hug', 'blow_kiss', 'compliment', 'joke', 'flirt')),
  event_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.character_relationships (
  source_character_id uuid not null references public.characters(id) on delete cascade,
  target_character_id uuid not null references public.characters(id) on delete cascade,
  familiarity integer not null default 0 check (familiarity between 0 and 100),
  friendship integer not null default 0 check (friendship between 0 and 100),
  romantic_interest integer not null default 0 check (romantic_interest between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_character_id, target_character_id),
  check (source_character_id <> target_character_id)
);

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  author_character_id uuid not null references public.characters(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  mode text not null check (mode in ('ic', 'ooc')),
  category text not null default 'General',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_character_id uuid not null references public.characters(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists characters_owner_user_id_idx on public.characters(owner_user_id);
create index if not exists characters_name_idx on public.characters(first_name, last_name);
create index if not exists conversation_participants_character_idx on public.conversation_participants(character_id);
create index if not exists direct_messages_conversation_created_idx on public.direct_messages(conversation_id, created_at);
create index if not exists social_interactions_pair_created_idx on public.social_interactions(source_character_id, target_character_id, created_at desc);
create index if not exists relationships_source_idx on public.character_relationships(source_character_id);
create index if not exists forum_threads_updated_idx on public.forum_threads(updated_at desc);
create index if not exists forum_posts_thread_created_idx on public.forum_posts(thread_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at
before update on public.characters
for each row execute function public.set_updated_at();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists relationships_set_updated_at on public.character_relationships;
create trigger relationships_set_updated_at
before update on public.character_relationships
for each row execute function public.set_updated_at();

drop trigger if exists forum_threads_set_updated_at on public.forum_threads;
create trigger forum_threads_set_updated_at
before update on public.forum_threads
for each row execute function public.set_updated_at();

create or replace function public.touch_conversation_after_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists direct_messages_touch_conversation on public.direct_messages;
create trigger direct_messages_touch_conversation
after insert on public.direct_messages
for each row execute function public.touch_conversation_after_message();

create or replace function public.touch_thread_after_post()
returns trigger
language plpgsql
as $$
begin
  update public.forum_threads
  set updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists forum_posts_touch_thread on public.forum_posts;
create trigger forum_posts_touch_thread
after insert on public.forum_posts
for each row execute function public.touch_thread_after_post();

create or replace function public.owns_character(character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.characters c
    where c.id = character_id
      and c.owner_user_id = auth.uid()
      and c.is_deceased = false
  );
$$;

create or replace function public.is_conversation_participant(conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    join public.characters c on c.id = cp.character_id
    where cp.conversation_id = is_conversation_participant.conversation_id
      and c.owner_user_id = auth.uid()
  );
$$;

alter table public.characters enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.direct_messages enable row level security;
alter table public.social_interactions enable row level security;
alter table public.character_relationships enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;

drop policy if exists "characters public read" on public.characters;
create policy "characters public read"
on public.characters for select
to authenticated
using (true);

drop policy if exists "characters owner insert" on public.characters;
create policy "characters owner insert"
on public.characters for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "characters owner update" on public.characters;
create policy "characters owner update"
on public.characters for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "conversations participant read" on public.conversations;
create policy "conversations participant read"
on public.conversations for select
to authenticated
using (public.is_conversation_participant(id));

drop policy if exists "conversation participants participant read" on public.conversation_participants;
create policy "conversation participants participant read"
on public.conversation_participants for select
to authenticated
using (public.is_conversation_participant(conversation_id));

drop policy if exists "direct messages participant read" on public.direct_messages;
create policy "direct messages participant read"
on public.direct_messages for select
to authenticated
using (public.is_conversation_participant(conversation_id));

drop policy if exists "direct messages sender insert" on public.direct_messages;
create policy "direct messages sender insert"
on public.direct_messages for insert
to authenticated
with check (
  public.is_conversation_participant(conversation_id)
  and public.owns_character(sender_character_id)
  and exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = direct_messages.conversation_id
      and cp.character_id = direct_messages.sender_character_id
  )
);

drop policy if exists "social interactions involved read" on public.social_interactions;
create policy "social interactions involved read"
on public.social_interactions for select
to authenticated
using (public.owns_character(source_character_id) or public.owns_character(target_character_id));

drop policy if exists "relationships source read" on public.character_relationships;
create policy "relationships source read"
on public.character_relationships for select
to authenticated
using (public.owns_character(source_character_id));

drop policy if exists "forum threads auth read" on public.forum_threads;
create policy "forum threads auth read"
on public.forum_threads for select
to authenticated
using (true);

drop policy if exists "forum threads own character insert" on public.forum_threads;
create policy "forum threads own character insert"
on public.forum_threads for insert
to authenticated
with check (public.owns_character(author_character_id));

drop policy if exists "forum posts auth read" on public.forum_posts;
create policy "forum posts auth read"
on public.forum_posts for select
to authenticated
using (true);

drop policy if exists "forum posts own character insert" on public.forum_posts;
create policy "forum posts own character insert"
on public.forum_posts for insert
to authenticated
with check (public.owns_character(author_character_id));

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

  if my_character_id is null then
    raise exception 'No active character found.';
  end if;

  if my_character_id = other_character_id then
    raise exception 'Cannot message yourself.';
  end if;

  if not exists (select 1 from public.characters where id = other_character_id and is_deceased = false) then
    raise exception 'Target character is not active.';
  end if;

  select cp1.conversation_id into existing_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
  where cp1.character_id = my_character_id
    and cp2.character_id = other_character_id
  limit 1;

  if existing_conversation_id is not null then
    return existing_conversation_id;
  end if;

  insert into public.conversations default values returning id into new_conversation_id;
  insert into public.conversation_participants (conversation_id, character_id)
  values
    (new_conversation_id, my_character_id),
    (new_conversation_id, other_character_id);

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
  where owner_user_id = auth.uid()
    and is_deceased = false
  order by updated_at desc
  limit 1;

  if source_character.id is null then
    raise exception 'No active character found.';
  end if;

  select * into target_character
  from public.characters
  where id = target_character_id
    and is_deceased = false;

  if target_character.id is null then
    raise exception 'Target character is not active.';
  end if;

  if source_character.id = target_character.id then
    raise exception 'Cannot interact with yourself.';
  end if;

  if exists (
    select 1 from public.social_interactions
    where source_character_id = source_character.id
      and target_character_id = target_character.id
      and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Interaction cooldown is still active.';
  end if;

  case interaction_action
    when 'wave' then familiarity_delta := 2;
    when 'smile' then familiarity_delta := 2; friendship_delta := 1;
    when 'wink' then familiarity_delta := 1; romantic_delta := 2;
    when 'hug' then familiarity_delta := 1; friendship_delta := 2; romantic_delta := 1;
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

  if recent_same_count >= 3 then
    divisor := 2;
  end if;

  familiarity_delta := ceil(familiarity_delta::numeric / divisor);
  friendship_delta := floor(friendship_delta::numeric / divisor);
  romantic_delta := floor(romantic_delta::numeric / divisor);

  insert into public.character_relationships (
    source_character_id,
    target_character_id,
    familiarity,
    friendship,
    romantic_interest
  )
  values (
    source_character.id,
    target_character.id,
    familiarity_delta,
    friendship_delta,
    romantic_delta
  )
  on conflict (source_character_id, target_character_id)
  do update set
    familiarity = least(100, public.character_relationships.familiarity + excluded.familiarity),
    friendship = least(100, public.character_relationships.friendship + excluded.friendship),
    romantic_interest = least(100, public.character_relationships.romantic_interest + excluded.romantic_interest),
    updated_at = now();

  event_text := source_character.first_name || ' ' || source_character.last_name || ' ' ||
    case interaction_action
      when 'wave' then 'waved at'
      when 'smile' then 'smiled at'
      when 'wink' then 'winked at'
      when 'hug' then 'hugged'
      when 'blow_kiss' then 'blew a kiss to'
      when 'compliment' then 'complimented'
      when 'joke' then 'joked with'
      when 'flirt' then 'flirted with'
    end || ' ' || target_character.first_name || ' ' || target_character.last_name || '.';

  insert into public.social_interactions (
    source_character_id,
    target_character_id,
    action,
    event_text
  )
  values (
    source_character.id,
    target_character.id,
    interaction_action,
    event_text
  )
  returning * into inserted_interaction;

  return inserted_interaction;
end;
$$;
