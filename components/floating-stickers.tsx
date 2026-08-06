"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type StickerSpec = {
    emoji: string;
    color: string;
    top: string;
    left: string;
    size?: number;
    rotate?: number;
    delay?: number;
    hideOnMobile?: boolean;
};

const STAMP_COLORS_FALLBACK = ["#8A6238", "#B5533C", "#4C7A70", "#5B5240"];

export default function FloatingStickers({ stickers, burstColors }: { stickers: StickerSpec[]; burstColors?: string[] }) {
    const [reducedMotion, setReducedMotion] = useState(false);
    const [stamps, setStamps] = useState<{ id: number; x: string; y: string; color: string }[]>([]);

    useEffect(() => {
        setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }, []);

    function pop(top: string, left: string, color: string) {
        const id = Date.now() + Math.random();
        setStamps((b) => [...b, { id, x: left, y: top, color }]);
        setTimeout(() => setStamps((b) => b.filter((p) => p.id !== id)), 650);
    }

    if (reducedMotion) return null;
    const inkColors = burstColors ?? STAMP_COLORS_FALLBACK;

    return (
        <>
            {stickers.map((s, i) => {
                const size = s.size ?? 38;
                return (
                    <motion.div
                        key={i}
                        drag
                        dragMomentum={false}
                        dragElastic={0.4}
                        onClick={() => pop(s.top, s.left, s.color)}
                        className={`fixed select-none cursor-grab active:cursor-grabbing items-center justify-center rounded-full z-0 ${s.hideOnMobile ? "hidden lg:flex" : "flex"
                            }`}
                        style={{
                            top: s.top,
                            left: s.left,
                            width: size,
                            height: size,
                            background: "#FBF7EC",
                            border: `1.5px solid ${s.color}`,
                            boxShadow: `0 3px 8px rgba(43,42,40,0.16), inset 0 0 0 3px #FBF7EC, inset 0 0 0 4px ${s.color}55`,
                        }}
                        initial={{ rotate: s.rotate ?? 0, y: 0 }}
                        animate={{ y: [0, -6, 0], rotate: [s.rotate ?? 0, (s.rotate ?? 0) + 3, s.rotate ?? 0] }}
                        transition={{ duration: 4.2, repeat: Infinity, delay: s.delay ?? 0, ease: "easeInOut" }}
                        whileHover={{ scale: 1.14, rotate: (s.rotate ?? 0) + 8 }}
                        whileTap={{ scale: 0.85 }}
                        whileDrag={{ scale: 1.22, zIndex: 30, boxShadow: "0 10px 20px rgba(43,42,40,0.28)" }}
                    >
                        {/* dashed inner ring, like a postage-stamp perforation / wax-seal rim */}
                        <span
                            className="absolute inset-[3px] rounded-full pointer-events-none"
                            style={{ border: `1px dashed ${s.color}88` }}
                        />
                        <span
                            className="relative"
                            style={{ color: s.color, fontSize: size * 0.42, opacity: 0.85, filter: "saturate(0.85)" }}
                        >
                            {s.emoji}
                        </span>
                    </motion.div>
                );
            })}

            {/* stamp-press pulse — a single expanding ring + a couple of muted ink flecks, in place of confetti */}
            <AnimatePresence>
                {stamps.map((b) => (
                    <motion.div key={b.id} className="fixed pointer-events-none z-[1]" style={{ top: b.y, left: b.x }}>
                        <motion.span
                            initial={{ scale: 0.5, opacity: 0.55 }}
                            animate={{ scale: 1.6, opacity: 0 }}
                            transition={{ duration: 0.55, ease: "easeOut" }}
                            className="absolute rounded-full"
                            style={{ width: 30, height: 30, marginLeft: -15, marginTop: -15, border: `1.5px solid ${b.color}` }}
                        />
                        {inkColors.slice(0, 3).map((c, idx) => {
                            const angle = (idx / 3) * Math.PI * 2 + Math.PI / 5;
                            return (
                                <motion.span
                                    key={idx}
                                    initial={{ x: 0, y: 0, opacity: 0.7, scale: 1 }}
                                    animate={{ x: Math.cos(angle) * 20, y: Math.sin(angle) * 20, opacity: 0, scale: 0.5 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="absolute rounded-full"
                                    style={{ width: 4, height: 4, background: c, opacity: 0.75 }}
                                />
                            );
                        })}
                    </motion.div>
                ))}
            </AnimatePresence>
        </>
    );
}