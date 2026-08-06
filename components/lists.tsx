"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Ticket, UserPlus, Check, Loader2, Users2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tokens } from "@/lib/scrapbook-theme";

type PersonRow = { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null };
type ScrapRow = {
    id: string;
    type: string;
    content: string | null;
    created_at: string;
    author: { username: string } | null;
    recipient: { username: string; display_name: string | null } | null;
};
type CommunityRow = { id: string; name: string; description: string | null; member_count: number };

const BANNER_COLORS = [tokens.color.periwinkle, tokens.color.pink, tokens.color.amber, tokens.color.mint];

export function ListLoading({ text }: { text: string }) {
    return (
        <div className="flex items-center justify-center gap-2 py-14" style={{ color: tokens.color.inkSoft }}>
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">{text}</span>
        </div>
    );
}

export function ListEmpty({ text }: { text: string }) {
    return (
        <p className="text-xs text-center py-14" style={{ color: tokens.color.inkSoft }}>
            {text}
        </p>
    );
}

/* -------------------------------------------------------------------- */
/* shared 3D-tilt card wrapper — mouse-driven rotateX/rotateY, same      */
/* spring feel as the login card, just scaled down for a grid item      */
/* -------------------------------------------------------------------- */

function TiltCard({
    children,
    index,
    className,
    style,
}: {
    children: React.ReactNode;
    index: number;
    className?: string;
    style?: React.CSSProperties;
}) {
    const mvX = useMotionValue(0);
    const mvY = useMotionValue(0);
    const rotateX = useSpring(useTransform(mvY, [-60, 60], [8, -8]), { stiffness: 220, damping: 20 });
    const rotateY = useSpring(useTransform(mvX, [-60, 60], [-8, 8]), { stiffness: 220, damping: 20 });

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
                initial={{ opacity: 0, y: 16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: Math.min(index * 0.05, 0.4), type: "spring", stiffness: 220, damping: 22 }}
                whileHover={{ scale: 1.02 }}
                style={{ rotateX, rotateY, transformStyle: "preserve-3d", ...style }}
                className={className}
            >
                {children}
            </motion.div>
        </div>
    );
}

/* -------------------------------------------------------------------- */
/* people                                                                 */
/* -------------------------------------------------------------------- */

export function PeopleList({ currentUserId, onOpenProfile }: { currentUserId?: string; onOpenProfile: (e: React.MouseEvent, username: string) => void }) {
    const [data, setData] = useState<PersonRow[] | null>(null);
    const [requested, setRequested] = useState<Set<string>>(new Set());

    useEffect(() => {
        let cancelled = false;
        const supabase = createClient();
        supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, bio")
            .neq("id", currentUserId ?? "")
            .order("created_at", { ascending: false })
            .limit(30)
            .then(({ data }) => {
                if (!cancelled) setData((data as any) ?? []);
            });
        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    async function addFriend(targetId: string) {
        if (!currentUserId || requested.has(targetId)) return;
        setRequested((r) => new Set(r).add(targetId));
        const supabase = createClient();
        await supabase.from("friendships").insert({ requester_id: currentUserId, addressee_id: targetId, status: "pending" });
    }

    if (data === null) return <ListLoading text="finding people…" />;
    if (data.length === 0) return <ListEmpty text="no one new to meet right now" />;

    // Slight per-card "pinned to a corkboard" rotation, deterministic per index so it doesn't jitter on re-render.
    const microTilt = (i: number) => [-1.4, 1.1, -0.6, 1.6, -1.8, 0.8][i % 6];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((p, i) => {
                const isRequested = requested.has(p.id);
                const accent = BANNER_COLORS[i % BANNER_COLORS.length];

                return (
                    <TiltCard
                        key={p.id}
                        index={i}
                        className="relative rounded-lg overflow-hidden border"
                        style={{
                            background: "#FBF7EC",
                            borderColor: "#DCD3B8",
                            boxShadow: "0 1px 2px rgba(60,50,30,0.06), 0 10px 24px -14px rgba(60,50,30,0.35)",
                            transform: `rotate(${microTilt(i)}deg)`,
                        }}
                    >
                        {/* spiral binding strip */}
                        <div
                            className="absolute top-0 left-0 right-0 h-5 flex items-center justify-evenly px-4"
                            style={{ background: "#F1E9D2", borderBottom: "1px dashed #C9BE9C" }}
                        >
                            {Array.from({ length: 9 }).map((_, h) => (
                                <span
                                    key={h}
                                    className="rounded-full"
                                    style={{
                                        width: 6,
                                        height: 6,
                                        background: "#FBF7EC",
                                        border: "1px solid #C9BE9C",
                                        boxShadow: "inset 0 1px 1px rgba(0,0,0,0.15)",
                                    }}
                                />
                            ))}
                        </div>

                        {/* washi tape corner accent */}
                        <div
                            className="absolute -right-3 top-3 opacity-80"
                            style={{
                                width: 46,
                                height: 18,
                                background: accent,
                                transform: "rotate(45deg)",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                            }}
                        />

                        {/* red notebook margin rule */}
                        <div className="absolute left-9 top-5 bottom-0 w-px" style={{ background: "rgba(214,92,79,0.35)" }} />

                        <button
                            type="button"
                            onClick={(e) => onOpenProfile(e, p.username)}
                            className="w-full text-left pt-9 pb-4 pl-14 pr-5"
                        >
                            <div className="flex items-start gap-3.5">
                                {/* pinned polaroid-style avatar */}
                                <div
                                    className="shrink-0 rounded-full flex items-center justify-center text-white"
                                    style={{
                                        width: 56,
                                        height: 56,
                                        background: accent,
                                        border: "3px solid #fff",
                                        outline: "1px solid #DCD3B8",
                                        fontFamily: tokens.font.display,
                                        fontWeight: 700,
                                        fontSize: 20,
                                        boxShadow: "0 2px 5px rgba(0,0,0,0.18)",
                                        transform: `rotate(${-microTilt(i) * 1.4}deg)`,
                                    }}
                                >
                                    {(p.display_name || p.username).slice(0, 1).toUpperCase()}
                                </div>

                                <div className="min-w-0 pt-1">
                                    <p
                                        className="text-base font-semibold truncate leading-tight"
                                        style={{ fontFamily: tokens.font.display, color: "#3A3327" }}
                                    >
                                        {p.display_name || `@${p.username}`}
                                    </p>
                                    <p className="text-xs truncate mt-0.5 tracking-wide" style={{ color: tokens.color.inkSoft, fontFamily: "monospace" }}>
                                        @{p.username}
                                    </p>
                                </div>
                            </div>

                            {/* bio on faint ruled paper */}
                            <div
                                className="mt-3.5 pl-3 py-2 text-[13px] leading-[19px]"
                                style={{
                                    color: "#5B5240",
                                    backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 18px, rgba(60,50,30,0.08) 19px)",
                                    minHeight: 38,
                                }}
                            >
                                {p.bio || "no bio yet — a person of mystery"}
                            </div>
                        </button>

                        <div className="px-5 pb-5 pt-1">
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.94 }}
                                onClick={() => addFriend(p.id)}
                                disabled={isRequested}
                                aria-label={isRequested ? `Friend request sent to ${p.display_name || p.username}` : `Add ${p.display_name || p.username} as a friend`}
                                className="w-full flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium disabled:opacity-70 transition-colors"
                                style={{
                                    background: isRequested ? tokens.color.mint : tokens.color.periwinkle,
                                    color: "#fff",
                                    border: "1.5px dashed rgba(255,255,255,0.55)",
                                    minHeight: 44,
                                }}
                            >
                                {isRequested ? <Check size={14} /> : <UserPlus size={14} />}
                                {isRequested ? "requested" : "add friend"}
                            </motion.button>
                        </div>
                    </TiltCard>
                );
            })}
        </div>
    );
}

/* -------------------------------------------------------------------- */
/* scraps — pinned-paper corkboard look                                  */
/* -------------------------------------------------------------------- */

export function ScrapsList({ onOpenProfile }: { onOpenProfile: (e: React.MouseEvent, username: string) => void }) {
    const [data, setData] = useState<ScrapRow[] | null>(null);
    const ROTATIONS = [-3, 2, -1.5, 2.5, -2, 1, -2.5, 1.5];

    // Torn bottom-edge variants — zigzag clip-paths so each note reads as a physically torn scrap, not a clean rectangle.
    const TORN_EDGES = [
        "polygon(0% 0%,100% 0%,100% 92%,92% 98%,84% 93%,76% 99%,68% 94%,60% 100%,52% 95%,44% 99%,36% 93%,28% 98%,20% 94%,12% 100%,4% 95%,0% 99%)",
        "polygon(0% 0%,100% 0%,100% 96%,90% 91%,82% 97%,74% 92%,66% 98%,58% 93%,50% 99%,42% 94%,34% 100%,26% 95%,18% 99%,10% 92%,0% 97%)",
        "polygon(0% 0%,100% 0%,100% 94%,93% 99%,85% 95%,77% 100%,69% 96%,61% 98%,53% 93%,45% 99%,37% 94%,29% 100%,21% 96%,13% 98%,5% 93%,0% 96%)",
    ];

    // Distinct paper stock per note — reads as an actual pile of scrap paper rather than uniform cards.
    const PAPER_STOCKS = [
        { bg: "#FEFCF6", texture: "none" },
        { bg: "#FFF6D8", texture: "repeating-linear-gradient(to bottom, transparent, transparent 20px, rgba(120,140,180,0.28) 21px)" },
        { bg: "#EAF6EF", texture: "linear-gradient(rgba(60,140,120,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(60,140,120,0.14) 1px, transparent 1px)" },
        { bg: "#F3EBDB", texture: "repeating-linear-gradient(115deg, transparent, transparent 3px, rgba(120,95,60,0.05) 4px)" },
    ];

    useEffect(() => {
        let cancelled = false;
        const supabase = createClient();
        supabase
            .from("scraps")
            .select(
                "id, type, content, created_at, author:profiles!scraps_author_id_fkey(username), recipient:profiles!scraps_recipient_id_fkey(username, display_name)"
            )
            .order("created_at", { ascending: false })
            .limit(30)
            .then(({ data }) => {
                if (!cancelled) setData((data as any) ?? []);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (data === null) return <ListLoading text="gathering fresh scraps…" />;
    if (data.length === 0) return <ListEmpty text="the wall is quiet right now" />;

    return (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
            {data.map((s, i) => {
                const rotate = ROTATIONS[i % ROTATIONS.length];
                const paper = PAPER_STOCKS[i % PAPER_STOCKS.length];
                const pinColor = BANNER_COLORS[i % BANNER_COLORS.length];

                return (
                    <motion.button
                        key={s.id}
                        type="button"
                        onClick={(e) => s.recipient && onOpenProfile(e, s.recipient.username)}
                        initial={{ opacity: 0, y: -16, rotate: 0 }}
                        animate={{ opacity: 1, y: 0, rotate }}
                        transition={{ delay: Math.min(i * 0.04, 0.4), type: "spring", stiffness: 240, damping: 22 }}
                        whileHover={{ rotate: 0, scale: 1.035, zIndex: 5, boxShadow: "0 18px 32px rgba(43,42,40,0.2)" }}
                        className="relative w-full text-left mb-5 break-inside-avoid pt-5 px-4 pb-6"
                        style={{
                            background: paper.bg,
                            backgroundImage: paper.texture,
                            backgroundSize: "20px 20px",
                            clipPath: TORN_EDGES[i % TORN_EDGES.length],
                            boxShadow: "0 8px 16px rgba(43,42,40,0.1), 0 1px 0 rgba(0,0,0,0.04)",
                        }}
                    >
                        {/* pushpin, casting a small shadow onto the paper as if stuck through it */}
                        <span
                            className="absolute left-1/2 -top-1.5 -translate-x-1/2 rounded-full pointer-events-none"
                            style={{
                                width: 11,
                                height: 11,
                                background: `radial-gradient(circle at 35% 30%, #fff8, ${pinColor})`,
                                boxShadow: "0 3px 4px rgba(0,0,0,0.35)",
                                border: "1px solid rgba(0,0,0,0.15)",
                            }}
                        />
                        <span
                            className="absolute left-1/2 top-2.5 -translate-x-1/2 rounded-full pointer-events-none opacity-30"
                            style={{ width: 5, height: 5, background: "#000", filter: "blur(1.5px)" }}
                        />

                        <p
                            className="text-sm line-clamp-4"
                            style={{ color: tokens.color.ink, lineHeight: 1.55, fontFamily: tokens.font.display }}
                        >
                            {s.content || `[${s.type}]`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-3.5">
                            <span
                                className="rounded-full flex items-center justify-center text-white shrink-0"
                                style={{ width: 18, height: 18, background: tokens.color.mint, fontSize: 9, fontFamily: tokens.font.display, fontWeight: 700 }}
                            >
                                {(s.author?.username ?? "?").slice(0, 1).toUpperCase()}
                            </span>
                            <span className="text-[11px] truncate" style={{ color: tokens.color.inkSoft }}>
                                @{s.author?.username} → {s.recipient?.display_name || `@${s.recipient?.username}`}
                            </span>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}

/* -------------------------------------------------------------------- */
/* communities                                                            */
/* -------------------------------------------------------------------- */

export function CommunitiesList({ currentUserId }: { currentUserId?: string }) {
    const [data, setData] = useState<CommunityRow[] | null>(null);
    const [joined, setJoined] = useState<Set<string>>(new Set());
    const PAGE_BG = "#F7F2E3"; // matches the app background — used to fake punched notches in the ticket perforation

    useEffect(() => {
        let cancelled = false;
        const supabase = createClient();
        supabase
            .from("communities")
            .select("id, name, description, community_members(count)")
            .order("created_at", { ascending: false })
            .limit(30)
            .then(({ data }) => {
                const shaped = (data as any[])?.map((c) => ({
                    id: c.id,
                    name: c.name,
                    description: c.description,
                    member_count: c.community_members?.[0]?.count ?? 0,
                }));
                if (!cancelled) setData(shaped ?? []);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    async function joinCommunity(communityId: string) {
        if (!currentUserId || joined.has(communityId)) return;
        setJoined((j) => new Set(j).add(communityId));
        const supabase = createClient();
        await supabase.from("community_members").insert({ community_id: communityId, user_id: currentUserId, role: "member" });
        setData((prev) => (prev ? prev.map((c) => (c.id === communityId ? { ...c, member_count: c.member_count + 1 } : c)) : prev));
    }

    if (data === null) return <ListLoading text="loading communities…" />;
    if (data.length === 0) return <ListEmpty text="no communities yet — start one!" />;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {data.map((c, i) => {
                const color = BANNER_COLORS[i % BANNER_COLORS.length];
                const isJoined = joined.has(c.id);
                const fakeMemberCount = Math.min(c.member_count, 5);
                const serial = c.id.replace(/-/g, "").slice(0, 6).toUpperCase();

                return (
                    <TiltCard
                        key={c.id}
                        index={i}
                        className="relative rounded-xl border overflow-hidden flex"
                        style={{ background: "#fff", borderColor: "#E4E0D3", boxShadow: "0 6px 16px rgba(43,42,40,0.1)" }}
                    >
                        {/* main ticket body */}
                        <div className="flex-1 min-w-0 p-4">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div
                                    className="rounded-full flex items-center justify-center text-white shrink-0"
                                    style={{ width: 32, height: 32, background: color, boxShadow: `0 3px 8px ${color}55` }}
                                >
                                    <Users2 size={15} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{c.name}</p>
                                    <p className="text-[10px] tracking-widest uppercase" style={{ color: tokens.color.inkSoft, fontFamily: "monospace" }}>
                                        admit one · no. {serial}
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs line-clamp-2 mt-1.5" style={{ color: tokens.color.inkSoft }}>
                                {c.description || "no description yet"}
                            </p>

                            <div className="flex items-center mt-3.5">
                                {Array.from({ length: fakeMemberCount || 1 }).map((_, idx) => (
                                    <span
                                        key={idx}
                                        className="rounded-full border-2"
                                        style={{
                                            width: 18,
                                            height: 18,
                                            marginLeft: idx === 0 ? 0 : -6,
                                            borderColor: "#fff",
                                            background: BANNER_COLORS[(i + idx) % BANNER_COLORS.length],
                                            zIndex: 5 - idx,
                                        }}
                                    />
                                ))}
                                <span className="text-[11px] ml-2" style={{ color: tokens.color.inkSoft }}>
                                    {c.member_count} member{c.member_count === 1 ? "" : "s"}
                                </span>
                            </div>
                        </div>

                        {/* perforation between ticket body and stub */}
                        <div className="relative w-0 shrink-0">
                            <div className="absolute inset-y-2 left-0 border-l-2 border-dashed" style={{ borderColor: "#D8D0BA" }} />
                            <span
                                className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full"
                                style={{ width: 16, height: 16, background: PAGE_BG, border: "1px solid #E4E0D3" }}
                            />
                            <span
                                className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full"
                                style={{ width: 16, height: 16, background: PAGE_BG, border: "1px solid #E4E0D3" }}
                            />
                        </div>

                        {/* tear-off stub with the join action */}
                        <div
                            className="w-24 sm:w-28 shrink-0 flex flex-col items-center justify-center gap-2 px-2.5 py-4"
                            style={{ background: `${color}14` }}
                        >
                            <Ticket size={16} style={{ color, opacity: 0.6 }} />
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.92 }}
                                onClick={() => joinCommunity(c.id)}
                                disabled={isJoined}
                                aria-label={isJoined ? `Joined ${c.name}` : `Join ${c.name}`}
                                className="text-[11px] font-semibold rounded-full w-full py-2 text-center leading-none"
                                style={{ background: isJoined ? tokens.color.mint : color, color: "#fff", opacity: isJoined ? 0.85 : 1, minHeight: 44 }}
                            >
                                {isJoined ? "joined ✓" : "join"}
                            </motion.button>
                        </div>
                    </TiltCard>
                );
            })}
        </div>
    );
}