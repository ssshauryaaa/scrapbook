"use client";

/**
 * Home feed — "your notebook, open on the desk"
 * -----------------------------------------------------------------------
 * Desktop: an open notebook spread. Left page = you (profile, stats,
 * quick compose, friend requests, your communities). Right page = the
 * wall — a torn-paper feed of scraps to/from you. A spiral-bound spine
 * runs down the middle, same visual language as explore.tsx and the
 * People/Scraps/Communities lists (paper stock, pushpins, washi tape,
 * ticket stubs, TiltCard 3D hover).
 * Mobile: pages stack, spine collapses to a simple dashed divider.
 * -----------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  PenLine,
  UserPlus,
  UserCheck,
  X as XIcon,
  Users2,
  Loader2,
  ChevronDown,
  Sparkles,
  Ticket,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tokens } from "@/lib/scrapbook-theme";

const PINK = tokens.color.pink ?? "#FF6F91";
const BANNER_COLORS = [tokens.color.periwinkle, PINK, tokens.color.amber, tokens.color.mint];
const PAGE_SIZE = 8;

/* -------------------------------------------------------------------- */
/* types                                                                  */
/* -------------------------------------------------------------------- */

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type FeedScrap = {
  id: string;
  type: string;
  content: string | null;
  created_at: string;
  author: { username: string; display_name: string | null } | null;
  recipient: { username: string; display_name: string | null } | null;
};

type FriendRequest = {
  id: string;
  requester: { id: string; username: string; display_name: string | null } | null;
};

type MiniCommunity = { id: string; name: string; description: string | null };

/* -------------------------------------------------------------------- */
/* small shared bits                                                     */
/* -------------------------------------------------------------------- */

function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10" style={{ color: tokens.color.inkSoft }}>
      <Loader2 size={14} className="animate-spin" />
      <span className="text-xs">{text}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="text-xs text-center py-10" style={{ color: tokens.color.inkSoft }}>
      {text}
    </p>
  );
}

/** Mouse-driven 3D tilt wrapper — same spring feel used across the app. */
function TiltCard({
  children,
  index = 0,
  className,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mvY, [-60, 60], [6, -6]), { stiffness: 220, damping: 20 });
  const rotateY = useSpring(useTransform(mvX, [-60, 60], [-6, 6]), { stiffness: 220, damping: 20 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mvX.set(e.clientX - rect.left - rect.width / 2);
    mvY.set(e.clientY - rect.top - rect.height / 2);
  }
  function reset() {
    mvX.set(0);
    mvY.set(0);
  }

  return (
    <div style={{ perspective: 900 }}>
      <motion.div
        onMouseMove={handleMove}
        onMouseLeave={reset}
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: Math.min(index * 0.04, 0.32), type: "spring", stiffness: 220, damping: 22 }}
        whileHover={{ scale: 1.015 }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d", ...style }}
        className={className}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Vertical run of spiral rings — used along the top of "pages" and down the spine. */
function SpiralRings({ count, className, style }: { count: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="rounded-full block"
          style={{ width: 11, height: 11, background: tokens.color.paper, border: `2px solid ${tokens.color.ink}55`, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.25)" }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* left page — profile card                                              */
/* -------------------------------------------------------------------- */

function ProfileCard({ profile, loading }: { profile: Profile | null; loading: boolean }) {
  return (
    <div
      className="relative rounded-lg overflow-hidden border"
      style={{ background: "#FBF7EC", borderColor: "#DCD3B8", boxShadow: "0 1px 2px rgba(60,50,30,0.06), 0 10px 24px -14px rgba(60,50,30,0.35)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-5 flex items-center justify-evenly px-4" style={{ background: "#F1E9D2", borderBottom: "1px dashed #C9BE9C" }}>
        {Array.from({ length: 9 }).map((_, h) => (
          <span key={h} className="rounded-full" style={{ width: 6, height: 6, background: "#FBF7EC", border: "1px solid #C9BE9C" }} />
        ))}
      </div>

      <div
        className="absolute -right-3 top-3 opacity-80"
        style={{ width: 46, height: 18, background: tokens.color.amber, transform: "rotate(45deg)", boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
      />

      {loading || !profile ? (
        <div className="pt-11 pb-6 px-6">
          <Loading text="opening your page…" />
        </div>
      ) : (
        <div className="pt-9 pb-5 px-5">
          <div className="flex items-center gap-3.5">
            <div
              className="shrink-0 rounded-full flex items-center justify-center text-white"
              style={{
                width: 60,
                height: 60,
                background: tokens.color.periwinkle,
                border: "3px solid #fff",
                outline: "1px solid #DCD3B8",
                fontFamily: tokens.font.display,
                fontWeight: 700,
                fontSize: 22,
                boxShadow: "0 2px 5px rgba(0,0,0,0.18)",
                transform: "rotate(-2deg)",
              }}
            >
              {(profile.display_name || profile.username).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold truncate leading-tight" style={{ fontFamily: tokens.font.display, color: "#3A3327" }}>
                {profile.display_name || `@${profile.username}`}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: tokens.color.inkSoft, fontFamily: "monospace" }}>
                @{profile.username}
              </p>
            </div>
          </div>

          <div
            className="mt-3.5 pl-3 py-2 text-[13px] leading-[19px]"
            style={{
              color: "#5B5240",
              backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 18px, rgba(60,50,30,0.08) 19px)",
              minHeight: 38,
            }}
          >
            {profile.bio || "no bio yet — a person of mystery"}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* left page — quick stats, washi-tape tags                              */
/* -------------------------------------------------------------------- */

function StatTag({ label, value, color, delay }: { label: string; value: number | null; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: [-2.5, 2, -2.5][Math.floor(delay * 10) % 3] }}
      transition={{ delay, type: "spring", stiffness: 240, damping: 20 }}
      className="flex-1 min-w-[86px] rounded px-3 py-2.5 text-center relative"
      style={{ background: `${color}20`, border: `1px dashed ${color}` }}
    >
      <p className="text-lg leading-none" style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}>
        {value === null ? "—" : value}
      </p>
      <p className="text-[10px] mt-1 uppercase tracking-wide" style={{ color: tokens.color.inkSoft }}>
        {label}
      </p>
    </motion.div>
  );
}

/* -------------------------------------------------------------------- */
/* left page — compose a note for your own wall                         */
/* -------------------------------------------------------------------- */

function ComposeScrap({ onPost }: { onPost: (content: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [posting, setPosting] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    await onPost(trimmed);
    setText("");
    setPosting(false);
    setFocused(false);
  }

  return (
    <motion.div
      animate={
        prefersReducedMotion
          ? {}
          : focused
            ? { rotateX: -3, y: -5, scale: 1.012, boxShadow: "0 22px 34px rgba(43,42,40,0.2)" }
            : { rotateX: 0, y: 0, scale: 1, boxShadow: "0 8px 16px rgba(43,42,40,0.1)" }
      }
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      style={{ transformPerspective: 800, transformStyle: "preserve-3d" }}
      className="relative rounded-lg pt-4 px-4 pb-4"
    >
      <div
        className="absolute inset-0 rounded-lg -z-10"
        style={{
          background: "#FEFCF6",
          backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 20px, rgba(120,140,180,0.22) 21px)",
          border: "1px solid #E4E0D3",
        }}
      />
      <div className="flex items-center gap-1.5 mb-2">
        <PenLine size={13} style={{ color: tokens.color.periwinkle }} />
        <p className="text-[11px] uppercase tracking-wide" style={{ color: tokens.color.inkSoft, letterSpacing: "0.08em" }}>
          write on your wall
        </p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => !text && setFocused(false)}
        placeholder="what's on your mind today…"
        rows={focused ? 3 : 2}
        maxLength={280}
        className="w-full resize-none bg-transparent outline-none text-sm leading-[20px]"
        style={{ color: tokens.color.ink, fontFamily: tokens.font.display }}
      />
      <AnimatePresence>
        {(focused || text) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between mt-2 overflow-hidden"
          >
            <span className="text-[10px]" style={{ color: tokens.color.inkSoft }}>
              {text.length}/280
            </span>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={submit}
              disabled={!text.trim() || posting}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              style={{ background: tokens.color.periwinkle }}
            >
              {posting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              pin it up
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* -------------------------------------------------------------------- */
/* left page — friend requests                                           */
/* -------------------------------------------------------------------- */

function FriendRequestRow({ req, onRespond }: { req: FriendRequest; onRespond: (id: string, accept: boolean) => void }) {
  const name = req.requester?.display_name || req.requester?.username || "someone";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, transition: { duration: 0.18 } }}
      className="flex items-center gap-2.5 py-2"
    >
      <div
        className="shrink-0 rounded-full flex items-center justify-center text-white text-[11px]"
        style={{ width: 30, height: 30, background: tokens.color.mint, fontFamily: tokens.font.display, fontWeight: 700 }}
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
      <p className="text-xs truncate flex-1" style={{ color: tokens.color.ink }}>
        {name} <span style={{ color: tokens.color.inkSoft }}>wants to be friends</span>
      </p>
      <button
        type="button"
        aria-label={`Accept ${name}`}
        onClick={() => onRespond(req.id, true)}
        className="shrink-0 rounded-full flex items-center justify-center"
        style={{ width: 26, height: 26, background: `${tokens.color.mint}25`, color: tokens.color.mint }}
      >
        <UserCheck size={13} />
      </button>
      <button
        type="button"
        aria-label={`Decline ${name}`}
        onClick={() => onRespond(req.id, false)}
        className="shrink-0 rounded-full flex items-center justify-center"
        style={{ width: 26, height: 26, background: `${PINK}20`, color: PINK }}
      >
        <XIcon size={13} />
      </button>
    </motion.div>
  );
}

/* -------------------------------------------------------------------- */
/* left page — your communities, mini ticket stubs                       */
/* -------------------------------------------------------------------- */

function MiniTicket({ community, color }: { community: MiniCommunity; color: string }) {
  return (
    <div className="relative rounded-md border overflow-hidden flex shrink-0 w-[168px]" style={{ background: "#fff", borderColor: "#E4E0D3" }}>
      <div className="flex-1 min-w-0 px-2.5 py-2">
        <p className="text-[11.5px] font-semibold truncate" style={{ color: tokens.color.ink }}>
          {community.name}
        </p>
        <p className="text-[10px] truncate" style={{ color: tokens.color.inkSoft }}>
          {community.description || "no description yet"}
        </p>
      </div>
      <div className="relative w-0 shrink-0">
        <div className="absolute inset-y-1.5 left-0 border-l-2 border-dashed" style={{ borderColor: "#D8D0BA" }} />
      </div>
      <div className="w-8 shrink-0 flex items-center justify-center" style={{ background: `${color}18` }}>
        <Ticket size={12} style={{ color, opacity: 0.7 }} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* right page — a single scrap on the wall                               */
/* -------------------------------------------------------------------- */

const TORN_EDGES = [
  "polygon(0% 0%,100% 0%,100% 95%,93% 100%,86% 96%,79% 100%,72% 95%,65% 100%,58% 96%,51% 100%,44% 95%,37% 100%,30% 96%,23% 100%,16% 95%,9% 100%,2% 96%,0% 98%)",
  "polygon(0% 0%,100% 0%,100% 97%,90% 92%,82% 98%,74% 93%,66% 99%,58% 94%,50% 100%,42% 95%,34% 99%,26% 94%,18% 98%,10% 93%,0% 96%)",
];
const PAPER_STOCKS = [
  { bg: "#FEFCF6", texture: "none" },
  { bg: "#FFF6D8", texture: "repeating-linear-gradient(to bottom, transparent, transparent 20px, rgba(120,140,180,0.24) 21px)" },
  { bg: "#EAF6EF", texture: "linear-gradient(rgba(60,140,120,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(60,140,120,0.12) 1px, transparent 1px)" },
];

function FeedItem({ scrap, index, onOpenProfile }: { scrap: FeedScrap; index: number; onOpenProfile: (e: React.MouseEvent, username: string) => void }) {
  const paper = PAPER_STOCKS[index % PAPER_STOCKS.length];
  const pinColor = BANNER_COLORS[index % BANNER_COLORS.length];
  const rotate = [-1.4, 1.1, -0.8, 1.6][index % 4];

  return (
    <TiltCard index={index}>
      <motion.button
        type="button"
        onClick={(e) => scrap.author && onOpenProfile(e, scrap.author.username)}
        animate={{ rotate }}
        whileHover={{ rotate: 0 }}
        className="relative w-full text-left pt-5 px-4 pb-6 rounded-sm"
        style={{
          background: paper.bg,
          backgroundImage: paper.texture,
          backgroundSize: "20px 20px",
          clipPath: TORN_EDGES[index % TORN_EDGES.length],
          boxShadow: "0 8px 16px rgba(43,42,40,0.1)",
        }}
      >
        <span
          className="absolute left-6 -top-1.5 rounded-full pointer-events-none"
          style={{ width: 11, height: 11, background: `radial-gradient(circle at 35% 30%, #fff8, ${pinColor})`, boxShadow: "0 3px 4px rgba(0,0,0,0.35)" }}
        />
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="rounded-full flex items-center justify-center text-white shrink-0"
            style={{ width: 18, height: 18, background: tokens.color.mint, fontSize: 9, fontFamily: tokens.font.display, fontWeight: 700 }}
          >
            {(scrap.author?.username ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <span className="text-[11px] truncate" style={{ color: tokens.color.inkSoft }}>
            @{scrap.author?.username ?? "someone"}
            {scrap.recipient && scrap.recipient.username !== scrap.author?.username ? ` → ${scrap.recipient.display_name || `@${scrap.recipient.username}`}` : ""}
          </span>
        </div>
        <p className="text-sm leading-[21px]" style={{ color: tokens.color.ink, fontFamily: tokens.font.display }}>
          {scrap.content || `[${scrap.type}]`}
        </p>
      </motion.button>
    </TiltCard>
  );
}

/* -------------------------------------------------------------------- */
/* main page                                                             */
/* -------------------------------------------------------------------- */

export default function HomeFeedPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [feed, setFeed] = useState<FeedScrap[] | null>(null);
  const [feedPage, setFeedPage] = useState(0);
  const [feedDone, setFeedDone] = useState(false);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[] | null>(null);
  const [communities, setCommunities] = useState<MiniCommunity[] | null>(null);
  const [stats, setStats] = useState<{ friends: number | null; scraps: number | null; communities: number | null }>({
    friends: null,
    scraps: null,
    communities: null,
  });

  // ---- living background parallax, same feel as explore, kept subtle ----
  const bgX = useMotionValue(0);
  const bgY = useMotionValue(0);
  const bgSpringX = useSpring(bgX, { stiffness: 40, damping: 20 });
  const bgSpringY = useSpring(bgY, { stiffness: 40, damping: 20 });
  useEffect(() => {
    if (prefersReducedMotion) return;
    function onMove(e: MouseEvent) {
      bgX.set(((e.clientX / window.innerWidth - 0.5) * 2) * -8);
      bgY.set(((e.clientY / window.innerHeight - 0.5) * 2) * -8);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [prefersReducedMotion, bgX, bgY]);

  const onOpenProfile = useCallback(
    (e: React.MouseEvent, username: string) => {
      e.preventDefault();
      router.push(`/${username}`);
    },
    [router]
  );

  // ---- bootstrap: who am I, then everything else ----
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .eq("id", userId)
      .single()
      .then(({ data }) => !cancelled && setProfile((data as any) ?? null));

    supabase
      .from("friendships")
      .select("id, requester:profiles!friendships_requester_id_fkey(id, username, display_name)")
      .eq("addressee_id", userId)
      .eq("status", "pending")
      .then(({ data }) => !cancelled && setRequests((data as any) ?? []));

    supabase
      .from("community_members")
      .select("community:communities(id, name, description)")
      .eq("user_id", userId)
      .limit(4)
      .then(({ data }) => !cancelled && setCommunities(((data as any[]) ?? []).map((r) => r.community).filter(Boolean)));

    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .then(({ count }) => !cancelled && setStats((s) => ({ ...s, friends: count ?? 0 })));

    supabase
      .from("scraps")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .then(({ count }) => !cancelled && setStats((s) => ({ ...s, scraps: count ?? 0 })));

    supabase
      .from("community_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .then(({ count }) => !cancelled && setStats((s) => ({ ...s, communities: count ?? 0 })));

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loadFeed = useCallback(
    async (page: number) => {
      if (!userId) return;
      const supabase = createClient();
      const from = page * PAGE_SIZE;
      const { data } = await supabase
        .from("scraps")
        .select(
          "id, type, content, created_at, author:profiles!scraps_author_id_fkey(username, display_name), recipient:profiles!scraps_recipient_id_fkey(username, display_name)"
        )
        .or(`recipient_id.eq.${userId},author_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      const rows = (data as any) ?? [];
      setFeed((prev) => (page === 0 ? rows : [...(prev ?? []), ...rows]));
      if (rows.length < PAGE_SIZE) setFeedDone(true);
    },
    [userId]
  );

  useEffect(() => {
    if (userId) loadFeed(0);
  }, [userId, loadFeed]);

  async function turnThePage() {
    if (feedLoadingMore || feedDone) return;
    setFeedLoadingMore(true);
    const next = feedPage + 1;
    await loadFeed(next);
    setFeedPage(next);
    setFeedLoadingMore(false);
  }

  async function respondToRequest(id: string, accept: boolean) {
    setRequests((prev) => (prev ?? []).filter((r) => r.id !== id));
    const supabase = createClient();
    if (accept) {
      await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
      setStats((s) => (s.friends === null ? s : { ...s, friends: s.friends + 1 }));
    } else {
      await supabase.from("friendships").delete().eq("id", id);
    }
  }

  async function postScrap(content: string) {
    if (!userId || !profile) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("scraps")
      .insert({ author_id: userId, recipient_id: userId, type: "status", content })
      .select("id, type, content, created_at")
      .single();

    const optimistic: FeedScrap = {
      id: (data as any)?.id ?? `local-${Date.now()}`,
      type: "status",
      content,
      created_at: new Date().toISOString(),
      author: { username: profile.username, display_name: profile.display_name },
      recipient: { username: profile.username, display_name: profile.display_name },
    };
    setFeed((prev) => [optimistic, ...(prev ?? [])]);
    setStats((s) => (s.scraps === null ? s : { ...s, scraps: s.scraps + 1 }));
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: "#F7F2E3", fontFamily: tokens.font.body, color: tokens.color.ink }}
    >
      {/* living background — grain + soft blobs, kept quiet since this page is visited often */}
      <motion.div
        style={{ x: prefersReducedMotion ? 0 : bgSpringX, y: prefersReducedMotion ? 0 : bgSpringY }}
        className="absolute -inset-8 pointer-events-none opacity-30"
      >
        <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${tokens.color.ink}0a 1px, transparent 1px)`, backgroundSize: "18px 18px" }} />
      </motion.div>
      <motion.div style={{ x: prefersReducedMotion ? 0 : bgSpringX, y: prefersReducedMotion ? 0 : bgSpringY }} className="absolute inset-0 pointer-events-none">
        <div
          className="absolute rounded-full opacity-20"
          style={{ width: 260, height: 260, top: "-8%", left: "-10%", background: tokens.color.mint, filter: "blur(70px)" }}
        />
        <div
          className="absolute rounded-full opacity-20"
          style={{ width: 280, height: 280, bottom: "-12%", right: "-10%", background: PINK, filter: "blur(80px)" }}
        />
      </motion.div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* header + retro status ticker */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-7">
          <div>
            <p className="text-2xl sm:text-3xl" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
              {profile ? `hey, ${profile.display_name || profile.username}` : "your notebook"}
            </p>
            <p className="text-sm mt-0.5" style={{ color: tokens.color.inkSoft }}>
              here's what's pinned up today
            </p>
          </div>
          <div
            className="rounded-md px-3 py-2 flex items-center gap-2"
            style={{ background: "#0D0D0D", fontFamily: "'VT323', monospace" }}
          >
            <span className="rounded-full" style={{ width: 6, height: 6, background: "#8AF5A3", boxShadow: "0 0 6px #8AF5A3" }} />
            <span style={{ color: "#8AF5A3", fontSize: 16, lineHeight: 1 }}>
              {requests === null ? "checking notifications" : `${requests.length} friend request${requests.length === 1 ? "" : "s"} waiting`}
              <span style={{ opacity: 0.6 }}>_</span>
            </span>
          </div>
        </div>

        {/* the open notebook */}
        <div className="relative grid grid-cols-1 md:grid-cols-[340px_1fr] gap-8 md:gap-14">
          {/* spine, desktop only */}
          <div className="hidden md:flex absolute top-0 bottom-0 flex-col items-center gap-3 py-2 pointer-events-none" style={{ left: "calc(340px + 1.75rem)" }}>
            <div className="flex-1 w-px" style={{ background: `repeating-linear-gradient(to bottom, ${tokens.color.ink}33 0, ${tokens.color.ink}33 6px, transparent 6px, transparent 12px)` }} />
            <SpiralRings count={10} className="flex flex-col gap-2.5 absolute inset-y-0 py-4" />
          </div>

          {/* ---------------- left page ---------------- */}
          <div className="space-y-5 relative">
            <SpiralRings count={7} className="hidden md:flex justify-evenly px-2 -mt-2 mb-1" />
            <ProfileCard profile={profile} loading={!userId || (userId !== null && profile === null)} />

            <div className="flex gap-2.5">
              <StatTag label="friends" value={stats.friends} color={tokens.color.periwinkle} delay={0.05} />
              <StatTag label="scraps" value={stats.scraps} color={PINK} delay={0.12} />
              <StatTag label="clubs" value={stats.communities} color={tokens.color.mint} delay={0.19} />
            </div>

            <ComposeScrap onPost={postScrap} />

            {/* friend requests */}
            <div className="rounded-lg border px-4 py-3.5" style={{ background: "#fff", borderColor: "#E4E0D3" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <UserPlus size={13} style={{ color: tokens.color.periwinkle }} />
                <p className="text-[11px] uppercase tracking-wide" style={{ color: tokens.color.inkSoft, letterSpacing: "0.08em" }}>
                  friend requests
                </p>
              </div>
              {requests === null ? (
                <Loading text="checking the mailbox…" />
              ) : requests.length === 0 ? (
                <Empty text="no requests right now" />
              ) : (
                <div className="divide-y" style={{ borderColor: "#EFEAD9" }}>
                  <AnimatePresence>
                    {requests.map((r) => (
                      <FriendRequestRow key={r.id} req={r} onRespond={respondToRequest} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* your communities */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
                <Users2 size={13} style={{ color: tokens.color.mint }} />
                <p className="text-[11px] uppercase tracking-wide" style={{ color: tokens.color.inkSoft, letterSpacing: "0.08em" }}>
                  your communities
                </p>
              </div>
              {communities === null ? (
                <Loading text="loading your clubs…" />
              ) : communities.length === 0 ? (
                <Empty text="you haven't joined any yet" />
              ) : (
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {communities.map((c, i) => (
                    <MiniTicket key={c.id} community={c} color={BANNER_COLORS[i % BANNER_COLORS.length]} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ---------------- right page — the wall ---------------- */}
          <div>
            <SpiralRings count={11} className="hidden md:flex justify-evenly px-2 -mt-2 mb-4" />
            <div className="flex items-center gap-1.5 mb-4 md:mb-3 px-0.5">
              <p className="text-base" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
                the wall
              </p>
            </div>

            {feed === null ? (
              <Loading text="gathering your scraps…" />
            ) : feed.length === 0 ? (
              <Empty text="nothing pinned up yet — write the first scrap" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {feed.map((s, i) => (
                  <FeedItem key={s.id} scrap={s} index={i} onOpenProfile={onOpenProfile} />
                ))}
              </div>
            )}

            {feed && feed.length > 0 && !feedDone && (
              <div className="flex justify-center mt-7">
                <motion.button
                  type="button"
                  onClick={turnThePage}
                  disabled={feedLoadingMore}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium disabled:opacity-60"
                  style={{ background: "#fff", border: "1.5px solid #E4E0D3", color: tokens.color.inkSoft }}
                >
                  {feedLoadingMore ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <motion.span whileTap={{ rotateY: 180 }} transition={{ duration: 0.4 }} style={{ display: "flex" }}>
                      <ChevronDown size={13} />
                    </motion.span>
                  )}
                  turn the page
                </motion.button>
              </div>
            )}
            {feedDone && feed && feed.length > 0 && (
              <p className="text-center text-[11px] mt-7" style={{ color: tokens.color.inkSoft }}>
                — end of the notebook —
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`.scrollbar-none::-webkit-scrollbar { display: none; } .scrollbar-none { scrollbar-width: none; }`}</style>
    </div>
  );
}