"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Archive, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  tokens,
  STICKER_LIBRARY,
  TAPE_LIBRARY,
  BURST_COLORS,
  PlacedDeco,
  Draft,
} from "@/lib/create-tokens";

/* ---------------------------------------------------------------------- */
/* DECORATION TRAY — drag stickers/tape onto the canvas below it           */
/* ---------------------------------------------------------------------- */

export function DecorationTray({
  canvasRef,
  placed,
  onPlace,
  onRemove,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  placed: PlacedDeco[];
  onPlace: (item: PlacedDeco) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs mb-2" style={{ fontFamily: tokens.font.body, color: tokens.color.inkSoft }}>
        drag 2–3 onto your scrap
      </p>
      <div className="flex items-center gap-3 flex-wrap p-3 rounded-xl" style={{ background: tokens.color.paperDark }}>
        {STICKER_LIBRARY.map((s) => (
          <motion.div
            key={s.id}
            drag
            dragSnapToOrigin
            dragElastic={0.6}
            whileDrag={{ scale: 1.3, zIndex: 50 }}
            onDragEnd={(_, info) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              const x = info.point.x - rect.left;
              const y = info.point.y - rect.top;
              if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
              onPlace({
                id: `${s.id}-${Date.now()}`,
                kind: "sticker",
                refId: s.id,
                x,
                y,
                rotate: Math.round(Math.random() * 30 - 15),
              });
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sm select-none"
            style={{ background: s.color, color: "#fff" }}
          >
            {s.emoji}
          </motion.div>
        ))}
        <span className="w-px h-6" style={{ background: "#E4E0D3" }} />
        {TAPE_LIBRARY.map((t) => (
          <motion.div
            key={t.id}
            drag
            dragSnapToOrigin
            dragElastic={0.6}
            whileDrag={{ scale: 1.3, zIndex: 50 }}
            onDragEnd={(_, info) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              const x = info.point.x - rect.left;
              const y = info.point.y - rect.top;
              if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
              onPlace({
                id: `${t.id}-${Date.now()}`,
                kind: "tape",
                refId: t.id,
                x,
                y,
                rotate: Math.round(Math.random() * 20 - 10),
              });
            }}
            className="w-9 h-4 cursor-grab active:cursor-grabbing shadow-sm select-none"
            style={{ background: t.color, opacity: 0.85 }}
          />
        ))}
      </div>

      {/* placed decorations, rendered as an overlay positioned to canvasRef */}
      <AnimatePresence>
        {placed.map((p) => {
          const sticker = STICKER_LIBRARY.find((s) => s.id === p.refId);
          const tape = TAPE_LIBRARY.find((t) => t.id === p.refId);
          return (
            <motion.button
              key={p.id}
              type="button"
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: p.rotate }}
              exit={{ scale: 0 }}
              onClick={() => onRemove(p.id)}
              className="absolute select-none"
              style={{
                left: p.x,
                top: p.y,
                transform: "translate(-50%,-50%)",
                width: p.kind === "sticker" ? 32 : 44,
                height: p.kind === "sticker" ? 32 : 16,
                borderRadius: p.kind === "sticker" ? "9999px" : 0,
                background: sticker?.color ?? tape?.color,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                opacity: p.kind === "tape" ? 0.85 : 1,
                zIndex: 25,
              }}
              title="tap to remove"
            >
              {sticker?.emoji}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* RECIPIENT PICKER                                                        */
/* ---------------------------------------------------------------------- */

type Friend = { id: string; name: string; handle: string; color: string };

// Profiles don't carry a color column, so we derive a stable one from the
// id — same friend always gets the same avatar color across sessions.
const AVATAR_COLORS = [tokens.color.pink, tokens.color.mint, tokens.color.amber, tokens.color.periwinkle];
function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function rowToFriend(row: { id: string; username: string | null; display_name: string | null }): Friend {
  return {
    id: row.id,
    name: row.display_name || row.username || "friend",
    handle: row.username || row.id.slice(0, 8),
    color: colorForId(row.id),
  };
}

export function RecipientPicker({
  selected,
  onSelect,
}: {
  selected: Friend | null;
  onSelect: (f: Friend | null) => void;
}) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);
  const [recents, setRecents] = useState<Friend[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);
  const selfId = useRef<string | null>(null);

  // recent/frequent recipients — pulled from who this user has actually
  // sent scraps or testimonials to, most recent first, deduped.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadingRecents(false);
        return;
      }
      selfId.current = user.id;

      // scraps/testimonials.recipient_id references auth.users, not
      // public.profiles directly, so PostgREST can't auto-embed a join —
      // fetch recipient ids first, then look up their profiles.
      const [{ data: scrapRows }, { data: testimonialRows }] = await Promise.all([
        supabase
          .from("scraps")
          .select("recipient_id, created_at")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("testimonials")
          .select("recipient_id, created_at")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      const orderedIds: string[] = [...(scrapRows ?? []), ...(testimonialRows ?? [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((row) => row.recipient_id);

      const seen = new Set<string>();
      const uniqueIds: string[] = [];
      for (const id of orderedIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        uniqueIds.push(id);
        if (uniqueIds.length >= 6) break;
      }

      let deduped: Friend[] = [];
      if (uniqueIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", uniqueIds);
        const byId = new Map((profileRows ?? []).map((p) => [p.id, p]));
        deduped = uniqueIds.map((id) => byId.get(id)).filter(Boolean).map((p) => rowToFriend(p as any));
      }

      // fall back to a few recently-active profiles if this user has never sent anything yet
      if (deduped.length === 0) {
        const { data: fallback } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .neq("id", user.id)
          .order("created_at", { ascending: false })
          .limit(6);
        setRecents((fallback ?? []).map(rowToFriend));
      } else {
        setRecents(deduped);
      }
      setLoadingRecents(false);
    })();
  }, [supabase]);

  // debounced search — same pattern as the handle-availability check on
  // the community composer / login page.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const q = query.trim();
      let builder = supabase
        .from("profiles")
        .select("id, username, display_name")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(8);
      if (selfId.current) builder = builder.neq("id", selfId.current);
      const { data } = await builder;
      setResults((data ?? []).map(rowToFriend));
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query, supabase]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs" style={{ fontFamily: tokens.font.body, color: tokens.color.inkSoft }}>
        whose wall is this for?
      </p>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: tokens.color.inkSoft }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search a friend…"
          className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none"
          style={{ borderColor: "#E4E0D3", fontFamily: tokens.font.body }}
        />
        {searching && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: tokens.color.inkSoft }} />
        )}
      </div>

      {query.trim().length >= 2 && (
        <div className="flex flex-col gap-1 -mt-1">
          {!searching && results.length === 0 && (
            <p className="text-xs px-1" style={{ color: tokens.color.inkSoft }}>
              no one matches &quot;{query}&quot;
            </p>
          )}
          {results.map((f) => (
            <FriendRow key={f.id} f={f} active={selected?.id === f.id} onClick={() => onSelect(f)} />
          ))}
        </div>
      )}

      {!loadingRecents && recents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recents.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelect(selected?.id === f.id ? null : f)}
              className="flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs transition-all"
              style={{
                fontFamily: tokens.font.body,
                fontWeight: 600,
                background: selected?.id === f.id ? tokens.color.periwinkle : "#fff",
                color: selected?.id === f.id ? "#fff" : tokens.color.ink,
                border: `1.5px solid ${selected?.id === f.id ? tokens.color.periwinkle : "#E4E0D3"}`,
              }}
            >
              <FriendAvatar name={f.name} color={f.color} size={18} />
              {f.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FriendRow({ f, active, onClick }: { f: Friend; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-black/5 transition-colors"
      style={{ background: active ? `${tokens.color.periwinkle}1A` : "transparent" }}
    >
      <FriendAvatar name={f.name} color={f.color} size={26} />
      <div>
        <p className="text-sm" style={{ fontFamily: tokens.font.body, fontWeight: 600, color: tokens.color.ink }}>
          {f.name}
        </p>
        <p className="text-[11px]" style={{ color: tokens.color.inkSoft }}>
          @{f.handle}
        </p>
      </div>
      {active && <Check size={14} className="ml-auto" style={{ color: tokens.color.periwinkle }} />}
    </button>
  );
}

function FriendAvatar({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center text-white shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42, fontFamily: tokens.font.display, fontWeight: 700 }}
    >
      {name[0].toUpperCase()}
    </span>
  );
}

export type { Friend };

/* ---------------------------------------------------------------------- */
/* SCRAP BOX — unsent drafts                                               */
/* ---------------------------------------------------------------------- */

export function ScrapBox({ drafts, onRestore, onDelete }: { drafts: Draft[]; onRestore: (d: Draft) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="mb-3 w-64 rounded-xl shadow-xl p-3 max-h-80 overflow-y-auto"
            style={{ background: "#fff", border: "1px solid #E4E0D3" }}
          >
            <p className="text-sm mb-2" style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}>
              scrap box
            </p>
            {drafts.length === 0 && (
              <p className="text-xs" style={{ color: tokens.color.inkSoft }}>
                unsent scraps land here — handy if you get interrupted mid-recording.
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              {drafts.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 p-2 rounded-lg" style={{ background: tokens.color.paperDark }}>
                  <button onClick={() => onRestore(d)} className="text-left flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ fontFamily: tokens.font.body, fontWeight: 600, color: tokens.color.ink }}>
                      {d.type} · {d.preview || "untitled"}
                    </p>
                  </button>
                  <button onClick={() => onDelete(d.id)} className="text-[11px]" style={{ color: tokens.color.pink }}>
                    delete
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
        style={{ background: tokens.color.ink, color: "#fff" }}
      >
        <Archive size={18} />
        {drafts.length > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
            style={{ background: tokens.color.pink, fontFamily: tokens.font.body, fontWeight: 700 }}
          >
            {drafts.length}
          </span>
        )}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* SEND — toss animation + confetti burst + toast                          */
/* ---------------------------------------------------------------------- */

export function SendButton({
  disabled,
  loading,
  onClick,
}: {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      whileHover={{ scale: disabled ? 1 : 1.03, boxShadow: disabled ? "none" : "0 10px 24px rgba(108,92,231,0.35)" }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className="w-full rounded-xl py-3 text-white font-medium disabled:opacity-40"
      style={{ background: tokens.color.periwinkle, fontFamily: tokens.font.body }}
    >
      {loading ? "sticking it on…" : "stick it on the wall"}
    </motion.button>
  );
}

export function ConfettiBurst({ originId }: { originId: number }) {
  return (
    <motion.div key={originId} className="pointer-events-none absolute left-1/2 top-1/2 z-40">
      {BURST_COLORS.map((c, idx) => {
        const angle = (idx / BURST_COLORS.length) * Math.PI * 2;
        return (
          <motion.span
            key={idx}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 60, y: Math.sin(angle) * 60, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute rounded-full"
            style={{ width: 8, height: 8, background: c, marginLeft: -4, marginTop: -4 }}
          />
        );
      })}
    </motion.div>
  );
}

export function SentToast({ recipientName, onSendAnother, onViewWall }: { recipientName: string; onSendAnother: () => void; onViewWall: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl shadow-xl px-5 py-3 flex items-center gap-4"
      style={{ background: tokens.color.ink, color: "#fff" }}
    >
      <span style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
        sent to {recipientName}! <span style={{ color: tokens.color.mint }}>✓</span>
      </span>
      <button onClick={onViewWall} className="text-sm underline" style={{ color: tokens.color.amber }}>
        view wall
      </button>
      <button onClick={onSendAnother} className="text-sm underline" style={{ color: tokens.color.mint }}>
        send another
      </button>
    </motion.div>
  );
}
