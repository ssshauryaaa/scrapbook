"use client";

/**
 * 3D "coverflow" testimonial carousel.
 * -----------------------------------------------------------------------
 * Pure CSS-3D (perspective + rotateY + translateZ), driven by framer-motion
 * spring values — no WebGL/three.js dependency, so it drops into the
 * existing stack (framer-motion + lucide-react) without adding a new
 * package. The center card faces you; side cards recede in depth and tilt
 * away, like flipping through a stack of photos.
 * -----------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { tokens } from "@/lib/scrapbook-theme";

export type Testimonial = {
    id: string;
    content: string;
    approved_at: string | null;
    author: {
        username: string;
        display_name: string | null;
        avatar_url: string | null;
    } | null;
};

export default function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
    const [index, setIndex] = useState(0);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }, []);

    if (!testimonials?.length) {
        return (
            <div
                className="rounded-2xl border p-8 text-center"
                style={{ background: "#fff", borderColor: "#E4E0D3" }}
            >
                <p style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}>
                    no testimonials yet
                </p>
                <p className="text-sm mt-1" style={{ color: tokens.color.inkSoft }}>
                    be the first to leave one on this wall
                </p>
            </div>
        );
    }

    const go = (dir: 1 | -1) => setIndex((i) => (i + dir + testimonials.length) % testimonials.length);

    return (
        <div className="relative">
            <p
                className="text-sm mb-3 px-1"
                style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}
            >
                what people are saying
            </p>

            <div
                className="relative flex items-center justify-center"
                style={{ perspective: 1200, height: 230 }}
            >
                {testimonials.map((t, i) => {
                    // signed distance from the active card, wrapped for a circular deck
                    const raw = i - index;
                    const n = testimonials.length;
                    const wrapped = ((raw + n / 2) % n) - n / 2;
                    const isVisible = Math.abs(wrapped) <= 2;
                    if (!isVisible) return null;

                    const isActive = wrapped === 0;

                    return (
                        <motion.div
                            key={t.id}
                            className="absolute w-[280px] sm:w-[340px] rounded-2xl border p-5 cursor-pointer select-none"
                            style={{
                                background: "#fff",
                                borderColor: "#E4E0D3",
                                transformStyle: "preserve-3d",
                            }}
                            animate={{
                                x: wrapped * (reducedMotion ? 0 : 130),
                                rotateY: reducedMotion ? 0 : wrapped * -28,
                                z: -Math.abs(wrapped) * 120,
                                scale: isActive ? 1 : 0.86,
                                opacity: isActive ? 1 : 0.55,
                                zIndex: 10 - Math.abs(wrapped),
                                boxShadow: isActive
                                    ? "0 20px 40px rgba(43,42,40,0.16)"
                                    : "0 10px 20px rgba(43,42,40,0.08)",
                            }}
                            transition={{ type: "spring", stiffness: 260, damping: 28 }}
                            onClick={() => !isActive && setIndex(i)}
                        >
                            <Quote size={20} style={{ color: tokens.color.periwinkle }} strokeWidth={2.4} />
                            <p
                                className="text-sm mt-2 line-clamp-4"
                                style={{ color: tokens.color.ink, fontFamily: tokens.font.body, lineHeight: 1.6 }}
                            >
                                {t.content}
                            </p>
                            <div className="flex items-center gap-2 mt-4">
                                <div
                                    className="rounded-full flex items-center justify-center text-white text-xs shrink-0"
                                    style={{ width: 26, height: 26, background: tokens.color.mint, fontFamily: tokens.font.display, fontWeight: 700 }}
                                >
                                    {(t.author?.display_name || t.author?.username || "?").slice(0, 1).toUpperCase()}
                                </div>
                                <span className="text-xs" style={{ color: tokens.color.inkSoft }}>
                                    {t.author?.display_name || `@${t.author?.username}`}
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="flex items-center justify-center gap-4 mt-3">
                <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Previous testimonial"
                    className="rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ width: 34, height: 34, background: tokens.color.paper, border: "1px solid #E4E0D3", color: tokens.color.ink }}
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1.5">
                    {testimonials.map((t, i) => (
                        <button
                            key={t.id}
                            aria-label={`Go to testimonial ${i + 1}`}
                            onClick={() => setIndex(i)}
                            className="rounded-full transition-all"
                            style={{
                                width: i === index ? 16 : 6,
                                height: 6,
                                background: i === index ? tokens.color.periwinkle : "#E4E0D3",
                            }}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Next testimonial"
                    className="rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ width: 34, height: 34, background: tokens.color.paper, border: "1px solid #E4E0D3", color: tokens.color.ink }}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}