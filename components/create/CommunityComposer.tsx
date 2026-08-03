"use client";

/**
 * CommunityComposer
 * -----------------------------------------------------------------------
 * Starting a community reads as pinning up a felt pennant on a board:
 * a corkboard-textured card, a banner drop zone styled like tacking up
 * a photo, and a handle-availability check using the same debounced
 * pattern as the username field on login. Submitting inserts the
 * community row, then a community_members row with the creator as
 * owner — matching the RLS policies that require auth.uid() = creator_id
 * / user_id on each insert respectively.
 * -----------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, X, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tokens, COMMUNITY_VIBES } from "@/lib/create-tokens";

export default function CommunityComposer({ onCreated }: { onCreated?: (handle: string) => void }) {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleOk, setHandleOk] = useState<boolean | null>(null);
  const [description, setDescription] = useState("");
  const [vibe, setVibe] = useState<string>(COMMUNITY_VIBES[0].id);
  const [banner, setBanner] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!banner) return setPreview(null);
    const url = URL.createObjectURL(banner);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [banner]);

  useEffect(() => {
    if (!handle || handle.length < 3) {
      setHandleOk(null);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("communities").select("id").eq("name", handle.toLowerCase()).maybeSingle();
      setHandleOk(!data);
    }, 500);
    return () => clearTimeout(t);
  }, [handle, supabase]);

  const handleHint =
    handle && handle.length < 3
      ? "minimum 3 characters"
      : handleOk === null && handle
      ? "checking…"
      : handleOk
      ? "✓ available"
      : handleOk === false
      ? "✗ already taken"
      : "";

  async function handleCreate() {
    if (!name.trim() || handleOk === false || !handle) return;
    setLoading(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to start a community.");

      let bannerUrl: string | null = null;
      if (banner) {
        const path = `${user.id}/${Date.now()}-${banner.name}`;
        const { error: upErr } = await supabase.storage.from("community-media").upload(path, banner);
        if (upErr) throw upErr;
        bannerUrl = supabase.storage.from("community-media").getPublicUrl(path).data.publicUrl;
      }

      const { data: community, error: cErr } = await supabase
        .from("communities")
        .insert({ creator_id: user.id, name, description, banner_url: bannerUrl })
        .select("id")
        .single();
      if (cErr) throw cErr;

      const { error: mErr } = await supabase
        .from("community_members")
        .insert({ community_id: community.id, user_id: user.id, role: "owner" });
      if (mErr) throw mErr;

      setLoading(false);
      setCreated(true);
      onCreated?.(handle);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong creating the community.");
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="rounded-2xl p-8 text-center shadow-xl" style={{ background: "#fff" }}>
        <Users size={28} style={{ color: tokens.color.mint }} className="mx-auto mb-3" />
        <p className="text-xl" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
          {name} is live
        </p>
        <p className="text-sm mt-1" style={{ color: tokens.color.inkSoft }}>
          you&apos;re the owner — invite friends whenever you&apos;re ready.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl shadow-xl p-6 sm:p-8"
      style={{
        background: "#DFCBA6",
        backgroundImage: "radial-gradient(#00000022 1px, transparent 1px)",
        backgroundSize: "10px 10px",
      }}
    >
      <p className="text-sm mb-1" style={{ fontFamily: tokens.font.terminal, color: tokens.color.filmBlack, fontSize: 18 }}>
        pin up a new board
      </p>
      <p className="text-2xl mb-5" style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}>
        start a community
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100">{error}</div>
      )}

      <div className="rounded-xl p-5 shadow-md" style={{ background: "#fff" }}>
        {/* banner — a pennant flag you tack up */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) setBanner(f);
          }}
          className="relative w-full h-28 rounded-lg mb-5 flex items-center justify-center overflow-hidden transition-transform"
          style={{
            background: `linear-gradient(135deg, ${tokens.color.mint}33, ${tokens.color.periwinkle}22)`,
            transform: dragOver ? "scale(1.02)" : "scale(1)",
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="community banner" className="w-full h-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-1.5"
              style={{ color: tokens.color.inkSoft }}
            >
              <Upload size={20} />
              <span className="text-xs" style={{ fontFamily: tokens.font.body }}>
                drop a banner, or tap to browse
              </span>
            </button>
          )}
          {preview && (
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X size={13} />
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setBanner(e.target.files?.[0] ?? null)} />
        </div>

        <label className="block mb-4">
          <span className="text-xs" style={{ color: tokens.color.inkSoft }}>
            name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="late night lo-fi lovers"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none mt-1"
            style={{ borderColor: "#E4E0D3", fontFamily: tokens.font.body }}
          />
        </label>

        <label className="block mb-4">
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs" style={{ color: tokens.color.inkSoft }}>
              handle (unique identifier)
            </span>
            {handleHint && (
              <span className="text-[10px]" style={{ color: handleHint.includes("✗") ? tokens.color.pink : tokens.color.inkSoft }}>
                {handleHint}
              </span>
            )}
          </div>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase())}
            placeholder="lofi-lovers"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "#E4E0D3", fontFamily: tokens.font.body }}
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs" style={{ color: tokens.color.inkSoft }}>
            what&apos;s it about
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="who's this for, what do you post here?"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none mt-1"
            style={{ borderColor: "#E4E0D3", fontFamily: tokens.font.body }}
          />
        </label>

        <div className="flex gap-2 mb-5">
          {COMMUNITY_VIBES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVibe(v.id)}
              className="flex-1 px-3 py-2 rounded-lg text-xs transition-all"
              style={{
                fontFamily: tokens.font.body,
                fontWeight: 600,
                background: vibe === v.id ? v.color : "#fff",
                color: vibe === v.id ? "#fff" : tokens.color.inkSoft,
                border: `1.5px solid ${vibe === v.id ? v.color : "#E4E0D3"}`,
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <motion.button
          type="button"
          disabled={!name.trim() || !handle || handleOk === false || loading}
          onClick={handleCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="w-full rounded-xl py-3 text-white font-medium disabled:opacity-40"
          style={{ background: tokens.color.mint, fontFamily: tokens.font.body }}
        >
          {loading ? "pinning it up…" : "pin it up"}
        </motion.button>
      </div>
    </div>
  );
}
