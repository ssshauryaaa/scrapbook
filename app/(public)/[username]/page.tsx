import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileClient from "@/components/profile/profile-client";

// app/(app)/[username]/page.tsx
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const supabase = await createClient();
  const { username } = await params;

  // who's looking (may be null for a signed-out visitor)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. profile + theme
  const { data: rawProfile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      *,
      theme:themes!profiles_theme_id_fkey(*)
    `
    )
    .eq("username", username.toLowerCase())
    .single();
  const profile = rawProfile as any;

  if (profileError || !profile) {
    console.error("Profile not found or error:", { username, profileError, profile });
    notFound();
  }

  // 2. the wall
  const { data: scraps } = await supabase
    .from("scraps")
    .select(
      `
      *,
      author:profiles!scraps_author_id_fkey(id, username, display_name, avatar_url)
    `
    )
    .eq("recipient_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // 3. approved testimonials
  const { data: testimonials } = await supabase
    .from("testimonials")
    .select(
      `
      *,
      author:profiles!testimonials_author_id_fkey(username, display_name, avatar_url)
    `
    )
    .eq("recipient_id", profile.id)
    .eq("status", "approved")
    .order("approved_at", { ascending: false });

  // 4. mutual visitors (only returns results when both parties opted in)
  const { data: mutualVisitors } = await (supabase as any).rpc("get_mutual_visitors", {
    user_id: profile.id,
  });

  // 5. log this visit + fetch real view count (fire-and-forget for the log)
  if (user && user.id !== profile.id) {
    // non-blocking: we don't await this
    (supabase as any).rpc("log_profile_visit", { visited_id: profile.id });
  }
  const { data: visitCountData } = await (supabase as any).rpc("get_profile_visit_count", {
    p_visited_id: profile.id,
  });
  const visitCount = (visitCountData as number | null) ?? 0;

  return (
    <ProfileClient
      profile={profile}
      scraps={scraps || []}
      testimonials={testimonials || []}
      mutualVisitors={mutualVisitors || []}
      currentUserId={user?.id ?? null}
      isOwnProfile={user?.id === profile.id}
      visitCount={visitCount}
    />
  );
}