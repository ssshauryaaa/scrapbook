"use client";

/**
 * Scrapbook — main scraps page (all scraps, one board)
 * -----------------------------------------------------------------------
 * This is the "everything" view: every scrap posted anywhere on the
 * platform, on one big corkboard, newest first, with infinite scroll.
 * It shares the pinned-note visual language from the wall page (so a
 * scrap looks the same wherever it's shown) but each card here reads
 * left -> right as "@author -> @recipient" since there's no single
 * profile context to imply the recipient.
 *
 * Two entry points live in the header, matching your existing routes:
 *   - "leave a scrap"  -> /create
 *   - "explore"        -> /explore/scraps
 * -----------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Pin, Compass, Shuffle, Clock } from "lucide-react";
import { tokens } from "@/lib/scrapbook-theme";
import { createClient } from "@/lib/supabase/client";

const PINK = "#FF6F91";
const PAGE_SIZE = 24;

type ScrapRow = {
    id: string;
    type: string;
    content: string | null;
    created_at: string;
    author: { username: string } | null;
    recipient: { username: string; display_name: string | null } | null;
};

const STOCKS = [
    { bg: "#FEFCF6", accent: tokens.color.periwinkle, lines: true },
    { bg: "#FFF3C4", accent: tokens.color.amber, lines: false },
    { bg: "#FFFFFF", accent: PINK, lines: false, postcard: true },
    { bg: "#EAF6EF", accent: tokens.color.mint, lines: true },
] as const;

const ROTATIONS = [-6, 4, -3, 5, -5, 2, -4, 3, -2, 6, -7, 1];
const DEPTHS = [0, -16, -6, -26, -10, 0, -20, -8, -4, -14];

function timeAgo(iso: string) {
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

function ScrapCard({ scrap, index }: { scrap: ScrapRow; index: number }) {
    const router = useRouter();
    const stock = STOCKS[index % STOCKS.length];
    const rotate = ROTATIONS[index % ROTATIONS.length];
    const depth = DEPTHS[index % DEPTHS.length];
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const ref = useRef<HTMLDivElement>(null);

    function onMove(e: React.MouseEvent<HTMLDivElement>) {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        const px = (e.clientX - box.left) / box.width - 0.5;
        const py = (e.clientY - box.top) / box.height - 0.5;
        setTilt({ x: py * -12, y: px * 14 });
    }

    return (
        <motion.div
            ref={ref}
            onMouseMove={onMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0, rotate, rotateX: tilt.x, rotateY: tilt.y, z: depth }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            whileHover={{ scale: 1.05, z: depth + 36, boxShadow: "0 24px 36px rgba(43,42,40,0.26)" }}
            style={{ transformStyle: "preserve-3d", transformPerspective: 800 }}
            className="relative w-full break-inside-avoid mb-5"
        >
            <button
                type="button"
                onClick={() => scrap.recipient && router.push(`/profile/${scrap.recipient.username}`)}
                className="relative w-full text-left pt-6 px-4 pb-4 rounded-sm"
                style={{
                    background: stock.bg,
                    backgroundImage: stock.lines
                        ? "repeating-linear-gradient(to bottom, transparent, transparent 19px, rgba(60,50,30,0.08) 20px)"
                        : undefined,
                    boxShadow: "0 10px 20px rgba(43,42,40,0.14), 0 1px 0 rgba(0,0,0,0.05)",
                    clipPath: (stock as any).postcard
                        ? "polygon(0% 3%,4% 0%,96% 0%,100% 3%,100% 97%,96% 100%,4% 100%,0% 97%)"
                        : undefined,
                }}
            >
                <span
                    className="absolute left-1/2 -top-2 -translate-x-1/2 rounded-full"
                    style={{
                        width: 13,
                        height: 13,
                        background: `radial-gradient(circle at 35% 30%, #fff9, ${stock.accent})`,
                        boxShadow: "0 3px 5px rgba(0,0,0,0.4)",
                        border: "1px solid rgba(0,0,0,0.15)",
                    }}
                />

                <p className="text-[13.5px] leading-snug break-words" style={{ color: tokens.color.ink, fontFamily: tokens.font.display }}>
                    {scrap.content || "[scrap]"}
                </p>

                <div className="flex items-center justify-between mt-3.5 gap-2">
                    <div className="flex items-center gap-1 min-w-0 text-[11px] truncate" style={{ color: tokens.color.inkSoft }}>
                        <span className="rounded-full flex items-center justify-center text-white shrink-0" style={{ width: 16, height: 16, background: stock.accent, fontSize: 8, fontFamily: tokens.font.display, fontWeight: 700 }}>
                            {(scrap.author?.username ?? "?").slice(0, 1).toUpperCase()}
                        </span>
                        <span className="truncate">@{scrap.author?.username ?? "someone"}</span>
                        <span style={{ opacity: 0.5 }}>→</span>
                        <span className="truncate font-medium" style={{ color: tokens.color.ink }}>
                            {scrap.recipient?.display_name || `@${scrap.recipient?.username ?? "?"}`}
                        </span>
                    </div>
                    <span className="text-[10px] shrink-0" style={{ color: tokens.color.inkSoft, opacity: 0.7 }}>
                        {timeAgo(scrap.created_at)}
                    </span>
                </div>
            </button>
        </motion.div>
    );
}

export default function AllScrapsPage() {
    const router = useRouter();
    const prefersReducedMotion = useReducedMotion();
    const [scraps, setScraps] = useState<ScrapRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [sort, setSort] = useState<"recent" | "shuffle">("recent");
    const cursorRef = useRef<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const loadPage = useCallback(async () => {
        const supabase = createClient();
        let query = supabase
            .from("scraps")
            .select(
                "id, type, content, created_at, author:profiles!scraps_author_id_fkey(username), recipient:profiles!scraps_recipient_id_fkey(username, display_name)"
            )
            .order("created_at", { ascending: false })
            .limit(PAGE_SIZE);

        if (cursorRef.current) query = query.lt("created_at", cursorRef.current);

        const { data } = await query;
        const rows = (data as any as ScrapRow[]) ?? [];
        if (rows.length < PAGE_SIZE) setHasMore(false);
        if (rows.length > 0) cursorRef.current = rows[rows.length - 1].created_at;
        return rows;
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        loadPage().then((rows) => {
            if (!cancelled) {
                setScraps(rows);
                setLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [loadPage]);

    useEffect(() => {
        if (!hasMore || loading) return;
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingMore) {
                    setLoadingMore(true);
                    loadPage().then((rows) => {
                        setScraps((prev) => [...prev, ...rows]);
                        setLoadingMore(false);
                    });
                }
            },
            { rootMargin: "400px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, loadPage]);

    function toggleShuffle() {
        if (sort === "recent") {
            setScraps((prev) => [...prev].sort(() => Math.random() - 0.5));
            setSort("shuffle");
        } else {
            setScraps((prev) => [...prev].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
            setSort("recent");
        }
    }

    return (
        <div className="relative min-h-screen w-full" style={{ background: tokens.color.paper, fontFamily: tokens.font.body }}>
            {/* header */}
            <div className="sticky top-0 z-20 backdrop-blur-sm" style={{ background: `${tokens.color.paper}e6`, borderBottom: `1px dashed ${tokens.color.ink}22` }}>
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <p className="text-xl sm:text-2xl" style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}>
                            scraps
                        </p>
                        <p className="text-xs" style={{ color: tokens.color.inkSoft }}>
                            {loading ? "gathering the pile…" : `every scrap, pinned as it lands`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleShuffle}
                            title={sort === "recent" ? "shuffle the board" : "back to newest first"}
                            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-opacity hover:opacity-70"
                            style={{ background: `${tokens.color.ink}0d`, color: tokens.color.ink, fontFamily: tokens.font.display, fontWeight: 700 }}
                        >
                            {sort === "recent" ? <Shuffle size={13} /> : <Clock size={13} />}
                            {sort === "recent" ? "shuffle" : "newest"}
                        </button>
                        <button
                            onClick={() => router.push("/explore/scraps")}
                            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-opacity hover:opacity-70"
                            style={{ background: `${tokens.color.mint}22`, color: "color-mix(in srgb, " + tokens.color.mint + " 55%, black)", fontFamily: tokens.font.display, fontWeight: 700 }}
                        >
                            <Compass size={13} />
                            explore
                        </button>
                        <button
                            onClick={() => router.push("/create")}
                            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs shadow-sm hover:shadow-md transition-shadow"
                            style={{ background: tokens.color.ink, color: tokens.color.paper, fontFamily: tokens.font.display, fontWeight: 700 }}
                        >
                            <Pin size={13} />
                            leave a scrap
                        </button>
                    </div>
                </div>
            </div>

            {/* the board */}
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
                <div
                    className="relative rounded-2xl p-5 sm:p-8"
                    style={{
                        backgroundImage: `radial-gradient(rgba(43,42,40,0.10) 1px, transparent 1px), radial-gradient(rgba(43,42,40,0.06) 1px, transparent 1px)`,
                        backgroundSize: "9px 9px, 13px 13px",
                        backgroundPosition: "0 0, 4px 6px",
                        background: `radial-gradient(circle at 15% 10%, color-mix(in srgb, ${tokens.color.amber} 18%, ${tokens.color.paper}) 0%, color-mix(in srgb, ${tokens.color.ink} 6%, ${tokens.color.paper}) 100%)`,
                        boxShadow: "inset 0 0 70px rgba(43,42,40,0.16)",
                        border: `10px solid color-mix(in srgb, ${tokens.color.ink} 70%, #6b4a2b)`,
                    }}
                >
                    {loading ? (
                        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="mb-5 rounded-sm animate-pulse break-inside-avoid"
                                    style={{ height: 96 + (i % 3) * 20, background: `${tokens.color.ink}0d` }}
                                />
                            ))}
                        </div>
                    ) : scraps.length === 0 ? (
                        <div className="text-center py-20" style={{ color: tokens.color.inkSoft }}>
                            <p style={{ fontFamily: tokens.font.display, fontWeight: 700, fontSize: 16 }}>the board is empty</p>
                            <p className="text-xs mt-1">be the first to pin something up</p>
                        </div>
                    ) : (
                        <>
                            <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]" style={{ transformStyle: "preserve-3d" }}>
                                <AnimatePresence initial={false}>
                                    {scraps.map((s, i) => (
                                        <ScrapCard key={s.id} scrap={s} index={i} />
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div ref={sentinelRef} className="h-6" />

                            {loadingMore && (
                                <p className="text-center text-xs py-4" style={{ color: tokens.color.inkSoft, fontFamily: "'VT323', monospace", fontSize: 16 }}>
                                    loading more…
                                </p>
                            )}
                            {!hasMore && !loadingMore && (
                                <p className="text-center text-xs py-4" style={{ color: tokens.color.inkSoft }}>
                                    that's every scrap — for now
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}