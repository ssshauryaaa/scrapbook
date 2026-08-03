"use client";

/**
 * CommunityPostComposer
 * -----------------------------------------------------------------------
 * Posting into a community reads as tacking a notecard to someone else's
 * board: pick which board (only communities you've already joined show
 * up, matching the community_posts RLS check), write the note, optional
 * photo, pin it up. Loads the member list client-side on mount.
 * -----------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Pin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tokens } from "@/lib/create-tokens";
import { ConfettiBurst } from "./create-extras";

type JoinedCommunity = { id: string; name: string };

export default function CommunityPostComposer() {
  const supabase = createClient();

  const [communities, setCommunities] = useState<JoinedCommunity[]>([]);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posted, setPosted] = useState(false);
  const [burstId, setBurstId] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadingList(false);
        return;
      }
      const { data } = await supabase
        .from("community_members")
        .select("community_id, communities(id, name)")
        .eq("user_id", user.id);
      const list = (data ?? [])
        .map((row: any) => row.communities)
        .filter(Boolean) as JoinedCommunity[];
      setCommunities(list);
      if (list[0]) setCommunityId(list[0].id);
      setLoadingList(false);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handlePost() {
    if (!communityId || !content.trim()) return;
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in first.");

      let mediaUrl: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("community-media").upload(path, file);
        if (upErr) throw upErr;
        mediaUrl = supabase.storage.from("community-media").getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase
        .from("community_posts")
        .insert({ author_id: user.id, community_id: communityId, content, media_url: mediaUrl });
      if (error) throw error;

      setBurstId((n) => n + 1);
      setPosted(true);
    } finally {
      setLoading(false);
    }
  }

  if (loadingList) {
    return (
      <p className="text-sm" style={{ color: tokens.color.inkSoft, fontFamily: tokens.font.body }}>
        checking which boards you&apos;ve joined…
      </p>
    );
  }

  if (communities.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center shadow-xl" style={{ background: "#fff" }}>
        <Pin size={26} style={{ color: tokens.color.pink }} className="mx-auto mb-3" />
        <p className="text-lg" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
          no boards to post to yet
        </p>
        <p className="text-sm mt-1" style={{ color: tokens.color.inkSoft }}>
          join or start a community first, then come back here.
        </p>
      </div>
    );
  }

  if (posted) {
    return (
      <div className="relative rounded-2xl p-8 text-center shadow-xl" style={{ background: "#fff" }}>
        <p className="text-lg" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
          pinned! ✓
        </p>
        <button
          onClick={() => {
            setPosted(false);
            setContent("");
            setFile(null);
          }}
          className="text-sm underline mt-2"
          style={{ color: tokens.color.periwinkle }}
        >
          post another
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl shadow-xl p-6 sm:p-8" style={{ background: "#fff" }}>
      <p className="text-sm mb-1" style={{ fontFamily: tokens.font.terminal, color: tokens.color.pink, fontSize: 18 }}>
        tack it to a board
      </p>
      <p className="text-2xl mb-5" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
        new community post
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {communities.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCommunityId(c.id)}
            className="px-3 py-1.5 rounded-full text-xs transition-all"
            style={{
              fontFamily: tokens.font.body,
              fontWeight: 600,
              background: communityId === c.id ? tokens.color.pink : "#fff",
              color: communityId === c.id ? "#fff" : tokens.color.ink,
              border: `1.5px solid ${communityId === c.id ? tokens.color.pink : "#E4E0D3"}`,
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="what's going on in this board?"
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none mb-4"
        style={{ borderColor: "#E4E0D3", fontFamily: tokens.font.body }}
      />

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
          if (f) setFile(f);
        }}
        className="relative w-full h-24 rounded-lg mb-5 flex items-center justify-center overflow-hidden transition-transform"
        style={{ background: `${tokens.color.pink}14`, transform: dragOver ? "scale(1.02)" : "scale(1)" }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="post attachment" className="w-full h-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-1"
            style={{ color: tokens.color.inkSoft }}
          >
            <Upload size={18} />
            <span className="text-xs" style={{ fontFamily: tokens.font.body }}>
              add a photo (optional)
            </span>
          </button>
        )}
        {preview && (
          <button
            type="button"
            onClick={() => setFile(null)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
          >
            <X size={13} />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>

      <div className="relative">
        <motion.button
          type="button"
          disabled={!content.trim() || !communityId || loading}
          onClick={handlePost}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="w-full rounded-xl py-3 text-white font-medium disabled:opacity-40"
          style={{ background: tokens.color.pink, fontFamily: tokens.font.body }}
        >
          {loading ? "pinning it up…" : "pin to the board"}
        </motion.button>
        <AnimatePresence>{burstId > 0 && !posted && <ConfettiBurst key={burstId} originId={burstId} />}</AnimatePresence>
      </div>
    </div>
  );
}
