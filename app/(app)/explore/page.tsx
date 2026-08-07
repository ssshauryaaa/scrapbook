"use client";

/**
 * Scrapbook — explore selector (v6: notebook cards + living background + peek-inside teasers)
 * -----------------------------------------------------------------------
 * Same crack-and-split transition as before. On top of v5's notebook-card
 * styling and living background, this adds a "peek inside" section below
 * the fan: for each notebook, a short themed teaser row (not the real
 * PeopleList / ScrapsList / CommunitiesList — just enough flavor, in each
 * notebook's own visual language, to invite scrolling down and clicking
 * through) plus an "open the notebook" link into the real page.
 * -----------------------------------------------------------------------
 */

import { useEffect, useRef, useState, useMemo } from "react";
import {
    motion,
    AnimatePresence,
    useReducedMotion,
    useMotionValue,
    useSpring,
} from "framer-motion";
import { useRouter } from "next/navigation";
import { Users, Sticker, LayoutGrid, Ticket } from "lucide-react";
import { tokens } from "@/lib/scrapbook-theme";

// a couple of brand-palette colors used only for background flourishes
const PINK = "#FF6F91";

type CardKey = "people" | "scraps" | "communities";
type Stage = "idle" | "lifting" | "cracking" | "splitting";

const CARD_META: Record<CardKey, { title: string; teaser: string; navLabel: string; color: string; icon: React.ReactNode; href: string }> = {
    people: { title: "people", teaser: "faces you haven't met yet", navLabel: "the people page", color: tokens.color.periwinkle, icon: <Users size={22} />, href: "/explore/people" },
    scraps: { title: "fresh off the wall", teaser: "recent scraps from around scrapbook", navLabel: "the scraps wall", color: tokens.color.amber, icon: <Sticker size={22} />, href: "/explore/scraps" },
    communities: { title: "communities", teaser: "find your people", navLabel: "communities", color: tokens.color.mint, icon: <LayoutGrid size={22} />, href: "/explore/communities" },
};

// generic, non-specific flavor lines for the peek-inside teasers — deliberately
// not real profiles/scraps/communities, just enough texture per notebook
const PREVIEW_ITEMS: Record<CardKey, string[]> = {
    people: ["someone new joined today", "say the first hi", "a face you haven't seen yet"],
    scraps: ["a quick hello, pinned up", "something silly, left behind", "a little note for someone"],
    communities: ["a group finding its people", "shared interests, one thread", "a table with room for one more"],
};

const FAN: Record<CardKey, { x: number; rotateZ: number; scale: number; zIndex: number }> = {
    people: { x: -190, rotateZ: -5, scale: 0.9, zIndex: 2 },
    scraps: { x: 0, rotateZ: 0, scale: 1.06, zIndex: 3 },
    communities: { x: 190, rotateZ: 5, scale: 0.9, zIndex: 2 },
};

const CARD_SPRING = { type: "spring" as const, stiffness: 130, damping: 17, mass: 0.9 };

// Smooth, natural easing curves reused across the crack + split phases.
const EASE_CRACK: [number, number, number, number] = [0.4, 0, 0.2, 1];
const EASE_SPLIT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const RING_COUNT = 7;
const BURST_COLORS = [tokens.color.amber, PINK, tokens.color.mint, tokens.color.periwinkle];

// background stickers — kept sparse and edge-anchored so they never
// compete with the cards for attention or tap targets
const STICKERS = [
    { emoji: "★", color: tokens.color.amber, top: "6%", left: "3%", size: 40, rotate: -12, delay: 0 },
    { emoji: "♡", color: PINK, top: "10%", left: "93%", size: 34, rotate: 10, delay: 0.4 },
    { emoji: "✦", color: tokens.color.mint, top: "88%", left: "6%", size: 30, rotate: 8, delay: 0.8 },
    { emoji: "☺", color: tokens.color.periwinkle, top: "86%", left: "92%", size: 36, rotate: -8, delay: 1.2 },
];

/**
 * Builds a jagged crack line running the full height of the viewport,
 * bowing toward the click origin so the crack always feels like it
 * started there. Returns percent-based {x,y} points, top -> bottom.
 */
function useCrackPoints(originXPct: number) {
    return useMemo(() => {
        const POINTS = 16;
        return Array.from({ length: POINTS + 1 }, (_, i) => {
            const t = i / POINTS;
            const y = -8 + t * 116;
            const pull = Math.sin(t * Math.PI) * (originXPct - 50) * 0.9;
            const jag = Math.sin(i * 12.9898 + 3) * 5.5 + Math.sin(i * 7.233) * 2.5;
            const x = 50 + pull * (1 - t * 0.15) + jag;
            return { x, y };
        });
    }, [originXPct]);
}

function pointsToPath(points: { x: number; y: number }[]) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}
function pointsToPolygonAttr(points: { x: number; y: number }[]) {
    return points.map((p) => `${p.x}% ${p.y}%`).join(", ");
}

/** Small mini-card matching each notebook's established visual language, used only for the peek-inside teasers. */
function PreviewTile({ type, color, text, tileIndex }: { type: CardKey; color: string; text: string; tileIndex: number }) {
    if (type === "people") {
        return (
            <div
                className="relative rounded-lg border overflow-hidden shrink-0 w-[168px] sm:w-[188px] pt-4 pb-3 px-3"
                style={{
                    background: "#FBF7EC",
                    borderColor: "#DCD3B8",
                    backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 15px, rgba(60,50,30,0.06) 16px)",
                }}
            >
                <div className="absolute top-0 left-0 right-0 h-3 flex items-center justify-evenly px-3" style={{ background: "#F1E9D2" }}>
                    {Array.from({ length: 5 }).map((_, h) => (
                        <span key={h} className="rounded-full" style={{ width: 4, height: 4, background: "#FBF7EC", border: "1px solid #C9BE9C" }} />
                    ))}
                </div>
                <div className="absolute left-6 top-3 bottom-0 w-px" style={{ background: "rgba(214,92,79,0.3)" }} />
                <div className="flex items-center gap-2 mt-1">
                    <span className="rounded-full flex items-center justify-center text-white shrink-0" style={{ width: 22, height: 22, background: color }}>
                        <Users size={11} />
                    </span>
                    <p className="text-[11.5px] leading-snug" style={{ color: tokens.color.ink }}>
                        {text}
                    </p>
                </div>
            </div>
        );
    }

    if (type === "scraps") {
        const stocks = ["#FEFCF6", "#FFF6D8", "#EAF6EF"];
        return (
            <div
                className="relative shrink-0 w-[168px] sm:w-[188px] pt-4 px-3 pb-4"
                style={{
                    background: stocks[tileIndex % stocks.length],
                    clipPath: "polygon(0% 0%,100% 0%,100% 91%,90% 97%,80% 92%,70% 98%,60% 93%,50% 99%,40% 94%,30% 98%,20% 93%,10% 99%,0% 94%)",
                    boxShadow: "0 4px 10px rgba(43,42,40,0.08)",
                }}
            >
                <span
                    className="absolute left-1/2 -top-1 -translate-x-1/2 rounded-full"
                    style={{ width: 8, height: 8, background: `radial-gradient(circle at 35% 30%, #fff8, ${color})`, boxShadow: "0 2px 3px rgba(0,0,0,0.3)" }}
                />
                <p className="text-[11.5px] leading-snug mt-1" style={{ color: tokens.color.ink, fontFamily: tokens.font.display }}>
                    {text}
                </p>
            </div>
        );
    }

    // communities — mini ticket stub
    return (
        <div className="relative shrink-0 w-[188px] sm:w-[208px] rounded-lg border overflow-hidden flex" style={{ background: "#fff", borderColor: "#E4E0D3" }}>
            <div className="flex-1 min-w-0 px-3 py-2.5">
                <p className="text-[11.5px] leading-snug" style={{ color: tokens.color.ink }}>
                    {text}
                </p>
            </div>
            <div className="relative w-0 shrink-0">
                <div className="absolute inset-y-1.5 left-0 border-l-2 border-dashed" style={{ borderColor: "#D8D0BA" }} />
            </div>
            <div className="w-9 shrink-0 flex items-center justify-center" style={{ background: `${color}18` }}>
                <Ticket size={13} style={{ color, opacity: 0.7 }} />
            </div>
        </div>
    );
}

function PreviewRow({ cardKey, opening }: { cardKey: CardKey; opening: CardKey | null }) {
    const router = useRouter();
    const meta = CARD_META[cardKey];
    const items = PREVIEW_ITEMS[cardKey];

    return (
        <motion.div
            data-no-sparkle
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.5, ease: EASE_SPLIT }}
            className="mb-9 last:mb-0"
        >
            <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-2.5">
                    <span className="rounded-full flex items-center justify-center" style={{ width: 30, height: 30, background: `${meta.color}22`, color: meta.color }}>
                        {meta.icon}
                    </span>
                    <p className="text-sm sm:text-base" style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}>
                        {meta.title}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => opening === null && router.push(meta.href)}
                    className="text-xs font-medium hover:opacity-70 transition-opacity whitespace-nowrap"
                    style={{ color: meta.color }}
                >
                    open the notebook →
                </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                {items.map((text, idx) => (
                    <PreviewTile key={idx} type={cardKey} color={meta.color} text={text} tileIndex={idx} />
                ))}
            </div>
        </motion.div>
    );
}

export default function ExplorePage() {
    const router = useRouter();
    const prefersReducedMotion = useReducedMotion();

    const [opening, setOpening] = useState<CardKey | null>(null);
    const [stage, setStage] = useState<Stage>("idle");
    const [origin, setOrigin] = useState({ xPct: 50, yPct: 50 });
    const pendingHref = useRef<string | null>(null);

    const crackPoints = useCrackPoints(origin.xPct);
    const crackPath = useMemo(() => pointsToPath(crackPoints), [crackPoints]);
    const leftClip = useMemo(() => `polygon(0% -8%, ${pointsToPolygonAttr(crackPoints)}, 0% 108%)`, [crackPoints]);
    const rightClip = useMemo(() => `polygon(100% -8%, ${pointsToPolygonAttr(crackPoints)}, 100% 108%)`, [crackPoints]);

    // Tilt for the "on to the ___ page" label: read the crack's local
    // lean right at the click height and use a small fraction of it, so
    // the caption reads as sitting along the tear without going sideways.
    const labelRotation = useMemo(() => {
        const t = (origin.yPct + 8) / 116;
        const idx = Math.min(crackPoints.length - 2, Math.max(1, Math.round(t * (crackPoints.length - 1))));
        const a = crackPoints[idx - 1];
        const b = crackPoints[idx + 1];
        const angleFromVertical = (Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI;
        return Math.max(-16, Math.min(16, angleFromVertical));
    }, [crackPoints, origin.yPct]);

    // ---- living background: cursor parallax ----
    const bgX = useMotionValue(0);
    const bgY = useMotionValue(0);
    const bgSpringX = useSpring(bgX, { stiffness: 40, damping: 20 });
    const bgSpringY = useSpring(bgY, { stiffness: 40, damping: 20 });

    useEffect(() => {
        if (prefersReducedMotion) return;
        function onMove(e: MouseEvent) {
            const nx = (e.clientX / window.innerWidth - 0.5) * 2;
            const ny = (e.clientY / window.innerHeight - 0.5) * 2;
            bgX.set(nx * -14);
            bgY.set(ny * -14);
        }
        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
    }, [prefersReducedMotion, bgX, bgY]);

    // ---- click-anywhere sparkles ----
    const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
    function spawnSparkle(e: React.MouseEvent<HTMLDivElement>) {
        if (prefersReducedMotion || opening) return;
        if ((e.target as HTMLElement).closest("[data-no-sparkle]")) return;
        const id = Date.now() + Math.random();
        setSparkles((s) => [...s, { id, x: e.clientX, y: e.clientY }]);
        setTimeout(() => setSparkles((s) => s.filter((p) => p.id !== id)), 650);
    }

    function handleClick(e: React.MouseEvent, key: CardKey) {
        if (opening) return;
        const xPct = (e.clientX / window.innerWidth) * 100;
        const yPct = (e.clientY / window.innerHeight) * 100;
        setOrigin({ xPct, yPct });
        pendingHref.current = CARD_META[key].href;
        setOpening(key);
        setStage("lifting");
        if (prefersReducedMotion) {
            window.setTimeout(() => router.push(CARD_META[key].href), 220);
        }
    }

    function cardAnimate(key: CardKey) {
        const fan = FAN[key];
        if (opening === null) return { x: fan.x, y: 0, rotateZ: fan.rotateZ, scale: fan.scale, opacity: 1 };
        if (opening !== key) return { x: fan.x, y: 10, rotateZ: fan.rotateZ * 0.6, scale: fan.scale * 0.92, opacity: 0 };
        return { x: fan.x, y: -6, rotateZ: 0, scale: fan.scale * 1.08, opacity: 1 };
    }

    const themeColor = opening ? CARD_META[opening].color : tokens.color.periwinkle;
    const themeColorDeep = opening ? `color-mix(in srgb, ${themeColor} 65%, black)` : themeColor;

    return (
        <div
            onClick={spawnSparkle}
            className="relative min-h-screen w-full overflow-hidden"
            style={{ background: tokens.color.paper, fontFamily: tokens.font.body, color: tokens.color.ink }}
        >
            {/* paper grain, parallaxed */}
            <motion.div
                style={{ x: prefersReducedMotion ? 0 : bgSpringX, y: prefersReducedMotion ? 0 : bgSpringY }}
                className="absolute -inset-8 pointer-events-none opacity-40"
            >
                <div
                    className="absolute inset-0"
                    style={{ backgroundImage: `radial-gradient(${tokens.color.ink}0a 1px, transparent 1px)`, backgroundSize: "18px 18px" }}
                />
            </motion.div>

            {/* ambient blurred blobs, parallaxed */}
            <motion.div
                style={{ x: prefersReducedMotion ? 0 : bgSpringX, y: prefersReducedMotion ? 0 : bgSpringY }}
                className="absolute inset-0 pointer-events-none"
            >
                <div
                    className="absolute rounded-full opacity-30"
                    style={{ width: "clamp(140px,30vw,260px)", height: "clamp(140px,30vw,260px)", top: "-6%", left: "-8%", background: tokens.color.mint, filter: "blur(60px)" }}
                />
                <div
                    className="absolute rounded-full opacity-30"
                    style={{ width: "clamp(160px,34vw,300px)", height: "clamp(160px,34vw,300px)", bottom: "-10%", right: "-10%", background: PINK, filter: "blur(70px)" }}
                />
                <div
                    className="absolute rounded-full opacity-20 hidden sm:block"
                    style={{ width: 200, height: 200, top: "42%", right: "8%", background: tokens.color.amber, filter: "blur(50px)" }}
                />
                {/* dashed rotating ring — decorative only */}
                <div
                    className="absolute rounded-full hidden sm:block"
                    style={{
                        width: 130,
                        height: 130,
                        top: "10%",
                        right: "16%",
                        border: `2px dashed ${tokens.color.periwinkle}40`,
                        animation: prefersReducedMotion ? "none" : "spin-slow 18s linear infinite",
                    }}
                />
                {/* squiggle doodle */}
                <svg className="absolute hidden md:block" style={{ bottom: "8%", left: "16%" }} width="90" height="40" viewBox="0 0 90 40">
                    <path d="M2 20 Q 15 4, 28 20 T 54 20 T 80 20" stroke={tokens.color.ink} strokeOpacity="0.25" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </svg>
            </motion.div>

            <style>{`@keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .scrollbar-none::-webkit-scrollbar { display: none; } .scrollbar-none { scrollbar-width: none; }`}</style>

            {/* draggable stickers */}
            {!prefersReducedMotion &&
                STICKERS.map((s, i) => (
                    <motion.div
                        key={i}
                        data-no-sparkle
                        drag
                        dragMomentum={false}
                        dragElastic={0.4}
                        className="absolute select-none cursor-grab active:cursor-grabbing items-center justify-center rounded-full shadow-md z-[5] hidden sm:flex"
                        style={{ top: s.top, left: s.left, width: s.size, height: s.size, background: s.color, color: "#fff", fontSize: s.size * 0.45 }}
                        initial={{ rotate: s.rotate, y: 0 }}
                        animate={{ y: [0, -10, 0], rotate: [s.rotate, s.rotate + 6, s.rotate] }}
                        transition={{ duration: 3.4, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
                        whileHover={{ scale: 1.3, rotate: s.rotate + 20 }}
                        whileTap={{ scale: 0.7 }}
                        whileDrag={{ scale: 1.4, zIndex: 50, boxShadow: "0 12px 24px rgba(0,0,0,0.25)" }}
                    >
                        {s.emoji}
                    </motion.div>
                ))}

            {/* click-anywhere sparkles */}
            <AnimatePresence>
                {sparkles.map((s) => (
                    <motion.div key={s.id} className="fixed pointer-events-none z-30" style={{ left: s.x, top: s.y }}>
                        {[0, 1, 2].map((idx) => {
                            const angle = (idx / 3) * Math.PI * 2 + Math.PI / 6;
                            const c = BURST_COLORS[idx % BURST_COLORS.length];
                            return (
                                <motion.span
                                    key={idx}
                                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                    animate={{ x: Math.cos(angle) * 22, y: Math.sin(angle) * 22, opacity: 0, scale: 0.3 }}
                                    transition={{ duration: 0.55, ease: "easeOut" }}
                                    className="absolute rounded-full"
                                    style={{ width: 5, height: 5, background: c, marginLeft: -2.5, marginTop: -2.5 }}
                                />
                            );
                        })}
                    </motion.div>
                ))}
            </AnimatePresence>

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <p data-no-sparkle className="text-2xl sm:text-3xl mb-1 text-center relative z-10" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
                    explore
                </p>
                <p data-no-sparkle className="text-sm mb-8 text-center relative z-10" style={{ color: tokens.color.inkSoft }}>
                    pick a notebook to dig through
                </p>

                {/* fan container — a single scale() here shrinks the whole
                    coordinate space (including each card's x-offset) so the
                    layout never overflows narrow viewports */}
                <div
                    data-no-sparkle
                    className="relative mx-auto scale-[0.62] xs:scale-[0.75] sm:scale-[0.9] md:scale-100 origin-center transition-transform"
                    style={{ height: "min(60vh, 460px)" }}
                >
                    {(Object.keys(CARD_META) as CardKey[]).map((key) => {
                        const meta = CARD_META[key];
                        const isOpening = opening === key;

                        return (
                            <motion.div
                                key={key}
                                onClick={(e) => opening === null && handleClick(e, key)}
                                animate={cardAnimate(key)}
                                initial={false}
                                transition={CARD_SPRING}
                                whileHover={opening === null ? { y: -14, scale: FAN[key].scale * 1.03 } : undefined}
                                onAnimationComplete={() => {
                                    if (isOpening && stage === "lifting") setStage("cracking");
                                }}
                                className="absolute top-1/2 left-1/2"
                                style={{
                                    translateX: "-50%",
                                    translateY: "-50%",
                                    width: 230,
                                    height: 300,
                                    cursor: opening === null ? "pointer" : "default",
                                    zIndex: isOpening ? 40 : FAN[key].zIndex,
                                    pointerEvents: opening && !isOpening ? "none" : "auto",
                                }}
                            >
                                {/* stacked pages peeking out behind the cover */}
                                <div
                                    className="absolute inset-0 rounded-2xl pointer-events-none"
                                    style={{ background: tokens.color.paper, transform: "rotate(-3deg) translate(4px, 7px)", boxShadow: "0 6px 14px rgba(43,42,40,0.12)" }}
                                />
                                <div
                                    className="absolute inset-0 rounded-2xl pointer-events-none"
                                    style={{ background: "#fff", transform: "rotate(2deg) translate(-3px, 5px)", boxShadow: "0 6px 14px rgba(43,42,40,0.1)" }}
                                />

                                {/* the notebook cover */}
                                <div
                                    className="absolute inset-0 rounded-2xl overflow-hidden"
                                    style={{
                                        background: `linear-gradient(155deg, ${meta.color} 0%, color-mix(in srgb, ${meta.color} 80%, black) 100%)`,
                                        boxShadow: isOpening ? "0 30px 60px rgba(43,42,40,0.25)" : "0 14px 26px rgba(43,42,40,0.18)",
                                    }}
                                >
                                    {/* cover fabric texture */}
                                    <div
                                        className="absolute inset-0 opacity-[0.08] pointer-events-none"
                                        style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 1px, transparent 6px)" }}
                                    />
                                    {/* ruled page lines peeking at the bottom */}
                                    <div
                                        className="absolute bottom-0 left-0 right-0 opacity-[0.18] pointer-events-none"
                                        style={{ height: "34%", backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 13px, #fff 14px)" }}
                                    />
                                    {/* dog-ear fold, bottom-right */}
                                    <div
                                        className="absolute bottom-0 right-0 pointer-events-none"
                                        style={{ width: 22, height: 22, background: "rgba(0,0,0,0.18)", clipPath: "polygon(100% 0, 0% 100%, 100% 100%)" }}
                                    />

                                    {/* taped-on paper label */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                                        <div className="rounded-lg px-4 py-3 shadow-sm" style={{ background: "#fff", transform: "rotate(-1.5deg)" }}>
                                            <div
                                                className="rounded-full flex items-center justify-center mx-auto mb-1.5"
                                                style={{ width: 42, height: 42, background: `${meta.color}22`, color: meta.color }}
                                            >
                                                {meta.icon}
                                            </div>
                                            <p className="text-base leading-tight" style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}>
                                                {meta.title}
                                            </p>
                                        </div>
                                        <p className="text-xs px-2" style={{ color: "rgba(255,255,255,0.9)" }}>
                                            {meta.teaser}
                                        </p>
                                    </div>
                                </div>

                                {/* spiral binding along the top edge */}
                                <div className="absolute -top-[9px] left-0 right-0 flex justify-around px-5 pointer-events-none" style={{ zIndex: 6 }}>
                                    {Array.from({ length: RING_COUNT }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="rounded-full"
                                            style={{ width: 13, height: 13, background: tokens.color.paper, border: `2px solid ${tokens.color.ink}66`, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.25)" }}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* peek-inside teasers — themed per notebook, generic content, links out to the real pages */}
                <div className="relative mt-6 sm:mt-10 pt-8 sm:pt-10" style={{ borderTop: `1px dashed ${tokens.color.ink}22` }}>
                    <p data-no-sparkle className="text-xs uppercase tracking-widest text-center mb-7" style={{ color: tokens.color.inkSoft, letterSpacing: "0.14em" }}>
                        a peek inside
                    </p>
                    {(Object.keys(CARD_META) as CardKey[]).map((key) => (
                        <PreviewRow key={key} cardKey={key} opening={opening} />
                    ))}
                </div>
            </div>

            {/* crack line — draws itself from the click point across the full page */}
            <AnimatePresence>
                {opening && (stage === "cracking" || stage === "splitting") && !prefersReducedMotion && (
                    <motion.svg
                        key="crack"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="fixed inset-0 z-[95] pointer-events-none"
                        style={{ width: "100%", height: "100%" }}
                        initial={{ opacity: 1 }}
                        animate={{ opacity: stage === "splitting" ? 0 : 1 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                        <motion.path
                            d={crackPath}
                            fill="none"
                            stroke={tokens.color.ink}
                            strokeWidth={0.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.4))" }}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ pathLength: { duration: 0.4, ease: EASE_CRACK }, opacity: { duration: 0.1 } }}
                            onAnimationComplete={() => {
                                if (stage === "cracking") setStage("splitting");
                            }}
                        />
                    </motion.svg>
                )}
            </AnimatePresence>

            {/* caption tag riding alongside the crack */}
            <AnimatePresence>
                {opening && (stage === "cracking" || stage === "splitting") && (
                    <motion.div
                        key="crack-label"
                        className="fixed z-[97] pointer-events-none"
                        style={{
                            left: `${origin.xPct}%`,
                            top: `${origin.yPct}%`,
                        }}
                        initial={{ opacity: 0, x: "-50%", y: "-50%", scale: 0.85 }}
                        animate={{
                            opacity: 1,
                            x: "calc(-50% + 15vw)",
                            y: "calc(-50% - 4vh)",
                            scale: 1,
                            rotate: labelRotation,
                        }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.3, delay: 0.12, ease: EASE_SPLIT }}
                    >
                        <div
                            className="rounded-md px-3.5 py-2 shadow-lg whitespace-nowrap"
                            style={{
                                background: tokens.color.paper,
                                border: `1.5px solid ${tokens.color.ink}22`,
                                boxShadow: "0 10px 22px rgba(43,42,40,0.28)",
                            }}
                        >
                            <p className="text-sm sm:text-base" style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}>
                                on to {opening ? CARD_META[opening].navLabel : ""} →
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* the two halves — peel apart from the crack and zoom through the gap */}
            <AnimatePresence>
                {opening && stage === "splitting" && (
                    <motion.div
                        key="split"
                        className="fixed inset-0 z-[100] pointer-events-none"
                        style={{ transformOrigin: `${origin.xPct}% ${origin.yPct}%` }}
                        initial={{ scale: 1 }}
                        animate={{ scale: prefersReducedMotion ? 1 : 2.2 }}
                        transition={{ duration: 1, ease: EASE_SPLIT }}
                        onAnimationComplete={() => {
                            if (pendingHref.current) router.push(pendingHref.current);
                        }}
                    >
                        <div className="absolute inset-0" style={{ background: themeColorDeep }} />

                        <motion.div
                            className="absolute inset-0"
                            style={{ background: tokens.color.paper, clipPath: leftClip, filter: "drop-shadow(-6px 0 10px rgba(0,0,0,0.3))" }}
                            initial={{ x: 0, rotateZ: 0 }}
                            animate={{ x: "-8vw", rotateZ: -2.5 }}
                            transition={{ duration: 0.6, ease: EASE_SPLIT }}
                        >
                            <div
                                className="absolute inset-0 opacity-20 mix-blend-multiply"
                                style={{
                                    backgroundImage:
                                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                                }}
                            />
                        </motion.div>

                        <motion.div
                            className="absolute inset-0"
                            style={{ background: tokens.color.paper, clipPath: rightClip, filter: "drop-shadow(6px 0 10px rgba(0,0,0,0.3))" }}
                            initial={{ x: 0, rotateZ: 0 }}
                            animate={{ x: "8vw", rotateZ: 2.5 }}
                            transition={{ duration: 0.6, ease: EASE_SPLIT }}
                        >
                            <div
                                className="absolute inset-0 opacity-20 mix-blend-multiply"
                                style={{
                                    backgroundImage:
                                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                                }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}