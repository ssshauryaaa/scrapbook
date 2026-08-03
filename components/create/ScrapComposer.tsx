"use client";

/**
 * ScrapComposer
 * -----------------------------------------------------------------------
 * The flagship /create flow. TypePicker cards use a shared layoutId with
 * the compose canvas below — picking a card is a "pull that sheet out of
 * the stack" morph, not a screen swap. Everything after (decoration,
 * recipient, send) lives on the same scroll, so the physical metaphor
 * (paper -> deco tray -> mailbox) reads as one continuous surface.
 * -----------------------------------------------------------------------
 */

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tokens, ScrapType, PlacedDeco, Draft } from "@/lib/create-tokens";
import TypePicker from "./TypePicker";
import { TextCompose, ImageCompose, RecorderCompose } from "./compose-panels";
import {
  DecorationTray,
  RecipientPicker,
  Friend,
  ScrapBox,
  SendButton,
  ConfettiBurst,
  SentToast,
} from "./create-extras";

export default function ScrapComposer() {
  const supabase = createClient();

  const [type, setType] = useState<ScrapType | null>(null);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [transcript, setTranscript] = useState("");
  const [placed, setPlaced] = useState<PlacedDeco[]>([]);
  const [recipient, setRecipient] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [burstId, setBurstId] = useState(0);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);

  const hasContent = useMemo(() => {
    if (type === "text") return text.trim().length > 0;
    if (type === "image" || type === "gif") return !!file;
    if (type === "voice" || type === "video") return transcript.length > 0;
    return false;
  }, [type, text, file, transcript]);

  function resetAll() {
    setType(null);
    setText("");
    setMood(null);
    setFile(null);
    setCaption("");
    setTranscript("");
    setPlaced([]);
    setRecipient(null);
    setSent(false);
  }

  function saveDraft() {
    if (!type) return;
    const preview = type === "text" ? text.slice(0, 40) : type === "image" || type === "gif" ? file?.name ?? "" : transcript.slice(0, 40);
    setDrafts((d) => [
      { id: `${type}-${Date.now()}`, type, savedAt: Date.now(), preview, payload: { text, mood, caption, transcript } },
      ...d,
    ]);
    resetAll();
  }

  function restoreDraft(d: Draft) {
    setType(d.type);
    const p = d.payload as { text: string; mood: string | null; caption: string; transcript: string };
    setText(p.text ?? "");
    setMood(p.mood ?? null);
    setCaption(p.caption ?? "");
    setTranscript(p.transcript ?? "");
    setDrafts((all) => all.filter((x) => x.id !== d.id));
  }

  async function handleSend() {
    if (!type || !recipient || !hasContent) return;
    setLoading(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to send a scrap.");

      // image/gif carry a real file upload; voice/video are transcribed
      // client-side for now (see RecorderCompose) so there's no blob yet.
      let mediaUrl: string | null = null;
      if ((type === "image" || type === "gif") && file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("scrap-media").upload(path, file);
        if (upErr) throw upErr;
        mediaUrl = supabase.storage.from("scrap-media").getPublicUrl(path).data.publicUrl;
      }

      const content = type === "text" ? text : type === "voice" || type === "video" ? transcript : caption;

      const { error: insertErr } = await supabase.from("scraps").insert({
        author_id: user.id,
        recipient_id: recipient.id,
        type,
        content: content || null,
        media_url: mediaUrl,
      });
      if (insertErr) throw insertErr;

      // on_scrap_created trigger fires the recipient's notification.
      setLoading(false);
      setBurstId((n) => n + 1);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong sending that scrap.");
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <ScrapBox drafts={drafts} onRestore={restoreDraft} onDelete={(id) => setDrafts((d) => d.filter((x) => x.id !== id))} />

      <AnimatePresence mode="wait">
        {sent ? (
          <SentToast
            recipientName={recipient?.name ?? "them"}
            onSendAnother={resetAll}
            onViewWall={() => {
              /* router.push(`/${recipient?.handle}`) */
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* step 1 — pick a piece of paper */}
      {!type && (
        <div>
          <p className="text-sm mb-2" style={{ fontFamily: tokens.font.body, color: tokens.color.inkSoft }}>
            what kind of scrap is this?
          </p>
          <TypePicker onPick={setType} />
        </div>
      )}

      {/* step 2+ — the sheet you pulled out becomes the canvas */}
      {type && (
        <motion.div
          layoutId={`scrap-card-${type}`}
          layout
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          ref={canvasRef}
          className="relative rounded-2xl shadow-xl p-5 sm:p-6"
          style={{ background: type === "video" ? tokens.color.filmBlack : "#fff" }}
        >
          <button
            type="button"
            onClick={resetAll}
            className="flex items-center gap-1 text-xs mb-4 hover:opacity-70 transition-opacity"
            style={{ color: type === "video" ? tokens.color.mint : tokens.color.inkSoft, fontFamily: tokens.font.body }}
          >
            <ArrowLeft size={13} /> choose a different scrap type
          </button>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100">{error}</div>
          )}

          {type === "text" && (
            <TextCompose value={text} onChange={setText} mood={mood} onMood={setMood} onEnterSend={handleSend} />
          )}
          {(type === "image" || type === "gif") && (
            <ImageCompose file={file} onFile={setFile} caption={caption} onCaption={setCaption} glossy={type === "gif"} />
          )}
          {(type === "voice" || type === "video") && (
            <RecorderCompose kind={type} transcript={transcript} onTranscript={setTranscript} />
          )}

          {/* decoration overlay lives inside the same canvas, positioned
              relative to it so placed stickers sit "on" the scrap */}
          <div className="mt-6">
            <DecorationTray
              canvasRef={canvasRef}
              placed={placed}
              onPlace={(p) => setPlaced((all) => [...all, p])}
              onRemove={(id) => setPlaced((all) => all.filter((p) => p.id !== id))}
            />
          </div>

          <div className="mt-6 pt-5" style={{ borderTop: `1px dashed ${type === "video" ? "#333" : "#E4E0D3"}` }}>
            <RecipientPicker selected={recipient} onSelect={setRecipient} />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={saveDraft}
              disabled={!hasContent}
              className="px-4 py-3 rounded-xl text-sm disabled:opacity-40"
              style={{
                fontFamily: tokens.font.body,
                fontWeight: 600,
                color: type === "video" ? "#fff" : tokens.color.ink,
                background: type === "video" ? "#1A1A1A" : tokens.color.paperDark,
              }}
            >
              save for later
            </button>
            <div className="flex-1 relative">
              <SendButton disabled={!hasContent || !recipient} loading={loading} onClick={handleSend} />
              <AnimatePresence>{burstId > 0 && !sent && <ConfettiBurst key={burstId} originId={burstId} />}</AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
