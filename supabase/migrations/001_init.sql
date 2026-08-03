-- ============================================================
-- Scrapbook — Migration 001: Schema, RLS, Storage Buckets
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ============================================================
-- TABLES
-- ============================================================



-- Drop and recreate in correct order --------------------------------

-- profiles
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique not null,
  display_name        text,
  avatar_url          text,
  bio                 text,
  theme_id            uuid,             -- FK added after themes table exists
  visitor_log_opt_in  boolean not null default false,
  created_at          timestamptz not null default now()
);

-- Now create themes properly (owner_id → profiles)
drop table if exists public.themes cascade;
create table public.themes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references public.profiles(id) on delete set null,
  name        text not null,
  palette     jsonb not null default '{}',
  banner_url  text,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Now add the FK from profiles → themes
alter table public.profiles
  add constraint profiles_theme_id_fkey
  foreign key (theme_id) references public.themes(id) on delete set null;

-- Insert a default system theme (owner_id null = system preset)
insert into public.themes (id, owner_id, name, palette, is_public)
values (
  '00000000-0000-0000-0000-000000000001',
  null,
  'Classic Scrapbook',
  '{"background":"#fdf6e3","primary":"#c0392b","secondary":"#2980b9","accent":"#f39c12","text":"#2c3e50","font":"Inter"}',
  true
);

-- friendships
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null check (status in ('pending','accepted','declined','blocked')) default 'pending',
  created_at    timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

-- scraps
create table if not exists public.scraps (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  type          text not null check (type in ('text','image','voice','video','gif')),
  content       text,
  media_url     text,
  transcript    text,
  created_at    timestamptz not null default now()
);

-- testimonials
create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  content       text not null,
  status        text not null check (status in ('pending','approved','declined')) default 'pending',
  ai_assisted   boolean not null default false,
  created_at    timestamptz not null default now(),
  approved_at   timestamptz
);

-- reactions
create table if not exists public.reactions (
  id              uuid primary key default gen_random_uuid(),
  scrap_id        uuid references public.scraps(id) on delete cascade,
  testimonial_id  uuid references public.testimonials(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  vibe            text not null check (vibe in ('funny','wholesome','unhinged','iconic')),
  constraint one_target check (
    (scrap_id is not null and testimonial_id is null) or
    (scrap_id is null and testimonial_id is not null)
  ),
  unique (scrap_id, user_id, vibe),
  unique (testimonial_id, user_id, vibe)
);

-- communities
create table if not exists public.communities (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  description text,
  banner_url  text,
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- community_members
create table if not exists public.community_members (
  community_id  uuid not null references public.communities(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null check (role in ('member','moderator','owner')) default 'member',
  joined_at     timestamptz not null default now(),
  primary key (community_id, user_id)
);

-- community_posts
create table if not exists public.community_posts (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  content       text not null,
  media_url     text,
  created_at    timestamptz not null default now()
);

-- profile_visits
create table if not exists public.profile_visits (
  id          uuid primary key default gen_random_uuid(),
  visitor_id  uuid not null references public.profiles(id) on delete cascade,
  visited_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- notifications
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  payload     jsonb not null default '{}',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists profiles_username_trgm on public.profiles using gin (username gin_trgm_ops);
create index if not exists profiles_display_name_trgm on public.profiles using gin (display_name gin_trgm_ops);
create index if not exists scraps_recipient_id_idx on public.scraps (recipient_id, created_at desc);
create index if not exists scraps_author_id_idx on public.scraps (author_id);
create index if not exists testimonials_recipient_id_idx on public.testimonials (recipient_id, status);
create index if not exists testimonials_author_id_idx on public.testimonials (author_id);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists reactions_scrap_idx on public.reactions (scrap_id);
create index if not exists reactions_testimonial_idx on public.reactions (testimonial_id);
create index if not exists community_posts_community_idx on public.community_posts (community_id, created_at desc);
create index if not exists profile_visits_visited_idx on public.profile_visits (visited_id, created_at desc);
create index if not exists notifications_user_id_idx on public.notifications (user_id, read, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.themes enable row level security;
alter table public.friendships enable row level security;
alter table public.scraps enable row level security;
alter table public.testimonials enable row level security;
alter table public.reactions enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.profile_visits enable row level security;
alter table public.notifications enable row level security;

-- ---- profiles ----
create policy "profiles_select_public" on public.profiles
  for select using (true);

create policy "profiles_update_owner" on public.profiles
  for update using (auth.uid() = id);

-- ---- themes ----
create policy "themes_select_public" on public.themes
  for select using (is_public = true or owner_id = auth.uid());

create policy "themes_insert_auth" on public.themes
  for insert with check (auth.uid() = owner_id);

create policy "themes_update_owner" on public.themes
  for update using (auth.uid() = owner_id);

create policy "themes_delete_owner" on public.themes
  for delete using (auth.uid() = owner_id);

-- ---- friendships ----
create policy "friendships_select_parties" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships_insert_requester" on public.friendships
  for insert with check (auth.uid() = requester_id);

create policy "friendships_update_addressee" on public.friendships
  for update using (auth.uid() = addressee_id);

create policy "friendships_delete_parties" on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ---- scraps ----
create policy "scraps_select_public" on public.scraps
  for select using (true);

create policy "scraps_insert_auth" on public.scraps
  for insert with check (auth.uid() = author_id);

create policy "scraps_delete_parties" on public.scraps
  for delete using (auth.uid() = author_id or auth.uid() = recipient_id);

-- ---- testimonials ----
create policy "testimonials_select" on public.testimonials
  for select using (
    status = 'approved'
    or auth.uid() = author_id
    or auth.uid() = recipient_id
  );

create policy "testimonials_insert_auth" on public.testimonials
  for insert with check (auth.uid() = author_id);

create policy "testimonials_update_recipient" on public.testimonials
  for update using (auth.uid() = recipient_id);

-- ---- reactions ----
create policy "reactions_select_public" on public.reactions
  for select using (true);

create policy "reactions_insert_owner" on public.reactions
  for insert with check (auth.uid() = user_id);

create policy "reactions_delete_owner" on public.reactions
  for delete using (auth.uid() = user_id);

-- ---- communities ----
create policy "communities_select_public" on public.communities
  for select using (true);

create policy "communities_insert_auth" on public.communities
  for insert with check (auth.uid() = creator_id);

create policy "communities_update_moderator" on public.communities
  for update using (
    exists (
      select 1 from public.community_members
      where community_id = id
        and user_id = auth.uid()
        and role in ('moderator','owner')
    )
  );

-- ---- community_members ----
create policy "community_members_select_public" on public.community_members
  for select using (true);

create policy "community_members_insert_auth" on public.community_members
  for insert with check (auth.uid() = user_id);

create policy "community_members_delete_self" on public.community_members
  for delete using (auth.uid() = user_id);

-- ---- community_posts ----
create policy "community_posts_select_public" on public.community_posts
  for select using (true);

create policy "community_posts_insert_member" on public.community_posts
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.community_members
      where community_id = community_posts.community_id
        and user_id = auth.uid()
    )
  );

create policy "community_posts_delete_author_or_mod" on public.community_posts
  for delete using (
    auth.uid() = author_id
    or exists (
      select 1 from public.community_members
      where community_id = community_posts.community_id
        and user_id = auth.uid()
        and role in ('moderator','owner')
    )
  );

-- ---- profile_visits ----
-- No direct INSERT allowed — must go through log_profile_visit() RPC (SECURITY DEFINER)
-- SELECT only if BOTH parties opted in
create policy "profile_visits_select_mutual_opt_in" on public.profile_visits
  for select using (
    (visitor_id = auth.uid() or visited_id = auth.uid())
    and exists (
      select 1 from public.profiles vr
      where vr.id = profile_visits.visitor_id and vr.visitor_log_opt_in = true
    )
    and exists (
      select 1 from public.profiles vd
      where vd.id = profile_visits.visited_id and vd.visitor_log_opt_in = true
    )
  );

-- ---- notifications ----
create policy "notifications_select_owner" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update_owner" on public.notifications
  for update using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('banners', 'banners', true),
  ('scrap-media', 'scrap-media', true),
  ('community-media', 'community-media', true),
  ('exports', 'exports', false)
on conflict (id) do nothing;

-- Storage RLS: avatars
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: banners
create policy "banners_public_read" on storage.objects
  for select using (bucket_id = 'banners');

create policy "banners_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'banners'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: scrap-media
create policy "scrap_media_public_read" on storage.objects
  for select using (bucket_id = 'scrap-media');

create policy "scrap_media_author_write" on storage.objects
  for insert with check (
    bucket_id = 'scrap-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: community-media
create policy "community_media_public_read" on storage.objects
  for select using (bucket_id = 'community-media');

create policy "community_media_member_write" on storage.objects
  for insert with check (bucket_id = 'community-media' and auth.role() = 'authenticated');

-- Storage RLS: exports (private, owner only)
create policy "exports_owner_read" on storage.objects
  for select using (
    bucket_id = 'exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "exports_service_write" on storage.objects
  for insert with check (bucket_id = 'exports');
