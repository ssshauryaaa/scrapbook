"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Sticker } from "lucide-react";
import { useRippleEntry, useRippleExit } from "@/components/profile/ripple-nav";
import { tokens } from "@/lib/scrapbook-theme";
import { ScrapsList } from "@/components/lists";
import FloatingStickers, { type StickerSpec } from "@/components/floating-stickers";

const STICKERS: StickerSpec[] = [
  { emoji: "✎", color: tokens.color.ink, top: "6%", left: "92%", size: 32, rotate: -14, delay: 0, hideOnMobile: true },
  { emoji: "♪", color: tokens.color.pink, top: "16%", left: "4%", size: 34, rotate: 12, delay: 0.4, hideOnMobile: true },
  { emoji: "✿", color: tokens.color.mint, top: "82%", left: "94%", size: 30, rotate: -8, delay: 0.8, hideOnMobile: true },
  { emoji: "★", color: tokens.color.amber, top: "90%", left: "5%", size: 32, rotate: 8, delay: 1.2, hideOnMobile: true },
];

/**
 * Background for the scraps explore page — a corkboard: mottled cork speckle
 * texture plus scattered old pin-holes, echoing the pushpins on ScrapsList's
 * torn-paper cards. One oversized torn-scrap outline sits as a watermark.
 */
function CorkboardBackground() {
  const cork = "#8A6238";

  return (
    <>
      {/* mottled cork speckle, four overlapping grains for an organic (non-repeating-looking) texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, ${cork}1c 0 1.6px, transparent 2px),
            radial-gradient(circle at 68% 62%, ${cork}16 0 1.2px, transparent 1.8px),
            radial-gradient(circle at 42% 82%, ${cork}14 0 1.4px, transparent 2px),
            radial-gradient(circle at 85% 18%, ${cork}18 0 1px, transparent 1.6px)
          `,
          backgroundSize: "46px 46px, 34px 34px, 58px 58px, 40px 40px",
        }}
      />

      {/* scattered old pin-holes, sparser and darker than the cork grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          backgroundImage: `radial-gradient(circle, ${tokens.color.ink}22 0 1.8px, transparent 2.2px)`,
          backgroundSize: "120px 120px",
        }}
      />

      {/* oversized torn-scrap watermark behind the header, jagged bottom edge echoing the card shape */}
      <svg
        className="absolute -top-8 -right-20 pointer-events-none hidden sm:block"
        width="440"
        height="250"
        viewBox="0 0 440 250"
        style={{ transform: "rotate(-7deg)", opacity: 0.06 }}
      >
        <path
          d="M4,4 L436,4 L436,224 L410,238 L384,222 L358,240 L332,224 L306,238 L280,222 L254,240 L228,224 L202,238 L176,222 L150,240 L124,224 L98,238 L72,222 L46,240 L20,228 L4,222 Z"
          fill="none"
          stroke={tokens.color.ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="220" cy="4" r="8" fill={tokens.color.paper} stroke={tokens.color.ink} strokeWidth="2.5" />
      </svg>
    </>
  );
}

export default function ExploreScrapsPage() {
  const { overlay: entryOverlay } = useRippleEntry(tokens.color.amber);
  const { trigger: exitToExplore, overlay: exitOverlay } = useRippleExit();

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: tokens.color.paper, fontFamily: tokens.font.body, color: tokens.color.ink }}
    >
      {entryOverlay}
      {exitOverlay}
      <FloatingStickers stickers={STICKERS} burstColors={[tokens.color.amber, tokens.color.pink, tokens.color.mint, tokens.color.periwinkle]} />
      <CorkboardBackground />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button
          type="button"
          onClick={(e) => exitToExplore(e, "/explore", tokens.color.amber)}
          className="inline-flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity relative z-10"
          style={{ color: tokens.color.inkSoft }}
        >
          <ArrowLeft size={14} /> back to explore
        </button>

        <motion.div
          initial={{ opacity: 0, y: -10, rotate: -3 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="flex items-center gap-3 mb-1"
        >
          <span
            className="rounded-full flex items-center justify-center"
            style={{ width: 40, height: 40, background: `${tokens.color.amber}22`, color: "#854F0B" }}
          >
            <Sticker size={20} />
          </span>
          <p className="text-2xl sm:text-3xl" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
            fresh off the wall
          </p>
        </motion.div>
        <p className="text-sm mb-7" style={{ color: tokens.color.inkSoft }}>
          recent scraps from around scrapbook
        </p>

        <ScrapsList onOpenProfile={(e, username) => exitToExplore(e, `/${username}`, tokens.color.amber)} />
      </div>
    </div>
  );
}