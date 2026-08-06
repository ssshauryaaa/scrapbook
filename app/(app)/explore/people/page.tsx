"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRippleEntry, useRippleExit } from "@/components/profile/ripple-nav";
import { tokens } from "@/lib/scrapbook-theme";
import { PeopleList } from "@/components/lists";
import FloatingStickers, { type StickerSpec } from "@/components/floating-stickers";

const STICKERS: StickerSpec[] = [
  { emoji: "☺", color: tokens.color.periwinkle, top: "8%", left: "4%", size: 40, rotate: -10, delay: 0, hideOnMobile: true },
  { emoji: "♡", color: tokens.color.pink, top: "14%", left: "92%", size: 34, rotate: 10, delay: 0.4, hideOnMobile: true },
  { emoji: "★", color: tokens.color.amber, top: "80%", left: "6%", size: 30, rotate: 8, delay: 0.8, hideOnMobile: true },
  { emoji: "✦", color: tokens.color.mint, top: "88%", left: "90%", size: 32, rotate: -8, delay: 1.2, hideOnMobile: true },
];

/**
 * Background for the people explore page — a loose-leaf notebook page: ruled
 * horizontal lines, a red margin rule, and a column of binder punch-holes down
 * the left edge, echoing the spiral binding + margin rule on PeopleList's cards.
 */
function NotebookBackground() {
  return (
    <>
      {/* ruled horizontal lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 27px, ${tokens.color.periwinkle}14 28px)`,
        }}
      />

      {/* red margin rule, offset to clear the binder holes */}
      <div
        className="absolute top-0 bottom-0 w-px pointer-events-none hidden sm:block"
        style={{ left: 84, background: "rgba(214,92,79,0.22)" }}
      />

      {/* column of binder punch-holes down the left edge */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none hidden sm:block"
        style={{
          left: 44,
          width: 14,
          backgroundImage: `radial-gradient(circle, ${tokens.color.ink}26 0 4px, transparent 4.5px)`,
          backgroundSize: "14px 46px",
          backgroundPosition: "center 20px",
          backgroundRepeat: "repeat-y",
        }}
      />

      {/* oversized ghost spiral-card watermark behind the header */}
      <svg
        className="absolute -top-10 -right-24 pointer-events-none hidden sm:block"
        width="420"
        height="240"
        viewBox="0 0 420 240"
        style={{ transform: "rotate(6deg)", opacity: 0.05 }}
      >
        <rect x="4" y="24" width="412" height="212" rx="14" fill="none" stroke={tokens.color.ink} strokeWidth="3" />
        <line x1="4" y1="24" x2="416" y2="24" stroke={tokens.color.ink} strokeWidth="3" />
        {Array.from({ length: 8 }).map((_, h) => (
          <circle key={h} cx={38 + h * 48} cy={24} r="7" fill={tokens.color.paper} stroke={tokens.color.ink} strokeWidth="2.5" />
        ))}
      </svg>
    </>
  );
}

export default function ExplorePeoplePage() {
  const { user } = useAuth();
  const { overlay: entryOverlay } = useRippleEntry(tokens.color.periwinkle);
  const { trigger: exitToExplore, overlay: exitOverlay } = useRippleExit();

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: tokens.color.paper, fontFamily: tokens.font.body, color: tokens.color.ink }}
    >
      {entryOverlay}
      {exitOverlay}
      <FloatingStickers stickers={STICKERS} />
      <NotebookBackground />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button
          type="button"
          onClick={(e) => exitToExplore(e, "/explore", tokens.color.periwinkle)}
          className="inline-flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity relative z-10"
          style={{ color: tokens.color.inkSoft }}
        >
          <ArrowLeft size={14} /> back to explore
        </button>

        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex items-center gap-3 mb-1"
        >
          <span
            className="rounded-full flex items-center justify-center"
            style={{ width: 40, height: 40, background: `${tokens.color.periwinkle}22`, color: tokens.color.periwinkle }}
          >
            <Users size={20} />
          </span>
          <p className="text-2xl sm:text-3xl" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
            people
          </p>
        </motion.div>
        <p className="text-sm mb-7" style={{ color: tokens.color.inkSoft }}>
          faces you haven't met yet
        </p>

        <PeopleList currentUserId={user?.id} onOpenProfile={(e, username) => exitToExplore(e, `/${username}`, tokens.color.periwinkle)} />
      </div>
    </div>
  );
}