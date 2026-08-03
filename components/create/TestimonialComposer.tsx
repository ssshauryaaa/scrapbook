"use client";

/**
 * TestimonialComposer
 * -----------------------------------------------------------------------
 * A testimonial reads as a signed note, not a form: cream parchment,
 * a ribbon header, a trait-tag row instead of a mood row, and an
 * optional AI "add a flourish" pass that types its suggestion in live
 * (same typing-simulation pattern as the voice transcript). Sending
 * "seals" it — a wax-stamp press animation instead of a toss.
 * -----------------------------------------------------------------------
 */

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tokens, TESTIMONIAL_OPENERS, TESTIMONIAL_TRAITS } from "@/lib/create-tokens";
import { RecipientPicker, Friend, ConfettiBurst, SentToast } from "./create-extras";

export default function TestimonialComposer() {
  const supabase = createClient();
  const opener = useRef(TESTIMONIAL_OPENERS[Math.floor(Math.random() * TESTIMONIAL_OPENERS.length)]).current;

  const [text, setText] = useState("");
  const [traits, setTraits] = useState<string[]>([]);
  const [recipient, setRecipient] = useState<Friend | null>(null);
  const [assisting, setAssisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [burstId, setBurstId] = useState(0);
  const [error, setError] = useState("");

  function toggleTrait(id: string) {
    setTraits((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length >= 3 ? t : [...t, id]));
  }

  async function handleAssist() {
    if (assisting) return;
    setAssisting(true);
    // TODO: replace with a real call, e.g. an edge function that wraps
    // the Anthropic API with the recipient's name + chosen traits as
    // context. This simulates the typed-out result so the interaction
    // can be reviewed before that endpoint exists.
    const suggestion = `${text ? text + " " : ""}honestly, ${recipient?.name || "you"} shows up for people in a way that's rare — `;
    let i = 0;
    await new Promise<void>((resolve) => {
      const id = setInterval(() => {
        i += 2;
        setText(suggestion.slice(0, i));
        if (i >= suggestion.length) {
          clearInterval(id);
          resolve();
        }
      }, 20);
    });
    setAssisting(false);
  }

  async function handleSend() {
    if (!recipient || !text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to send a testimonial.");

      const { error: insertErr } = await supabase.from("testimonials").insert({
        author_id: user.id,
        recipient_id: recipient.id,
        content: text,
        status: "pending",
        ai_assisted: false,
      });
      if (insertErr) throw insertErr;

      // on_testimonial_created trigger fires the recipient's notification.
      setLoading(false);
      setBurstId((n) => n + 1);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong sealing that testimonial.");
      setLoading(false);
    }
  }

  const hasContent = text.trim().length > 0;

  return (
    <div className="relative">
      <AnimatePresence>
        {sent && (
          <SentToast
            recipientName={recipient?.name ?? "them"}
            onSendAnother={() => {
              setText("");
              setTraits([]);
              setRecipient(null);
              setSent(false);
            }}
            onViewWall={() => {
              /* router.push(`/${recipient?.handle}`) */
            }}
          />
        )}
      </AnimatePresence>

      <div
        className="relative rounded-2xl shadow-xl p-6 sm:p-8"
        style={{
          background: "#FFFCF3",
          backgroundImage:
            "radial-gradient(#2B2A2810 0.5px, transparent 0.5px), radial-gradient(#2B2A2808 0.5px, transparent 0.5px)",
          backgroundSize: "3px 3px, 7px 7px",
        }}
      >
        {/* ribbon header */}
        <div
          className="absolute -top-3 left-8 w-14 h-8"
          style={{ background: tokens.color.amber, clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)" }}
        />

        <p className="text-sm mb-1" style={{ fontFamily: tokens.font.terminal, color: tokens.color.periwinkle, fontSize: 18 }}>
          a testimonial, signed by you
        </p>
        <p className="text-2xl mb-5" style={{ fontFamily: tokens.font.display, fontWeight: 700 }}>
          for a friend&apos;s wall
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100">{error}</div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={opener}
          rows={6}
          className="w-full bg-transparent outline-none resize-none leading-[26px] border-b border-dashed pb-3"
          style={{ fontFamily: tokens.font.body, fontSize: 15, color: tokens.color.ink, borderColor: "#D8D2BC" }}
        />

        <button
          type="button"
          onClick={handleAssist}
          disabled={assisting}
          className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-transform hover:scale-105 disabled:opacity-60"
          style={{ background: `${tokens.color.periwinkle}1A`, color: tokens.color.periwinkleDark, fontFamily: tokens.font.body, fontWeight: 600 }}
        >
          {assisting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {assisting ? "channeling a flourish…" : "add a flourish (AI)"}
        </button>

        <div className="flex flex-wrap gap-2 mt-5">
          {TESTIMONIAL_TRAITS.map((t) => {
            const active = traits.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTrait(t.id)}
                className="px-3 py-1.5 rounded-full text-xs transition-all"
                style={{
                  fontFamily: tokens.font.body,
                  fontWeight: 600,
                  background: active ? t.color : "#fff",
                  color: active ? "#fff" : tokens.color.inkSoft,
                  border: `1.5px solid ${active ? t.color : "#E4E0D3"}`,
                  transform: active ? "scale(1.05)" : "scale(1)",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-5" style={{ borderTop: "1px dashed #D8D2BC" }}>
          <RecipientPicker selected={recipient} onSelect={setRecipient} />
        </div>

        <div className="mt-6 relative">
          <motion.button
            type="button"
            disabled={!hasContent || !recipient || loading}
            onClick={handleSend}
            whileHover={{ scale: !hasContent || !recipient ? 1 : 1.02 }}
            whileTap={{ scale: !hasContent || !recipient ? 1 : 0.95 }}
            className="w-full rounded-xl py-3 text-white font-medium disabled:opacity-40"
            style={{ background: tokens.color.amber, fontFamily: tokens.font.body, color: tokens.color.ink }}
          >
            {loading ? "pressing the seal…" : "seal it"}
          </motion.button>
          <AnimatePresence>{burstId > 0 && !sent && <ConfettiBurst key={burstId} originId={burstId} />}</AnimatePresence>
        </div>
      </div>
    </div>
  );
}
