"use client";

/**
 * Notifications — "the corkboard"
 * -----------------------------------------------------------------------
 * Same visual language as the notebook home feed / explore / lists:
 * paper stock, spiral rings, pushpins, washi tape, torn edges, TiltCard
 * 3D hover. The metaphor here is a corkboard pinned inside the cover of
 * the notebook — every notification is a little pinned note. You can:
 *   - drag a note sideways to unpin (dismiss) it
 *   - tap the pushpin to toggle read/unread
 *   - flip through category tabs that stick out the side like a
 *     dictionary thumb-index
 *   - stamp "ALL READ" across the board to clear everything at once
 * Realtime: new notifications drop in and swing to a stop, like someone
 * just pinned something up while you were looking.
 * -----------------------------------------------------------------------
 *
 * Assumed schema (adjust the select() calls if yours differs):
 *
 * notifications
 *   id            uuid
 *   recipient_id  uuid
 *   actor_id      uuid            -- who caused it
 *   type          text            -- 'friend_request' | 'friend_accept'
 *                                    | 'scrap' | 'reaction' | 'mention'
 *                                    | 'community_invite'
 *   content       text | null     -- optional preview text
 *   target_id     uuid | null     -- friendship id / scrap id / community id
 *   read          boolean
 *   created_at    timestamptz
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    motion,
    AnimatePresence,
    useReducedMotion,
    useMotionValue,
    useSpring,
    useTransform,
} from "framer-motion";
import { useRouter } from "next/navigation";
import {
    UserPlus,
    UserCheck,
    X as XIcon,
    Users2,
    AtSign,
    Heart,
    MessageSquareText,
    Loader2,
    ChevronDown,
    BellOff,
    Stamp,
    PinOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tokens } from "@/lib/scrapbook-theme";

const PINK = tokens.color.pink ?? "#FF6F91";
const PAGE_SIZE = 10;

/* -------------------------------------------------------------------- */
/* types                                                                  */
/* -------------------------------------------------------------------- */

type NotifType =
    | "friend_request"
    | "friend_accept"
    | "scrap"
    | "reaction"
    | "mention"
    | "community_invite";

type Notification = {
    id: string;
    type: NotifType;
    content: string | null;
    target_id: string | null;
    read: boolean;
    created_at: string;
    actor: { id: string; username: string; display_name: string | null } | null;
};

type FilterKey = "all" | "friends" | "scraps" | "clubs" | "mentions";

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
        <div className="flex flex-col items-center gap-2 py-14" style={{ color: tokens.color.inkSoft }}>
            <BellOff size={20} strokeWidth={1.5} />
            <p className="text-xs text-center">{text}</p>
        </div>
    );
}

/** Vertical run of spiral rings — same piece used across the app. */
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

/** Mouse-driven 3D tilt wrapper. */
function TiltCard({
    children,
    className,
    style,
    disabled,
}: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
}) {
    const mvX = useMotionValue(0);
    const mvY = useMotionValue(0);
    const rotateX = useSpring(useTransform(mvY, [-60, 60], [5, -5]), { stiffness: 220, damping: 20 });
    const rotateY = useSpring(useTransform(mvX, [-60, 60], [-5, 5]), { stiffness: 220, damping: 20 });

    function handleMove(e: React.MouseEvent<HTMLDivElement>) {
        if (disabled) return;
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
                style={{ rotateX: disabled ? 0 : rotateX, rotateY: disabled ? 0 : rotateY, transformStyle: "preserve-3d", ...style }}
                className={className}
            >
                {children}
            </motion.div>
        </div>
    );
}

/* -------------------------------------------------------------------- */
/* per-type meta                                                         */
/* -------------------------------------------------------------------- */

const TYPE_META: Record<
    NotifType,
    { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string; verb: string }
> = {
    friend_request: { icon: UserPlus, color: tokens.color.periwinkle, verb: "wants to be friends" },
    friend_accept: { icon: UserCheck, color: tokens.color.mint, verb: "accepted your friend request" },
    scrap: { icon: MessageSquareText, color: PINK, verb: "left a scrap on your wall" },
    reaction: { icon: Heart, color: PINK, verb: "reacted to your scrap" },
    mention: { icon: AtSign, color: tokens.color.periwinkle, verb: "mentioned you" },
    community_invite: { icon: Users2, color: tokens.color.mint, verb: "invited you to a community" },
};

const FILTERS: { key: FilterKey; label: string; types: NotifType[] | null; color: string }[] = [
    { key: "all", label: "all", types: null, color: tokens.color.ink },
    { key: "friends", label: "friends", types: ["friend_request", "friend_accept"], color: tokens.color.periwinkle },
    { key: "scraps", label: "scraps", types: ["scrap", "reaction"], color: PINK },
    { key: "clubs", label: "clubs", types: ["community_invite"], color: tokens.color.mint },
    { key: "mentions", label: "@you", types: ["mention"], color: tokens.color.amber },
];

function relativeTime(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupLabel(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000);
    if (diffDays <= 0) return "today";
    if (diffDays <= 6) return "this week";
    return "earlier";
}

/* -------------------------------------------------------------------- */
/* index tabs — dictionary thumb-index for filtering                     */
/* -------------------------------------------------------------------- */

function IndexTabs({
    active,
    onChange,
    counts,
}: {
    active: FilterKey;
    onChange: (k: FilterKey) => void;
    counts: Record<FilterKey, number>;
}) {
    return (
        <>
            {/* desktop: tabs sticking off the left edge */}
            <div className="hidden md:flex flex-col gap-2.5 pt-8">
                {FILTERS.map((f) => {
                    const isActive = active === f.key;
                    return (
                        <motion.button
                            key={f.key}
                            type="button"
                            onClick={() => onChange(f.key)}
                            animate={{ x: isActive ? 6 : 0 }}
                            whileHover={{ x: 3 }}
                            transition={{ type: "spring", stiffness: 320, damping: 24 }}
                            className="relative flex items-center gap-1.5 rounded-l-md pl-3 pr-2.5 py-2 text-left"
                            style={{
                                background: isActive ? f.color : "#fff",
                                borderTop: `1px solid #E4E0D3`,
                                borderLeft: `1px solid #E4E0D3`,
                                borderBottom: `1px solid #E4E0D3`,
                                boxShadow: isActive ? "-3px 3px 8px rgba(43,42,40,0.18)" : "-1px 1px 3px rgba(43,42,40,0.08)",
                            }}
                        >
                            <span
                                className="text-[11px] uppercase tracking-wide"
                                style={{
                                    color: isActive ? "#fff" : tokens.color.inkSoft,
                                    fontFamily: tokens.font.display,
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                }}
                            >
                                {f.label}
                            </span>
                            {counts[f.key] > 0 && (
                                <span
                                    className="rounded-full flex items-center justify-center shrink-0"
                                    style={{
                                        minWidth: 15,
                                        height: 15,
                                        padding: "0 3px",
                                        fontSize: 9,
                                        fontWeight: 700,
                                        background: isActive ? "rgba(255,255,255,0.35)" : `${f.color}22`,
                                        color: isActive ? "#fff" : f.color,
                                    }}
                                >
                                    {counts[f.key]}
                                </span>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* mobile: horizontal pill row */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                {FILTERS.map((f) => {
                    const isActive = active === f.key;
                    return (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => onChange(f.key)}
                            className="shrink-0 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-wide flex items-center gap-1.5"
                            style={{
                                fontFamily: tokens.font.display,
                                fontWeight: 700,
                                background: isActive ? f.color : "#fff",
                                color: isActive ? "#fff" : tokens.color.inkSoft,
                                border: `1px solid ${isActive ? f.color : "#E4E0D3"}`,
                            }}
                        >
                            {f.label}
                            {counts[f.key] > 0 && <span style={{ opacity: 0.85 }}>{counts[f.key]}</span>}
                        </button>
                    );
                })}
            </div>
        </>
    );
}

/* -------------------------------------------------------------------- */
/* a single pinned note                                                  */
/* -------------------------------------------------------------------- */

function NotificationNote({
    n,
    rotate,
    onToggleRead,
    onDismiss,
    onOpenProfile,
    onRespondFriend,
    onJoinCommunity,
}: {
    n: Notification;
    rotate: number;
    onToggleRead: (id: string) => void;
    onDismiss: (id: string) => void;
    onOpenProfile: (username: string) => void;
    onRespondFriend: (n: Notification, accept: boolean) => void;
    onJoinCommunity: (n: Notification) => void;
}) {
    const meta = TYPE_META[n.type];
    const Icon = meta.icon;
    const name = n.actor?.display_name || (n.actor?.username ? `@${n.actor.username}` : "someone");

    const x = useMotionValue(0);
    const dragRotate = useTransform(x, [-140, 0, 140], [-10, 0, 10]);
    const dragOpacity = useTransform(x, [-140, -60, 0, 60, 140], [0.3, 1, 1, 1, 0.3]);
    const unpinHintOpacity = useTransform(x, [-140, -40, 0, 40, 140], [1, 0, 0, 0, 1]);
    const [exiting, setExiting] = useState(false);

    function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
        if (Math.abs(info.offset.x) > 110) {
            setExiting(true);
            onDismiss(n.id);
        }
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -26, rotate: 0, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotate, scale: 1 }}
            exit={{ opacity: 0, x: x.get() > 0 ? 220 : -220, rotate: x.get() > 0 ? 20 : -20, transition: { duration: 0.22 } }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            style={{ perspective: 900 }}
        >
            <motion.div
                drag={exiting ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={handleDragEnd}
                style={{ x, rotate: dragRotate, opacity: dragOpacity, transformStyle: "preserve-3d" }}
                whileTap={{ cursor: "grabbing" }}
                className="relative"
            >
                {/* unpin hint revealed while dragging */}
                <motion.div
                    style={{ opacity: unpinHintOpacity }}
                    className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none z-0"
                >
                    <PinOff size={14} style={{ color: tokens.color.inkSoft }} />
                    <span className="text-[11px] uppercase tracking-wide" style={{ color: tokens.color.inkSoft, fontFamily: tokens.font.display, fontWeight: 700 }}>
                        release to unpin
                    </span>
                </motion.div>

                <TiltCard>
                    <div
                        className="relative rounded-md pt-5 px-4 pb-3.5 cursor-grab active:cursor-grabbing"
                        style={{
                            background: n.read ? "#FDFBF3" : "#FFFDF6",
                            border: `1px solid ${n.read ? "#EAE4CF" : "#E4E0D3"}`,
                            boxShadow: n.read ? "0 3px 8px rgba(43,42,40,0.06)" : "0 8px 18px rgba(43,42,40,0.14)",
                        }}
                    >
                        {/* pushpin — click to toggle read state */}
                        <button
                            type="button"
                            aria-label={n.read ? "mark unread" : "mark read"}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleRead(n.id);
                            }}
                            className="absolute left-5 -top-2 rounded-full"
                            style={{
                                width: 13,
                                height: 13,
                                background: n.read
                                    ? "radial-gradient(circle at 35% 30%, #fff8, #B9B2A0)"
                                    : `radial-gradient(circle at 35% 30%, #fff8, ${meta.color})`,
                                boxShadow: n.read ? "0 3px 4px rgba(0,0,0,0.25)" : `0 3px 5px rgba(0,0,0,0.35), 0 0 8px ${meta.color}88`,
                            }}
                        />

                        <div className="flex items-start gap-2.5 pl-2">
                            <span
                                className="shrink-0 rounded-full flex items-center justify-center mt-0.5"
                                style={{ width: 26, height: 26, background: `${meta.color}1c`, color: meta.color }}
                            >
                                <Icon size={13} />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="text-[13.5px] leading-[19px]" style={{ color: tokens.color.ink, fontFamily: tokens.font.display }}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (n.actor?.username) onOpenProfile(n.actor.username);
                                        }}
                                        className="font-semibold underline decoration-dotted underline-offset-2"
                                    >
                                        {name}
                                    </button>{" "}
                                    <span style={{ color: "#5B5240" }}>{meta.verb}</span>
                                </p>

                                {n.content && (
                                    <p className="text-xs mt-1 leading-[18px] italic" style={{ color: tokens.color.inkSoft }}>
                                        "{n.content}"
                                    </p>
                                )}

                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px]" style={{ color: tokens.color.inkSoft, fontFamily: "monospace" }}>
                                        {relativeTime(n.created_at)}
                                    </span>

                                    {n.type === "friend_request" && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRespondFriend(n, true);
                                                }}
                                                className="rounded-full flex items-center justify-center"
                                                style={{ width: 24, height: 24, background: `${tokens.color.mint}22`, color: tokens.color.mint }}
                                                aria-label="accept"
                                            >
                                                <UserCheck size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRespondFriend(n, false);
                                                }}
                                                className="rounded-full flex items-center justify-center"
                                                style={{ width: 24, height: 24, background: `${PINK}1c`, color: PINK }}
                                                aria-label="decline"
                                            >
                                                <XIcon size={12} />
                                            </button>
                                        </div>
                                    )}

                                    {n.type === "community_invite" && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onJoinCommunity(n);
                                            }}
                                            className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
                                            style={{ background: tokens.color.mint }}
                                        >
                                            join
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </TiltCard>
            </motion.div>
        </motion.div>
    );
}

/* -------------------------------------------------------------------- */
/* group divider — washi-tape style date label                           */
/* -------------------------------------------------------------------- */

function GroupDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2.5 mt-6 mb-3 first:mt-0">
            <span
                className="rounded px-2.5 py-1 text-[10px] uppercase tracking-wide shrink-0"
                style={{
                    background: `${tokens.color.amber}2a`,
                    color: "#7A5C1E",
                    fontFamily: tokens.font.display,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    transform: "rotate(-1.5deg)",
                }}
            >
                {label}
            </span>
            <div className="flex-1 h-px" style={{ background: "#E4E0D3" }} />
        </div>
    );
}

/* -------------------------------------------------------------------- */
/* mark-all-read stamp button                                            */
/* -------------------------------------------------------------------- */

function StampButton({ onStamp, disabled }: { onStamp: () => void; disabled: boolean }) {
    const [stamped, setStamped] = useState(false);

    function handleClick() {
        if (disabled) return;
        setStamped(true);
        onStamp();
        setTimeout(() => setStamped(false), 900);
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-45"
                style={{ background: "#fff", border: "1.5px solid #E4E0D3", color: tokens.color.inkSoft }}
            >
                <Stamp size={13} />
                mark all read
            </button>
            <AnimatePresence>
                {stamped && (
                    <motion.div
                        initial={{ opacity: 0, scale: 2.2, rotate: -18 }}
                        animate={{ opacity: 0.9, scale: 1, rotate: -12 }}
                        exit={{ opacity: 0, scale: 1.15, transition: { duration: 0.35 } }}
                        transition={{ type: "spring", stiffness: 300, damping: 16 }}
                        className="absolute -top-2 right-0 pointer-events-none select-none rounded px-3 py-1"
                        style={{
                            border: `2.5px solid ${PINK}`,
                            color: PINK,
                            fontFamily: tokens.font.display,
                            fontWeight: 700,
                            fontSize: 12,
                            letterSpacing: "0.1em",
                            background: "rgba(255,255,255,0.6)",
                        }}
                    >
                        ALL READ
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* -------------------------------------------------------------------- */
/* main page                                                             */
/* -------------------------------------------------------------------- */

export default function NotificationsPage() {
    const router = useRouter();
    const prefersReducedMotion = useReducedMotion();

    const [userId, setUserId] = useState<string | null>(null);
    const [notifs, setNotifs] = useState<Notification[] | null>(null);
    const [page, setPage] = useState(0);
    const [done, setDone] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filter, setFilter] = useState<FilterKey>("all");
    const rotations = useRef<Map<string, number>>(new Map());

    function rotationFor(id: string) {
        if (!rotations.current.has(id)) {
            rotations.current.set(id, [-1.2, 0.9, -0.6, 1.3, -1.6][rotations.current.size % 5]);
        }
        return rotations.current.get(id)!;
    }

    // ---- auth bootstrap ----
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

    const loadPage = useCallback(
        async (p: number) => {
            if (!userId) return;
            const supabase = createClient();
            const from = p * PAGE_SIZE;
            const { data } = await supabase
                .from("notifications")
                .select(
                    "id, type, content, target_id, read, created_at, actor:profiles!notifications_actor_id_fkey(id, username, display_name)"
                )
                .eq("recipient_id", userId)
                .order("created_at", { ascending: false })
                .range(from, from + PAGE_SIZE - 1);

            const rows = (data as any) ?? [];
            setNotifs((prev) => (p === 0 ? rows : [...(prev ?? []), ...rows]));
            if (rows.length < PAGE_SIZE) setDone(true);
        },
        [userId]
    );

    useEffect(() => {
        if (userId) loadPage(0);
    }, [userId, loadPage]);

    // ---- realtime: new notifications drop in live ----
    useEffect(() => {
        if (!userId) return;
        const supabase = createClient();
        const channel = supabase
            .channel(`notifications-page:${userId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
                async (payload) => {
                    const row = payload.new as any;
                    const { data: actor } = await supabase
                        .from("profiles")
                        .select("id, username, display_name")
                        .eq("id", row.actor_id)
                        .single();
                    setNotifs((prev) => [
                        { id: row.id, type: row.type, content: row.content, target_id: row.target_id, read: row.read, created_at: row.created_at, actor: (actor as any) ?? null },
                        ...(prev ?? []),
                    ]);
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    async function turnThePage() {
        if (loadingMore || done) return;
        setLoadingMore(true);
        const next = page + 1;
        await loadPage(next);
        setPage(next);
        setLoadingMore(false);
    }

    async function toggleRead(id: string) {
        const target = (notifs ?? []).find((n) => n.id === id);
        if (!target) return;
        const nextRead = !target.read;
        setNotifs((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, read: nextRead } : n)));
        const supabase = createClient();
        await supabase.from("notifications").update({ read: nextRead }).eq("id", id);
    }

    async function dismiss(id: string) {
        setNotifs((prev) => (prev ?? []).filter((n) => n.id !== id));
        const supabase = createClient();
        await supabase.from("notifications").delete().eq("id", id);
    }

    async function markAllRead() {
        setNotifs((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
        if (!userId) return;
        const supabase = createClient();
        await supabase.from("notifications").update({ read: true }).eq("recipient_id", userId).eq("read", false);
    }

    async function respondFriend(n: Notification, accept: boolean) {
        if (!n.target_id) return;
        setNotifs((prev) => (prev ?? []).filter((x) => x.id !== n.id));
        const supabase = createClient();
        if (accept) {
            await supabase.from("friendships").update({ status: "accepted" }).eq("id", n.target_id);
        } else {
            await supabase.from("friendships").delete().eq("id", n.target_id);
        }
    }

    async function joinCommunity(n: Notification) {
        if (!n.target_id || !userId) return;
        setNotifs((prev) => (prev ?? []).map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        const supabase = createClient();
        await supabase.from("community_members").insert({ community_id: n.target_id, user_id: userId });
        router.push(`/communities/${n.target_id}`);
    }

    const openProfile = useCallback((username: string) => router.push(`/${username}`), [router]);

    const counts = useMemo(() => {
        const c: Record<FilterKey, number> = { all: 0, friends: 0, scraps: 0, clubs: 0, mentions: 0 };
        for (const n of notifs ?? []) {
            if (n.read) continue;
            c.all++;
            for (const f of FILTERS) {
                if (f.types?.includes(n.type)) c[f.key]++;
            }
        }
        return c;
    }, [notifs]);

    const visible = useMemo(() => {
        const active = FILTERS.find((f) => f.key === filter);
        const list = !active?.types ? notifs ?? [] : (notifs ?? []).filter((n) => active.types!.includes(n.type));
        const groups: { label: string; items: Notification[] }[] = [];
        for (const n of list) {
            const label = groupLabel(n.created_at);
            let g = groups.find((x) => x.label === label);
            if (!g) {
                g = { label, items: [] };
                groups.push(g);
            }
            g.items.push(n);
        }
        return groups;
    }, [notifs, filter]);

    // living background parallax, same feel as the rest of the app
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

    return (
        <div className="relative min-h-screen w-full overflow-hidden" style={{ background: "#F7F2E3", fontFamily: tokens.font.body, color: tokens.color.ink }}>
            {/* living background */}
            <motion.div style={{ x: prefersReducedMotion ? 0 : bgSpringX, y: prefersReducedMotion ? 0 : bgSpringY }} className="absolute -inset-8 pointer-events-none opacity-30">
                <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${tokens.color.ink}0a 1px, transparent 1px)`, backgroundSize: "18px 18px" }} />
            </motion.div>
            <motion.div style={{ x: prefersReducedMotion ? 0 : bgSpringX, y: prefersReducedMotion ? 0 : bgSpringY }} className="absolute inset-0 pointer-events-none">
                <div className="absolute rounded-full opacity-20" style={{ width: 260, height: 260, top: "-8%", right: "-8%", background: tokens.color.periwinkle, filter: "blur(70px)" }} />
                <div className="absolute rounded-full opacity-20" style={{ width: 260, height: 260, bottom: "-10%", left: "-10%", background: tokens.color.amber, filter: "blur(80px)" }} />
            </motion.div>

            <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8">
                {/* header + terminal ticker */}
                <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
                    <div>
                        <p className="text-2xl sm:text-3xl" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
                            the corkboard
                        </p>
                        <p className="text-sm mt-0.5" style={{ color: tokens.color.inkSoft }}>
                            everything pinned up for you
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-md px-3 py-2 flex items-center gap-2" style={{ background: "#0D0D0D", fontFamily: "'VT323', monospace" }}>
                            <span
                                className="rounded-full"
                                style={{ width: 6, height: 6, background: counts.all > 0 ? "#8AF5A3" : "#5A5850", boxShadow: counts.all > 0 ? "0 0 6px #8AF5A3" : "none" }}
                            />
                            <span style={{ color: "#8AF5A3", fontSize: 16, lineHeight: 1 }}>
                                {notifs === null ? "scanning the board" : `${counts.all} unread`}
                                <span style={{ opacity: 0.6 }}>_</span>
                            </span>
                        </div>
                        <StampButton onStamp={markAllRead} disabled={!notifs || counts.all === 0} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[104px_1fr] gap-1 md:gap-4">
                    <IndexTabs active={filter} onChange={setFilter} counts={counts} />

                    {/* the board itself */}
                    <div className="relative rounded-lg border pt-2" style={{ background: "#FBF7EC", borderColor: "#DCD3B8", boxShadow: "0 1px 2px rgba(60,50,30,0.06), 0 14px 30px -18px rgba(60,50,30,0.4)" }}>
                        <SpiralRings count={9} className="hidden md:flex justify-evenly px-4 -mt-2 mb-2" />

                        <div className="px-4 sm:px-5 pb-5 pt-2">
                            {notifs === null ? (
                                <Loading text="scanning the board…" />
                            ) : visible.length === 0 ? (
                                <Empty text={filter === "all" ? "the corkboard is bare — nothing pinned up yet" : "nothing here for this filter"} />
                            ) : (
                                <AnimatePresence initial={false}>
                                    {visible.map((group) => (
                                        <div key={group.label}>
                                            <GroupDivider label={group.label} />
                                            <div className="space-y-3.5">
                                                {group.items.map((n) => (
                                                    <NotificationNote
                                                        key={n.id}
                                                        n={n}
                                                        rotate={rotationFor(n.id)}
                                                        onToggleRead={toggleRead}
                                                        onDismiss={dismiss}
                                                        onOpenProfile={openProfile}
                                                        onRespondFriend={respondFriend}
                                                        onJoinCommunity={joinCommunity}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </AnimatePresence>
                            )}

                            {notifs && notifs.length > 0 && !done && filter === "all" && (
                                <div className="flex justify-center mt-6">
                                    <motion.button
                                        type="button"
                                        onClick={turnThePage}
                                        disabled={loadingMore}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium disabled:opacity-60"
                                        style={{ background: "#fff", border: "1.5px solid #E4E0D3", color: tokens.color.inkSoft }}
                                    >
                                        {loadingMore ? (
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
                            {done && notifs && notifs.length > 0 && filter === "all" && (
                                <p className="text-center text-[11px] mt-6" style={{ color: tokens.color.inkSoft }}>
                                    — end of the board —
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`.scrollbar-none::-webkit-scrollbar { display: none; } .scrollbar-none { scrollbar-width: none; }`}</style>
        </div>
    );
}