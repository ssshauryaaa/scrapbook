"use client";

/**
 * Scrapbook — login page
 * -----------------------------------------------------------------------
 * Brand tokens locked earlier in the project:
 *   paper #FAF6EC · ink #2B2A28 · periwinkle #6C5CE7
 *   scrap pink #FF6F91 · sticker amber #FFC857 · mint #4ECDC4
 *   display: Baloo 2 · body: Manrope · terminal accent: VT323
 *
 * Requires: framer-motion (npm install framer-motion)
 * Fonts: swap the <style> @import block below for next/font/google if
 * you're on Next.js and want them self-hosted.
 *
 * Stacking order (bottom to top): ambient blobs -> paper grain -> doodles
 * & stickers (z-15, draggable) -> card (z-10 wrapper, opaque white face) ->
 * washi tape (z-20, deliberately pinned on top of the card edge). Stickers
 * sit ABOVE the card's z-10 so they never disappear behind the input box.
 * -----------------------------------------------------------------------
 */

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

const tokens = {
  color: {
    paper: "#FAF6EC",
    paperDark: "#F0EADA",
    ink: "#2B2A28",
    inkSoft: "#6B6860",
    periwinkle: "#6C5CE7",
    periwinkleDark: "#4A3FC7",
    pink: "#FF6F91",
    amber: "#FFC857",
    mint: "#4ECDC4",
  },
  font: {
    display: "'Baloo 2', sans-serif",
    body: "'Manrope', sans-serif",
    terminal: "'VT323', monospace",
  },
};

type Mode = "login" | "signup";

// the pencil sticker that used to float dead-center above the heading has
// been removed per feedback — everything left lives at the edges/corners
const STICKERS = [
  { emoji: "★", color: tokens.color.amber, top: "8%", left: "2%", size: 46, rotate: -12, delay: 0, hideOnMobile: false },
  { emoji: "♡", color: tokens.color.pink, top: "12%", left: "92%", size: 40, rotate: 10, delay: 0.4, hideOnMobile: false },
  { emoji: "✦", color: tokens.color.mint, top: "82%", left: "4%", size: 36, rotate: 8, delay: 0.8, hideOnMobile: false },
  { emoji: "☺", color: tokens.color.periwinkle, top: "86%", left: "94%", size: 44, rotate: -8, delay: 1.2, hideOnMobile: false },
  { emoji: "♪", color: tokens.color.pink, top: "48%", left: "-4%", size: 34, rotate: 14, delay: 2.0, hideOnMobile: true },
  { emoji: "✿", color: tokens.color.mint, top: "52%", left: "100%", size: 38, rotate: -10, delay: 0.6, hideOnMobile: true },
  { emoji: "☆", color: tokens.color.amber, top: "97%", left: "48%", size: 30, rotate: 6, delay: 1.0, hideOnMobile: true },
];

const TAPES = [
  { top: "-22px", left: "18%", rotate: -8, color: tokens.color.amber },
  { top: "-18px", left: "70%", rotate: 6, color: tokens.color.mint },
];

const BURST_COLORS = [tokens.color.amber, tokens.color.pink, tokens.color.mint, tokens.color.periwinkle];

export default function LoginPageContainer() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF6EC]" />}>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [booted, setBooted] = useState(false);
  const [bootPct, setBootPct] = useState(0);
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (searchParams.get("mode") === "signup") {
      setMode("signup");
    }
  }, [searchParams]);

  useEffect(() => {
    if (booted || reducedMotion) {
      if (reducedMotion) setBooted(true);
      return;
    }
    const id = setInterval(() => {
      setBootPct((p) => {
        const next = p + Math.random() * 16 + 6;
        if (next >= 100) {
          clearInterval(id);
          setTimeout(() => setBooted(true), 350);
          return 100;
        }
        return next;
      });
    }, 160);
    return () => clearInterval(id);
  }, [booted, reducedMotion]);

  useEffect(() => {
    if (mode !== "signup") return;
    if (!username || username.length < 3) {
      setUsernameOk(null);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      setUsernameOk(!data);
    }, 500);
    return () => clearTimeout(t);
  }, [username, mode, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } else {
      if (usernameOk === false) {
        setError("That username is already taken");
        setLoading(false);
        return;
      }
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName,
            username: username.toLowerCase(),
            avatar_url: null,
          },
        },
      });

      if (signUpErr) {
        setError(signUpErr.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError("Please check your email to verify your account.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    }
  };

  // 3D tilt on mouse move
  const cardRef = useRef<HTMLDivElement>(null);
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mvY, [-120, 120], [8, -8]), { stiffness: 180, damping: 18 });
  const rotateY = useSpring(useTransform(mvX, [-120, 120], [-8, 8]), { stiffness: 180, damping: 18 });

  function handleTilt(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mvX.set(e.clientX - rect.left - rect.width / 2);
    mvY.set(e.clientY - rect.top - rect.height / 2);
  }
  function resetTilt() {
    mvX.set(0);
    mvY.set(0);
  }

  // whole-page parallax layer (background drifts opposite the cursor)
  const bgX = useMotionValue(0);
  const bgY = useMotionValue(0);
  const bgSpringX = useSpring(bgX, { stiffness: 40, damping: 20 });
  const bgSpringY = useSpring(bgY, { stiffness: 40, damping: 20 });

  useEffect(() => {
    if (reducedMotion) return;
    function onMove(e: MouseEvent) {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      bgX.set(nx * -14);
      bgY.set(ny * -14);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [reducedMotion, bgX, bgY]);

  // sticker click bursts (percentage-positioned, local to the card wrapper)
  const [bursts, setBursts] = useState<{ id: number; x: string; y: string }[]>([]);
  function popSticker(top: string, left: string) {
    const id = Date.now() + Math.random();
    setBursts((b) => [...b, { id, x: left, y: top }]);
    setTimeout(() => setBursts((b) => b.filter((p) => p.id !== id)), 700);
  }

  // click-anywhere sparkles (pixel-positioned, whole page) — extra bit of
  // "this page is alive" interactivity requested on top of the stickers
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  function spawnSparkle(e: React.MouseEvent<HTMLDivElement>) {
    if (reducedMotion) return;
    if ((e.target as HTMLElement).closest("button, a, input, form")) return;
    const id = Date.now() + Math.random();
    setSparkles((s) => [...s, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setSparkles((s) => s.filter((p) => p.id !== id)), 650);
  }

  return (
    <div
      style={{
        fontFamily: tokens.font.body,
        background: tokens.color.paper,
        color: tokens.color.ink,
      }}
      onClick={spawnSparkle}
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-10"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700&family=Manrope:wght@400;500;700&family=VT323&display=swap');
        .paper-grain { background-image: radial-gradient(${tokens.color.ink}0a 1px, transparent 1px); background-size: 18px 18px; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ambient layer: grain + blurred blobs + doodle shapes, all z-0 */}
      <motion.div
        style={{ x: reducedMotion ? 0 : bgSpringX, y: reducedMotion ? 0 : bgSpringY }}
        className="absolute -inset-8 paper-grain opacity-40 pointer-events-none z-0"
      />
      <motion.div
        style={{ x: reducedMotion ? 0 : bgSpringX, y: reducedMotion ? 0 : bgSpringY }}
        className="absolute inset-0 pointer-events-none z-0"
      >
        <div
          className="absolute rounded-full opacity-30"
          style={{ width: "clamp(140px,30vw,260px)", height: "clamp(140px,30vw,260px)", top: "-6%", left: "-8%", background: tokens.color.mint, filter: "blur(60px)" }}
        />
        <div
          className="absolute rounded-full opacity-30"
          style={{ width: "clamp(160px,34vw,300px)", height: "clamp(160px,34vw,300px)", bottom: "-10%", right: "-10%", background: tokens.color.pink, filter: "blur(70px)" }}
        />
        <div
          className="absolute rounded-full opacity-20 hidden sm:block"
          style={{ width: 200, height: 200, top: "40%", right: "10%", background: tokens.color.amber, filter: "blur(50px)" }}
        />
        {/* dashed rotating ring — decorative, purely ambient */}
        <div
          className="absolute rounded-full hidden sm:block"
          style={{
            width: 140,
            height: 140,
            top: "8%",
            right: "18%",
            border: `2px dashed ${tokens.color.periwinkle}40`,
            animation: reducedMotion ? "none" : "spin-slow 18s linear infinite",
          }}
        />
        {/* squiggle doodle */}
        <svg className="absolute hidden md:block" style={{ bottom: "6%", left: "20%" }} width="90" height="40" viewBox="0 0 90 40">
          <path d="M2 20 Q 15 4, 28 20 T 54 20 T 80 20" stroke={tokens.color.ink} strokeOpacity="0.25" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      </motion.div>

      <AnimatePresence>
        {!booted && (
          <motion.div
            key="boot"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "#0D0D0D" }}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)",
              }}
            />
            <div className="w-full max-w-sm px-6" style={{ fontFamily: tokens.font.terminal }}>
              <p className="text-2xl mb-2" style={{ color: tokens.color.mint }}>
                SCRAPBOOK OS v1.0
              </p>
              <p className="text-lg mb-4" style={{ color: "#8AF5A3" }}>
                dialing your friends network...
              </p>
              <div className="h-3 rounded overflow-hidden mb-3" style={{ background: "#1A1A1A" }}>
                <motion.div
                  animate={{ width: `${Math.min(bootPct, 100)}%` }}
                  transition={{ ease: "linear" }}
                  className="h-full"
                  style={{ background: tokens.color.amber }}
                />
              </div>
              <p className="text-lg" style={{ color: "#8AF5A3" }} aria-live="polite">
                {Math.min(Math.round(bootPct), 100)}% connected
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBooted(true);
                }}
                className="mt-6 text-sm underline opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: tokens.color.mint, fontFamily: tokens.font.body }}
              >
                skip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {booted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative w-full max-w-md"
        >
          {/* stickers — draggable, z-15, always above the card (z-10) so
              they never vanish behind the input box */}
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
                className={`absolute select-none cursor-grab active:cursor-grabbing items-center justify-center rounded-full shadow-md z-[15] ${s.hideOnMobile ? "hidden sm:flex" : "flex"
                  }`}
                style={{
                  top: s.top,
                  left: s.left,
                  width: s.size,
                  height: s.size,
                  background: s.color,
                  color: "#fff",
                  fontSize: s.size * 0.45,
                }}
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

          {/* polaroid doodle pinned near the bottom-left corner, tucked
              behind the tape line so it reads as part of the scrapbook */}
          {!reducedMotion && (
            <motion.div
              drag
              dragMomentum={false}
              className="absolute z-[15] hidden sm:block cursor-grab active:cursor-grabbing rounded-sm shadow-lg"
              style={{ top: "62%", left: "-9%", width: 56, height: 68, background: "#fff", padding: 4 }}
              initial={{ rotate: -10 }}
              animate={{ rotate: [-10, -6, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.08, rotate: 0 }}
              whileDrag={{ scale: 1.15, zIndex: 50 }}
            >
              <div className="w-full" style={{ height: 44, background: tokens.color.periwinkle, opacity: 0.25 }} />
              <p className="text-center mt-1" style={{ fontFamily: tokens.font.terminal, fontSize: 12, color: tokens.color.inkSoft }}>
                us :)
              </p>
            </motion.div>
          )}

          {/* confetti burst on sticker click */}
          <AnimatePresence>
            {bursts.map((b) => (
              <motion.div key={b.id} className="absolute pointer-events-none z-[16]" style={{ top: b.y, left: b.x }}>
                {BURST_COLORS.map((c, idx) => {
                  const angle = (idx / BURST_COLORS.length) * Math.PI * 2;
                  return (
                    <motion.span
                      key={idx}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x: Math.cos(angle) * 34, y: Math.sin(angle) * 34, opacity: 0, scale: 0.4 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="absolute rounded-full"
                      style={{ width: 8, height: 8, background: c }}
                    />
                  );
                })}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* washi tape — deliberately above the card (z-20) since real
              tape sits on top of the paper it's pinning down */}
          {TAPES.map((t, i) => (
            <div
              key={i}
              className="absolute z-20 pointer-events-none opacity-80"
              style={{ top: t.top, left: t.left, width: 64, height: 22, background: t.color, transform: `rotate(${t.rotate}deg)` }}
            />
          ))}

          <p
            className="text-center text-3xl sm:text-4xl mb-6 relative z-10"
            style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}
          >
            scrapbook
          </p>

          <div style={{ perspective: 1400 }} className="relative z-10" onClick={(e) => e.stopPropagation()}>
            <motion.div
              ref={cardRef}
              onMouseMove={handleTilt}
              onMouseLeave={resetTilt}
              style={{ rotateX: reducedMotion ? 0 : rotateX, rotateY: reducedMotion ? 0 : rotateY, transformStyle: "preserve-3d" }}
              className="rounded-2xl"
            >
              <div style={{ perspective: 1400 }}>
                <motion.div
                  animate={{ rotateY: mode === "signup" ? 180 : 0 }}
                  transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
                  style={{ transformStyle: "preserve-3d", display: "grid" }}
                  className="w-full"
                >
                  {/* front — login */}
                  <div
                    style={{ backfaceVisibility: "hidden", background: "#fff", gridArea: "1 / 1" }}
                    className="rounded-2xl border p-6 sm:p-8 pb-7 sm:pb-9 shadow-xl flex flex-col"
                  >
                    <FormBody
                      heading="welcome back"
                      subheading="your scraps missed you"
                      ctaLabel="log in"
                      showPassword={showPassword}
                      setShowPassword={setShowPassword}
                      onSubmit={handleSubmit}
                      loading={loading}
                      error={error}
                      email={email}
                      setEmail={setEmail}
                      password={password}
                      setPassword={setPassword}
                    />
                    <SwitchLine
                      text="new here?"
                      cta="create an account"
                      onClick={() => {
                        setMode("signup");
                        setError("");
                      }}
                    />
                  </div>

                  {/* back — signup */}
                  <div
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", gridArea: "1 / 1", background: "#fff" }}
                    className="rounded-2xl border p-6 sm:p-8 pb-7 sm:pb-9 shadow-xl flex flex-col"
                  >
                    <FormBody
                      heading="start your scrapbook"
                      subheading="claim your wall before someone else does"
                      ctaLabel="sign up"
                      showPassword={showPassword}
                      setShowPassword={setShowPassword}
                      onSubmit={handleSubmit}
                      isSignup
                      loading={loading}
                      error={error}
                      email={email}
                      setEmail={setEmail}
                      password={password}
                      setPassword={setPassword}
                      displayName={displayName}
                      setDisplayName={setDisplayName}
                      username={username}
                      setUsername={setUsername}
                      usernameOk={usernameOk}
                    />
                    <SwitchLine
                      text="already have an account?"
                      cta="log in"
                      onClick={() => {
                        setMode("login");
                        setError("");
                      }}
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function FormBody({
  heading,
  subheading,
  ctaLabel,
  showPassword,
  setShowPassword,
  isSignup,
  onSubmit,
  loading,
  error,
  email,
  setEmail,
  password,
  setPassword,
  displayName,
  setDisplayName,
  username,
  setUsername,
  usernameOk,
}: {
  heading: string;
  subheading: string;
  ctaLabel: string;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  isSignup?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  displayName?: string;
  setDisplayName?: (v: string) => void;
  username?: string;
  setUsername?: (v: string) => void;
  usernameOk?: boolean | null;
}) {
  const usernameHint =
    username && username.length < 3
      ? "Minimum 3 characters"
      : usernameOk === null && username
        ? "Checking…"
        : usernameOk
          ? "✓ Available"
          : usernameOk === false
            ? "✗ Already taken"
            : "";

  return (
    <>
      <p className="text-xl sm:text-2xl mb-1" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
        {heading}
      </p>
      <p className="text-sm mb-6" style={{ color: tokens.color.inkSoft }}>
        {subheading}
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100">
          {error}
        </div>
      )}

      <form className="space-y-4 flex flex-col flex-1" onSubmit={onSubmit}>
        {isSignup && setDisplayName && setUsername && (
          <>
            <Field
              label="display name"
              type="text"
              placeholder="what should friends call you"
              value={displayName || ""}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <Field
              label="username"
              type="text"
              placeholder="your_handle"
              value={username || ""}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
              hint={usernameHint}
              required
            />
          </>
        )}
        <Field label="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field
          label="password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs transition-opacity hover:opacity-70 flex items-center justify-center h-full px-3"
              style={{ color: tokens.color.inkSoft }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <div className="flex-1" />

        <motion.button
          type="submit"
          disabled={loading || (isSignup && usernameOk === false)}
          whileHover={{ scale: loading ? 1 : 1.02, boxShadow: loading ? "none" : "0 8px 20px rgba(108,92,231,0.35)" }}
          whileTap={{ scale: loading ? 1 : 0.96 }}
          className="w-full rounded-xl py-3 text-white font-medium disabled:opacity-50"
          style={{ background: tokens.color.periwinkle, fontFamily: tokens.font.body, marginTop: "auto" }}
        >
          {loading ? "..." : ctaLabel}
        </motion.button>
      </form>
    </>
  );
}

function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
  hint,
  required,
  rightElement,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
  required?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <label className="block relative">
      <div className="flex justify-between items-end mb-1">
        <span className="block text-xs" style={{ color: tokens.color.inkSoft }}>
          {label}
        </span>
        {hint && (
          <span className="text-[10px]" style={{ color: hint.includes("✗") ? tokens.color.pink : tokens.color.inkSoft }}>
            {hint}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-shadow"
          style={{ borderColor: "#E4E0D3", paddingRight: rightElement ? "2.5rem" : "0.75rem" }}
          onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 3px ${tokens.color.periwinkle}33`)}
          onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
        />
        {rightElement && <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center">{rightElement}</div>}
      </div>
    </label>
  );
}

function SwitchLine({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }) {
  return (
    <p className="text-center text-sm mt-6" style={{ color: tokens.color.inkSoft }}>
      {text}{" "}
      <button type="button" onClick={onClick} className="underline font-medium" style={{ color: tokens.color.pink }}>
        {cta}
      </button>
    </p>
  );
}