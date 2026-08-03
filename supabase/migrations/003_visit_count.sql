-- ============================================================
-- Scrapbook — Migration 003: Profile visit count RPC
-- ============================================================

-- Returns the total number of visits to a profile.
-- No opt-in check here — the count itself is always public info,
-- only the *identities* of visitors are gated by the mutual opt-in policy.

create or replace function public.get_profile_visit_count(p_visited_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::bigint
  from public.profile_visits
  where visited_id = p_visited_id;
$$;
