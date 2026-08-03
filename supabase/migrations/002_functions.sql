-- ============================================================
-- Scrapbook — Migration 002: Postgres Functions & Triggers
-- ============================================================

-- ============================================================
-- handle_new_user() — auto-create profile on auth.users insert
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  counter       int := 0;
begin
  -- derive base username from email prefix
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  final_username := base_username;

  -- ensure uniqueness by appending a counter if necessary
  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url, bio, theme_id, visitor_log_opt_in, created_at)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', final_username),
    new.raw_user_meta_data->>'avatar_url',
    null,
    '00000000-0000-0000-0000-000000000001', -- default system theme
    false,
    now()
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- log_profile_visit(visited_id uuid)
-- Called client-side on profile page load via supabase.rpc()
-- Silently no-ops if: not authenticated, or visitor === visited
-- ============================================================

create or replace function public.log_profile_visit(visited_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- no-op if not authenticated
  if auth.uid() is null then return; end if;
  -- no-op if visiting own profile
  if auth.uid() = visited_id then return; end if;

  insert into public.profile_visits (visitor_id, visited_id, created_at)
  values (auth.uid(), visited_id, now());
end;
$$;

-- ============================================================
-- request_testimonial(recipient_id uuid)
-- Creates a testimonial_request notification for the recipient
-- ============================================================

create or replace function public.request_testimonial(recipient_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  notif_id uuid;
  caller_display text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select display_name into caller_display
  from public.profiles
  where id = auth.uid();

  insert into public.notifications (user_id, type, payload)
  values (
    recipient_id,
    'testimonial_request',
    jsonb_build_object(
      'requester_id', auth.uid(),
      'requester_display_name', coalesce(caller_display, 'Someone')
    )
  )
  returning id into notif_id;

  return jsonb_build_object('notification_id', notif_id, 'success', true);
end;
$$;

-- ============================================================
-- approve_testimonial(testimonial_id uuid)
-- Permission-checked: only the recipient may approve
-- ============================================================

create or replace function public.approve_testimonial(testimonial_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  rec public.testimonials%rowtype;
  ts  timestamptz;
begin
  select * into rec from public.testimonials where id = testimonial_id;

  if not found then
    raise exception 'not_found';
  end if;

  if rec.recipient_id <> auth.uid() then
    raise exception 'not_authorized';
  end if;

  ts := now();

  update public.testimonials
  set status = 'approved', approved_at = ts
  where id = testimonial_id;

  -- notify the author that their testimonial was approved
  insert into public.notifications (user_id, type, payload)
  values (
    rec.author_id,
    'testimonial_approved',
    jsonb_build_object(
      'testimonial_id', testimonial_id,
      'recipient_id', rec.recipient_id
    )
  );

  return jsonb_build_object('success', true, 'approved_at', ts);
end;
$$;

-- ============================================================
-- decline_testimonial(testimonial_id uuid)
-- Permission-checked: only the recipient may decline
-- ============================================================

create or replace function public.decline_testimonial(testimonial_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  rec public.testimonials%rowtype;
begin
  select * into rec from public.testimonials where id = testimonial_id;

  if not found then
    raise exception 'not_found';
  end if;

  if rec.recipient_id <> auth.uid() then
    raise exception 'not_authorized';
  end if;

  update public.testimonials
  set status = 'declined'
  where id = testimonial_id;

  return jsonb_build_object('success', true);
end;
$$;

-- ============================================================
-- get_on_this_day(user_id uuid)
-- Returns scraps sent to user_id on today's month/day in prior years
-- ============================================================

create or replace function public.get_on_this_day(user_id uuid)
returns table (
  id                  uuid,
  author_id           uuid,
  author_display_name text,
  type                text,
  content             text,
  media_url           text,
  created_at          timestamptz,
  years_ago           int
)
language sql
security definer set search_path = public
as $$
  select
    s.id,
    s.author_id,
    coalesce(p.display_name, p.username) as author_display_name,
    s.type,
    s.content,
    s.media_url,
    s.created_at,
    extract(year from now())::int - extract(year from s.created_at)::int as years_ago
  from public.scraps s
  join public.profiles p on p.id = s.author_id
  where
    s.recipient_id = user_id
    and extract(month from s.created_at) = extract(month from now())
    and extract(day   from s.created_at) = extract(day   from now())
    and extract(year  from s.created_at) < extract(year  from now())
  order by s.created_at desc;
$$;

-- ============================================================
-- get_mutual_visitors(user_id uuid)
-- Returns visitors where both visitor & visited opted in
-- ============================================================

create or replace function public.get_mutual_visitors(user_id uuid)
returns table (
  visitor_id           uuid,
  visitor_display_name text,
  visitor_avatar_url   text,
  visited_at           timestamptz
)
language sql
security definer set search_path = public
as $$
  select
    pv.visitor_id,
    coalesce(p.display_name, p.username) as visitor_display_name,
    p.avatar_url as visitor_avatar_url,
    pv.created_at as visited_at
  from public.profile_visits pv
  join public.profiles p  on p.id  = pv.visitor_id
  join public.profiles vd on vd.id = pv.visited_id
  where
    pv.visited_id = user_id
    and p.visitor_log_opt_in  = true
    and vd.visitor_log_opt_in = true
  order by pv.created_at desc
  limit 50;
$$;

-- ============================================================
-- TRIGGERS: auto-create notifications on scraps / testimonials insert
-- ============================================================

create or replace function public.notify_on_scrap()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  author_name text;
begin
  select coalesce(display_name, username) into author_name
  from public.profiles
  where id = new.author_id;

  insert into public.notifications (user_id, type, payload)
  values (
    new.recipient_id,
    'new_scrap',
    jsonb_build_object(
      'scrap_id', new.id,
      'author_id', new.author_id,
      'author_display_name', coalesce(author_name, 'Someone')
    )
  );

  return new;
end;
$$;

drop trigger if exists on_scrap_created on public.scraps;
create trigger on_scrap_created
  after insert on public.scraps
  for each row execute procedure public.notify_on_scrap();

-- ----

create or replace function public.notify_on_testimonial()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  author_name text;
begin
  select coalesce(display_name, username) into author_name
  from public.profiles
  where id = new.author_id;

  insert into public.notifications (user_id, type, payload)
  values (
    new.recipient_id,
    'testimonial_submitted',
    jsonb_build_object(
      'testimonial_id', new.id,
      'author_id', new.author_id,
      'author_display_name', coalesce(author_name, 'Someone')
    )
  );

  return new;
end;
$$;

drop trigger if exists on_testimonial_created on public.testimonials;
create trigger on_testimonial_created
  after insert on public.testimonials
  for each row execute procedure public.notify_on_testimonial();

-- ============================================================
-- Grant execute on RPCs to authenticated users
-- ============================================================

grant execute on function public.log_profile_visit(uuid) to authenticated;
grant execute on function public.request_testimonial(uuid) to authenticated;
grant execute on function public.approve_testimonial(uuid) to authenticated;
grant execute on function public.decline_testimonial(uuid) to authenticated;
grant execute on function public.get_on_this_day(uuid) to authenticated;
grant execute on function public.get_mutual_visitors(uuid) to authenticated;
