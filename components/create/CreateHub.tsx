"use client";

/**
 * CreateHub
 * -----------------------------------------------------------------------
 * The unified /create page. Same "pick a physical thing off a stack"
 * language as TypePicker, one level up: four tactile cards — a scrap,
 * a testimonial, a community, a community post — each tilts in 3D on
 * hover and morphs into its own composer on tap.
 *
 * Switching kinds plays a half-second terminal-flavored "loading"
 * flicker (VT323, scanlines) — a small echo of the boot sequence on
 * login, kept to a micro-moment here rather than the full 2–3s intro.
 * -----------------------------------------------------------------------
 */

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { PenLine, Award, Users, Pin } from "lucide-react";
import { tokens, CREATE_KINDS, CreateKind } from "@/lib/create-tokens";
import ScrapComposer from "./ScrapComposer";
import TestimonialComposer from "./TestimonialComposer";
import CommunityComposer from "./CommunityComposer";
import CommunityPostComposer from "./CommunityPostComposer";

const ICONS: Record<CreateKind, React.ElementType> = {
  scrap: PenLine,
  testimonial: Award,
  community: Users,
  "community-post": Pin,
};

export default function CreateHub() {
  const [kind, setKind] = useState<CreateKind | null>(null);
  const [loadingSwitch, setLoadingSwitch] = useState(false);

  function pick(next: CreateKind) {
    setLoadingSwitch(true);
    setTimeout(() => {
      setKind(next);
      setLoadingSwitch(false);
    }, 420);
  }

  function backToHub() {
    setKind(null);
  }

  return (
    <div
      className="relative w-full px-4 py-4 sm:py-6"
      style={{ background: tokens.color.paper, fontFamily: tokens.font.body, color: tokens.color.ink }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center">
          <p className="text-3xl sm:text-4xl" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
            what are you making today?
          </p>
          <p className="mt-2 text-sm" style={{ color: tokens.color.inkSoft }}>
            everything here starts the same way — pick the thing off the stack.
          </p>
        </header>

        <AnimatePresence mode="wait">
          {loadingSwitch && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative mx-auto max-w-sm rounded-xl p-5 overflow-hidden"
              style={{ background: tokens.color.filmBlack }}
            >
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 3px)",
                }}
              />
              <p style={{ fontFamily: tokens.font.terminal, fontSize: 18, color: "#8AF5A3" }}>
                loading the right paper<span className="opacity-70">_</span>
              </p>
            </motion.div>
          )}

          {!loadingSwitch && !kind && (
            <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HubPicker onPick={pick} />
            </motion.div>
          )}

          {!loadingSwitch && kind === "scrap" && (
            <motion.div key="scrap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <BackBar onBack={backToHub} dark={false} />
              <ScrapComposer />
            </motion.div>
          )}

          {!loadingSwitch && kind === "testimonial" && (
            <motion.div key="testimonial" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <BackBar onBack={backToHub} dark={false} />
              <TestimonialComposer />
            </motion.div>
          )}

          {!loadingSwitch && kind === "community" && (
            <motion.div key="community" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <BackBar onBack={backToHub} dark={false} />
              <CommunityComposer onCreated={backToHub} />
            </motion.div>
          )}

          {!loadingSwitch && kind === "community-post" && (
            <motion.div key="community-post" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <BackBar onBack={backToHub} dark={false} />
              <CommunityPostComposer />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BackBar({ onBack }: { onBack: () => void; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-4 text-xs hover:opacity-70 transition-opacity"
      style={{ color: tokens.color.inkSoft, fontFamily: tokens.font.body }}
    >
      ← make something else
    </button>
  );
}

function HubPicker({ onPick }: { onPick: (k: CreateKind) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
      {CREATE_KINDS.map((k) => (
        <HubCard key={k.id} k={k} onPick={onPick} />
      ))}
    </div>
  );
}

function HubCard({ k, onPick }: { k: (typeof CREATE_KINDS)[number]; onPick: (k: CreateKind) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mvY, [-50, 50], [10, -10]), { stiffness: 220, damping: 16 });
  const rotateY = useSpring(useTransform(mvX, [-50, 50], [-10, 10]), { stiffness: 220, damping: 16 });
  const Icon = ICONS[k.id];

  function handleMove(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mvX.set(e.clientX - rect.left - rect.width / 2);
    mvY.set(e.clientY - rect.top - rect.height / 2);
  }
  function reset() {
    mvX.set(0);
    mvY.set(0);
  }

  return (
    <motion.button
      ref={ref}
      type="button"
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={() => onPick(k.id)}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.96 }}
      style={{ perspective: 900 }}
      className="relative text-left"
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full h-[168px] rounded-xl shadow-md overflow-hidden flex flex-col items-center justify-center gap-2"
      >
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(155deg, ${k.accent}, ${k.accent}CC)` }}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: "linear-gradient(115deg, transparent 45%, rgba(255,255,255,0.5) 52%, transparent 60%)" }}
        />
        <Icon size={28} color="#fff" className="relative z-10" />
        <span
          className="relative z-10 text-base text-center px-2"
          style={{ fontFamily: tokens.font.display, fontWeight: 700, color: "#fff" }}
        >
          {k.label}
        </span>
      </motion.div>
      <p className="mt-2 text-center text-xs" style={{ fontFamily: tokens.font.body, color: tokens.color.inkSoft }}>
        {k.hint}
      </p>
    </motion.button>
  );
}
