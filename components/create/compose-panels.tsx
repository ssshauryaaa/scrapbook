"use client";

/**
 * Compose panels — one per scrap type. Each keeps the "physical" texture
 * from its TypePicker card so the compose canvas reads as a continuation
 * of the same object, not a generic swap.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Upload, Image as ImageIcon, X, Video as VideoIcon } from "lucide-react";
import { tokens, MOOD_TAGS, TEXT_PLACEHOLDERS } from "@/lib/create-tokens";

/* ---------------------------------------------------------------------- */
/* TEXT                                                                    */
/* ---------------------------------------------------------------------- */

export function TextCompose({
  value,
  onChange,
  mood,
  onMood,
  onEnterSend,
}: {
  value: string;
  onChange: (v: string) => void;
  mood: string | null;
  onMood: (m: string) => void;
  onEnterSend: () => void;
}) {
  const placeholder = useRef(TEXT_PLACEHOLDERS[Math.floor(Math.random() * TEXT_PLACEHOLDERS.length)]).current;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative rounded-lg p-4 min-h-[160px]"
        style={{
          background: "#FFFDF7",
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 27px, ${tokens.color.periwinkle}22 28px)`,
        }}
      >
        <div className="absolute left-8 top-0 bottom-0 w-px" style={{ background: tokens.color.pink, opacity: 0.4 }} />
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onEnterSend();
            }
          }}
          placeholder={placeholder}
          rows={5}
          className="w-full bg-transparent outline-none resize-none pl-4 leading-[28px]"
          style={{ fontFamily: tokens.font.body, fontSize: 15, color: tokens.color.ink }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {MOOD_TAGS.map((m) => {
          const active = mood === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onMood(m.id)}
              className="px-3 py-1.5 rounded-full text-xs transition-all"
              style={{
                fontFamily: tokens.font.body,
                fontWeight: 600,
                background: active ? m.color : "#fff",
                color: active ? "#fff" : tokens.color.inkSoft,
                border: `1.5px solid ${active ? m.color : "#E4E0D3"}`,
                transform: active ? "scale(1.05)" : "scale(1)",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px]" style={{ color: tokens.color.inkSoft, fontFamily: tokens.font.body }}>
        press <kbd className="px-1 rounded bg-black/5">enter</kbd> to send · shift+enter for a new line
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* IMAGE / GIF — shared drop-into-photo-corner behavior                    */
/* ---------------------------------------------------------------------- */

export function ImageCompose({
  file,
  onFile,
  caption,
  onCaption,
  glossy,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  caption: string;
  onCaption: (v: string) => void;
  glossy?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex flex-col items-center gap-3">
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
          if (f) onFile(f);
        }}
        className="relative w-56 rounded-sm shadow-lg p-3 pb-10 transition-transform"
        style={{ background: "#fff", transform: dragOver ? "rotate(0deg) scale(1.03)" : "rotate(-1.5deg)" }}
      >
        <div
          className="relative w-full aspect-square rounded-[2px] flex items-center justify-center overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${tokens.color.mint}33, ${tokens.color.pink}33)` }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="upload preview" className="w-full h-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-2 px-4 text-center"
              style={{ color: tokens.color.inkSoft }}
            >
              <Upload size={22} />
              <span className="text-xs" style={{ fontFamily: tokens.font.body }}>
                drop {glossy ? "a gif" : "a photo"} here, or tap to browse
              </span>
            </button>
          )}
          {glossy && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.45) 50%, transparent 60%)" }}
            />
          )}
          {preview && (
            <button
              type="button"
              onClick={() => onFile(null)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <input
          value={caption}
          onChange={(e) => onCaption(e.target.value)}
          placeholder="write a caption…"
          className="absolute bottom-2 left-3 right-3 bg-transparent outline-none text-center text-sm"
          style={{ fontFamily: tokens.font.terminal, color: tokens.color.ink }}
        />
        <input
          ref={inputRef}
          type="file"
          accept={glossy ? "image/gif" : "image/*"}
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <p className="text-[11px] flex items-center gap-1" style={{ color: tokens.color.inkSoft }}>
        <ImageIcon size={12} /> slides into the photo corners once uploaded
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* VOICE / VIDEO — shared record UI                                        */
/* ---------------------------------------------------------------------- */

export function RecorderCompose({
  kind,
  transcript,
  onTranscript,
}: {
  kind: "voice" | "video";
  transcript: string;
  onTranscript: (v: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // NOTE: wire this up to your real transcription pipeline (e.g. Whisper).
  // This is a display-only simulation so designers/PMs can see the target
  // interaction before the STT hook exists.
  const DEMO_LINE = "ok so remember when we tried to prank mr. patel and it went SO wrong—";

  useEffect(() => {
    if (!recording) return;
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    let i = 0;
    const typeId = setInterval(() => {
      i++;
      onTranscript(DEMO_LINE.slice(0, i));
      if (i >= DEMO_LINE.length) clearInterval(typeId);
    }, 45);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(typeId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div
      className="rounded-xl p-5 flex flex-col items-center gap-4"
      style={{ background: tokens.color.filmBlack }}
    >
      <div className="flex items-center gap-2 self-start">
        {kind === "voice" ? <Mic size={16} color={tokens.color.amber} /> : <VideoIcon size={16} color={tokens.color.mint} />}
        <span className="text-sm" style={{ fontFamily: tokens.font.terminal, color: tokens.color.mint }}>
          {kind === "voice" ? "voice memo" : "video scrap"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setRecording((r) => !r)}
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: recording ? "#fff" : "#B91C3C" }}
      >
        {recording && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid #B91C3C" }}
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {recording ? <Square size={20} color="#B91C3C" fill="#B91C3C" /> : <span className="w-4 h-4 rounded-full bg-white" />}
      </button>

      <span className="text-xs" style={{ fontFamily: tokens.font.terminal, color: "#8AF5A3" }}>
        {recording ? `● rec ${mins}:${secs}` : "tap to record"}
      </span>

      {/* hand-drawn-feel waveform */}
      <div className="flex items-end gap-[3px] h-8">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.span
            key={i}
            className="w-1 rounded-full"
            style={{ background: kind === "voice" ? tokens.color.amber : tokens.color.mint }}
            animate={recording ? { height: [4, 4 + ((i * 37) % 22), 4] } : { height: 4 }}
            transition={{ duration: 0.7 + (i % 5) * 0.08, repeat: recording ? Infinity : 0, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* live captions */}
      <div className="w-full min-h-[44px] rounded-lg px-3 py-2" style={{ background: "#1A1A1A" }}>
        <p style={{ fontFamily: tokens.font.terminal, fontSize: 17, color: "#8AF5A3" }}>
          {transcript || <span className="opacity-40">transcript appears here while you talk…</span>}
          {recording && <span className="opacity-70">_</span>}
        </p>
      </div>
    </div>
  );
}
