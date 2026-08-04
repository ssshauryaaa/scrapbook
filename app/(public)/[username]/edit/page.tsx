"use client";

/**
 * Scrapbook — settings / edit profile page
 * -----------------------------------------------------------------------
 * Arrives via a ripple transition from the "edit profile" button on the
 * profile page (see components/transitions/ripple-nav.tsx). Shares the
 * same paper/periwinkle/washi-tape visual language as the profile and
 * login pages: Baloo 2 headings, Manrope body, white cards on paper grain.
 * -----------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Camera, ArrowLeft, Check, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { tokens, resolveTheme } from "@/lib/scrapbook-theme";
import { useRippleEntry, useRippleExit } from "@/components/profile/ripple-nav";
import ManageDrawers from "@/components/profile/manage-drawers";

type SaveState = "idle" | "saving" | "success" | "error";

// background "characters" scattered around the edit form — same draggable
// + click-to-pop device as the login page, just a fresh cast for variety
const BG_STICKERS = [
  { emoji: "👻", color: tokens.color.periwinkle, top: "10%", left: "6%", size: 44, rotate: -10, delay: 0, hideOnMobile: true },
  { emoji: "★", color: tokens.color.amber, top: "22%", left: "90%", size: 38, rotate: 12, delay: 0.4, hideOnMobile: true },
  { emoji: "✂", color: tokens.color.pink, top: "68%", left: "4%", size: 36, rotate: -8, delay: 0.8, hideOnMobile: true },
  { emoji: "♪", color: tokens.color.mint, top: "80%", left: "92%", size: 34, rotate: 8, delay: 1.2, hideOnMobile: true },
  { emoji: "✦", color: tokens.color.pink, top: "42%", left: "94%", size: 30, rotate: -14, delay: 1.6, hideOnMobile: true },
  { emoji: "☺", color: tokens.color.amber, top: "90%", left: "10%", size: 32, rotate: 6, delay: 2.0, hideOnMobile: true },
];

const BG_BURST_COLORS = [tokens.color.amber, tokens.color.pink, tokens.color.mint, tokens.color.periwinkle];

export default function EditProfilePage() {
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const routeUsername = (params?.username ?? "").toLowerCase();
  const supabase = useRef(createClient()).current;
  const { user, profile, refreshProfile, loading } = useAuth();

  const { overlay: entryOverlay } = useRippleEntry(tokens.color.periwinkle);
  const { trigger: exitToProfile, overlay: exitOverlay } = useRippleExit();

  const theme = resolveTheme((profile as any)?.theme ?? null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [visitorLogOptIn, setVisitorLogOptIn] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [warnUnsaved, setWarnUnsaved] = useState(false);
  const goProfileControls = useAnimationControls();

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [bgBursts, setBgBursts] = useState<{ id: number; x: string; y: string }[]>([]);
  function popBgSticker(top: string, left: string) {
    const id = Date.now() + Math.random();
    setBgBursts((b) => [...b, { id, x: left, y: top }]);
    setTimeout(() => setBgBursts((b) => b.filter((p) => p.id !== id)), 700);
  }

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // hydrate form fields once the profile has loaded
  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? "");
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setVisitorLogOptIn(profile.visitor_log_opt_in ?? false);
    setAvatarUrl(profile.avatar_url ?? null);
    setAvatarDirty(false);
  }, [profile]);

  // redirect signed-out visitors, and redirect anyone trying to edit a
  // profile that isn't their own to their own edit page instead
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (profile && routeUsername && profile.username.toLowerCase() !== routeUsername) {
      router.push(`/${profile.username}/edit`);
    }
  }, [loading, user, profile, routeUsername, router]);

  // debounced username availability check, ignoring the user's own row
  useEffect(() => {
    if (!user) return;
    if (!username || username.length < 3) {
      setUsernameOk(null);
      return;
    }
    if (username.toLowerCase() === profile?.username) {
      setUsernameOk(true);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .neq("id", user.id)
        .maybeSingle();
      setUsernameOk(!data);
    }, 500);
    return () => clearTimeout(t);
  }, [username, user, profile?.username, supabase]);

  async function handleAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    setErrorMsg("");

    const path = `${user.id}/${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

    if (uploadErr) {
      setErrorMsg(uploadErr.message);
      setAvatarUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // cache-bust so the new image shows immediately even if the filename repeats
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    setAvatarDirty(true);
    setAvatarUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (usernameOk === false) {
      setSaveState("error");
      setErrorMsg("That username is already taken.");
      return;
    }

    setSaveState("saving");
    setErrorMsg("");

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.toLowerCase(),
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
        visitor_log_opt_in: visitorLogOptIn,
      })
      .eq("id", user.id);

    if (error) {
      setSaveState("error");
      setErrorMsg(error.message);
      return;
    }

    await refreshProfile();
    setSaveState("success");
    setTimeout(() => setSaveState("idle"), 2500);
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: tokens.color.paper }}>
        <Loader2 className="animate-spin" style={{ color: tokens.color.periwinkle }} />
      </div>
    );
  }

  const isDirty =
    username.toLowerCase() !== (profile.username ?? "").toLowerCase() ||
    displayName !== (profile.display_name ?? "") ||
    bio !== (profile.bio ?? "") ||
    visitorLogOptIn !== (profile.visitor_log_opt_in ?? false) ||
    avatarDirty;

  function handleGoToProfile(e: React.MouseEvent) {
    if (!profile) return;
    if (isDirty) {
      goProfileControls.start({ x: [0, -8, 8, -8, 8, 0], transition: { duration: 0.4 } });
      setWarnUnsaved(true);
      setTimeout(() => setWarnUnsaved(false), 2400);
      return;
    }
    exitToProfile(e, `/${profile.username}`, theme.primary);
  }

  return (
    <div
      className="relative min-h-screen w-full"
      style={{ background: tokens.color.paper, fontFamily: tokens.font.body, color: tokens.color.ink }}
    >
      {entryOverlay}
      {exitOverlay}
      {user && <ManageDrawers userId={user.id} />}

      {/* paper grain, consistent with every other page */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{ backgroundImage: `radial-gradient(${tokens.color.ink}0a 1px, transparent 1px)`, backgroundSize: "18px 18px" }}
      />

      {/* background characters — draggable, poppable, purely decorative */}
      {!reducedMotion &&
        BG_STICKERS.map((s, i) => (
          <motion.div
            key={i}
            drag
            dragMomentum={false}
            dragElastic={0.4}
            onClick={() => popBgSticker(s.top, s.left)}
            className={`fixed select-none cursor-grab active:cursor-grabbing items-center justify-center rounded-full shadow-md z-0 ${
              s.hideOnMobile ? "hidden lg:flex" : "flex"
            }`}
            style={{ top: s.top, left: s.left, width: s.size, height: s.size, background: s.color, color: "#fff", fontSize: s.size * 0.5 }}
            initial={{ rotate: s.rotate, y: 0 }}
            animate={{ y: [0, -10, 0], rotate: [s.rotate, s.rotate + 6, s.rotate] }}
            transition={{ duration: 3.6, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
            whileHover={{ scale: 1.25, rotate: s.rotate + 16 }}
            whileTap={{ scale: 0.75 }}
            whileDrag={{ scale: 1.35, zIndex: 30, boxShadow: "0 12px 24px rgba(0,0,0,0.25)" }}
          >
            {s.emoji}
          </motion.div>
        ))}

      <AnimatePresence>
        {bgBursts.map((b) => (
          <motion.div key={b.id} className="fixed pointer-events-none z-[1]" style={{ top: b.y, left: b.x }}>
            {BG_BURST_COLORS.map((c, idx) => {
              const angle = (idx / BG_BURST_COLORS.length) * Math.PI * 2;
              return (
                <motion.span
                  key={idx}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(angle) * 30, y: Math.sin(angle) * 30, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="absolute rounded-full"
                  style={{ width: 7, height: 7, background: c }}
                />
              );
            })}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* left-edge tab — mirrors the manage-drawer tabs on the right */}
      <motion.button
        type="button"
        animate={goProfileControls}
        onClick={handleGoToProfile}
        whileHover={{ x: 4 }}
        className="fixed z-40 flex flex-col items-center gap-2 rounded-r-xl shadow-lg"
        style={{
          left: 0,
          top: "50%",
          y: "-50%",
          background: theme.primary,
          color: "#fff",
          padding: "16px 10px",
          fontFamily: tokens.font.display,
          fontWeight: 700,
        }}
        aria-label="Go view your profile"
      >
        <Sparkles size={16} />
        <span style={{ writingMode: "vertical-rl", fontSize: 13, letterSpacing: 0.3 }}>go view ur profile noww!</span>
      </motion.button>

      <AnimatePresence>
        {warnUnsaved && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="fixed z-40 rounded-xl px-3 py-2 text-xs shadow-lg"
            style={{ left: 68, top: "50%", y: "-50%", background: tokens.color.ink, color: "#fff", maxWidth: 180 }}
          >
            save your changes first! 👀
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button
          type="button"
          onClick={(e) => profile?.username && exitToProfile(e, `/${profile.username}`, theme.primary)}
          className="inline-flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity"
          style={{ color: tokens.color.inkSoft }}
        >
          <ArrowLeft size={14} /> back to profile
        </button>

        <p className="text-2xl sm:text-3xl mb-1" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
          edit your scrapbook
        </p>
        <p className="text-sm mb-6" style={{ color: tokens.color.inkSoft }}>
          this is what friends see when they visit your wall
        </p>

        <form onSubmit={handleSave} className="rounded-2xl border p-6 sm:p-8 relative" style={{ background: "#fff", borderColor: "#E4E0D3" }}>
          {/* washi tape corner, same device as the login card + profile widgets */}
          <div
            className="absolute -top-2 left-8 opacity-80 pointer-events-none"
            style={{ width: 56, height: 18, background: tokens.color.amber, transform: "rotate(-4deg)" }}
          />

          {/* avatar upload */}
          <div className="flex flex-col items-center mb-8">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="group relative rounded-full overflow-hidden border-4"
              style={{ width: 96, height: 96, borderColor: "#fff", background: theme.primary, boxShadow: "0 10px 20px rgba(43,42,40,0.15)" }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-3xl" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
                  {(displayName || username || "?").slice(0, 1).toUpperCase()}
                </div>
              )}

              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(13,13,13,0.45)" }}
              >
                {avatarUploading ? <Loader2 size={18} className="animate-spin text-white" /> : <Camera size={18} color="#fff" />}
              </div>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarSelected} className="hidden" />
            <p className="text-xs mt-2" style={{ color: tokens.color.inkSoft }}>
              tap to change your photo
            </p>
          </div>

          {saveState === "error" && errorMsg && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}
          {saveState === "success" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
              style={{ background: `${tokens.color.mint}22`, color: "#1f7a70" }}
            >
              <Check size={15} /> saved — your scrapbook is up to date
            </motion.div>
          )}

          <div className="space-y-4">
            <Field label="display name" value={displayName} onChange={setDisplayName} placeholder="what should friends call you" />

            <Field
              label="username"
              value={username}
              onChange={(v) => setUsername(v.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
              placeholder="your_handle"
              hint={
                username.length > 0 && username.length < 3
                  ? "minimum 3 characters"
                  : usernameOk === null
                  ? undefined
                  : usernameOk
                  ? "✓ available"
                  : "✗ already taken"
              }
              hintColor={usernameOk === false ? tokens.color.pink : tokens.color.inkSoft}
            />

            <label className="block">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs" style={{ color: tokens.color.inkSoft }}>
                  bio
                </span>
                <span className="text-[10px]" style={{ color: tokens.color.inkSoft }}>
                  {bio.length}/160
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 160))}
                placeholder="a little about you, or your wall"
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none transition-shadow"
                style={{ borderColor: "#E4E0D3" }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 3px ${tokens.color.periwinkle}33`)}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
              />
            </label>

            <div className="flex items-center justify-between rounded-lg border px-3 py-3" style={{ borderColor: "#E4E0D3" }}>
              <div className="pr-4">
                <p className="text-sm font-medium">who stopped by</p>
                <p className="text-xs mt-0.5" style={{ color: tokens.color.inkSoft }}>
                  show mutual profile visitors on your wall — only visible when both people opt in
                </p>
              </div>
              <Toggle checked={visitorLogOptIn} onChange={setVisitorLogOptIn} />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={saveState === "saving" || usernameOk === false}
            whileHover={{ scale: saveState === "saving" ? 1 : 1.02, boxShadow: "0 8px 20px rgba(108,92,231,0.35)" }}
            whileTap={{ scale: saveState === "saving" ? 1 : 0.96 }}
            className="w-full rounded-xl py-3 text-white font-medium mt-6 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: tokens.color.periwinkle }}
          >
            {saveState === "saving" && <Loader2 size={15} className="animate-spin" />}
            {saveState === "saving" ? "saving..." : "save changes"}
          </motion.button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  hintColor,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
  hintColor?: string;
}) {
  return (
    <label className="block">
      <div className="flex justify-between items-end mb-1">
        <span className="text-xs" style={{ color: tokens.color.inkSoft }}>
          {label}
        </span>
        {hint && (
          <span className="text-[10px]" style={{ color: hintColor || tokens.color.inkSoft }}>
            {hint}
          </span>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-shadow"
        style={{ borderColor: "#E4E0D3" }}
        onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 3px ${tokens.color.periwinkle}33`)}
        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
      />
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 rounded-full transition-colors"
      style={{ width: 44, height: 26, background: checked ? tokens.color.periwinkle : "#E4E0D3" }}
    >
      <motion.span
        className="absolute rounded-full bg-white shadow"
        style={{ width: 20, height: 20, top: 3 }}
        animate={{ left: checked ? 21 : 3 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </button>
  );
}