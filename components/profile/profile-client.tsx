"use client";

/**
 * Scrapbook — profile page client shell
 * -----------------------------------------------------------------------
 * Receives server-fetched data as props (profile, scraps, testimonials,
 * mutualVisitors) and owns everything interactive: the 3D-tilt avatar
 * frame (same perspective/rotateX/rotateY technique as the login card),
 * floating corner stickers, the wall/testimonials tab switch, and firing
 * the log_profile_visit RPC on mount.
 * -----------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import {
    useMotionValue,
    useSpring,
    useTransform,
    motion,
    AnimatePresence,
} from "framer-motion";
import { Pencil, MessageSquarePlus, Camera, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tokens, resolveTheme, type ProfileTheme } from "@/lib/scrapbook-theme";
import ScrapWall, { type Scrap } from "./scrap-wall";
import TestimonialCarousel, { type Testimonial } from "./testimonial-carousel";
import MutualVisitors, { type MutualVisitor } from "./mutual-visitors";

type Profile = {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    theme: ProfileTheme | null;
};

// banner stickers — draggable + poppable, same device as the login page's
// floating emoji stickers. Kept off the far edges so they clear the
// avatar frame that overlaps the bottom of the banner.
const STICKERS = [
    { emoji: "★", color: tokens.color.amber, top: "10%", left: "4%", size: 34, rotate: -10, delay: 0 },
    { emoji: "♡", color: tokens.color.pink, top: "14%", left: "93%", size: 30, rotate: 8, delay: 0.3 },
    { emoji: "✦", color: tokens.color.mint, top: "78%", left: "2%", size: 26, rotate: 6, delay: 0.6 },
    { emoji: "☺", color: tokens.color.periwinkle, top: "20%", left: "80%", size: 28, rotate: -6, delay: 0.9, hideOnMobile: true },
    { emoji: "♪", color: tokens.color.pink, top: "65%", left: "88%", size: 24, rotate: 12, delay: 1.2, hideOnMobile: true },
    { emoji: "☆", color: tokens.color.amber, top: "35%", left: "12%", size: 22, rotate: -14, delay: 1.5, hideOnMobile: true },
];

const BURST_COLORS = [tokens.color.amber, tokens.color.pink, tokens.color.mint, tokens.color.periwinkle];

export default function ProfileClient({
    profile,
    scraps,
    testimonials,
    mutualVisitors,
    currentUserId,
    isOwnProfile,
    visitCount,
}: {
    profile: Profile;
    scraps: Scrap[];
    testimonials: Testimonial[];
    mutualVisitors: MutualVisitor[];
    currentUserId?: string | null;
    isOwnProfile: boolean;
    /** Optional real hit count from your analytics/RPC layer. Falls back to a
     * decorative placeholder derived from wall activity if not supplied. */
    visitCount?: number;
}) {
    const supabase = useRef(createClient()).current;
    const theme = resolveTheme(profile.theme);
    const [tab, setTab] = useState<"wall" | "testimonials">("wall");
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }, []);

    // fire-and-forget visit log — the RPC itself safely no-ops for self-visits
    useEffect(() => {
        if (!isOwnProfile) {
            supabase.rpc("log_profile_visit", { visited_id: profile.id });
        }
    }, [profile.id, isOwnProfile, supabase]);

    // 3D tilt on the avatar frame, same spring feel as the login card
    const avatarRef = useRef<HTMLDivElement>(null);
    const mvX = useMotionValue(0);
    const mvY = useMotionValue(0);
    const rotateX = useSpring(useTransform(mvY, [-60, 60], [12, -12]), { stiffness: 200, damping: 18 });
    const rotateY = useSpring(useTransform(mvX, [-60, 60], [-12, 12]), { stiffness: 200, damping: 18 });

    function handleTilt(e: React.MouseEvent<HTMLDivElement>) {
        if (reducedMotion) return;
        const rect = avatarRef.current?.getBoundingClientRect();
        if (!rect) return;
        mvX.set(e.clientX - rect.left - rect.width / 2);
        mvY.set(e.clientY - rect.top - rect.height / 2);
    }
    function resetTilt() {
        mvX.set(0);
        mvY.set(0);
    }

    // banner-scoped parallax: ambient shapes drift opposite the cursor,
    // independent of the page-wide scroll/tilt behavior above
    const bannerRef = useRef<HTMLDivElement>(null);
    const bgX = useMotionValue(0);
    const bgY = useMotionValue(0);
    const bgSpringX = useSpring(bgX, { stiffness: 50, damping: 20 });
    const bgSpringY = useSpring(bgY, { stiffness: 50, damping: 20 });

    function handleBannerParallax(e: React.MouseEvent<HTMLDivElement>) {
        if (reducedMotion) return;
        const rect = bannerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        bgX.set(nx * -18);
        bgY.set(ny * -18);
    }

    // sticker click bursts + click-anywhere sparkles, scoped to the banner
    const [bursts, setBursts] = useState<{ id: number; x: string; y: string }[]>([]);
    function popSticker(top: string, left: string) {
        const id = Date.now() + Math.random();
        setBursts((b) => [...b, { id, x: left, y: top }]);
        setTimeout(() => setBursts((b) => b.filter((p) => p.id !== id)), 700);
    }

    const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
    function spawnSparkle(e: React.MouseEvent<HTMLDivElement>) {
        if (reducedMotion) return;
        if ((e.target as HTMLElement).closest("button, a")) return;
        const rect = bannerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const id = Date.now() + Math.random();
        setSparkles((s) => [...s, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
        setTimeout(() => setSparkles((s) => s.filter((p) => p.id !== id)), 650);
    }

    // GeoCities-style hit counter: rolls up to its target once on mount.
    // Purely decorative unless you pass a real `visitCount` prop from a
    // page-view analytics table/RPC.
    const targetCount = visitCount ?? 128 + scraps.length * 37 + testimonials.length * 11;
    const [displayCount, setDisplayCount] = useState(reducedMotion ? targetCount : 0);
    useEffect(() => {
        if (reducedMotion) {
            setDisplayCount(targetCount);
            return;
        }
        const duration = 900;
        const start = performance.now();
        let raf: number;
        const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            setDisplayCount(Math.round(targetCount * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [targetCount, reducedMotion]);

    return (
        <div
            className="relative min-h-screen w-full"
            style={{ background: theme.background, fontFamily: tokens.font.body, color: tokens.color.ink }}
        >
            {/* ambient paper grain, consistent with the login page background */}
            <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                    backgroundImage: `radial-gradient(${tokens.color.ink}0a 1px, transparent 1px)`,
                    backgroundSize: "18px 18px",
                }}
            />

            {/* banner */}
            <div
                ref={bannerRef}
                onMouseMove={(e) => {
                    handleBannerParallax(e);
                }}
                onClick={spawnSparkle}
                className="group relative h-40 sm:h-56 w-full overflow-hidden"
                style={{
                    background: theme.bannerUrl
                        ? undefined
                        : `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
                }}
            >
                {theme.bannerUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={theme.bannerUrl} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(43,42,40,0.15) 100%)" }} />

                {/* parallax ambient shapes: dashed ring + squiggle + soft blobs */}
                <motion.div
                    style={{ x: reducedMotion ? 0 : bgSpringX, y: reducedMotion ? 0 : bgSpringY }}
                    className="absolute inset-0 pointer-events-none"
                >
                    <div
                        className="absolute rounded-full hidden sm:block"
                        style={{ width: 110, height: 110, top: "-12%", right: "22%", border: "2px dashed rgba(255,255,255,0.35)", animation: reducedMotion ? "none" : "profile-spin-slow 20s linear infinite" }}
                    />
                    <svg className="absolute hidden md:block opacity-40" style={{ bottom: "10%", left: "40%" }} width="90" height="34" viewBox="0 0 90 40">
                        <path d="M2 20 Q 15 4, 28 20 T 54 20 T 80 20" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    </svg>
                    <div className="absolute rounded-full opacity-25" style={{ width: 160, height: 160, top: "-20%", left: "18%", background: "#fff", filter: "blur(50px)" }} />
                </motion.div>

                {/* click-anywhere sparkles */}
                <AnimatePresence>
                    {sparkles.map((s) => (
                        <motion.div key={s.id} className="absolute pointer-events-none z-20" style={{ left: s.x, top: s.y }}>
                            {[0, 1, 2].map((idx) => {
                                const angle = (idx / 3) * Math.PI * 2 + Math.PI / 6;
                                const c = BURST_COLORS[idx % BURST_COLORS.length];
                                return (
                                    <motion.span
                                        key={idx}
                                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                        animate={{ x: Math.cos(angle) * 20, y: Math.sin(angle) * 20, opacity: 0, scale: 0.3 }}
                                        transition={{ duration: 0.55, ease: "easeOut" }}
                                        className="absolute rounded-full"
                                        style={{ width: 5, height: 5, background: c, marginLeft: -2.5, marginTop: -2.5 }}
                                    />
                                );
                            })}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* draggable, poppable stickers */}
                {!reducedMotion &&
                    STICKERS.map((s, i) => (
                        <motion.div
                            key={i}
                            drag
                            dragMomentum={false}
                            dragElastic={0.4}
                            onClick={(e) => {
                                e.stopPropagation();
                                popSticker(s.top, s.left);
                            }}
                            className={`absolute select-none cursor-grab active:cursor-grabbing items-center justify-center rounded-full shadow-md z-10 ${s.hideOnMobile ? "hidden sm:flex" : "flex"}`}
                            style={{ top: s.top, left: s.left, width: s.size, height: s.size, background: s.color, color: "#fff", fontSize: s.size * 0.45 }}
                            initial={{ rotate: s.rotate, y: 0 }}
                            animate={{ y: [0, -8, 0], rotate: [s.rotate, s.rotate + 6, s.rotate] }}
                            transition={{ duration: 3.2, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
                            whileHover={{ scale: 1.3, rotate: s.rotate + 18 }}
                            whileTap={{ scale: 0.7 }}
                            whileDrag={{ scale: 1.4, zIndex: 30, boxShadow: "0 12px 24px rgba(0,0,0,0.25)" }}
                        >
                            {s.emoji}
                        </motion.div>
                    ))}

                {/* confetti burst on sticker click */}
                <AnimatePresence>
                    {bursts.map((b) => (
                        <motion.div key={b.id} className="absolute pointer-events-none z-20" style={{ top: b.y, left: b.x }}>
                            {BURST_COLORS.map((c, idx) => {
                                const angle = (idx / BURST_COLORS.length) * Math.PI * 2;
                                return (
                                    <motion.span
                                        key={idx}
                                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                        animate={{ x: Math.cos(angle) * 30, y: Math.sin(angle) * 30, opacity: 0, scale: 0.4 }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                        className="absolute rounded-full"
                                        style={{ width: 7, height: 7, background: c }}
                                    />
                                );
                            })}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* GeoCities-style hit counter, bottom-left */}
                <div
                    className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1"
                    style={{ background: "rgba(13,13,13,0.55)", backdropFilter: "blur(4px)" }}
                >
                    <Eye size={11} color="#8AF5A3" />
                    <span style={{ fontFamily: tokens.font.terminal, fontSize: 15, color: "#8AF5A3", letterSpacing: 1 }}>
                        {String(displayCount).padStart(6, "0")} views
                    </span>
                </div>

                {/* hover-reveal cover changer, owner only */}
                {isOwnProfile && (
                    <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-3 right-3 z-10 hidden group-hover:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity"
                        style={{ background: "rgba(255,255,255,0.9)", color: tokens.color.ink }}
                    >
                        <Camera size={13} /> change cover
                    </button>
                )}
            </div>

            <style>{`
        @keyframes profile-spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

            {/* header */}
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14 relative z-10">
                    {/* 3D-tilt avatar frame */}
                    <div style={{ perspective: 800 }}>
                        <motion.div
                            ref={avatarRef}
                            onMouseMove={handleTilt}
                            onMouseLeave={resetTilt}
                            style={{ rotateX: reducedMotion ? 0 : rotateX, rotateY: reducedMotion ? 0 : rotateY, transformStyle: "preserve-3d" }}
                            className="rounded-2xl p-1.5 shrink-0"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                        >
                            <div
                                className="rounded-xl overflow-hidden border-4"
                                style={{ width: 104, height: 104, borderColor: "#fff", background: tokens.color.periwinkle, boxShadow: "0 12px 24px rgba(43,42,40,0.2)" }}
                            >
                                {profile.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={profile.avatar_url} alt={profile.display_name || profile.username} className="w-full h-full object-cover" />
                                ) : (
                                    <div
                                        className="w-full h-full flex items-center justify-center text-white text-3xl"
                                        style={{ fontFamily: tokens.font.display, fontWeight: 700 }}
                                    >
                                        {(profile.display_name || profile.username).slice(0, 1).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    <div className="flex-1 pb-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                        <div>
                            <p className="text-2xl" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
                                {profile.display_name || profile.username}
                            </p>
                            <p className="text-sm" style={{ color: tokens.color.inkSoft }}>
                                @{profile.username}
                            </p>
                        </div>

                        {isOwnProfile ? (
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                className="group/edit inline-grid grid-cols-[auto_0fr] hover:grid-cols-[auto_1fr] transition-[grid-template-columns] duration-300 ease-out items-center rounded-full border overflow-hidden"
                                style={{ borderColor: "#E4E0D3", color: tokens.color.ink, background: "#fff" }}
                                aria-label="Edit profile"
                            >
                                <span className="flex items-center justify-center px-3 py-2">
                                    <Pencil size={14} />
                                </span>
                                <span className="overflow-hidden whitespace-nowrap">
                                    <span className="pr-3.5 text-sm font-medium">edit profile</span>
                                </span>
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.03, boxShadow: "0 8px 18px rgba(108,92,231,0.35)" }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setTab("testimonials")}
                                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white"
                                style={{ background: theme.primary }}
                            >
                                <MessageSquarePlus size={14} /> leave testimonial
                            </motion.button>
                        )}
                    </div>
                </div>

                {profile.bio && (
                    <p className="text-sm mt-4 max-w-xl" style={{ color: tokens.color.ink, lineHeight: 1.6 }}>
                        {profile.bio}
                    </p>
                )}

                {/* tabs */}
                <div className="flex items-center gap-1 mt-6 border-b" style={{ borderColor: "#E4E0D3" }}>
                    {(["wall", "testimonials"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className="relative px-4 py-2.5 text-sm capitalize"
                            style={{ color: tab === t ? theme.primary : tokens.color.inkSoft, fontWeight: tab === t ? 600 : 500 }}
                        >
                            {t}
                            {tab === t && (
                                <motion.span
                                    layoutId="profile-tab-underline"
                                    className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full"
                                    style={{ background: theme.primary }}
                                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 py-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={tab}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            {tab === "wall" ? (
                                <ScrapWall initialScraps={scraps} recipientId={profile.id} currentUserId={currentUserId} />
                            ) : (
                                <TestimonialCarousel testimonials={testimonials} />
                            )}
                        </motion.div>
                    </AnimatePresence>

                    <aside className="space-y-4">
                        <MutualVisitors visitors={mutualVisitors} />
                    </aside>
                </div>
            </div>
        </div>
    );
}