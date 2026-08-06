"use client";

import { motion } from "framer-motion";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRippleEntry, useRippleExit } from "@/components/profile/ripple-nav";
import { tokens } from "@/lib/scrapbook-theme";
import { CommunitiesList } from "@/components/lists";
import FloatingStickers, { type StickerSpec } from "@/components/floating-stickers";

const STICKERS: StickerSpec[] = [
  { emoji: "✦", color: tokens.color.mint, top: "8%", left: "90%", size: 34, rotate: -10, delay: 0, hideOnMobile: true },
  { emoji: "☆", color: tokens.color.amber, top: "18%", left: "5%", size: 30, rotate: 10, delay: 0.4, hideOnMobile: true },
  { emoji: "♡", color: tokens.color.pink, top: "84%", left: "92%", size: 32, rotate: -8, delay: 0.8, hideOnMobile: true },
  { emoji: "☺", color: tokens.color.periwinkle, top: "90%", left: "4%", size: 34, rotate: 8, delay: 1.2, hideOnMobile: true },
];

/**
 * Background for the communities explore page — reads as a perforated sheet of
 * raffle/admission tickets waiting to be torn apart, echoing the ticket-stub
 * shape used in CommunitiesList's cards (dashed perforation + punch-hole notches).
 */
function TicketSheetBackground() {
  return (
    <>
      {/* faint grid + corner punch-holes, like a full sheet of uncut tickets */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(${tokens.color.ink}0d 1px, transparent 1px),
            linear-gradient(90deg, ${tokens.color.ink}0d 1px, transparent 1px),
            radial-gradient(circle, ${tokens.color.ink}20 1.4px, transparent 1.6px)
          `,
          backgroundSize: "148px 74px, 148px 74px, 148px 74px",
        }}
      />

      {/* one oversized ticket watermark behind the header, echoing the stub's perforation + notches */}
      <svg
        className="absolute -top-14 -right-28 pointer-events-none hidden sm:block"
        width="440"
        height="230"
        viewBox="0 0 440 230"
        style={{ transform: "rotate(-8deg)", opacity: 0.05 }}
      >
        <rect x="4" y="4" width="432" height="222" rx="20" fill="none" stroke={tokens.color.ink} strokeWidth="3" />
        <line x1="312" y1="4" x2="312" y2="226" stroke={tokens.color.ink} strokeWidth="3" strokeDasharray="7 9" />
        <circle cx="312" cy="4" r="15" fill={tokens.color.paper} stroke={tokens.color.ink} strokeWidth="3" />
        <circle cx="312" cy="226" r="15" fill={tokens.color.paper} stroke={tokens.color.ink} strokeWidth="3" />
      </svg>

      {/* a second, smaller watermark low on the left for balance */}
      <svg
        className="absolute -bottom-10 -left-20 pointer-events-none hidden sm:block"
        width="300"
        height="160"
        viewBox="0 0 300 160"
        style={{ transform: "rotate(11deg)", opacity: 0.045 }}
      >
        <rect x="4" y="4" width="292" height="152" rx="16" fill="none" stroke={tokens.color.ink} strokeWidth="3" />
        <line x1="214" y1="4" x2="214" y2="156" stroke={tokens.color.ink} strokeWidth="3" strokeDasharray="6 8" />
        <circle cx="214" cy="4" r="12" fill={tokens.color.paper} stroke={tokens.color.ink} strokeWidth="3" />
        <circle cx="214" cy="156" r="12" fill={tokens.color.paper} stroke={tokens.color.ink} strokeWidth="3" />
      </svg>
    </>
  );
}

export default function ExploreCommunitiesPage() {
  const { user } = useAuth();
  const { overlay: entryOverlay } = useRippleEntry(tokens.color.mint);
  const { trigger: exitToExplore, overlay: exitOverlay } = useRippleExit();

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: tokens.color.paper, fontFamily: tokens.font.body, color: tokens.color.ink }}
    >
      {entryOverlay}
      {exitOverlay}
      <FloatingStickers stickers={STICKERS} />
      <TicketSheetBackground />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button
          type="button"
          onClick={(e) => exitToExplore(e, "/explore", tokens.color.mint)}
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
            style={{ width: 40, height: 40, background: `${tokens.color.mint}22`, color: "#1f7a70" }}
          >
            <LayoutGrid size={20} />
          </span>
          <p className="text-2xl sm:text-3xl" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
            communities
          </p>
        </motion.div>
        <p className="text-sm mb-7" style={{ color: tokens.color.inkSoft }}>
          find your people
        </p>

        <CommunitiesList currentUserId={user?.id} />
      </div>
    </div>
  );
}