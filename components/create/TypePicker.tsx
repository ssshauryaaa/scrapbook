"use client";

/**
 * TypePicker
 * -----------------------------------------------------------------------
 * "Picking a piece of paper off a stack" — five physically-distinct card
 * textures instead of a dropdown. Each card tilts in 3D toward the cursor
 * (same spring-tilt mechanic as the login card). Tapping a card hands its
 * layoutId to the parent, which mounts a canvas sharing that same
 * layoutId — framer-motion morphs the small card into the full compose
 * surface instead of cutting between two static screens.
 * -----------------------------------------------------------------------
 */

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Type, Image as ImageIcon, Mic, Video, Sparkles } from "lucide-react";
import { tokens, SCRAP_TYPES, ScrapType } from "@/lib/create-tokens";

const ICONS: Record<ScrapType, React.ElementType> = {
  text: Type,
  image: ImageIcon,
  voice: Mic,
  video: Video,
  gif: Sparkles,
};

export default function TypePicker({
  onPick,
  disabled,
}: {
  onPick: (type: ScrapType) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex gap-4 overflow-x-auto px-1 py-3 snap-x snap-mandatory sm:overflow-visible sm:grid sm:grid-cols-5"
      style={{ scrollbarWidth: "none" }}
    >
      {SCRAP_TYPES.map((t) => (
        <TiltCard key={t.id} type={t} onPick={onPick} disabled={disabled} />
      ))}
    </div>
  );
}

function TiltCard({
  type,
  onPick,
  disabled,
}: {
  type: (typeof SCRAP_TYPES)[number];
  onPick: (type: ScrapType) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mvY, [-50, 50], [10, -10]), { stiffness: 220, damping: 16 });
  const rotateY = useSpring(useTransform(mvX, [-50, 50], [-10, 10]), { stiffness: 220, damping: 16 });
  const Icon = ICONS[type.id];

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
      layoutId={`scrap-card-${type.id}`}
      disabled={disabled}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={() => onPick(type.id)}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.96 }}
      style={{ perspective: 900 }}
      className="relative shrink-0 w-[120px] sm:w-full snap-start text-left disabled:opacity-40 disabled:pointer-events-none"
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full h-[152px] rounded-xl shadow-md overflow-hidden"
      >
        <CardFace type={type.id} accent={type.accent} Icon={Icon} label={type.label} />
      </motion.div>
      <p
        className="mt-2 text-center text-xs"
        style={{ fontFamily: tokens.font.body, color: tokens.color.inkSoft }}
      >
        {type.hint}
      </p>
    </motion.button>
  );
}

function CardFace({
  type,
  accent,
  Icon,
  label,
}: {
  type: ScrapType;
  accent: string;
  Icon: React.ElementType;
  label: string;
}) {
  if (type === "text") {
    return (
      <div className="absolute inset-0" style={{ background: "#FFFDF7" }}>
        <div className="absolute left-6 top-0 bottom-0 w-px" style={{ background: tokens.color.pink, opacity: 0.5 }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 21px, ${tokens.color.periwinkle}22 22px)`,
          }}
        />
        <Icon size={20} className="absolute top-3 right-3" style={{ color: accent }} />
        <span
          className="absolute bottom-3 left-6 text-lg"
          style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}
        >
          {label}
        </span>
      </div>
    );
  }

  if (type === "image") {
    return (
      <div className="absolute inset-0 flex flex-col p-2.5" style={{ background: "#fff" }}>
        <div
          className="flex-1 rounded-sm flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${tokens.color.mint}33, ${tokens.color.pink}33)` }}
        >
          <Icon size={28} style={{ color: accent }} />
        </div>
        <span
          className="pt-2 text-center text-sm"
          style={{ fontFamily: tokens.font.terminal, color: tokens.color.ink }}
        >
          {label}
        </span>
      </div>
    );
  }

  if (type === "voice") {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2"
        style={{ background: `linear-gradient(180deg, ${accent}, #E8AE33)` }}
      >
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full border-4 flex items-center justify-center" style={{ borderColor: tokens.color.filmBlack + "55" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: tokens.color.filmBlack }} />
          </div>
          <div className="w-9 h-9 rounded-full border-4 flex items-center justify-center" style={{ borderColor: tokens.color.filmBlack + "55" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: tokens.color.filmBlack }} />
          </div>
        </div>
        <div className="w-16 h-6 rounded bg-[#2B2A28]/80 flex items-center justify-center gap-0.5 mt-1">
          {[3, 6, 4, 8, 5, 3].map((h, i) => (
            <span key={i} style={{ width: 2, height: h, background: "#fff" }} />
          ))}
        </div>
        <span className="text-sm" style={{ fontFamily: tokens.font.terminal, color: tokens.color.filmBlack }}>
          {label}
        </span>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="absolute inset-0 flex" style={{ background: tokens.color.filmBlack }}>
        <SprocketRail />
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Icon size={26} color="#fff" />
          <span className="text-sm" style={{ fontFamily: tokens.font.terminal, color: tokens.color.mint }}>
            {label}
          </span>
        </div>
        <SprocketRail />
      </div>
    );
  }

  // gif — glossy sticker-sheet
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${accent}, #2FB8AE)` }}>
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%)" }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <Icon size={26} color="#fff" />
        <span className="text-sm px-2 py-0.5 rounded-full" style={{ fontFamily: tokens.font.display, fontWeight: 700, background: "#fff", color: tokens.color.ink }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function SprocketRail() {
  return (
    <div className="w-3 flex flex-col justify-around py-1.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-[2px] bg-white/70 mx-auto" />
      ))}
    </div>
  );
}
